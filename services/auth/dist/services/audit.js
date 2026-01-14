/**
 * Audit Logging Service
 * DPA 2024 Compliance: 5-year retention, immutable audit trail
 * FIA AML/KYC: All authentication events must be logged
 */
import { randomUUID } from 'crypto';
import { logger, maskPII } from '../utils/logger.js';
import { DynamoDBService } from './dynamodb.js';
export class AuditService {
    dynamodb;
    constructor(dynamodb) {
        this.dynamodb = dynamodb || new DynamoDBService();
    }
    async logEvent(input) {
        const now = new Date();
        const eventId = randomUUID();
        const entry = {
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
            metadata: maskPII(input.metadata || {}),
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
    async logLogin(userId, clientId, success, ipAddress, userAgent, errorCode) {
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
    async logLogout(userId, clientId, sessionId) {
        await this.logEvent({
            userId,
            clientId,
            action: 'LOGOUT',
            resourceId: sessionId,
            resourceType: 'session',
            status: 'success',
        });
    }
    async logTokenRefresh(userId, clientId, success, errorCode) {
        await this.logEvent({
            userId,
            clientId,
            action: 'TOKEN_REFRESH',
            status: success ? 'success' : 'failure',
            errorCode,
        });
    }
    // Session events
    async logSessionCreate(userId, clientId, sessionId, ipAddress, userAgent) {
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
    async logSessionValidate(sessionId, success, userId, errorCode) {
        await this.logEvent({
            userId,
            action: 'SESSION_VALIDATE',
            resourceId: sessionId,
            resourceType: 'session',
            status: success ? 'success' : 'failure',
            errorCode,
        });
    }
    async logSessionRevoke(userId, sessionId) {
        await this.logEvent({
            userId,
            action: 'SESSION_REVOKE',
            resourceId: sessionId,
            resourceType: 'session',
            status: 'success',
        });
    }
    // API Key events
    async logApiKeyCreate(clientId, keyId, keyName) {
        await this.logEvent({
            clientId,
            action: 'API_KEY_CREATE',
            resourceId: keyId,
            resourceType: 'api_key',
            status: 'success',
            metadata: { keyName },
        });
    }
    async logApiKeyValidate(keyId, clientId, success, errorCode) {
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
    async logRateLimitExceeded(clientId, ipAddress, endpoint) {
        await this.logEvent({
            clientId,
            action: 'RATE_LIMIT_EXCEEDED',
            ipAddress,
            status: 'failure',
            errorCode: 'RATE_LIMIT_EXCEEDED',
            metadata: { endpoint },
        });
    }
    async logAuthFailure(reason, ipAddress, userAgent, metadata) {
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
    async getEntriesByUser(userId, limit = 100) {
        const entries = await this.dynamodb.queryAuditLogsByUser(userId);
        return entries
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
            .slice(0, limit);
    }
    async getEntriesByDate(date, limit = 1000) {
        const entries = await this.dynamodb.queryAuditLogsByDate(date);
        return entries
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
            .slice(0, limit);
    }
}
// Singleton instance for convenience
export const auditService = new AuditService();
