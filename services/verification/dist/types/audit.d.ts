export type AuditAction = 'CASE_CREATED' | 'CASE_VIEWED' | 'CASE_ASSIGNED' | 'CASE_APPROVED' | 'CASE_REJECTED' | 'CASE_RESUBMISSION_REQUESTED' | 'CASE_NOTE_ADDED' | 'CASE_STATUS_CHANGED' | 'CASE_EXPORTED' | 'CASE_DELETED' | 'DOCUMENT_UPLOADED' | 'DOCUMENT_VIEWED' | 'DOCUMENT_DOWNLOADED' | 'DOCUMENT_DELETED' | 'OCR_STARTED' | 'OCR_COMPLETED' | 'OCR_FAILED' | 'BIOMETRIC_MATCH_RUN' | 'USER_LOGIN' | 'USER_LOGOUT' | 'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED' | 'USER_ROLE_CHANGED' | 'USER_PASSWORD_RESET' | 'WEBHOOK_CONFIGURED' | 'WEBHOOK_SENT' | 'WEBHOOK_RETRY' | 'WEBHOOK_FAILED' | 'WEBHOOK_DELETED' | 'API_KEY_CREATED' | 'API_KEY_ROTATED' | 'API_KEY_REVOKED' | 'API_KEY_USED' | 'API_KEY_RATE_LIMITED' | 'DATA_ENCRYPTED' | 'DATA_DECRYPTED' | 'ENCRYPTION_ERROR' | 'DECRYPTION_ERROR' | 'CACHE_CLEARED' | 'KMS_KEY_ACCESSED' | 'SYSTEM_ERROR' | 'RATE_LIMIT_EXCEEDED' | 'INVALID_REQUEST' | 'UNAUTHORIZED_ACCESS' | 'PERMISSION_DENIED';
export interface AuditLogEntry {
    PK: string;
    SK: string;
    eventId: string;
    timestamp: string;
    date: string;
    action: AuditAction;
    userId: string | null;
    resourceId: string | null;
    resourceType: string | null;
    fieldName: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    clientId: string | null;
    status: 'success' | 'failure';
    errorCode: string | null;
    metadata: Record<string, any>;
    ttl: number;
    GSI5PK: string | null;
    GSI5SK: string;
    GSI6PK: string | null;
    GSI6SK: string;
    GSI7PK: string;
    GSI7SK: string;
}
export interface CreateAuditEntryInput {
    action: AuditAction;
    userId?: string | null;
    resourceId?: string | null;
    resourceType?: string | null;
    fieldName?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    clientId?: string | null;
    status: 'success' | 'failure';
    errorCode?: string | null;
    metadata?: Record<string, any>;
}
//# sourceMappingURL=audit.d.ts.map