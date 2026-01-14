export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'TOKEN_REFRESH'
  | 'TOKEN_VALIDATION'
  | 'SESSION_CREATE'
  | 'SESSION_VALIDATE'
  | 'SESSION_RENEW'
  | 'SESSION_REVOKE'
  | 'SESSION_EXPIRE'
  | 'API_KEY_CREATE'
  | 'API_KEY_VALIDATE'
  | 'API_KEY_REVOKE'
  | 'API_KEY_ROTATE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'AUTH_FAILURE'
  | 'PERMISSION_DENIED';

export interface AuditLogEntry {
  eventId: string;
  timestamp: string;
  date: string; // YYYY-MM-DD for partitioning
  userId: string | null;
  clientId: string | null;
  action: AuditAction;
  resourceId: string | null;
  resourceType: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  status: 'success' | 'failure';
  errorCode: string | null;
  metadata: Record<string, unknown>;
}

export interface CreateAuditEntryInput {
  userId?: string;
  clientId?: string;
  action: AuditAction;
  resourceId?: string;
  resourceType?: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  errorCode?: string;
  metadata?: Record<string, unknown>;
}
