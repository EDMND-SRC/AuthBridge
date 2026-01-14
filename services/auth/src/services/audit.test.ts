import { describe, it, expect, beforeEach } from 'vitest';
import { AuditService } from './audit.js';

describe('AuditService', () => {
  let auditService: AuditService;

  beforeEach(() => {
    auditService = new AuditService();
    auditService.clearAllEntries();
  });

  describe('logEvent', () => {
    it('should create an audit entry', async () => {
      const entry = await auditService.logEvent({
        userId: 'user_123',
        clientId: 'client_456',
        action: 'LOGIN',
        status: 'success',
      });

      expect(entry.eventId).toBeDefined();
      expect(entry.userId).toBe('user_123');
      expect(entry.clientId).toBe('client_456');
      expect(entry.action).toBe('LOGIN');
      expect(entry.status).toBe('success');
      expect(entry.timestamp).toBeDefined();
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should mask PII in metadata', async () => {
      const entry = await auditService.logEvent({
        action: 'LOGIN',
        status: 'success',
        metadata: {
          email: 'test@example.com',
          omang: '123456789',
        },
      });

      expect(entry.metadata.email).toBe('***masked-email***');
      expect(entry.metadata.omang).toBe('***masked-omang***');
    });
  });

  describe('logLogin', () => {
    it('should log successful login', async () => {
      await auditService.logLogin('user_123', 'client_456', true, '192.168.1.1', 'Mozilla/5.0');

      const entries = await auditService.getEntriesByUser('user_123');
      expect(entries).toHaveLength(1);
      expect(entries[0].action).toBe('LOGIN');
      expect(entries[0].status).toBe('success');
    });

    it('should log failed login', async () => {
      await auditService.logLogin('user_123', 'client_456', false, '192.168.1.1', 'Mozilla/5.0', 'INVALID_CREDENTIALS');

      const entries = await auditService.getEntriesByUser('user_123');
      expect(entries).toHaveLength(1);
      expect(entries[0].status).toBe('failure');
      expect(entries[0].errorCode).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('logSessionCreate', () => {
    it('should log session creation', async () => {
      await auditService.logSessionCreate('user_123', 'client_456', 'session_789', '192.168.1.1', 'Mozilla/5.0');

      const entries = await auditService.getEntriesByUser('user_123');
      expect(entries).toHaveLength(1);
      expect(entries[0].action).toBe('SESSION_CREATE');
      expect(entries[0].resourceId).toBe('session_789');
      expect(entries[0].resourceType).toBe('session');
    });
  });

  describe('logApiKeyCreate', () => {
    it('should log API key creation', async () => {
      await auditService.logApiKeyCreate('client_456', 'key_123', 'Production Key');

      const entries = await auditService.getEntriesByAction('API_KEY_CREATE');
      expect(entries).toHaveLength(1);
      expect(entries[0].clientId).toBe('client_456');
      expect(entries[0].resourceId).toBe('key_123');
    });
  });

  describe('logRateLimitExceeded', () => {
    it('should log rate limit exceeded', async () => {
      await auditService.logRateLimitExceeded('client_456', '192.168.1.1', '/api/sessions');

      const entries = await auditService.getEntriesByAction('RATE_LIMIT_EXCEEDED');
      expect(entries).toHaveLength(1);
      expect(entries[0].status).toBe('failure');
      expect(entries[0].errorCode).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('getEntriesByUser', () => {
    it('should return entries for a specific user', async () => {
      await auditService.logLogin('user_123', 'client_456', true);
      await auditService.logLogin('user_123', 'client_456', true);
      await auditService.logLogin('other_user', 'client_456', true);

      const entries = await auditService.getEntriesByUser('user_123');
      expect(entries).toHaveLength(2);
      expect(entries.every(e => e.userId === 'user_123')).toBe(true);
    });
  });

  describe('getEntriesByDate', () => {
    it('should return entries for a specific date', async () => {
      await auditService.logLogin('user_123', 'client_456', true);
      await auditService.logLogin('user_456', 'client_456', true);

      const today = new Date().toISOString().split('T')[0];
      const entries = await auditService.getEntriesByDate(today);
      expect(entries.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getFailedAuthAttempts', () => {
    it('should return failed auth attempts since a given time', async () => {
      await auditService.logLogin('user_123', 'client_456', false, undefined, undefined, 'INVALID_CREDENTIALS');
      await auditService.logLogin('user_456', 'client_456', true);
      await auditService.logAuthFailure('INVALID_TOKEN', '192.168.1.1');

      const since = new Date(Date.now() - 60000); // 1 minute ago
      const entries = await auditService.getFailedAuthAttempts(since);
      expect(entries.length).toBeGreaterThanOrEqual(2);
      expect(entries.every(e => e.status === 'failure')).toBe(true);
    });
  });
});
