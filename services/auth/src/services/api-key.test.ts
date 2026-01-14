import { describe, it, expect, beforeEach } from 'vitest';
import { ApiKeyService } from './api-key.js';

describe('ApiKeyService', () => {
  let apiKeyService: ApiKeyService;

  beforeEach(() => {
    apiKeyService = new ApiKeyService();
    apiKeyService.clearAllKeys();
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
      expect(plainTextKey).toMatch(/^ab_[a-f0-9]{32}$/);
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
      const { plainTextKey } = await apiKeyService.createApiKey({
        clientId: 'client_123',
        name: 'Test Key',
      });

      const result = await apiKeyService.validateApiKey(plainTextKey);

      expect(result.valid).toBe(true);
      expect(result.apiKey).toBeDefined();
      expect(result.apiKey?.clientId).toBe('client_123');
    });

    it('should reject invalid API key', async () => {
      const result = await apiKeyService.validateApiKey('ab_invalid_key_12345678901234');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('should reject revoked API key', async () => {
      const { apiKey, plainTextKey } = await apiKeyService.createApiKey({
        clientId: 'client_123',
        name: 'Test Key',
      });

      await apiKeyService.revokeApiKey(apiKey.keyId);

      const result = await apiKeyService.validateApiKey(plainTextKey);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('revoked');
    });

    it('should update lastUsed on validation', async () => {
      const { apiKey, plainTextKey } = await apiKeyService.createApiKey({
        clientId: 'client_123',
        name: 'Test Key',
      });

      expect(apiKey.lastUsed).toBeNull();

      await apiKeyService.validateApiKey(plainTextKey);

      const updated = await apiKeyService.getApiKeyById(apiKey.keyId);
      expect(updated?.lastUsed).toBeDefined();
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke an active API key', async () => {
      const { apiKey } = await apiKeyService.createApiKey({
        clientId: 'client_123',
        name: 'Test Key',
      });

      await apiKeyService.revokeApiKey(apiKey.keyId);

      const updated = await apiKeyService.getApiKeyById(apiKey.keyId);
      expect(updated?.status).toBe('revoked');
    });
  });

  describe('rotateApiKey', () => {
    it('should rotate an API key', async () => {
      const { apiKey: oldKey, plainTextKey: oldPlainText } = await apiKeyService.createApiKey({
        clientId: 'client_123',
        name: 'Test Key',
        scopes: ['read', 'write'],
        rateLimit: 200,
      });

      const result = await apiKeyService.rotateApiKey(oldKey.keyId);

      expect(result).toBeDefined();
      expect(result!.apiKey.keyId).not.toBe(oldKey.keyId);
      expect(result!.plainTextKey).not.toBe(oldPlainText);
      expect(result!.apiKey.name).toBe(oldKey.name);
      expect(result!.apiKey.scopes).toEqual(oldKey.scopes);
      expect(result!.apiKey.rateLimit).toBe(oldKey.rateLimit);

      // Old key should be revoked
      const oldKeyResult = await apiKeyService.validateApiKey(oldPlainText);
      expect(oldKeyResult.valid).toBe(false);
    });
  });

  describe('getClientApiKeys', () => {
    it('should return all active keys for a client', async () => {
      await apiKeyService.createApiKey({ clientId: 'client_123', name: 'Key 1' });
      await apiKeyService.createApiKey({ clientId: 'client_123', name: 'Key 2' });
      await apiKeyService.createApiKey({ clientId: 'other_client', name: 'Key 3' });

      const keys = await apiKeyService.getClientApiKeys('client_123');

      expect(keys).toHaveLength(2);
      expect(keys.every(k => k.clientId === 'client_123')).toBe(true);
    });
  });
});
