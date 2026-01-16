import { WebhookService } from './webhook.js';
import { DynamoDBService } from './dynamodb.js';
import type { VerificationEntity, VerificationStatus } from '../types/verification.js';
export declare class CaseStatusService {
    private webhookService;
    private dynamoDBService;
    constructor(webhookService?: WebhookService, dynamoDBService?: DynamoDBService);
    /**
     * Update case status and trigger webhook
     */
    updateStatus(verificationId: string, newStatus: VerificationStatus, additionalData?: Partial<VerificationEntity>): Promise<void>;
    /**
     * Map case status to webhook event type
     */
    private getWebhookEventType;
}
//# sourceMappingURL=case-status.d.ts.map