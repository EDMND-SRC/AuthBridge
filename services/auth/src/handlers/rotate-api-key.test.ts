import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './rotate-api-key.js';
import { ApiKeyService } from '../services/api-key.js';

vi.mock('../services/api-key.js');
vi.mock('../services/audit.js');

describe('rotate-api-key handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should rotate an API key successfully', async () => {
    const mockResult = {
      apiKey: {
        keyId: 'new-key-789',
        clientId: 'client-123',
        keyHash: 'new-hash',
        name: 'Production Key',
        createdAt: '2026-01-16T00:00:00Z',
        expiresAt: null,
        lastUsed: null,
        status: 'active' as const,
        scopes: ['read', 'write'],
        rateLimit: 100,
      },
      plainTextKey: 'ab_live_newkey123456789abcdef',
    };

    vi.mocked(ApiKeyService.prototype.rotateApiKey).mockResolvedValue(mockResult);

    const event = {
      requestContext: {
        requestId: 'test-request-id',
        authorizer: {
          clientId: 'client-123',
        },
      },
      pathParameters: {
        keyId: 'old-key-456',
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.keyId).toBe('new-key-789');
    expect(body.apiKey).toBe('ab_live_newkey123456789abcdef');
    expect(body.warning).toContain('Store this API key securely');
    expect(ApiKeyService.prototype.rotateApiKey).toHaveBeenCalledWith('client-123', 'old-key-456');
  });

  it('should return 404 when key not found', async () => {
    vi.mocked(ApiKeyService.prototype.rotateApiKey).mockResolvedValue(null);

    const event = {
      requestContext: {
        requestId: 'test-request-id',
        authorizer: {
          clientId: 'client-123',
        },
      },
      pathParameters: {
        keyId: 'nonexistent-key',
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('should return 400 when keyId is missing', async () => {
    const event = {
      requestContext: {
        requestId: 'test-request-id',
        authorizer: {
          clientId: 'client-123',
        },
      },
      pathParameters: null,
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 401 when clientId is missing', async () => {
    const event = {
      requestContext: {
        requestId: 'test-request-id',
        authorizer: {},
      },
      pathParameters: {
        keyId: 'key-456',
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });
});
