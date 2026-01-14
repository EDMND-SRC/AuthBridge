import { describe, it, expect, beforeEach } from 'vitest';
import { SessionService } from './session.js';
import type { CreateSessionInput } from '../types/session.js';

describe('SessionService', () => {
  let sessionService: SessionService;
  const mockInput: CreateSessionInput = {
    userId: 'user_123',
    clientId: 'client_456',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    deviceType: 'desktop',
  };

  beforeEach(() => {
    sessionService = new SessionService();
    sessionService.clearAllSessions(); // Clear sessions between tests
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const session = await sessionService.createSession(mockInput);

      expect(session.sessionId).toBeDefined();
      expect(session.userId).toBe(mockInput.userId);
      expect(session.clientId).toBe(mockInput.clientId);
      expect(session.status).toBe('active');
      expect(session.ipAddress).toBe(mockInput.ipAddress);
    });

    it('should set expiration 30 minutes in the future', async () => {
      const session = await sessionService.createSession(mockInput);

      const expiresAt = new Date(session.expiresAt);
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();
      const thirtyMinutes = 30 * 60 * 1000;

      expect(diff).toBeLessThanOrEqual(thirtyMinutes);
      expect(diff).toBeGreaterThan(thirtyMinutes - 5000); // Allow 5s tolerance
    });

    it('should enforce maximum concurrent sessions', async () => {
      // Create 50 sessions (the limit)
      for (let i = 0; i < 50; i++) {
        await sessionService.createSession(mockInput);
      }

      // 51st session should fail
      await expect(sessionService.createSession(mockInput)).rejects.toThrow(
        'Maximum concurrent sessions exceeded'
      );
    });
  });

  describe('validateSession', () => {
    it('should validate an active session', async () => {
      const session = await sessionService.createSession(mockInput);

      const result = await sessionService.validateSession(session.sessionId);

      expect(result.valid).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session?.sessionId).toBe(session.sessionId);
    });

    it('should reject non-existent session', async () => {
      const result = await sessionService.validateSession('non-existent-id');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('should update lastActivity on validation', async () => {
      const session = await sessionService.createSession(mockInput);
      const originalActivity = session.lastActivity;

      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await sessionService.validateSession(session.sessionId);

      expect(result.valid).toBe(true);
      expect(result.session?.lastActivity).not.toBe(originalActivity);
    });
  });

  describe('renewSession', () => {
    it('should renew a valid session', async () => {
      const session = await sessionService.createSession(mockInput);
      const originalExpiry = session.expiresAt;

      await new Promise(resolve => setTimeout(resolve, 100));

      const renewed = await sessionService.renewSession(session.sessionId);

      expect(renewed.expiresAt).not.toBe(originalExpiry);
      expect(new Date(renewed.expiresAt).getTime()).toBeGreaterThan(
        new Date(originalExpiry).getTime()
      );
    });

    it('should not renew non-existent session', async () => {
      await expect(sessionService.renewSession('non-existent-id')).rejects.toThrow(
        'Cannot renew invalid session'
      );
    });
  });

  describe('revokeSession', () => {
    it('should revoke an active session', async () => {
      const session = await sessionService.createSession(mockInput);

      await sessionService.revokeSession(session.sessionId);

      const result = await sessionService.validateSession(session.sessionId);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('revoked');
    });

    it('should handle revoking non-existent session gracefully', async () => {
      await expect(sessionService.revokeSession('non-existent-id')).resolves.toBeUndefined();
    });
  });

  describe('getUserSessions', () => {
    it('should return all active sessions for a user', async () => {
      await sessionService.createSession(mockInput);
      await sessionService.createSession(mockInput);
      await sessionService.createSession({ ...mockInput, userId: 'other_user' });

      const sessions = await sessionService.getUserSessions(mockInput.userId);

      expect(sessions).toHaveLength(2);
      expect(sessions.every(s => s.userId === mockInput.userId)).toBe(true);
    });

    it('should not return revoked sessions', async () => {
      const session1 = await sessionService.createSession(mockInput);
      await sessionService.createSession(mockInput);

      await sessionService.revokeSession(session1.sessionId);

      const sessions = await sessionService.getUserSessions(mockInput.userId);

      expect(sessions).toHaveLength(1);
    });
  });
});
