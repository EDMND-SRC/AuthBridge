import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DynamoDB service - must be before AuditService import
const mockPutAuditLog = vi.fn();
const mockQueryAuditLogsByDate = vi.fn();
const mockQueryAuditLogsByUser = vi.fn();

vi.mock('./dynamodb.js', () => ({
  DynamoDBService: vi.fn(() => ({
    putAuditLog: mockPutAuditLog,
    queryAuditLogsByDate: mockQueryAuditLogsByDate,
    queryAuditLogsByUser: mockQueryAuditLogsByUser,
  })),
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    audit: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
  maskPII: vi.fn((data: Record<string, unknown>) => {
    const masked = { ...data };
    if (masked.email) masked.email = '***masked-email***';
    if (masked.omang) masked.omang = '***masked-omang***';
    return masked;
  }),
}));

// Import after mocks are set up
import { AuditService } from './audit.js';

describe('AuditService', () => {
  let auditService: AuditService;

  beforeEach(() => {
    vi.clearAllMocks();
    auditService = new AuditService();
    mockPutAuditLog.mockResolvedValue(undefined);
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
      expect(mockPutAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user_123',
        action: 'LOGIN',
      }));
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

      expect(mockPutAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user_123',
        clientId: 'client_456',
        action: 'LOGIN',
        status: 'success',
        ipAddress: '192.168.1.1',
      }));
    });

    it('should log failed login', async () => {
      await auditService.logLogin('user_123', 'client_456', false, '192.168.1.1', 'Mozilla/5.0', 'INVALID_CREDENTIALS');

      expect(mockPutAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'LOGIN',
        status: 'failure',
        errorCode: 'INVALID_CREDENTIALS',
      }));
    });
  });

  describe('logSessionCreate', () => {
    it('should log session creation', async () => {
      await auditService.logSessionCreate('user_123', 'client_456', 'session_789', '192.168.1.1', 'Mozilla/5.0');

      expect(mockPutAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'SESSION_CREATE',
        resourceId: 'session_789',
        resourceType: 'session',
      }));
    });
  });

  describe('logApiKeyCreate', () => {
    it('should log API key creation', async () => {
      await auditService.logApiKeyCreate('client_456', 'key_123', 'Production Key');

      expect(mockPutAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        clientId: 'client_456',
        action: 'API_KEY_CREATE',
        resourceId: 'key_123',
        resourceType: 'api_key',
      }));
    });
  });

  describe('logRateLimitExceeded', () => {
    it('should log rate limit exceeded', async () => {
      await auditService.logRateLimitExceeded('client_456', '192.168.1.1', '/api/sessions');

      expect(mockPutAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'RATE_LIMIT_EXCEEDED',
        status: 'failure',
        errorCode: 'RATE_LIMIT_EXCEEDED',
      }));
    });
  });

  describe('getEntriesByUser', () => {
    it('should return entries for a specific user', async () => {
      const mockEntries = [
        { eventId: 'e1', userId: 'user_123', timestamp: '2026-01-14T12:00:00Z' },
        { eventId: 'e2', userId: 'user_123', timestamp: '2026-01-14T11:00:00Z' },
      ];
      mockQueryAuditLogsByUser.mockResolvedValue(mockEntries);

      const entries = await auditService.getEntriesByUser('user_123');

      expect(entries).toHaveLength(2);
      expect(mockQueryAuditLogsByUser).toHaveBeenCalledWith('user_123');
    });

    it('should sort entries by timestamp descending', async () => {
      const mockEntries = [
        { eventId: 'e1', timestamp: '2026-01-14T11:00:00Z' },
        { eventId: 'e2', timestamp: '2026-01-14T12:00:00Z' },
      ];
      mockQueryAuditLogsByUser.mockResolvedValue(mockEntries);

      const entries = await auditService.getEntriesByUser('user_123');

      expect(entries[0].eventId).toBe('e2'); // Later timestamp first
    });
  });

  describe('getEntriesByDate', () => {
    it('should return entries for a specific date', async () => {
      const mockEntries = [
        { eventId: 'e1', date: '2026-01-14', timestamp: '2026-01-14T12:00:00Z' },
        { eventId: 'e2', date: '2026-01-14', timestamp: '2026-01-14T11:00:00Z' },
      ];
      mockQueryAuditLogsByDate.mockResolvedValue(mockEntries);

      const entries = await auditService.getEntriesByDate('2026-01-14');

      expect(entries).toHaveLength(2);
      expect(mockQueryAuditLogsByDate).toHaveBeenCalledWith('2026-01-14');
    });
  });
});
