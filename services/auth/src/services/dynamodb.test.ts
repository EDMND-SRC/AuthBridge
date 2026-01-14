import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DynamoDBService } from './dynamodb.js';
import type { Session } from '../types/session.js';
import type { ApiKey } from '../types/api-key.js';
import type { AuditLogEntry } from '../types/audit.js';

// Mock AWS SDK
const mockSend = vi.fn();

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({
      send: mockSend,
    })),
  },
  PutCommand: vi.fn((params) => ({ type: 'Put', params })),
  GetCommand: vi.fn((params) => ({ type: 'Get', params })),
  QueryCommand: vi.fn((params) => ({ type: 'Query', params })),
  UpdateCommand: vi.fn((params) => ({ type: 'Update', params })),
  DeleteCommand: vi.fn((params) => ({ type: 'Delete', params })),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({})),
}));

describe('DynamoDBService', () => {
  let service: DynamoDBService;

  const mockSession: Session = {
    sessionId: 'session_123',
    userId: 'user_456',
    clientId: 'client_789',
    createdAt: '2026-01-14T10:00:00Z',
    expiresAt: '2026-01-14T10:30:00Z',
    lastActivity: '2026-01-14T10:00:00Z',
    status: 'active',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    deviceType: 'desktop',
    ttl: 1736851800,
  };

  const mockApiKey: ApiKey = {
    keyId: 'key_123',
    clientId: 'client_456',
    keyHash: 'hash_abc123',
    name: 'Test Key',
    createdAt: '2026-01-14T10:00:00Z',
    expiresAt: null,
    lastUsed: null,
    status: 'active',
    scopes: ['read', 'write'],
    rateLimit: 100,
  };

  const mockAuditEntry: AuditLogEntry = {
    eventId: 'event_123',
    timestamp: '2026-01-14T10:00:00Z',
    date: '2026-01-14',
    userId: 'user_456',
    clientId: 'client_789',
    action: 'LOGIN',
    resourceId: null,
    resourceType: null,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    status: 'success',
    errorCode: null,
    metadata: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DynamoDBService('AuthBridgeTable', 'af-south-1');
  });

  // ============================================
  // SESSION OPERATIONS
  // ============================================

  describe('putSession', () => {
    it('should put session with correct keys', async () => {
      mockSend.mockResolvedValue({});

      await service.putSession(mockSession);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const call = mockSend.mock.calls[0][0];
      expect(call.type).toBe('Put');
      expect(call.params.TableName).toBe('AuthBridgeTable');
      expect(call.params.Item.PK).toBe('SESSION#session_123');
      expect(call.params.Item.SK).toBe('META');
      expect(call.params.Item.GSI1PK).toBe('USER#user_456');
    });
  });

  describe('getSession', () => {
    it('should get session by ID', async () => {
      mockSend.mockResolvedValue({
        Item: {
          PK: 'SESSION#session_123',
          SK: 'META',
          GSI1PK: 'USER#user_456',
          GSI1SK: '2026-01-14T10:00:00Z#session_123',
          ...mockSession,
        },
      });

      const result = await service.getSession('session_123');

      expect(result).toEqual(mockSession);
      const call = mockSend.mock.calls[0][0];
      expect(call.params.Key).toEqual({ PK: 'SESSION#session_123', SK: 'META' });
    });

    it('should return null if session not found', async () => {
      mockSend.mockResolvedValue({ Item: undefined });

      const result = await service.getSession('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('queryUserSessions', () => {
    it('should query sessions by user ID using GSI1', async () => {
      mockSend.mockResolvedValue({
        Items: [
          { PK: 'SESSION#s1', SK: 'META', GSI1PK: 'USER#user_456', ...mockSession },
        ],
      });

      const result = await service.queryUserSessions('user_456');

      expect(result).toHaveLength(1);
      const call = mockSend.mock.calls[0][0];
      expect(call.params.IndexName).toBe('GSI1');
      expect(call.params.ExpressionAttributeValues[':pk']).toBe('USER#user_456');
    });
  });

  describe('countActiveUserSessions', () => {
    it('should count only active sessions', async () => {
      mockSend.mockResolvedValue({
        Items: [
          { ...mockSession, status: 'active' },
          { ...mockSession, sessionId: 's2', status: 'active' },
          { ...mockSession, sessionId: 's3', status: 'revoked' },
        ],
      });

      const count = await service.countActiveUserSessions('user_456');

      expect(count).toBe(2);
    });
  });

  // ============================================
  // API KEY OPERATIONS
  // ============================================

  describe('putApiKey', () => {
    it('should put API key with correct keys', async () => {
      mockSend.mockResolvedValue({});

      await service.putApiKey(mockApiKey);

      const call = mockSend.mock.calls[0][0];
      expect(call.params.Item.PK).toBe('APIKEY#client_456');
      expect(call.params.Item.SK).toBe('KEY#key_123');
      expect(call.params.Item.GSI2PK).toBe('CLIENT#client_456');
    });
  });

  describe('getApiKey', () => {
    it('should get API key by client and key ID', async () => {
      mockSend.mockResolvedValue({
        Item: {
          PK: 'APIKEY#client_456',
          SK: 'KEY#key_123',
          GSI2PK: 'CLIENT#client_456',
          GSI2SK: '2026-01-14T10:00:00Z#key_123',
          ...mockApiKey,
        },
      });

      const result = await service.getApiKey('client_456', 'key_123');

      expect(result).toEqual(mockApiKey);
    });

    it('should return null if API key not found', async () => {
      mockSend.mockResolvedValue({ Item: undefined });

      const result = await service.getApiKey('client_456', 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('queryClientApiKeys', () => {
    it('should query all API keys for a client', async () => {
      mockSend.mockResolvedValue({
        Items: [
          { PK: 'APIKEY#client_456', SK: 'KEY#k1', ...mockApiKey },
          { PK: 'APIKEY#client_456', SK: 'KEY#k2', ...mockApiKey, keyId: 'k2' },
        ],
      });

      const result = await service.queryClientApiKeys('client_456');

      expect(result).toHaveLength(2);
      const call = mockSend.mock.calls[0][0];
      expect(call.params.KeyConditionExpression).toBe('PK = :pk AND begins_with(SK, :skPrefix)');
    });
  });

  // ============================================
  // AUDIT LOG OPERATIONS
  // ============================================

  describe('putAuditLog', () => {
    it('should put audit log with correct keys', async () => {
      mockSend.mockResolvedValue({});

      await service.putAuditLog(mockAuditEntry);

      const call = mockSend.mock.calls[0][0];
      expect(call.params.Item.PK).toBe('AUDIT#2026-01-14');
      expect(call.params.Item.SK).toBe('2026-01-14T10:00:00Z#event_123');
      expect(call.params.Item.GSI3PK).toBe('USER#user_456');
    });
  });

  describe('queryAuditLogsByDate', () => {
    it('should query audit logs by date', async () => {
      mockSend.mockResolvedValue({
        Items: [
          { PK: 'AUDIT#2026-01-14', SK: '2026-01-14T10:00:00Z#e1', ...mockAuditEntry },
        ],
      });

      const result = await service.queryAuditLogsByDate('2026-01-14');

      expect(result).toHaveLength(1);
      const call = mockSend.mock.calls[0][0];
      expect(call.params.ExpressionAttributeValues[':pk']).toBe('AUDIT#2026-01-14');
    });
  });

  describe('queryAuditLogsByUser', () => {
    it('should query audit logs by user using GSI3', async () => {
      mockSend.mockResolvedValue({
        Items: [
          { PK: 'AUDIT#2026-01-14', GSI3PK: 'USER#user_456', ...mockAuditEntry },
        ],
      });

      const result = await service.queryAuditLogsByUser('user_456');

      expect(result).toHaveLength(1);
      const call = mockSend.mock.calls[0][0];
      expect(call.params.IndexName).toBe('GSI3');
      expect(call.params.ExpressionAttributeValues[':pk']).toBe('USER#user_456');
    });
  });
});
