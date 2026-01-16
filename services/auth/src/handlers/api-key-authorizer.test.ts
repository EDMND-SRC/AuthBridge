import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { APIGatewayTokenAuthorizerEvent } from 'aws-lambda';
import { handler } from './api-key-authorizer.js';
import { ApiKeyService } from '../services/api-key.js';

vi.mock('../services/api-key.js');

describe('api-key-authorizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should authorize valid API key', async () => {
    const mockValidation = {
      valid: true,
      apiKey: {
        keyId: 'key-123',
        clientId: 'client-456',
        keyHash: 'hash',
        name: 'Test Key',
        createdAt: '2026-01-01T00:00:00Z',
        expiresAt: null,
        lastUsed: null,
        status: 'active' as const,
        scopes: ['read', 'write'],
        rateLimit: 100,
      },
    };

    vi.mocked(ApiKeyService.prototype.validateApiKey).mockResolvedValue(mockValidation);

    const event = {
      type: 'TOKEN',
      methodArn: 'arn:aws:execute-api:af-south-1:123456789012:abcdef123/staging/POST/verifications',
      authorizationToken: 'Bearer ab_live_1234567890abcdef',
    } as APIGatewayTokenAuthorizerEvent;

    const result = await handler(event);

    expect(result.principalId).toBe('client-456');
    expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
    expect(result.context).toMatchObject({
      clientId: 'client-456',
      keyId: 'key-123',
      scopes: 'read,write',
      rateLimit: '100',
    });
  });

  it('should deny invalid API key', async () => {
    vi.mocked(ApiKeyService.prototype.validateApiKey).mockResolvedValue({
      valid: false,
      error: 'Invalid API key',
    });

    const event = {
      type: 'TOKEN',
      methodArn: 'arn:aws:execute-api:af-south-1:123456789012:abcdef123/staging/POST/verifications',
      authorizationToken: 'Bearer ab_live_invalid',
    } as APIGatewayTokenAuthorizerEvent;

    await expect(handler(event)).rejects.toThrow('Unauthorized');
  });

  it('should deny when token is missing', async () => {
    const event = {
      type: 'TOKEN',
      methodArn: 'arn:aws:execute-api:af-south-1:123456789012:abcdef123/staging/POST/verifications',
      authorizationToken: '',
    } as APIGatewayTokenAuthorizerEvent;

    await expect(handler(event)).rejects.toThrow('Unauthorized');
  });

  it('should deny expired API key', async () => {
    vi.mocked(ApiKeyService.prototype.validateApiKey).mockResolvedValue({
      valid: false,
      error: 'API key has expired',
    });

    const event = {
      type: 'TOKEN',
      methodArn: 'arn:aws:execute-api:af-south-1:123456789012:abcdef123/staging/POST/verifications',
      authorizationToken: 'Bearer ab_live_expired',
    } as APIGatewayTokenAuthorizerEvent;

    await expect(handler(event)).rejects.toThrow('Unauthorized');
  });
});
