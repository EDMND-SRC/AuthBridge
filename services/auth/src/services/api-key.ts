/**
 * API Key Management Service
 * Handles generation, validation, and lifecycle of API keys
 */

import { randomUUID } from 'crypto';
import { generateApiKey, hashApiKey, verifyApiKey } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

export interface ApiKey {
  keyId: string;
  clientId: string;
  keyHash: string;
  name: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsed: string | null;
  status: 'active' | 'revoked' | 'expired';
  scopes: string[];
  rateLimit: number; // requests per minute
}

export interface CreateApiKeyInput {
  clientId: string;
  name: string;
  scopes?: string[];
  rateLimit?: number;
  expiresInDays?: number;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  apiKey?: ApiKey;
  error?: string;
}

const DEFAULT_RATE_LIMIT = 100; // requests per minute
const DEFAULT_SCOPES = ['read', 'write'];

// In-memory storage for MVP (replace with DynamoDB in production)
const apiKeys = new Map<string, ApiKey>();
// Index by hash for fast lookup during validation
const apiKeysByHash = new Map<string, string>(); // hash -> keyId

export class ApiKeyService {
  // For testing: clear all API keys
  clearAllKeys(): void {
    apiKeys.clear();
    apiKeysByHash.clear();
  }

  async createApiKey(input: CreateApiKeyInput): Promise<{ apiKey: ApiKey; plainTextKey: string }> {
    const keyId = randomUUID();
    const plainTextKey = generateApiKey();
    const keyHash = hashApiKey(plainTextKey);
    const now = new Date();

    let expiresAt: string | null = null;
    if (input.expiresInDays) {
      const expiry = new Date(now.getTime() + input.expiresInDays * 24 * 60 * 60 * 1000);
      expiresAt = expiry.toISOString();
    }

    const apiKey: ApiKey = {
      keyId,
      clientId: input.clientId,
      keyHash,
      name: input.name,
      createdAt: now.toISOString(),
      expiresAt,
      lastUsed: null,
      status: 'active',
      scopes: input.scopes || DEFAULT_SCOPES,
      rateLimit: input.rateLimit || DEFAULT_RATE_LIMIT,
    };

    apiKeys.set(keyId, apiKey);
    apiKeysByHash.set(keyHash, keyId);

    logger.audit('API_KEY_CREATED', {
      clientId: input.clientId,
      keyId,
      name: input.name,
      scopes: apiKey.scopes,
    });

    // Return the plain text key ONLY on creation - it cannot be retrieved later
    return { apiKey, plainTextKey };
  }

  async validateApiKey(plainTextKey: string): Promise<ApiKeyValidationResult> {
    const keyHash = hashApiKey(plainTextKey);
    const keyId = apiKeysByHash.get(keyHash);

    if (!keyId) {
      logger.warn('API key validation failed: key not found');
      return { valid: false, error: 'Invalid API key' };
    }

    const apiKey = apiKeys.get(keyId);
    if (!apiKey) {
      return { valid: false, error: 'API key not found' };
    }

    if (apiKey.status !== 'active') {
      logger.warn('API key validation failed: key not active', { keyId, status: apiKey.status });
      return { valid: false, error: `API key is ${apiKey.status}` };
    }

    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      apiKey.status = 'expired';
      apiKeys.set(keyId, apiKey);
      logger.warn('API key validation failed: key expired', { keyId });
      return { valid: false, error: 'API key has expired' };
    }

    // Update last used timestamp
    apiKey.lastUsed = new Date().toISOString();
    apiKeys.set(keyId, apiKey);

    return { valid: true, apiKey };
  }

  async revokeApiKey(keyId: string): Promise<void> {
    const apiKey = apiKeys.get(keyId);
    if (apiKey) {
      apiKey.status = 'revoked';
      apiKeys.set(keyId, apiKey);

      logger.audit('API_KEY_REVOKED', {
        clientId: apiKey.clientId,
        keyId,
        name: apiKey.name,
      });
    }
  }

  async rotateApiKey(keyId: string): Promise<{ apiKey: ApiKey; plainTextKey: string } | null> {
    const oldKey = apiKeys.get(keyId);
    if (!oldKey) {
      return null;
    }

    // Revoke old key
    await this.revokeApiKey(keyId);

    // Create new key with same settings
    const result = await this.createApiKey({
      clientId: oldKey.clientId,
      name: oldKey.name,
      scopes: oldKey.scopes,
      rateLimit: oldKey.rateLimit,
    });

    logger.audit('API_KEY_ROTATED', {
      clientId: oldKey.clientId,
      oldKeyId: keyId,
      newKeyId: result.apiKey.keyId,
    });

    return result;
  }

  async getClientApiKeys(clientId: string): Promise<ApiKey[]> {
    return Array.from(apiKeys.values()).filter(
      key => key.clientId === clientId && key.status === 'active'
    );
  }

  async getApiKeyById(keyId: string): Promise<ApiKey | undefined> {
    return apiKeys.get(keyId);
  }
}
