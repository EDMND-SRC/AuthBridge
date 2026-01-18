import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

vi.mock('../services/dynamodb.js', () => ({
  DynamoDBService: vi.fn(function() {
    return {
      getItem: vi.fn(),
      putItem: vi.fn(),
    };
  }),
}));

import { handler } from './configure-webhook.js';
import { DynamoDBService } from '../services/dynamodb.js';

describe('configure-webhook handler', () => {
  const mockContext = {
    requestId: 'test-request-id',
  } as Context;

  const mockClientConfig = {
    PK: 'CLIENT#client_123',
    SK: 'CONFIG',
    clientId: 'client_123',
    companyName: 'Test Company',
    tier: 'business' as const,
    apiKey: 'hashed_key',
    webhookUrl: undefined,
    webhookSecret: undefined,
    webhookEnabled: false,
    webhookEvents: [],
    createdAt: '2026-01-16T10:00:00Z',
    updatedAt: '2026-01-16T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should configure webhook with auto-generated secret', async () => {
    const event = {
      body: JSON.stringify({
        webhookUrl: 'https://webhook.example.com/authbridge',
        webhookEnabled: true,
        webhookEvents: ['verification.approved', 'verification.rejected'],
      }),
      requestContext: {
        requestId: 'test-request-id',
        authorizer: {
          clientId: 'client_123',
        },
      },
    } as unknown as APIGatewayProxyEvent;

    vi.mocked(DynamoDBService.prototype.getItem).mockResolvedValue({
      Item: mockClientConfig,
    });
    vi.mocked(DynamoDBService.prototype.putItem).mockResolvedValue(undefined);

    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.webhookUrl).toBe('https://webhook.example.com/authbridge');
    expect(body.webhookEnabled).toBe(true);
    expect(body.webhookEvents).toEqual([
      'verification.approved',
      'verification.rejected',
    ]);
    expect(body.webhookSecret).toMatch(/^[a-f0-9]{64}$/); // Auto-generated
  });

  it('should not return secret if provided by client', async () => {
    const event = {
      body: JSON.stringify({
        webhookUrl: 'https://webhook.example.com/authbridge',
        webhookSecret: 'client_provided_secret_key_min_32_chars_long',
        webhookEnabled: true,
      }),
      requestContext: {
        requestId: 'test-request-id',
        authorizer: {
          clientId: 'client_123',
        },
      },
    } as unknown as APIGatewayProxyEvent;

    vi.mocked(DynamoDBService.prototype.getItem).mockResolvedValue({
      Item: mockClientConfig,
    });
    vi.mocked(DynamoDBService.prototype.putItem).mockResolvedValue(undefined);

    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.webhookSecret).toBeUndefined(); // Should not return provided secret
  });

  it('should reject non-HTTPS webhook URL', async () => {
    const event = {
      body: JSON.stringify({
        webhookUrl: 'http://webhook.example.com/authbridge',
      }),
      requestContext: {
        requestId: 'test-request-id',
        authorizer: {
          clientId: 'client_123',
        },
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('INVALID_WEBHOOK_URL');
    expect(body.error.message).toContain('HTTPS');
  });

  it('should reject invalid webhook URL format', async () => {
    const event = {
      body: JSON.stringify({
        webhookUrl: 'not-a-valid-url',
      }),
      requestContext: {
        requestId: 'test-request-id',
        authorizer: {
          clientId: 'client_123',
        },
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('INVALID_WEBHOOK_URL');
    // URL without https:// prefix triggers HTTPS validation first
    expect(body.error.message).toContain('HTTPS');
  });

  it('should return 401 when clientId is missing', async () => {
    const event = {
      body: JSON.stringify({
        webhookUrl: 'https://webhook.example.com/authbridge',
      }),
      requestContext: {
        requestId: 'test-request-id',
        authorizer: {},
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 404 when client config not found', async () => {
    const event = {
      body: JSON.stringify({
        webhookUrl: 'https://webhook.example.com/authbridge',
      }),
      requestContext: {
        requestId: 'test-request-id',
        authorizer: {
          clientId: 'client_123',
        },
      },
    } as unknown as APIGatewayProxyEvent;

    vi.mocked(DynamoDBService.prototype.getItem).mockResolvedValue({
      Item: undefined,
    });

    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('CLIENT_NOT_FOUND');
  });

  it('should use default webhook events if not provided', async () => {
    const event = {
      body: JSON.stringify({
        webhookUrl: 'https://webhook.example.com/authbridge',
      }),
      requestContext: {
        requestId: 'test-request-id',
        authorizer: {
          clientId: 'client_123',
        },
      },
    } as unknown as APIGatewayProxyEvent;

    vi.mocked(DynamoDBService.prototype.getItem).mockResolvedValue({
      Item: mockClientConfig,
    });
    vi.mocked(DynamoDBService.prototype.putItem).mockResolvedValue(undefined);

    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.webhookEvents).toEqual([
      'verification.approved',
      'verification.rejected',
      'verification.resubmission_required',
      'verification.expired',
    ]);
  });

  it('should include CORS headers', async () => {
    const event = {
      body: JSON.stringify({
        webhookUrl: 'https://webhook.example.com/authbridge',
      }),
      requestContext: {
        requestId: 'test-request-id',
        authorizer: {
          clientId: 'client_123',
        },
      },
    } as unknown as APIGatewayProxyEvent;

    vi.mocked(DynamoDBService.prototype.getItem).mockResolvedValue({
      Item: mockClientConfig,
    });
    vi.mocked(DynamoDBService.prototype.putItem).mockResolvedValue(undefined);

    const result = await handler(event, mockContext);

    expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(result.headers['Content-Type']).toBe('application/json');
  });
});
