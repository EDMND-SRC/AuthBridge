import { DynamoDBService } from './dynamodb.js';
import type { WebhookEventType, WebhookPayload } from '../types/webhook.js';
import type { VerificationEntity } from '../types/verification.js';
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
export declare class WebhookService {
    private dynamoDBService;
    private readonly MAX_ATTEMPTS;
    private readonly RETRY_DELAYS;
    private readonly TIMEOUT_MS;
    private readonly TTL_DAYS;
    constructor(dynamoDBService?: DynamoDBService);
    /**
     * Send webhook notification for verification status change.
     * Handles client configuration lookup, payload formatting, and delivery with retries.
     */
    sendWebhook(verificationCase: VerificationEntity, eventType: WebhookEventType): Promise<void>;
    /**
     * Format webhook payload based on event type.
     * Masks PII (Omang numbers) for compliance.
     */
    private formatPayload;
    /**
     * Deliver webhook with retry logic.
     * Uses exponential backoff: 1s, 5s, 30s.
     * Does not retry on 4xx client errors.
     */
    private deliverWithRetry;
    /**
     * Generate HMAC-SHA256 signature for webhook payload.
     * Format: timestamp.payload
     */
    generateSignature(payload: WebhookPayload, timestamp: number, secret: string): string;
    /**
     * Log webhook delivery attempt to DynamoDB with 30-day TTL.
     */
    private logDeliveryAttempt;
    /**
     * Log audit event for webhook delivery (compliance requirement).
     */
    private logAuditEvent;
    /**
     * Emit CloudWatch metrics for webhook delivery monitoring.
     */
    private emitMetrics;
    /**
     * Mask Omang number for webhook payload (DPA 2024 compliance).
     * Shows only last 4 digits.
     */
    private maskOmangNumber;
    /**
     * Sleep utility for retry delays.
     */
    private sleep;
}
//# sourceMappingURL=webhook.d.ts.map