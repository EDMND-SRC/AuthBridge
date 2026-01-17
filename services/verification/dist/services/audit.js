/**
 * Audit Logging Service for Verification Service
 * DPA 2024 Compliance: 5-year retention, immutable audit trail
 * Dual-write strategy: DynamoDB (queryable) + CloudWatch Logs (backup)
 */
import { randomUUID } from 'crypto';
import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogStreamCommand } from '@aws-sdk/client-cloudwatch-logs';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
export class AuditService {
    cloudwatchLogs;
    dynamodb;
    logGroupName;
    logStreamName;
    tableName;
    constructor() {
        this.cloudwatchLogs = new CloudWatchLogsClient({ region: process.env.AWS_REGION || 'af-south-1' });
        this.dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION || 'af-south-1' });
        this.logGroupName = `/aws/lambda/authbridge-verification-${process.env.STAGE || 'staging'}/audit`;
        this.logStreamName = `audit-${new Date().toISOString().split('T')[0]}`;
        this.tableName = process.env.TABLE_NAME || 'AuthBridgeTable';
    }
    async logEvent(input) {
        const now = new Date();
        const eventId = randomUUID();
        const entry = {
            PK: `AUDIT#${now.toISOString().split('T')[0]}`,
            SK: `${now.toISOString()}#${eventId}`,
            eventId,
            timestamp: now.toISOString(),
            date: now.toISOString().split('T')[0],
            action: input.action,
            userId: input.userId || null,
            resourceId: input.resourceId || null,
            resourceType: input.resourceType || null,
            fieldName: input.fieldName || null,
            ipAddress: input.ipAddress || null,
            userAgent: input.userAgent || null,
            clientId: input.clientId || null,
            status: input.status,
            errorCode: input.errorCode || null,
            metadata: input.metadata || {},
            ttl: Math.floor(Date.now() / 1000) + (5 * 365 * 24 * 60 * 60), // 5 years
            // GSI keys (using GSI5, GSI6, GSI7 - GSI1-4 already in use)
            GSI5PK: input.userId ? `USER#${input.userId}` : null,
            GSI5SK: `${now.toISOString()}#${eventId}`,
            GSI6PK: input.resourceId && input.resourceType ? `${input.resourceType}#${input.resourceId}` : null,
            GSI6SK: `${now.toISOString()}#${eventId}`,
            GSI7PK: `ACTION#${input.action}`,
            GSI7SK: `${now.toISOString()}#${eventId}`,
        };
        // Dual write: DynamoDB + CloudWatch Logs
        await Promise.all([
            this.writeToDynamoDB(entry),
            this.logToCloudWatch(entry),
        ]);
        return entry;
    }
    async writeToDynamoDB(entry) {
        try {
            await this.dynamodb.send(new PutItemCommand({
                TableName: this.tableName,
                Item: marshall(entry, { removeUndefinedValues: true }),
                // Immutability: Prevent overwrites
                ConditionExpression: 'attribute_not_exists(PK)',
            }));
        }
        catch (error) {
            console.error('Failed to write audit log to DynamoDB:', error);
            // Don't fail the operation if audit logging fails
        }
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
    // Case Management
    async logCaseCreated(caseId, userId, ipAddress, metadata) {
        await this.logEvent({
            action: 'CASE_CREATED',
            userId,
            resourceId: caseId,
            resourceType: 'case',
            ipAddress,
            status: 'success',
            metadata,
        });
    }
    async logCaseApproved(caseId, userId, ipAddress, reason) {
        await this.logEvent({
            action: 'CASE_APPROVED',
            userId,
            resourceId: caseId,
            resourceType: 'case',
            ipAddress,
            status: 'success',
            metadata: { reason },
        });
    }
    async logCaseRejected(caseId, userId, ipAddress, reason) {
        await this.logEvent({
            action: 'CASE_REJECTED',
            userId,
            resourceId: caseId,
            resourceType: 'case',
            ipAddress,
            status: 'success',
            metadata: { reason },
        });
    }
    async logCaseAssigned(caseId, userId, ipAddress, assignedTo) {
        await this.logEvent({
            action: 'CASE_ASSIGNED',
            userId,
            resourceId: caseId,
            resourceType: 'case',
            ipAddress,
            status: 'success',
            metadata: { assignedTo },
        });
    }
    async logCaseNoteAdded(caseId, userId, ipAddress, noteId) {
        await this.logEvent({
            action: 'CASE_NOTE_ADDED',
            userId,
            resourceId: caseId,
            resourceType: 'case',
            ipAddress,
            status: 'success',
            metadata: { noteId },
        });
    }
    // User Management
    async logUserLogin(userId, ipAddress, userAgent) {
        await this.logEvent({
            action: 'USER_LOGIN',
            userId,
            resourceId: userId,
            resourceType: 'user',
            ipAddress,
            userAgent,
            status: 'success',
        });
    }
    async logUserLogout(userId, ipAddress) {
        await this.logEvent({
            action: 'USER_LOGOUT',
            userId,
            resourceId: userId,
            resourceType: 'user',
            ipAddress,
            status: 'success',
        });
    }
    async logUserRoleChanged(targetUserId, adminUserId, ipAddress, oldRole, newRole) {
        await this.logEvent({
            action: 'USER_ROLE_CHANGED',
            userId: adminUserId,
            resourceId: targetUserId,
            resourceType: 'user',
            ipAddress,
            status: 'success',
            metadata: { oldRole, newRole },
        });
    }
    // Document Management
    async logDocumentUploaded(docId, caseId, userId, ipAddress) {
        await this.logEvent({
            action: 'DOCUMENT_UPLOADED',
            userId,
            resourceId: docId,
            resourceType: 'document',
            ipAddress,
            status: 'success',
            metadata: { caseId },
        });
    }
    async logDocumentViewed(docId, userId, ipAddress) {
        await this.logEvent({
            action: 'DOCUMENT_VIEWED',
            userId,
            resourceId: docId,
            resourceType: 'document',
            ipAddress,
            status: 'success',
        });
    }
    async logOcrCompleted(docId, caseId, metadata) {
        await this.logEvent({
            action: 'OCR_COMPLETED',
            resourceId: docId,
            resourceType: 'document',
            status: 'success',
            metadata: { caseId, ...metadata },
        });
    }
    async logOcrFailed(docId, caseId, errorCode, errorMessage) {
        await this.logEvent({
            action: 'OCR_FAILED',
            resourceId: docId,
            resourceType: 'document',
            status: 'failure',
            errorCode,
            metadata: { caseId, errorMessage },
        });
    }
    async logBiometricMatchRun(caseId, selfieDocId, idDocId, matched, similarity) {
        await this.logEvent({
            action: 'BIOMETRIC_MATCH_RUN',
            resourceId: caseId,
            resourceType: 'case',
            status: 'success',
            metadata: { selfieDocId, idDocId, matched, similarity },
        });
    }
    // Webhook Management
    async logWebhookConfigured(webhookId, userId, ipAddress, url) {
        await this.logEvent({
            action: 'WEBHOOK_CONFIGURED',
            userId,
            resourceId: webhookId,
            resourceType: 'webhook',
            ipAddress,
            status: 'success',
            metadata: { url },
        });
    }
    async logWebhookSent(webhookId, caseId, status, statusCode) {
        await this.logEvent({
            action: 'WEBHOOK_SENT',
            resourceId: webhookId,
            resourceType: 'webhook',
            status,
            metadata: { caseId, statusCode },
        });
    }
    // API Key Management
    async logApiKeyUsed(keyId, clientId, ipAddress, endpoint) {
        await this.logEvent({
            action: 'API_KEY_USED',
            resourceId: keyId,
            resourceType: 'api_key',
            ipAddress,
            clientId,
            status: 'success',
            metadata: { endpoint },
        });
    }
    // System Events
    async logUnauthorizedAccess(userId, ipAddress, endpoint, reason) {
        await this.logEvent({
            action: 'UNAUTHORIZED_ACCESS',
            userId,
            ipAddress,
            status: 'failure',
            metadata: { endpoint, reason },
        });
    }
    async logPermissionDenied(userId, ipAddress, resource, action) {
        await this.logEvent({
            action: 'PERMISSION_DENIED',
            userId,
            ipAddress,
            status: 'failure',
            metadata: { resource, action },
        });
    }
}
//# sourceMappingURL=audit.js.map