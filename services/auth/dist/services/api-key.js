/**
 * API Key Management Service
 * Handles generation, validation, and lifecycle of API keys
 */
import { randomUUID } from 'crypto';
import { generateApiKey, hashApiKey } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { DynamoDBService } from './dynamodb.js';
const DEFAULT_RATE_LIMIT = 100; // requests per minute
const DEFAULT_SCOPES = ['read', 'write'];
export class ApiKeyService {
    dynamodb;
    constructor(dynamodb) {
        this.dynamodb = dynamodb || new DynamoDBService();
    }
    async createApiKey(input) {
        const keyId = randomUUID();
        const plainTextKey = generateApiKey();
        const keyHash = hashApiKey(plainTextKey);
        const now = new Date();
        let expiresAt = null;
        if (input.expiresInDays) {
            const expiry = new Date(now.getTime() + input.expiresInDays * 24 * 60 * 60 * 1000);
            expiresAt = expiry.toISOString();
        }
        const apiKey = {
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
        await this.dynamodb.putApiKey(apiKey);
        logger.audit('API_KEY_CREATED', {
            clientId: input.clientId,
            keyId,
            name: input.name,
            scopes: apiKey.scopes,
        });
        // Return the plain text key ONLY on creation - it cannot be retrieved later
        return { apiKey, plainTextKey };
    }
    async validateApiKey(plainTextKey, clientId) {
        const keyHash = hashApiKey(plainTextKey);
        let apiKey;
        if (clientId === '*') {
            // Search across all clients (for API key authorizer)
            // Extract client ID from API key prefix if possible
            const match = plainTextKey.match(/^ab_(live|test)_/);
            if (!match) {
                logger.warn('API key validation failed: invalid format');
                return { valid: false, error: 'Invalid API key format' };
            }
            // For now, we need to scan - in production, consider adding a GSI on keyHash
            // This is acceptable for MVP since API keys are cached by API Gateway authorizer
            const allKeys = await this.dynamodb.scanAllApiKeys();
            apiKey = allKeys.find(k => k.keyHash === keyHash);
        }
        else {
            // Query all keys for the specific client
            const clientKeys = await this.dynamodb.queryClientApiKeys(clientId);
            apiKey = clientKeys.find(k => k.keyHash === keyHash);
        }
        if (!apiKey) {
            logger.warn('API key validation failed: key not found');
            return { valid: false, error: 'Invalid API key' };
        }
        if (apiKey.status !== 'active') {
            logger.warn('API key validation failed: key not active', { keyId: apiKey.keyId, status: apiKey.status });
            return { valid: false, error: `API key is ${apiKey.status}` };
        }
        if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
            apiKey.status = 'expired';
            await this.dynamodb.updateApiKey(apiKey);
            logger.warn('API key validation failed: key expired', { keyId: apiKey.keyId });
            return { valid: false, error: 'API key has expired' };
        }
        // Update last used timestamp
        apiKey.lastUsed = new Date().toISOString();
        await this.dynamodb.updateApiKey(apiKey);
        return { valid: true, apiKey };
    }
    async revokeApiKey(clientId, keyId) {
        const apiKey = await this.dynamodb.getApiKey(clientId, keyId);
        if (apiKey) {
            apiKey.status = 'revoked';
            await this.dynamodb.updateApiKey(apiKey);
            logger.audit('API_KEY_REVOKED', {
                clientId: apiKey.clientId,
                keyId,
                name: apiKey.name,
            });
        }
    }
    async rotateApiKey(clientId, keyId) {
        const oldKey = await this.dynamodb.getApiKey(clientId, keyId);
        if (!oldKey) {
            return null;
        }
        // Revoke old key
        await this.revokeApiKey(clientId, keyId);
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
    async getClientApiKeys(clientId) {
        return this.dynamodb.queryClientApiKeys(clientId);
    }
    async getApiKeyById(clientId, keyId) {
        return this.dynamodb.getApiKey(clientId, keyId);
    }
}
