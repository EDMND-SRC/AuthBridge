import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './revoke-api-key.js';
import { ApiKeyService } from '../services/api-key.js';

vi.mock('../services/api-key.js');
vi.mock('../services/audit.js');

describe('revoke-api-key handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should revoke an API key successfully', async () => {
    vi.mocked(ApiKeyService.prototype.revokeApiKey).mockResolvedValue(undefined);

    const event = {
      requestContext: {
        requestId: 'test-request-id',
        authorizer: {
          clientId: 'client-123',
        },
      },
      pathParameters: {
        keyId: 'key-456',
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('API key revoked successfully');
    expect(ApiKeyService.prototype.revokeApiKey).toHaveBeenCalledWith('client-123', 'key-456');
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
