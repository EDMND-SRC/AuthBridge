import crypto from 'crypto';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { DynamoDBService } from './dynamodb.js';
import type {
  WebhookEventType,
  WebhookPayload,
  ClientConfiguration,
} from '../types/webhook.js';
import type { VerificationEntity } from '../types/verification.js';

const cloudWatchClient = new CloudWatchClient({
  region: process.env.AWS_REGION || 'af-south-1',
});

/**
 * WebhookService handles sending webhook notifications for verification events.
 *
 * Features:
 * - HMAC-SHA256 signature generation for payload verification
 * - Exponential backoff retry logic (1s, 5s, 30s)
 * - No retry on 4xx client errors
 * - Webhook delivery logging to DynamoDB with 30-day TTL
 * - CloudWatch metrics for monitoring
 * - PII masking in payloads (Omang numbers)
 */
export class WebhookService {
  private dynamoDBService: DynamoDBService;
  private readonly MAX_ATTEMPTS = 3;
  private readonly RETRY_DELAYS = [1000, 5000, 30000]; // ms - configurable via env
  private readonly TIMEOUT_MS = 10000; // 10 seconds
  private readonly TTL_DAYS = 30; // Webhook log retention

  constructor(dynamoDBService?: DynamoDBService) {
    this.dynamoDBService = dynamoDBService || new DynamoDBService();
  }

  /**
   * Send webhook notification for verification status change.
   * Handles client configuration lookup, payload formatting, and delivery with retries.
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
   * Format webhook payload based on event type.
   * Masks PII (Omang numbers) for compliance.
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
   * Deliver webhook with retry logic.
   * Uses exponential backoff: 1s, 5s, 30s.
   * Does not retry on 4xx client errors.
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
    const startTime = Date.now();

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
        const latencyMs = Date.now() - startTime;

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

          // Emit success metrics
          await this.emitMetrics({
            success: true,
            latencyMs,
            attemptNumber: attempt,
            clientId,
            eventType,
          });

          // Log audit event for successful delivery
          await this.logAuditEvent({
            action: 'WEBHOOK_DELIVERED',
            webhookId,
            verificationId,
            clientId,
            eventType,
            attemptNumber: attempt,
            latencyMs,
          });

          return;
        }

        // Don't retry on 4xx errors (client error)
        if (response.status >= 400 && response.status < 500) {
          console.error(
            `Webhook failed with client error: ${response.status}`
          );

          // Emit failure metrics
          await this.emitMetrics({
            success: false,
            latencyMs,
            attemptNumber: attempt,
            clientId,
            eventType,
            statusCode: response.status,
          });

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
    const totalLatencyMs = Date.now() - startTime;
    console.error(
      `Webhook delivery failed after ${this.MAX_ATTEMPTS} attempts: ${webhookId}`
    );

    // Emit failure metrics
    await this.emitMetrics({
      success: false,
      latencyMs: totalLatencyMs,
      attemptNumber: this.MAX_ATTEMPTS,
      clientId,
      eventType,
      failed: true,
    });

    // Log audit event for failed delivery
    await this.logAuditEvent({
      action: 'WEBHOOK_FAILED',
      webhookId,
      verificationId,
      clientId,
      eventType,
      attemptNumber: this.MAX_ATTEMPTS,
      latencyMs: totalLatencyMs,
    });
  }

  /**
   * Generate HMAC-SHA256 signature for webhook payload.
   * Format: timestamp.payload
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
   * Log webhook delivery attempt to DynamoDB with 30-day TTL.
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
    const now = new Date();
    const ttl = Math.floor(now.getTime() / 1000) + this.TTL_DAYS * 24 * 60 * 60;

    await this.dynamoDBService.putItem({
      PK: `WEBHOOK#${log.webhookId}`,
      SK: `ATTEMPT#${log.attemptNumber}`,
      ...log,
      responseBody: log.responseBody?.substring(0, 1024), // Truncate to 1KB
      createdAt: now.toISOString(),
      ttl, // 30-day TTL for automatic cleanup
    });
  }

  /**
   * Log audit event for webhook delivery (compliance requirement).
   */
  private async logAuditEvent(event: {
    action: 'WEBHOOK_DELIVERED' | 'WEBHOOK_FAILED';
    webhookId: string;
    verificationId: string;
    clientId: string;
    eventType: WebhookEventType;
    attemptNumber: number;
    latencyMs: number;
  }): Promise<void> {
    const now = new Date();
    const ttl = Math.floor(now.getTime() / 1000) + 5 * 365 * 24 * 60 * 60; // 5-year retention for FIA

    await this.dynamoDBService.putItem({
      PK: `AUDIT#${event.verificationId}`,
      SK: `WEBHOOK#${now.toISOString()}#${event.webhookId}`,
      entityType: 'AUDIT',
      action: event.action,
      webhookId: event.webhookId,
      verificationId: event.verificationId,
      clientId: event.clientId,
      eventType: event.eventType,
      attemptNumber: event.attemptNumber,
      latencyMs: event.latencyMs,
      timestamp: now.toISOString(),
      ttl, // 5-year retention for compliance
    });
  }

  /**
   * Emit CloudWatch metrics for webhook delivery monitoring.
   */
  private async emitMetrics(metrics: {
    success: boolean;
    latencyMs: number;
    attemptNumber: number;
    clientId: string;
    eventType: WebhookEventType;
    statusCode?: number;
    failed?: boolean;
  }): Promise<void> {
    try {
      const metricData = [
        {
          MetricName: metrics.success ? 'WebhookDeliverySuccess' : 'WebhookDeliveryFailure',
          Value: 1,
          Unit: 'Count' as const,
          Dimensions: [
            { Name: 'ClientId', Value: metrics.clientId },
            { Name: 'EventType', Value: metrics.eventType },
          ],
        },
        {
          MetricName: 'WebhookDeliveryLatency',
          Value: metrics.latencyMs,
          Unit: 'Milliseconds' as const,
          Dimensions: [
            { Name: 'ClientId', Value: metrics.clientId },
          ],
        },
        {
          MetricName: 'WebhookRetryCount',
          Value: metrics.attemptNumber,
          Unit: 'Count' as const,
          Dimensions: [
            { Name: 'ClientId', Value: metrics.clientId },
          ],
        },
      ];

      if (metrics.failed) {
        metricData.push({
          MetricName: 'WebhookDeliveryFailed',
          Value: 1,
          Unit: 'Count' as const,
          Dimensions: [
            { Name: 'ClientId', Value: metrics.clientId },
            { Name: 'EventType', Value: metrics.eventType },
          ],
        });
      }

      await cloudWatchClient.send(
        new PutMetricDataCommand({
          Namespace: 'AuthBridge/Webhooks',
          MetricData: metricData,
        })
      );
    } catch (error) {
      // Don't fail webhook delivery if metrics fail
      console.error('Failed to emit CloudWatch metrics:', error);
    }
  }

  /**
   * Mask Omang number for webhook payload (DPA 2024 compliance).
   * Shows only last 4 digits.
   */
  private maskOmangNumber(omangNumber: string | undefined): string {
    if (!omangNumber) return '';
    if (omangNumber.length < 4) return '***';
    return '***' + omangNumber.slice(-4);
  }

  /**
   * Sleep utility for retry delays.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
