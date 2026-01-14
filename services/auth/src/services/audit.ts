/**
 * Audit Logging Service
 * DPA 2024 Compliance: 5-year retention, immutable audit trail
 * FIA AML/KYC: All authentication events must be logged
 */

import { randomUUID } from 'crypto';
import { logger, maskPII } from '../utils/logger.js';

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

export interface AuditEntry {
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

// In-memory storage for MVP (replace with DynamoDB in production)
// DynamoDB Schema:
// PK: AUDIT#<date>
// SK: <timestamp>#<eventId>
// GSI1PK: USER#<userId>, GSI1SK: <timestamp>#<eventId>
const auditLog: AuditEntry[] = [];

export class AuditService {
  // For testing: clear all audit entries
  clearAllEntries(): void {
    auditLog.length = 0;
  }

  async logEvent(input: CreateAuditEntryInput): Promise<AuditEntry> {
    const now = new Date();
    const eventId = randomUUID();

    const entry: AuditEntry = {
      eventId,
      timestamp: now.toISOString(),
      date: now.toISOString().split('T')[0],
      userId: input.userId || null,
      clientId: input.clientId || null,
      action: input.action,
      resourceId: input.resourceId || null,
      resourceType: input.resourceType || null,
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
      status: input.status,
      errorCode: input.errorCode || null,
      metadata: maskPII(input.metadata || {}) as Record<string, unknown>,
    };

    // Append to audit log (immutable - no updates or deletes)
    auditLog.push(entry);

    // Also log to CloudWatch for real-time monitoring
    logger.audit(input.action, {
      eventId,
      userId: input.userId,
      clientId: input.clientId,
      status: input.status,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
    });

    return entry;
  }

  // Authentication events
  async logLogin(userId: string, clientId: string, success: boolean, ipAddress?: string, userAgent?: string, errorCode?: string): Promise<void> {
    await this.logEvent({
      userId,
      clientId,
      action: 'LOGIN',
      status: success ? 'success' : 'failure',
      ipAddress,
      userAgent,
      errorCode,
    });
  }

  async logLogout(userId: string, clientId: string, sessionId: string): Promise<void> {
    await this.logEvent({
      userId,
      clientId,
      action: 'LOGOUT',
      resourceId: sessionId,
      resourceType: 'session',
      status: 'success',
    });
  }

  async logTokenRefresh(userId: string, clientId: string, success: boolean, errorCode?: string): Promise<void> {
    await this.logEvent({
      userId,
      clientId,
      action: 'TOKEN_REFRESH',
      status: success ? 'success' : 'failure',
      errorCode,
    });
  }

  // Session events
  async logSessionCreate(userId: string, clientId: string, sessionId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      userId,
      clientId,
      action: 'SESSION_CREATE',
      resourceId: sessionId,
      resourceType: 'session',
      status: 'success',
      ipAddress,
      userAgent,
    });
  }

  async logSessionValidate(sessionId: string, success: boolean, userId?: string, errorCode?: string): Promise<void> {
    await this.logEvent({
      userId,
      action: 'SESSION_VALIDATE',
      resourceId: sessionId,
      resourceType: 'session',
      status: success ? 'success' : 'failure',
      errorCode,
    });
  }

  async logSessionRevoke(userId: string, sessionId: string): Promise<void> {
    await this.logEvent({
      userId,
      action: 'SESSION_REVOKE',
      resourceId: sessionId,
      resourceType: 'session',
      status: 'success',
    });
  }

  // API Key events
  async logApiKeyCreate(clientId: string, keyId: string, keyName: string): Promise<void> {
    await this.logEvent({
      clientId,
      action: 'API_KEY_CREATE',
      resourceId: keyId,
      resourceType: 'api_key',
      status: 'success',
      metadata: { keyName },
    });
  }

  async logApiKeyValidate(keyId: string, clientId: string, success: boolean, errorCode?: string): Promise<void> {
    await this.logEvent({
      clientId,
      action: 'API_KEY_VALIDATE',
      resourceId: keyId,
      resourceType: 'api_key',
      status: success ? 'success' : 'failure',
      errorCode,
    });
  }

  // Security events
  async logRateLimitExceeded(clientId: string, ipAddress: string, endpoint: string): Promise<void> {
    await this.logEvent({
      clientId,
      action: 'RATE_LIMIT_EXCEEDED',
      ipAddress,
      status: 'failure',
      errorCode: 'RATE_LIMIT_EXCEEDED',
      metadata: { endpoint },
    });
  }

  async logAuthFailure(reason: string, ipAddress?: string, userAgent?: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.logEvent({
      action: 'AUTH_FAILURE',
      status: 'failure',
      errorCode: reason,
      ipAddress,
      userAgent,
      metadata,
    });
  }

  // Query methods (for admin/compliance)
  async getEntriesByUser(userId: string, limit: number = 100): Promise<AuditEntry[]> {
    return auditLog
      .filter(entry => entry.userId === userId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);
  }

  async getEntriesByDate(date: string, limit: number = 1000): Promise<AuditEntry[]> {
    return auditLog
      .filter(entry => entry.date === date)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);
  }

  async getEntriesByAction(action: AuditAction, limit: number = 100): Promise<AuditEntry[]> {
    return auditLog
      .filter(entry => entry.action === action)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);
  }

  async getFailedAuthAttempts(since: Date, limit: number = 100): Promise<AuditEntry[]> {
    const sinceStr = since.toISOString();
    return auditLog
      .filter(entry =>
        entry.status === 'failure' &&
        entry.timestamp >= sinceStr &&
        ['LOGIN', 'TOKEN_VALIDATION', 'API_KEY_VALIDATE', 'AUTH_FAILURE'].includes(entry.action)
      )
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);
  }
}

// Singleton instance
export const auditService = new AuditService();
