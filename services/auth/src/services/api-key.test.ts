import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiKeyService } from './api-key.js';

// Mock DynamoDB service
const mockPutApiKey = vi.fn();
const mockGetApiKey = vi.fn();
const mockUpdateApiKey = vi.fn();
const mockQueryClientApiKeys = vi.fn();

vi.mock('./dynamodb.js', () => ({
  DynamoDBService: vi.fn(() => ({
    putApiKey: mockPutApiKey,
    getApiKey: mockGetApiKey,
    updateApiKey: mockUpdateApiKey,
    queryClientApiKeys: mockQueryClientApiKeys,
  })),
}));

// Mock crypto utils
vi.mock('../utils/crypto.js', () => ({
  generateApiKey: vi.fn(() => 'ab_12345678901234567890123456789012'),
  hashApiKey: vi.fn((key: string) => `hash_${key}`),
}));

describe('ApiKeyService', () => {
  let apiKeyService: ApiKeyService;

  beforeEach(() => {
    vi.clearAllMocks();
    apiKeyService = new ApiKeyService();
    mockPutApiKey.mockResolvedValue(undefined);
    mockUpdateApiKey.mockResolvedValue(undefined);
  });

  describe('createApiKey', () => {
    it('should create a new API key', async () => {
      const { apiKey, plainTextKey } = await apiKeyService.createApiKey({
        clientId: 'client_123',
        name: 'Test Key',
      });

      expect(apiKey.keyId).toBeDefined();
      expect(apiKey.clientId).toBe('client_123');
      expect(apiKey.name).toBe('Test Key');
      expect(apiKey.status).toBe('active');
      expect(plainTextKey).toBe('ab_12345678901234567890123456789012');
      expect(mockPutApiKey).toHaveBeenCalledWith(expect.objectContaining({
        clientId: 'client_123',
        name: 'Test Key',
        status: 'active',
      }));
    });

    it('should create API key with custom scopes and rate limit', async () => {
      const { apiKey } = await apiKeyService.createApiKey({
        clientId: 'client_123',
        name: 'Custom Key',
        scopes: ['read'],
        rateLimit: 50,
      });

      expect(apiKey.scopes).toEqual(['read']);
      expect(apiKey.rateLimit).toBe(50);
    });

    it('should create API key with expiration', async () => {
      const { apiKey } = await apiKeyService.createApiKey({
        clientId: 'client_123',
        name: 'Expiring Key',
        expiresInDays: 30,
      });

      expect(apiKey.expiresAt).toBeDefined();
      const expiresAt = new Date(apiKey.expiresAt!);
      const now = new Date();
      const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(29);
      expect(diffDays).toBeLessThanOrEqual(30);
    });
  });

  describe('validateApiKey', () => {
    it('should validate a valid API key', async () => {
      const mockApiKey = {
        keyId: 'key_123',
        clientId: 'client_123',
        keyHash: 'hash_ab_12345678901234567890123456789012',
        name: 'Test Key',
        status: 'active',
        expiresAt: null,
        lastUsed: null,
        scopes: ['read', 'write'],
        rateLimit: 100,
      };
      mockQueryClientApiKeys.mockResolvedValue([mockApiKey]);

      const result = await apiKeyService.validateApiKey('ab_12345678901234567890123456789012', 'client_123');

      expect(result.valid).toBe(true);
      expect(result.apiKey).toBeDefined();
      expect(result.apiKey?.clientId).toBe('client_123');
      expect(mockUpdateApiKey).toHaveBeenCalledWith(expect.objectContaining({
        lastUsed: expect.any(String),
      }));
    });

    it('should reject invalid API key', async () => {
      mockQueryClientApiKeys.mockResolvedValue([]);

      const result = await apiKeyService.validateApiKey('ab_invalid_key_12345678901234', 'client_123');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('should reject revoked API key', async () => {
      const mockApiKey = {
        keyId: 'key_123',
        clientId: 'client_123',
        keyHash: 'hash_ab_12345678901234567890123456789012',
        status: 'revoked',
      };
      mockQueryClientApiKeys.mockResolvedValue([mockApiKey]);

      const result = await apiKeyService.validateApiKey('ab_12345678901234567890123456789012', 'client_123');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('revoked');
    });

    it('should reject expired API key', async () => {
      const mockApiKey = {
        keyId: 'key_123',
        clientId: 'client_123',
        keyHash: 'hash_ab_12345678901234567890123456789012',
        status: 'active',
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired
      };
      mockQueryClientApiKeys.mockResolvedValue([mockApiKey]);

      const result = await apiKeyService.validateApiKey('ab_12345678901234567890123456789012', 'client_123');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key has expired');
      expect(mockUpdateApiKey).toHaveBeenCalledWith(expect.objectContaining({
        status: 'expired',
      }));
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke an active API key', async () => {
      const mockApiKey = {
        keyId: 'key_123',
        clientId: 'client_123',
        name: 'Test Key',
        status: 'active',
      };
      mockGetApiKey.mockResolvedValue(mockApiKey);

      await apiKeyService.revokeApiKey('client_123', 'key_123');

      expect(mockUpdateApiKey).toHaveBeenCalledWith(expect.objectContaining({
        status: 'revoked',
      }));
    });

    it('should handle revoking non-existent key gracefully', async () => {
      mockGetApiKey.mockResolvedValue(null);

      await expect(apiKeyService.revokeApiKey('client_123', 'non-existent')).resolves.toBeUndefined();
    });
  });

  describe('rotateApiKey', () => {
    it('should rotate an API key', async () => {
      const oldKey = {
        keyId: 'old_key_123',
        clientId: 'client_123',
        name: 'Test Key',
        status: 'active',
        scopes: ['read', 'write'],
        rateLimit: 200,
      };
      mockGetApiKey.mockResolvedValue(oldKey);

      const result = await apiKeyService.rotateApiKey('client_123', 'old_key_123');

      expect(result).toBeDefined();
      expect(result!.apiKey.keyId).not.toBe('old_key_123');
      expect(result!.apiKey.name).toBe(oldKey.name);
      expect(result!.apiKey.scopes).toEqual(oldKey.scopes);
      expect(result!.apiKey.rateLimit).toBe(oldKey.rateLimit);
      // Old key should be revoked
      expect(mockUpdateApiKey).toHaveBeenCalledWith(expect.objectContaining({
        status: 'revoked',
      }));
    });

    it('should return null for non-existent key', async () => {
      mockGetApiKey.mockResolvedValue(null);

      const result = await apiKeyService.rotateApiKey('client_123', 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getClientApiKeys', () => {
    it('should return all active keys for a client', async () => {
      const mockKeys = [
        { keyId: 'k1', clientId: 'client_123', status: 'active' },
        { keyId: 'k2', clientId: 'client_123', status: 'active' },
        { keyId: 'k3', clientId: 'client_123', status: 'revoked' },
      ];
      mockQueryClientApiKeys.mockResolvedValue(mockKeys);

      const keys = await apiKeyService.getClientApiKeys('client_123');

      expect(keys).toHaveLength(2);
      expect(keys.every(k => k.status === 'active')).toBe(true);
    });
  });

  describe('getApiKeyById', () => {
    it('should return API key by ID', async () => {
      const mockApiKey = {
        keyId: 'key_123',
        clientId: 'client_123',
        name: 'Test Key',
      };
      mockGetApiKey.mockResolvedValue(mockApiKey);

      const result = await apiKeyService.getApiKeyById('client_123', 'key_123');

      expect(result).toEqual(mockApiKey);
      expect(mockGetApiKey).toHaveBeenCalledWith('client_123', 'key_123');
    });
  });
});
