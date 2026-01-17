export type AuditAction = 'DATA_ENCRYPTED' | 'DATA_DECRYPTED' | 'ENCRYPTION_ERROR' | 'DECRYPTION_ERROR' | 'CACHE_CLEARED' | 'KMS_KEY_ACCESSED';
export interface AuditLogEntry {
    eventId: string;
    timestamp: string;
    date: string;
    action: AuditAction;
    resourceId: string | null;
    resourceType: string | null;
    fieldName: string | null;
    status: 'success' | 'failure';
    errorCode: string | null;
    metadata: Record<string, unknown>;
}
export interface CreateAuditEntryInput {
    action: AuditAction;
    resourceId?: string;
    resourceType?: string;
    fieldName?: string;
    status: 'success' | 'failure';
    errorCode?: string;
    metadata?: Record<string, unknown>;
}
//# sourceMappingURL=audit.d.ts.map