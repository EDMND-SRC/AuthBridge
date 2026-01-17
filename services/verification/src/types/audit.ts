export type AuditAction =
  | 'DATA_ENCRYPTED'
  | 'DATA_DECRYPTED'
  | 'ENCRYPTION_ERROR'
  | 'DECRYPTION_ERROR'
  | 'CACHE_CLEARED'
  | 'KMS_KEY_ACCESSED';

export interface AuditLogEntry {
  eventId: string;
  timestamp: string;
  date: string; // YYYY-MM-DD for partitioning
  action: AuditAction;
  resourceId: string | null; // verificationId or caseId
  resourceType: string | null; // 'verification', 'case', 'field'
  fieldName: string | null; // encrypted field name
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
