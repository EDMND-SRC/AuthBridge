import { WebhookService } from './webhook.js';
import { DynamoDBService } from './dynamodb.js';
import type { VerificationEntity, VerificationStatus } from '../types/verification.js';
import type { WebhookEventType } from '../types/webhook.js';

export class CaseStatusService {
  private webhookService: WebhookService;
  private dynamoDBService: DynamoDBService;

  constructor(
    webhookService?: WebhookService,
    dynamoDBService?: DynamoDBService
  ) {
    this.webhookService = webhookService || new WebhookService();
    this.dynamoDBService = dynamoDBService || new DynamoDBService();
  }

  /**
   * Update case status and trigger webhook
   */
  async updateStatus(
    verificationId: string,
    newStatus: VerificationStatus,
    additionalData?: Partial<VerificationEntity>
  ): Promise<void> {
    // Load current case
    const verificationCase = await this.dynamoDBService.getVerification(
      verificationId
    );

    if (!verificationCase) {
      throw new Error('Verification case not found');
    }

    // Update case status
    const updatedCase: VerificationEntity = {
      ...verificationCase,
      ...additionalData,
      status: newStatus,
      updatedAt: new Date().toISOString(),
      completedAt: ['approved', 'rejected', 'auto_rejected', 'expired'].includes(
        newStatus
      )
        ? new Date().toISOString()
        : verificationCase.completedAt,
    };

    // Save to DynamoDB
    await this.dynamoDBService.putItem(updatedCase);

    // Determine webhook event type
    const eventType = this.getWebhookEventType(newStatus);
    if (eventType) {
      // Trigger webhook asynchronously (don't block status update)
      this.webhookService
        .sendWebhook(updatedCase, eventType)
        .catch((error) => {
          console.error('Webhook delivery failed:', error);
          // Don't throw - webhook failure shouldn't block status update
        });
    }
  }

  /**
   * Map case status to webhook event type
   */
  private getWebhookEventType(
    status: VerificationStatus
  ): WebhookEventType | null {
    const eventMap: Record<string, WebhookEventType> = {
      created: 'verification.created',
      submitted: 'verification.submitted',
      approved: 'verification.approved',
      rejected: 'verification.rejected',
      auto_rejected: 'verification.rejected',
      resubmission_required: 'verification.resubmission_required',
      expired: 'verification.expired',
    };

    return eventMap[status] || null;
  }
}
