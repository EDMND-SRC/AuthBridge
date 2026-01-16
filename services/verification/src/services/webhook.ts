import crypto from 'crypto';
import { DynamoDBService } from './dynamodb.js';
import type {
  WebhookEventType,
  WebhookPayload,
  ClientConfiguration,
} from '../types/webhook.js';
import type { VerificationEntity } from '../types/verification.js';

export class WebhookService {
  private dynamoDBService: DynamoDBService;
  private readonly MAX_ATTEMPTS = 3;
  private readonly RETRY_DELAYS = [1000, 5000, 30000]; // ms
  private readonly TIMEOUT_MS = 10000; // 10 seconds

  constructor(dynamoDBService?: DynamoDBService) {
    this.dynamoDBService = dynamoDBService || new DynamoDBService();
  }

  /**
   * Send webhook notification for verification status change
   */
  async sendWebhook(
    verificationCase: VerificationEntity,
    eventType: WebhookEventType
  ): Promise<void> {
    // Load client configuration
    const result = await this.dynamoDBService.getItem({
      Key: {
        PK: `CLIENT#${verificationCase.clientId}`,
        SK: 'CONFIG',
      },
    });

    const clientConfig = result.Item as ClientConfiguration | undefined;

    if (!clientConfig?.webhookEnabled || !clientConfig.webhookUrl) {
      console.log(
        `Webhook not configured for client ${verificationCase.clientId}`
      );
      return;
    }

    // Check if event type is subscribed
    if (!clientConfig.webhookEvents?.includes(eventType)) {
      console.log(`Client not subscribed to event ${eventType}`);
      return;
    }

    // Generate webhook ID
    const webhookId = `whk_${crypto.randomUUID().replace(/-/g, '')}`;

    // Format payload
    const payload = this.formatPayload(verificationCase, eventType);

    // Attempt delivery with retries
    await this.deliverWithRetry(
      webhookId,
      clientConfig.webhookUrl,
      clientConfig.webhookSecret || '',
      payload,
      verificationCase.verificationId,
      verificationCase.clientId,
      eventType
    );
  }

  /**
   * Format webhook payload based on event type
   */
  private formatPayload(
    verificationCase: VerificationEntity,
    eventType: WebhookEventType
  ): WebhookPayload {
    const basePayload: WebhookPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data: {
        verificationId: verificationCase.verificationId,
        status: verificationCase.status,
        documentType: verificationCase.documentType,
        createdAt: verificationCase.createdAt,
        updatedAt: verificationCase.updatedAt,
      },
    };

    // Add status-specific data
    if (verificationCase.status === 'approved') {
      const omangNumber = verificationCase.extractedData?.idNumber;
      basePayload.data.customer = {
        name: verificationCase.customer?.name,
        email: verificationCase.customer?.email,
        omangNumber: this.maskOmangNumber(omangNumber),
      };
      basePayload.data.extractedData = {
        fullName: verificationCase.extractedData?.surname
          ? `${verificationCase.extractedData.forenames} ${verificationCase.extractedData.surname}`
          : undefined,
        dateOfBirth: verificationCase.extractedData?.dateOfBirth,
        sex: verificationCase.extractedData?.sex,
        dateOfExpiry: verificationCase.extractedData?.dateOfExpiry,
      };
      basePayload.data.biometricScore =
        verificationCase.biometricSummary?.overallScore;
      basePayload.data.completedAt = verificationCase.completedAt;
    } else if (
      verificationCase.status === 'rejected' ||
      verificationCase.status === 'auto_rejected'
    ) {
      basePayload.data.customer = {
        email: verificationCase.customer?.email,
      };
      basePayload.data.rejectionReason = verificationCase.rejectionReason;
      basePayload.data.rejectionCode = verificationCase.rejectionCode;
      basePayload.data.completedAt = verificationCase.completedAt;
    }

    return basePayload;
  }

  /**
   * Deliver webhook with retry logic
   */
  private async deliverWithRetry(
    webhookId: string,
    webhookUrl: string,
    webhookSecret: string,
    payload: WebhookPayload,
    verificationId: string,
    clientId: string,
    eventType: WebhookEventType
  ): Promise<void> {
    for (let attempt = 1; attempt <= this.MAX_ATTEMPTS; attempt++) {
      try {
        // Generate signature
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = this.generateSignature(
          payload,
          timestamp,
          webhookSecret
        );

        // Send request
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': `sha256=${signature}`,
            'X-Webhook-Event': eventType,
            'X-Webhook-Id': webhookId,
            'X-Webhook-Timestamp': String(timestamp),
            'User-Agent': 'AuthBridge-Webhooks/1.0',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(this.TIMEOUT_MS),
        });

        const responseBody = await response.text().catch(() => '');

        // Log delivery attempt
        await this.logDeliveryAttempt({
          webhookId,
          verificationId,
          clientId,
          eventType,
          webhookUrl,
          attemptNumber: attempt,
          statusCode: response.status,
          responseBody,
          deliveredAt: response.ok ? new Date().toISOString() : undefined,
          failedAt: !response.ok ? new Date().toISOString() : undefined,
        });

        // Success if 2xx status code
        if (response.ok) {
          console.log(`Webhook delivered successfully: ${webhookId}`);
          return;
        }

        // Don't retry on 4xx errors (client error)
        if (response.status >= 400 && response.status < 500) {
          console.error(
            `Webhook failed with client error: ${response.status}`
          );
          break;
        }

        // Retry on 5xx errors
        if (attempt < this.MAX_ATTEMPTS) {
          const delay = this.RETRY_DELAYS[attempt - 1];
          console.log(
            `Retrying webhook in ${delay}ms (attempt ${attempt + 1}/${this.MAX_ATTEMPTS})`
          );
          await this.sleep(delay);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`Webhook delivery error (attempt ${attempt}):`, error);

        // Log failed attempt
        await this.logDeliveryAttempt({
          webhookId,
          verificationId,
          clientId,
          eventType,
          webhookUrl,
          attemptNumber: attempt,
          error: errorMessage,
          failedAt: new Date().toISOString(),
          nextRetryAt:
            attempt < this.MAX_ATTEMPTS
              ? new Date(
                  Date.now() + this.RETRY_DELAYS[attempt - 1]
                ).toISOString()
              : undefined,
        });

        // Retry on network errors
        if (attempt < this.MAX_ATTEMPTS) {
          const delay = this.RETRY_DELAYS[attempt - 1];
          await this.sleep(delay);
        }
      }
    }

    // All attempts failed
    console.error(
      `Webhook delivery failed after ${this.MAX_ATTEMPTS} attempts: ${webhookId}`
    );
  }

  /**
   * Generate HMAC-SHA256 signature for webhook
   */
  generateSignature(
    payload: WebhookPayload,
    timestamp: number,
    secret: string
  ): string {
    const payloadString = JSON.stringify(payload);
    const signedPayload = `${timestamp}.${payloadString}`;
    return crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  }

  /**
   * Log webhook delivery attempt to DynamoDB
   */
  private async logDeliveryAttempt(log: {
    webhookId: string;
    verificationId: string;
    clientId: string;
    eventType: WebhookEventType;
    webhookUrl: string;
    attemptNumber: number;
    statusCode?: number;
    responseBody?: string;
    error?: string;
    deliveredAt?: string;
    failedAt?: string;
    nextRetryAt?: string;
  }): Promise<void> {
    await this.dynamoDBService.putItem({
      PK: `WEBHOOK#${log.webhookId}`,
      SK: `ATTEMPT#${log.attemptNumber}`,
      ...log,
      responseBody: log.responseBody?.substring(0, 1024), // Truncate to 1KB
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Mask Omang number for webhook payload
   */
  private maskOmangNumber(omangNumber: string | undefined): string {
    if (!omangNumber) return '';
    if (omangNumber.length < 4) return '***';
    return '***' + omangNumber.slice(-4);
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
