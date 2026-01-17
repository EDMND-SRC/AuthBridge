/**
 * Audit Logging Service for Verification Service
 * DPA 2024 Compliance: 5-year retention, immutable audit trail for encryption operations
 */
import type { AuditLogEntry, CreateAuditEntryInput } from '../types/audit';
export declare class AuditService {
    private cloudwatchLogs;
    private logGroupName;
    private logStreamName;
    constructor();
    logEvent(input: CreateAuditEntryInput): Promise<AuditLogEntry>;
    private logToCloudWatch;
    logEncryption(resourceId: string, fieldName: string, success: boolean, errorCode?: string): Promise<void>;
    logDecryption(resourceId: string, fieldName: string, success: boolean, cacheHit?: boolean, errorCode?: string): Promise<void>;
    logEncryptionError(resourceId: string, fieldName: string, errorCode: string, errorMessage: string): Promise<void>;
    logDecryptionError(resourceId: string, fieldName: string, errorCode: string, errorMessage: string): Promise<void>;
    logCacheCleared(resourceId?: string): Promise<void>;
    logKmsKeyAccess(keyId: string, operation: 'encrypt' | 'decrypt', success: boolean): Promise<void>;
}
export type { AuditLogEntry, AuditAction, CreateAuditEntryInput } from '../types/audit';
//# sourceMappingURL=audit.d.ts.map