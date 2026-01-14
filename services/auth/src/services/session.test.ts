import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionService } from './session.js';
import type { CreateSessionInput } from '../types/session.js';

// Mock DynamoDB service
const mockPutSession = vi.fn();
const mockGetSession = vi.fn();
const mockUpdateSession = vi.fn();
const mockQueryUserSessions = vi.fn();
const mockCountActiveUserSessions = vi.fn();

vi.mock('./dynamodb.js', () => ({
  DynamoDBService: vi.fn(() => ({
    putSession: mockPutSession,
    getSession: mockGetSession,
    updateSession: mockUpdateSession,
    queryUserSessions: mockQueryUserSessions,
    countActiveUserSessions: mockCountActiveUserSessions,
  })),
}));

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
    vi.clearAllMocks();
    sessionService = new SessionService();
    mockCountActiveUserSessions.mockResolvedValue(0);
    mockPutSession.mockResolvedValue(undefined);
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const session = await sessionService.createSession(mockInput);

      expect(session.sessionId).toBeDefined();
      expect(session.userId).toBe(mockInput.userId);
      expect(session.clientId).toBe(mockInput.clientId);
      expect(session.status).toBe('active');
      expect(session.ipAddress).toBe(mockInput.ipAddress);
      expect(mockPutSession).toHaveBeenCalledWith(expect.objectContaining({
        userId: mockInput.userId,
        clientId: mockInput.clientId,
        status: 'active',
      }));
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
      mockCountActiveUserSessions.mockResolvedValue(50);

      await expect(sessionService.createSession(mockInput)).rejects.toThrow(
        'Maximum concurrent sessions exceeded'
      );
    });
  });

  describe('validateSession', () => {
    it('should validate an active session', async () => {
      const mockSession = {
        sessionId: 'session_123',
        userId: 'user_123',
        clientId: 'client_456',
        status: 'active',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        lastActivity: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + 1800,
      };
      mockGetSession.mockResolvedValue(mockSession);
      mockUpdateSession.mockResolvedValue(undefined);

      const result = await sessionService.validateSession('session_123');

      expect(result.valid).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session?.sessionId).toBe('session_123');
    });

    it('should reject non-existent session', async () => {
      mockGetSession.mockResolvedValue(null);

      const result = await sessionService.validateSession('non-existent-id');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('should reject expired session', async () => {
      const mockSession = {
        sessionId: 'session_123',
        userId: 'user_123',
        status: 'active',
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired
        lastActivity: new Date().toISOString(),
      };
      mockGetSession.mockResolvedValue(mockSession);
      mockUpdateSession.mockResolvedValue(undefined);

      const result = await sessionService.validateSession('session_123');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Session expired');
      expect(mockUpdateSession).toHaveBeenCalledWith(expect.objectContaining({
        status: 'expired',
      }));
    });

    it('should reject revoked session', async () => {
      const mockSession = {
        sessionId: 'session_123',
        userId: 'user_123',
        status: 'revoked',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };
      mockGetSession.mockResolvedValue(mockSession);

      const result = await sessionService.validateSession('session_123');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('revoked');
    });
  });

  describe('renewSession', () => {
    it('should renew a valid session', async () => {
      const originalExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const mockSession = {
        sessionId: 'session_123',
        userId: 'user_123',
        status: 'active',
        expiresAt: originalExpiry,
        lastActivity: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + 600,
      };
      mockGetSession.mockResolvedValue(mockSession);
      mockUpdateSession.mockResolvedValue(undefined);

      const renewed = await sessionService.renewSession('session_123');

      expect(new Date(renewed.expiresAt).getTime()).toBeGreaterThan(
        new Date(originalExpiry).getTime()
      );
      expect(mockUpdateSession).toHaveBeenCalled();
    });

    it('should not renew non-existent session', async () => {
      mockGetSession.mockResolvedValue(null);

      await expect(sessionService.renewSession('non-existent-id')).rejects.toThrow(
        'Cannot renew invalid session'
      );
    });
  });

  describe('revokeSession', () => {
    it('should revoke an active session', async () => {
      const mockSession = {
        sessionId: 'session_123',
        userId: 'user_123',
        status: 'active',
      };
      mockGetSession.mockResolvedValue(mockSession);
      mockUpdateSession.mockResolvedValue(undefined);

      await sessionService.revokeSession('session_123');

      expect(mockUpdateSession).toHaveBeenCalledWith(expect.objectContaining({
        status: 'revoked',
      }));
    });

    it('should handle revoking non-existent session gracefully', async () => {
      mockGetSession.mockResolvedValue(null);

      await expect(sessionService.revokeSession('non-existent-id')).resolves.toBeUndefined();
    });
  });

  describe('getUserSessions', () => {
    it('should return all active sessions for a user', async () => {
      const mockSessions = [
        { sessionId: 's1', userId: 'user_123', status: 'active' },
        { sessionId: 's2', userId: 'user_123', status: 'active' },
        { sessionId: 's3', userId: 'user_123', status: 'revoked' },
      ];
      mockQueryUserSessions.mockResolvedValue(mockSessions);

      const sessions = await sessionService.getUserSessions('user_123');

      expect(sessions).toHaveLength(2);
      expect(sessions.every(s => s.status === 'active')).toBe(true);
    });
  });
});
