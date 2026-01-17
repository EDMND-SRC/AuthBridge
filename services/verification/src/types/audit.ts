export type AuditAction =
  // Case Management
  | 'CASE_CREATED'
  | 'CASE_VIEWED'
  | 'CASE_ASSIGNED'
  | 'CASE_APPROVED'
  | 'CASE_REJECTED'
  | 'CASE_RESUBMISSION_REQUESTED'
  | 'CASE_NOTE_ADDED'
  | 'CASE_STATUS_CHANGED'
  | 'CASE_EXPORTED'
  | 'CASE_DELETED'
  // Document Management
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_VIEWED'
  | 'DOCUMENT_DOWNLOADED'
  | 'DOCUMENT_DELETED'
  | 'OCR_STARTED'
  | 'OCR_COMPLETED'
  | 'OCR_FAILED'
  | 'BIOMETRIC_MATCH_RUN'
  // User Management
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'USER_ROLE_CHANGED'
  | 'USER_PASSWORD_RESET'
  // Webhook Management
  | 'WEBHOOK_CONFIGURED'
  | 'WEBHOOK_SENT'
  | 'WEBHOOK_RETRY'
  | 'WEBHOOK_FAILED'
  | 'WEBHOOK_DELETED'
  // API Key Management
  | 'API_KEY_CREATED'
  | 'API_KEY_ROTATED'
  | 'API_KEY_REVOKED'
  | 'API_KEY_USED'
  | 'API_KEY_RATE_LIMITED'
  // Data Protection (from Story 5.1)
  | 'DATA_ENCRYPTED'
  | 'DATA_DECRYPTED'
  | 'ENCRYPTION_ERROR'
  | 'DECRYPTION_ERROR'
  | 'CACHE_CLEARED'
  | 'KMS_KEY_ACCESSED'
  // Data Request Actions (Story 5.3)
  | 'DATA_EXPORT_REQUESTED'
  | 'DATA_EXPORT_COMPLETED'
  | 'DATA_EXPORT_FAILED'
  | 'DATA_DELETION_REQUESTED'
  | 'DATA_DELETION_COMPLETED'
  | 'DATA_DELETION_FAILED'
  | 'DATA_HARD_DELETION_COMPLETED'
  | 'DATA_HARD_DELETION_FAILED'
  // System Events
  | 'SYSTEM_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED_ACCESS'
  | 'PERMISSION_DENIED';

export interface AuditLogEntry {
  PK: string;                    // AUDIT#{date}
  SK: string;                    // {timestamp}#{eventId}
  eventId: string;
  timestamp: string;             // ISO 8601
  date: string;                  // YYYY-MM-DD
  action: AuditAction;
  userId: string | null;
  resourceId: string | null;
  resourceType: string | null;
  fieldName: string | null;      // For encryption events
  ipAddress: string | null;
  userAgent: string | null;
  clientId: string | null;
  status: 'success' | 'failure';
  errorCode: string | null;
  metadata: Record<string, any>;
  ttl: number;                   // Unix timestamp (5 years from now)
  // GSI keys
  GSI5PK: string | null;         // USER#{userId}
  GSI5SK: string;                // {timestamp}#{eventId}
  GSI6PK: string | null;         // {resourceType}#{resourceId}
  GSI6SK: string;                // {timestamp}#{eventId}
  GSI7PK: string;                // ACTION#{action}
  GSI7SK: string;                // {timestamp}#{eventId}
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
