import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './list-api-keys.js';
import { ApiKeyService } from '../services/api-key.js';

vi.mock('../services/api-key.js');

describe('list-api-keys handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list all API keys for a client', async () => {
    const mockKeys = [
      {
        keyId: 'key-1',
        clientId: 'client-123',
        keyHash: 'hash1',
        name: 'Production Key',
        createdAt: '2026-01-01T00:00:00Z',
        expiresAt: null,
        lastUsed: '2026-01-15T10:00:00Z',
        status: 'active' as const,
        scopes: ['read', 'write'],
        rateLimit: 100,
      },
      {
        keyId: 'key-2',
        clientId: 'client-123',
        keyHash: 'hash2',
        name: 'Test Key',
        createdAt: '2026-01-10T00:00:00Z',
        expiresAt: '2026-02-10T00:00:00Z',
        lastUsed: null,
        status: 'active' as const,
        scopes: ['read'],
        rateLimit: 50,
      },
    ];

    vi.mocked(ApiKeyService.prototype.getClientApiKeys).mockResolvedValue(mockKeys);

    const event = {
      requestContext: {
        requestId: 'test-request-id',
        authorizer: {
          clientId: 'client-123',
        },
      },
      queryStringParameters: null,
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.keys).toHaveLength(2);
    expect(body.keys[0]).toMatchObject({
      keyId: 'key-1',
      name: 'Production Key',
      status: 'active',
    });
    expect(body.keys[0]).not.toHaveProperty('keyHash'); // Should not expose hash
  });

  it('should return empty array when no keys exist', async () => {
    vi.mocked(ApiKeyService.prototype.getClientApiKeys).mockResolvedValue([]);

    const event = {
      requestContext: {
        requestId: 'test-request-id',
        authorizer: {
          clientId: 'client-123',
        },
      },
      queryStringParameters: null,
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.keys).toEqual([]);
  });

  it('should return 401 when clientId is missing', async () => {
    const event = {
      requestContext: {
        requestId: 'test-request-id',
        authorizer: {},
      },
      queryStringParameters: null,
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });
});
