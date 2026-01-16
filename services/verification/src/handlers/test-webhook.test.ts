import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from './test-webhook.js';
import { DynamoDBService } from '../services/dynamodb.js';
import { WebhookService } from '../services/webhook.js';

vi.mock('../services/dynamodb.js');
vi.mock('../services/webhook.js');

describe('test-webhook handler', () => {
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
    webhookUrl: 'https://webhook.example.com/authbridge',
    webhookSecret: 'test_secret',
    webhookEnabled: true,
    webhookEvents: ['verification.approved'],
    createdAt: '2026-01-16T10:00:00Z',
    updatedAt: '2026-01-16T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send test webhook successfully', async () => {
    const event = {
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
    vi.mocked(WebhookService.prototype.sendWebhook).mockResolvedValue(undefined);

    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Test webhook sent successfully');
    expect(body.webhookUrl).toBe('https://webhook.example.com/authbridge');
    expect(WebhookService.prototype.sendWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'approved',
        documentType: 'omang',
      }),
      'verification.approved'
    );
  });

  it('should return 401 when clientId is missing', async () => {
    const event = {
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

  it('should return 400 when webhook not configured', async () => {
    const event = {
      requestContext: {
        requestId: 'test-request-id',
        authorizer: {
          clientId: 'client_123',
        },
      },
    } as unknown as APIGatewayProxyEvent;

    vi.mocked(DynamoDBService.prototype.getItem).mockResolvedValue({
      Item: { ...mockClientConfig, webhookUrl: undefined },
    });

    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('WEBHOOK_NOT_CONFIGURED');
  });

  it('should include CORS headers', async () => {
    const event = {
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
    vi.mocked(WebhookService.prototype.sendWebhook).mockResolvedValue(undefined);

    const result = await handler(event, mockContext);

    expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(result.headers['Content-Type']).toBe('application/json');
  });

  it('should handle errors gracefully', async () => {
    const event = {
      requestContext: {
        requestId: 'test-request-id',
        authorizer: {
          clientId: 'client_123',
        },
      },
    } as unknown as APIGatewayProxyEvent;

    vi.mocked(DynamoDBService.prototype.getItem).mockRejectedValue(
      new Error('DynamoDB error')
    );

    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
