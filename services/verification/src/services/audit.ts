/**
 * Audit Logging Service for Verification Service
 * DPA 2024 Compliance: 5-year retention, immutable audit trail
 * Dual-write strategy: DynamoDB (queryable) + CloudWatch Logs (backup)
 */

import { randomUUID } from 'crypto';
import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogStreamCommand } from '@aws-sdk/client-cloudwatch-logs';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import type { AuditLogEntry, AuditAction, CreateAuditEntryInput } from '../types/audit';

export class AuditService {
  private cloudwatchLogs: CloudWatchLogsClient;
  private cloudwatch: CloudWatchClient;
  private dynamodb: DynamoDBClient;
  private logGroupName: string;
  private logStreamName: string;
  private tableName: string;

  constructor() {
    const region = process.env.AWS_REGION;
    this.cloudwatchLogs = new CloudWatchLogsClient({ region });
    this.cloudwatch = new CloudWatchClient({ region });
    this.dynamodb = new DynamoDBClient({ region });
    this.logGroupName = `/aws/lambda/authbridge-verification-${process.env.STAGE || 'staging'}/audit`;
    this.logStreamName = `audit-${new Date().toISOString().split('T')[0]}`;
    this.tableName = process.env.TABLE_NAME || 'AuthBridgeTable';
  }

  async logEvent(input: CreateAuditEntryInput): Promise<AuditLogEntry> {
    const now = new Date();
    const eventId = randomUUID();

    const entry: AuditLogEntry = {
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
      this.emitMetrics(true), // Emit success metric
    ]);

    return entry;
  }

  /**
   * Emit CloudWatch metrics for audit monitoring
   * @param success - Whether the audit log write was successful
   */
  private async emitMetrics(success: boolean): Promise<void> {
    try {
      await this.cloudwatch.send(
        new PutMetricDataCommand({
          Namespace: 'AuthBridge/Audit',
          MetricData: [
            {
              MetricName: 'AuditLogEntries',
              Value: 1,
              Unit: 'Count',
              Dimensions: [
                { Name: 'Stage', Value: process.env.STAGE || 'staging' },
              ],
            },
            ...(success ? [] : [{
              MetricName: 'AuditWriteFailures',
              Value: 1,
              Unit: 'Count',
              Dimensions: [
                { Name: 'Stage', Value: process.env.STAGE || 'staging' },
              ],
            }]),
          ],
        })
      );
    } catch (error) {
      // Don't fail if metrics emission fails
      console.error('Failed to emit audit metrics:', error);
    }
  }

  private async writeToDynamoDB(entry: AuditLogEntry): Promise<void> {
    try {
      await this.dynamodb.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: marshall(entry, { removeUndefinedValues: true }),
          // Immutability: Prevent overwrites
          ConditionExpression: 'attribute_not_exists(PK)',
        })
      );
    } catch (error) {
      console.error('Failed to write audit log to DynamoDB:', error);
      // Emit failure metric
      await this.emitMetrics(false);
      // Don't fail the operation if audit logging fails
    }
  }

  private async logToCloudWatch(entry: AuditLogEntry): Promise<void> {
    try {
      // Ensure log stream exists (idempotent)
      try {
        await this.cloudwatchLogs.send(
          new CreateLogStreamCommand({
            logGroupName: this.logGroupName,
            logStreamName: this.logStreamName,
          })
        );
      } catch (error: any) {
        // Ignore if stream already exists
        if (error.name !== 'ResourceAlreadyExistsException') {
          throw error;
        }
      }

      // Write audit log entry
      await this.cloudwatchLogs.send(
        new PutLogEventsCommand({
          logGroupName: this.logGroupName,
          logStreamName: this.logStreamName,
          logEvents: [
            {
              timestamp: Date.now(),
              message: JSON.stringify(entry),
            },
          ],
        })
      );
    } catch (error) {
      // Don't fail encryption operations if audit logging fails
      console.error('Failed to write audit log:', error);
    }
  }

  // Encryption events
  async logEncryption(
    resourceId: string,
    fieldName: string,
    success: boolean,
    errorCode?: string
  ): Promise<void> {
    await this.logEvent({
      action: 'DATA_ENCRYPTED',
      resourceId,
      resourceType: 'field',
      fieldName,
      status: success ? 'success' : 'failure',
      errorCode,
    });
  }

  async logDecryption(
    resourceId: string,
    fieldName: string,
    success: boolean,
    cacheHit: boolean = false,
    errorCode?: string
  ): Promise<void> {
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

  async logEncryptionError(
    resourceId: string,
    fieldName: string,
    errorCode: string,
    errorMessage: string
  ): Promise<void> {
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

  async logDecryptionError(
    resourceId: string,
    fieldName: string,
    errorCode: string,
    errorMessage: string
  ): Promise<void> {
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

  async logCacheCleared(resourceId?: string): Promise<void> {
    await this.logEvent({
      action: 'CACHE_CLEARED',
      resourceId,
      resourceType: resourceId ? 'field' : 'all',
      status: 'success',
    });
  }

  async logKmsKeyAccess(keyId: string, operation: 'encrypt' | 'decrypt', success: boolean): Promise<void> {
    await this.logEvent({
      action: 'KMS_KEY_ACCESSED',
      resourceId: keyId,
      resourceType: 'kms_key',
      status: success ? 'success' : 'failure',
      metadata: { operation },
    });
  }

  // Case Management
  /**
   * Log case creation event
   * @param caseId - Case identifier
   * @param userId - User who created the case
   * @param ipAddress - IP address of the request
   * @param metadata - Additional metadata (e.g., documentType)
   */
  async logCaseCreated(caseId: string, userId: string, ipAddress: string, metadata?: any): Promise<void> {
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

  /**
   * Log case approval event
   * @param caseId - Case identifier
   * @param userId - User who approved the case
   * @param ipAddress - IP address of the request
   * @param reason - Reason for approval (optional)
   */
  async logCaseApproved(caseId: string, userId: string, ipAddress: string, reason?: string): Promise<void> {
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

  /**
   * Log case rejection event
   * @param caseId - Case identifier
   * @param userId - User who rejected the case
   * @param ipAddress - IP address of the request
   * @param reason - Reason for rejection (required for compliance)
   */
  async logCaseRejected(caseId: string, userId: string, ipAddress: string, reason: string): Promise<void> {
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

  /**
   * Log case assignment event
   * @param caseId - Case identifier
   * @param userId - User who assigned the case
   * @param ipAddress - IP address of the request
   * @param assignedTo - User the case was assigned to
   */
  async logCaseAssigned(caseId: string, userId: string, ipAddress: string, assignedTo: string): Promise<void> {
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

  /**
   * Log case note added event
   * @param caseId - Case identifier
   * @param userId - User who added the note
   * @param ipAddress - IP address of the request
   * @param noteId - Note identifier
   */
  async logCaseNoteAdded(caseId: string, userId: string, ipAddress: string, noteId: string): Promise<void> {
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

  /**
   * Log case viewed event
   * @param caseId - Case identifier
   * @param userId - User who viewed the case
   * @param ipAddress - IP address of the request
   */
  async logCaseViewed(caseId: string, userId: string, ipAddress: string): Promise<void> {
    await this.logEvent({
      action: 'CASE_VIEWED',
      userId,
      resourceId: caseId,
      resourceType: 'case',
      ipAddress,
      status: 'success',
    });
  }

  /**
   * Log case status change event
   * @param caseId - Case identifier
   * @param userId - User who changed the status
   * @param ipAddress - IP address of the request
   * @param oldStatus - Previous status
   * @param newStatus - New status
   */
  async logCaseStatusChanged(caseId: string, userId: string, ipAddress: string, oldStatus: string, newStatus: string): Promise<void> {
    await this.logEvent({
      action: 'CASE_STATUS_CHANGED',
      userId,
      resourceId: caseId,
      resourceType: 'case',
      ipAddress,
      status: 'success',
      metadata: { oldStatus, newStatus },
    });
  }

  /**
   * Log case export event (GDPR data export)
   * @param caseId - Case identifier
   * @param userId - User who exported the case
   * @param ipAddress - IP address of the request
   * @param format - Export format (json, pdf, etc.)
   */
  async logCaseExported(caseId: string, userId: string, ipAddress: string, format: string): Promise<void> {
    await this.logEvent({
      action: 'CASE_EXPORTED',
      userId,
      resourceId: caseId,
      resourceType: 'case',
      ipAddress,
      status: 'success',
      metadata: { format },
    });
  }

  /**
   * Log case deletion event (GDPR right to be forgotten)
   * @param caseId - Case identifier
   * @param userId - User who deleted the case
   * @param ipAddress - IP address of the request
   * @param reason - Reason for deletion
   */
  async logCaseDeleted(caseId: string, userId: string, ipAddress: string, reason: string): Promise<void> {
    await this.logEvent({
      action: 'CASE_DELETED',
      userId,
      resourceId: caseId,
      resourceType: 'case',
      ipAddress,
      status: 'success',
      metadata: { reason },
    });
  }

  /**
   * Log case resubmission request
   * @param caseId - Case identifier
   * @param userId - User who requested resubmission
   * @param ipAddress - IP address of the request
   * @param reason - Reason for resubmission request
   */
  async logCaseResubmissionRequested(caseId: string, userId: string, ipAddress: string, reason: string): Promise<void> {
    await this.logEvent({
      action: 'CASE_RESUBMISSION_REQUESTED',
      userId,
      resourceId: caseId,
      resourceType: 'case',
      ipAddress,
      status: 'success',
      metadata: { reason },
    });
  }

  // User Management
  async logUserLogin(userId: string, ipAddress: string, userAgent: string): Promise<void> {
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

  async logUserLogout(userId: string, ipAddress: string): Promise<void> {
    await this.logEvent({
      action: 'USER_LOGOUT',
      userId,
      resourceId: userId,
      resourceType: 'user',
      ipAddress,
      status: 'success',
    });
  }

  async logUserRoleChanged(targetUserId: string, adminUserId: string, ipAddress: string, oldRole: string, newRole: string): Promise<void> {
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

  /**
   * Log user creation event
   * @param userId - New user identifier
   * @param adminUserId - Admin who created the user
   * @param ipAddress - IP address of the request
   * @param role - Initial role assigned
   */
  async logUserCreated(userId: string, adminUserId: string, ipAddress: string, role: string): Promise<void> {
    await this.logEvent({
      action: 'USER_CREATED',
      userId: adminUserId,
      resourceId: userId,
      resourceType: 'user',
      ipAddress,
      status: 'success',
      metadata: { role },
    });
  }

  /**
   * Log user update event
   * @param userId - User identifier
   * @param adminUserId - Admin who updated the user
   * @param ipAddress - IP address of the request
   * @param changes - Fields that were changed
   */
  async logUserUpdated(userId: string, adminUserId: string, ipAddress: string, changes: string[]): Promise<void> {
    await this.logEvent({
      action: 'USER_UPDATED',
      userId: adminUserId,
      resourceId: userId,
      resourceType: 'user',
      ipAddress,
      status: 'success',
      metadata: { changes },
    });
  }

  /**
   * Log user deletion event
   * @param userId - User identifier
   * @param adminUserId - Admin who deleted the user
   * @param ipAddress - IP address of the request
   * @param reason - Reason for deletion
   */
  async logUserDeleted(userId: string, adminUserId: string, ipAddress: string, reason: string): Promise<void> {
    await this.logEvent({
      action: 'USER_DELETED',
      userId: adminUserId,
      resourceId: userId,
      resourceType: 'user',
      ipAddress,
      status: 'success',
      metadata: { reason },
    });
  }

  /**
   * Log password reset request
   * @param userId - User identifier
   * @param ipAddress - IP address of the request
   */
  async logUserPasswordReset(userId: string, ipAddress: string): Promise<void> {
    await this.logEvent({
      action: 'USER_PASSWORD_RESET',
      userId,
      resourceId: userId,
      resourceType: 'user',
      ipAddress,
      status: 'success',
    });
  }

  // Document Management
  async logDocumentUploaded(docId: string, caseId: string, userId: string, ipAddress: string): Promise<void> {
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

  async logDocumentViewed(docId: string, userId: string, ipAddress: string): Promise<void> {
    await this.logEvent({
      action: 'DOCUMENT_VIEWED',
      userId,
      resourceId: docId,
      resourceType: 'document',
      ipAddress,
      status: 'success',
    });
  }

  /**
   * Log document download event
   * @param docId - Document identifier
   * @param userId - User who downloaded the document
   * @param ipAddress - IP address of the request
   */
  async logDocumentDownloaded(docId: string, userId: string, ipAddress: string): Promise<void> {
    await this.logEvent({
      action: 'DOCUMENT_DOWNLOADED',
      userId,
      resourceId: docId,
      resourceType: 'document',
      ipAddress,
      status: 'success',
    });
  }

  /**
   * Log document deletion event
   * @param docId - Document identifier
   * @param userId - User who deleted the document
   * @param ipAddress - IP address of the request
   * @param reason - Reason for deletion
   */
  async logDocumentDeleted(docId: string, userId: string, ipAddress: string, reason: string): Promise<void> {
    await this.logEvent({
      action: 'DOCUMENT_DELETED',
      userId,
      resourceId: docId,
      resourceType: 'document',
      ipAddress,
      status: 'success',
      metadata: { reason },
    });
  }

  /**
   * Log OCR processing start
   * @param docId - Document identifier
   * @param caseId - Associated case identifier
   */
  async logOcrStarted(docId: string, caseId: string): Promise<void> {
    await this.logEvent({
      action: 'OCR_STARTED',
      resourceId: docId,
      resourceType: 'document',
      status: 'success',
      metadata: { caseId },
    });
  }

  async logOcrCompleted(docId: string, caseId: string, metadata?: any): Promise<void> {
    await this.logEvent({
      action: 'OCR_COMPLETED',
      resourceId: docId,
      resourceType: 'document',
      status: 'success',
      metadata: { caseId, ...metadata },
    });
  }

  async logOcrFailed(docId: string, caseId: string, errorCode: string, errorMessage: string): Promise<void> {
    await this.logEvent({
      action: 'OCR_FAILED',
      resourceId: docId,
      resourceType: 'document',
      status: 'failure',
      errorCode,
      metadata: { caseId, errorMessage },
    });
  }

  async logBiometricMatchRun(caseId: string, selfieDocId: string, idDocId: string, matched: boolean, similarity: number): Promise<void> {
    await this.logEvent({
      action: 'BIOMETRIC_MATCH_RUN',
      resourceId: caseId,
      resourceType: 'case',
      status: 'success',
      metadata: { selfieDocId, idDocId, matched, similarity },
    });
  }

  // Webhook Management
  async logWebhookConfigured(webhookId: string, userId: string, ipAddress: string, url: string): Promise<void> {
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

  async logWebhookSent(webhookId: string, caseId: string, status: 'success' | 'failure', statusCode?: number): Promise<void> {
    await this.logEvent({
      action: 'WEBHOOK_SENT',
      resourceId: webhookId,
      resourceType: 'webhook',
      status,
      metadata: { caseId, statusCode },
    });
  }

  /**
   * Log webhook retry attempt
   * @param webhookId - Webhook identifier
   * @param caseId - Associated case identifier
   * @param attemptNumber - Retry attempt number
   */
  /**
   * Log webhook retry attempt
   * @param webhookId - Webhook identifier
   * @param caseId - Associated case identifier
   * @param attemptNumber - Retry attempt number
   */
  async logWebhookRetry(webhookId: string, caseId: string, attemptNumber: number): Promise<void> {
    await this.logEvent({
      action: 'WEBHOOK_RETRY',
      resourceId: webhookId,
      resourceType: 'webhook',
      status: 'success',
      metadata: { caseId, attemptNumber },
    });
  }

  /**
   * Log webhook failure (all retries exhausted)
   * @param webhookId - Webhook identifier
   * @param caseId - Associated case identifier
   * @param errorCode - Error code
   * @param errorMessage - Error message
   */
  /**
   * Log webhook failure (all retries exhausted)
   * @param webhookId - Webhook identifier
   * @param caseId - Associated case identifier
   * @param errorCode - Error code
   * @param errorMessage - Error message
   */
  async logWebhookFailed(webhookId: string, caseId: string, errorCode: string, errorMessage: string): Promise<void> {
    await this.logEvent({
      action: 'WEBHOOK_FAILED',
      resourceId: webhookId,
      resourceType: 'webhook',
      status: 'failure',
      errorCode,
      metadata: { caseId, errorMessage },
    });
  }

  /**
   * Log webhook deletion
   * @param webhookId - Webhook identifier
   * @param userId - User who deleted the webhook
   * @param ipAddress - IP address of the request
   */
  /**
   * Log webhook deletion
   * @param webhookId - Webhook identifier
   * @param userId - User who deleted the webhook
   * @param ipAddress - IP address of the request
   */
  async logWebhookDeleted(webhookId: string, userId: string, ipAddress: string): Promise<void> {
    await this.logEvent({
      action: 'WEBHOOK_DELETED',
      userId,
      resourceId: webhookId,
      resourceType: 'webhook',
      ipAddress,
      status: 'success',
    });
  }

  // API Key Management
  async logApiKeyUsed(keyId: string, clientId: string, ipAddress: string, endpoint: string): Promise<void> {
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

  /**
   * Log API key creation
   * @param keyId - API key identifier
   * @param userId - User who created the key
   * @param ipAddress - IP address of the request
   * @param clientId - Client identifier
   */
  async logApiKeyCreated(keyId: string, userId: string, ipAddress: string, clientId: string): Promise<void> {
    await this.logEvent({
      action: 'API_KEY_CREATED',
      userId,
      resourceId: keyId,
      resourceType: 'api_key',
      ipAddress,
      clientId,
      status: 'success',
    });
  }

  /**
   * Log API key rotation
   * @param keyId - API key identifier
   * @param userId - User who rotated the key
   * @param ipAddress - IP address of the request
   * @param clientId - Client identifier
   */
  async logApiKeyRotated(keyId: string, userId: string, ipAddress: string, clientId: string): Promise<void> {
    await this.logEvent({
      action: 'API_KEY_ROTATED',
      userId,
      resourceId: keyId,
      resourceType: 'api_key',
      ipAddress,
      clientId,
      status: 'success',
    });
  }

  /**
   * Log API key revocation
   * @param keyId - API key identifier
   * @param userId - User who revoked the key
   * @param ipAddress - IP address of the request
   * @param clientId - Client identifier
   * @param reason - Reason for revocation
   */
  async logApiKeyRevoked(keyId: string, userId: string, ipAddress: string, clientId: string, reason: string): Promise<void> {
    await this.logEvent({
      action: 'API_KEY_REVOKED',
      userId,
      resourceId: keyId,
      resourceType: 'api_key',
      ipAddress,
      clientId,
      status: 'success',
      metadata: { reason },
    });
  }

  /**
   * Log API key rate limit hit
   * @param keyId - API key identifier
   * @param clientId - Client identifier
   * @param ipAddress - IP address of the request
   * @param endpoint - Endpoint that was rate limited
   */
  async logApiKeyRateLimited(keyId: string, clientId: string, ipAddress: string, endpoint: string): Promise<void> {
    await this.logEvent({
      action: 'API_KEY_RATE_LIMITED',
      resourceId: keyId,
      resourceType: 'api_key',
      ipAddress,
      clientId,
      status: 'failure',
      metadata: { endpoint },
    });
  }

  // System Events
  async logUnauthorizedAccess(userId: string | null, ipAddress: string, endpoint: string, reason: string): Promise<void> {
    await this.logEvent({
      action: 'UNAUTHORIZED_ACCESS',
      userId,
      ipAddress,
      status: 'failure',
      metadata: { endpoint, reason },
    });
  }

  async logPermissionDenied(userId: string, ipAddress: string, resource: string, action: string): Promise<void> {
    await this.logEvent({
      action: 'PERMISSION_DENIED',
      userId,
      ipAddress,
      status: 'failure',
      metadata: { resource, action },
    });
  }

  /**
   * Log system error
   * @param errorCode - Error code
   * @param errorMessage - Error message
   * @param metadata - Additional error context
   */
  async logSystemError(errorCode: string, errorMessage: string, metadata?: any): Promise<void> {
    await this.logEvent({
      action: 'SYSTEM_ERROR',
      status: 'failure',
      errorCode,
      metadata: { errorMessage, ...metadata },
    });
  }

  /**
   * Log rate limit exceeded
   * @param userId - User who hit rate limit (if authenticated)
   * @param ipAddress - IP address of the request
   * @param endpoint - Endpoint that was rate limited
   */
  async logRateLimitExceeded(userId: string | null, ipAddress: string, endpoint: string): Promise<void> {
    await this.logEvent({
      action: 'RATE_LIMIT_EXCEEDED',
      userId,
      ipAddress,
      status: 'failure',
      metadata: { endpoint },
    });
  }

  /**
   * Log invalid request (validation error)
   * @param userId - User who made the request (if authenticated)
   * @param ipAddress - IP address of the request
   * @param endpoint - Endpoint that received invalid request
   * @param validationErrors - Validation error details
   */
  async logInvalidRequest(userId: string | null, ipAddress: string, endpoint: string, validationErrors: any): Promise<void> {
    await this.logEvent({
      action: 'INVALID_REQUEST',
      userId,
      ipAddress,
      status: 'failure',
      metadata: { endpoint, validationErrors },
    });
  }
}

// Re-export types for convenience
export type { AuditLogEntry, AuditAction, CreateAuditEntryInput } from '../types/audit';
