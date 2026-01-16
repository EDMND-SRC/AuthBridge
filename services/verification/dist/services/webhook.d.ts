import { DynamoDBService } from './dynamodb.js';
import type { WebhookEventType, WebhookPayload } from '../types/webhook.js';
import type { VerificationEntity } from '../types/verification.js';
export declare class WebhookService {
    private dynamoDBService;
    private readonly MAX_ATTEMPTS;
    private readonly RETRY_DELAYS;
    private readonly TIMEOUT_MS;
    constructor(dynamoDBService?: DynamoDBService);
    /**
     * Send webhook notification for verification status change
     */
    sendWebhook(verificationCase: VerificationEntity, eventType: WebhookEventType): Promise<void>;
    /**
     * Format webhook payload based on event type
     */
    private formatPayload;
    /**
     * Deliver webhook with retry logic
     */
    private deliverWithRetry;
    /**
     * Generate HMAC-SHA256 signature for webhook
     */
    generateSignature(payload: WebhookPayload, timestamp: number, secret: string): string;
    /**
     * Log webhook delivery attempt to DynamoDB
     */
    private logDeliveryAttempt;
    /**
     * Mask Omang number for webhook payload
     */
    private maskOmangNumber;
    /**
     * Sleep utility for retry delays
     */
    private sleep;
}
//# sourceMappingURL=webhook.d.ts.map