/**
 * Audit Logging Service for Verification Service
 * DPA 2024 Compliance: 5-year retention, immutable audit trail for encryption operations
 */
import { randomUUID } from 'crypto';
import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogStreamCommand } from '@aws-sdk/client-cloudwatch-logs';
export class AuditService {
    cloudwatchLogs;
    logGroupName;
    logStreamName;
    constructor() {
        this.cloudwatchLogs = new CloudWatchLogsClient({ region: process.env.AWS_REGION || 'af-south-1' });
        this.logGroupName = `/aws/lambda/authbridge-verification-${process.env.STAGE || 'staging'}`;
        this.logStreamName = `audit-${new Date().toISOString().split('T')[0]}`;
    }
    async logEvent(input) {
        const now = new Date();
        const eventId = randomUUID();
        const entry = {
            eventId,
            timestamp: now.toISOString(),
            date: now.toISOString().split('T')[0],
            action: input.action,
            resourceId: input.resourceId || null,
            resourceType: input.resourceType || null,
            fieldName: input.fieldName || null,
            status: input.status,
            errorCode: input.errorCode || null,
            metadata: input.metadata || {},
        };
        // Log to CloudWatch Logs for audit trail
        await this.logToCloudWatch(entry);
        return entry;
    }
    async logToCloudWatch(entry) {
        try {
            // Ensure log stream exists (idempotent)
            try {
                await this.cloudwatchLogs.send(new CreateLogStreamCommand({
                    logGroupName: this.logGroupName,
                    logStreamName: this.logStreamName,
                }));
            }
            catch (error) {
                // Ignore if stream already exists
                if (error.name !== 'ResourceAlreadyExistsException') {
                    throw error;
                }
            }
            // Write audit log entry
            await this.cloudwatchLogs.send(new PutLogEventsCommand({
                logGroupName: this.logGroupName,
                logStreamName: this.logStreamName,
                logEvents: [
                    {
                        timestamp: Date.now(),
                        message: JSON.stringify(entry),
                    },
                ],
            }));
        }
        catch (error) {
            // Don't fail encryption operations if audit logging fails
            console.error('Failed to write audit log:', error);
        }
    }
    // Encryption events
    async logEncryption(resourceId, fieldName, success, errorCode) {
        await this.logEvent({
            action: 'DATA_ENCRYPTED',
            resourceId,
            resourceType: 'field',
            fieldName,
            status: success ? 'success' : 'failure',
            errorCode,
        });
    }
    async logDecryption(resourceId, fieldName, success, cacheHit = false, errorCode) {
        await this.logEvent({
            action: 'DATA_DECRYPTED',
            resourceId,
            resourceType: 'field',
            fieldName,
            status: success ? 'success' : 'failure',
            errorCode,
            metadata: { cacheHit },
        });
    }
    async logEncryptionError(resourceId, fieldName, errorCode, errorMessage) {
        await this.logEvent({
            action: 'ENCRYPTION_ERROR',
            resourceId,
            resourceType: 'field',
            fieldName,
            status: 'failure',
            errorCode,
            metadata: { errorMessage },
        });
    }
    async logDecryptionError(resourceId, fieldName, errorCode, errorMessage) {
        await this.logEvent({
            action: 'DECRYPTION_ERROR',
            resourceId,
            resourceType: 'field',
            fieldName,
            status: 'failure',
            errorCode,
            metadata: { errorMessage },
        });
    }
    async logCacheCleared(resourceId) {
        await this.logEvent({
            action: 'CACHE_CLEARED',
            resourceId,
            resourceType: resourceId ? 'field' : 'all',
            status: 'success',
        });
    }
    async logKmsKeyAccess(keyId, operation, success) {
        await this.logEvent({
            action: 'KMS_KEY_ACCESSED',
            resourceId: keyId,
            resourceType: 'kms_key',
            status: success ? 'success' : 'failure',
            metadata: { operation },
        });
    }
}
//# sourceMappingURL=audit.js.map