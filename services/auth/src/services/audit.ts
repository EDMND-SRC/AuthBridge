/**
 * Audit Logging Service
 * DPA 2024 Compliance: 5-year retention, immutable audit trail
 * FIA AML/KYC: All authentication events must be logged
 */

import { randomUUID } from 'crypto';
import { logger, maskPII } from '../utils/logger.js';
import { DynamoDBService } from './dynamodb.js';
import type { AuditLogEntry, AuditAction, CreateAuditEntryInput } from '../types/audit.js';

export class AuditService {
  private dynamodb: DynamoDBService;

  constructor(dynamodb?: DynamoDBService) {
    this.dynamodb = dynamodb || new DynamoDBService();
  }

  async logEvent(input: CreateAuditEntryInput): Promise<AuditLogEntry> {
    const now = new Date();
    const eventId = randomUUID();

    const entry: AuditLogEntry = {
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
    await this.dynamodb.putAuditLog(entry);

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

  async logApiKeyRevoke(clientId: string, keyId: string): Promise<void> {
    await this.logEvent({
      clientId,
      action: 'API_KEY_REVOKE',
      resourceId: keyId,
      resourceType: 'api_key',
      status: 'success',
    });
  }

  async logApiKeyRotate(clientId: string, oldKeyId: string, newKeyId: string): Promise<void> {
    await this.logEvent({
      clientId,
      action: 'API_KEY_ROTATE',
      resourceId: oldKeyId,
      resourceType: 'api_key',
      status: 'success',
      metadata: { newKeyId },
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
  async getEntriesByUser(userId: string, limit: number = 100): Promise<AuditLogEntry[]> {
    const entries = await this.dynamodb.queryAuditLogsByUser(userId);
    return entries
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);
  }

  async getEntriesByDate(date: string, limit: number = 1000): Promise<AuditLogEntry[]> {
    const entries = await this.dynamodb.queryAuditLogsByDate(date);
    return entries
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);
  }
}

// Re-export types for convenience
export type { AuditLogEntry, AuditAction, CreateAuditEntryInput } from '../types/audit.js';

// Singleton instance for convenience
export const auditService = new AuditService();
