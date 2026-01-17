/**
 * Audit Logging Service for Verification Service
 * DPA 2024 Compliance: 5-year retention, immutable audit trail
 * Dual-write strategy: DynamoDB (queryable) + CloudWatch Logs (backup)
 */
import type { AuditLogEntry, CreateAuditEntryInput } from '../types/audit';
export declare class AuditService {
    private cloudwatchLogs;
    private dynamodb;
    private logGroupName;
    private logStreamName;
    private tableName;
    constructor();
    logEvent(input: CreateAuditEntryInput): Promise<AuditLogEntry>;
    private writeToDynamoDB;
    private logToCloudWatch;
    logEncryption(resourceId: string, fieldName: string, success: boolean, errorCode?: string): Promise<void>;
    logDecryption(resourceId: string, fieldName: string, success: boolean, cacheHit?: boolean, errorCode?: string): Promise<void>;
    logEncryptionError(resourceId: string, fieldName: string, errorCode: string, errorMessage: string): Promise<void>;
    logDecryptionError(resourceId: string, fieldName: string, errorCode: string, errorMessage: string): Promise<void>;
    logCacheCleared(resourceId?: string): Promise<void>;
    logKmsKeyAccess(keyId: string, operation: 'encrypt' | 'decrypt', success: boolean): Promise<void>;
    logCaseCreated(caseId: string, userId: string, ipAddress: string, metadata?: any): Promise<void>;
    logCaseApproved(caseId: string, userId: string, ipAddress: string, reason?: string): Promise<void>;
    logCaseRejected(caseId: string, userId: string, ipAddress: string, reason: string): Promise<void>;
    logCaseAssigned(caseId: string, userId: string, ipAddress: string, assignedTo: string): Promise<void>;
    logCaseNoteAdded(caseId: string, userId: string, ipAddress: string, noteId: string): Promise<void>;
    logUserLogin(userId: string, ipAddress: string, userAgent: string): Promise<void>;
    logUserLogout(userId: string, ipAddress: string): Promise<void>;
    logUserRoleChanged(targetUserId: string, adminUserId: string, ipAddress: string, oldRole: string, newRole: string): Promise<void>;
    logDocumentUploaded(docId: string, caseId: string, userId: string, ipAddress: string): Promise<void>;
    logDocumentViewed(docId: string, userId: string, ipAddress: string): Promise<void>;
    logOcrCompleted(docId: string, caseId: string, metadata?: any): Promise<void>;
    logOcrFailed(docId: string, caseId: string, errorCode: string, errorMessage: string): Promise<void>;
    logBiometricMatchRun(caseId: string, selfieDocId: string, idDocId: string, matched: boolean, similarity: number): Promise<void>;
    logWebhookConfigured(webhookId: string, userId: string, ipAddress: string, url: string): Promise<void>;
    logWebhookSent(webhookId: string, caseId: string, status: 'success' | 'failure', statusCode?: number): Promise<void>;
    logApiKeyUsed(keyId: string, clientId: string, ipAddress: string, endpoint: string): Promise<void>;
    logUnauthorizedAccess(userId: string | null, ipAddress: string, endpoint: string, reason: string): Promise<void>;
    logPermissionDenied(userId: string, ipAddress: string, resource: string, action: string): Promise<void>;
}
export type { AuditLogEntry, AuditAction, CreateAuditEntryInput } from '../types/audit';
//# sourceMappingURL=audit.d.ts.map