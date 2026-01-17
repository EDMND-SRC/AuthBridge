import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';

// Mock AWS SDK clients before importing handler
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
  PutItemCommand: vi.fn(),
  GetItemCommand: vi.fn(),
}));

vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: vi.fn(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
  InvokeCommand: vi.fn(),
}));

vi.mock('@aws-sdk/util-dynamodb', () => ({
  marshall: vi.fn((obj) => obj),
  unmarshall: vi.fn((obj) => obj),
}));

vi.mock('../services/audit', () => ({
  AuditService: vi.fn(() => ({
    logEvent: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock('../middleware/audit-context', () => ({
  auditContextMiddleware: vi.fn(() => ({
    before: vi.fn(),
  })),
  getAuditContext: vi.fn(() => ({
    userId: 'user-123',
    clientId: 'CLIENT#acme-corp',
    ipAddress: '127.0.0.1',
  })),
}));

vi.mock('../middleware/security-headers', () => ({
  securityHeadersMiddleware: vi.fn(() => ({
    after: vi.fn(),
  })),
}));

vi.mock('../middleware/rate-limit', () => ({
  rateLimitMiddleware: vi.fn(() => ({
    before: vi.fn(),
    after: vi.fn(),
  })),
}));

// Import handler after mocks are set up
// We'll test the baseHandler directly to avoid middy complexity
const createDataRequestModule = await import('./create-data-request');
// Access the baseHandler via the module internals for testing
const baseHandler = (createDataRequestModule as any).baseHandler || createDataRequestModule.handler;

describe('createDataRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create export request successfully', async () => {
    const event = {
      pathParameters: { type: 'export' },
      body: JSON.stringify({
        subjectIdentifier: {
          type: 'email',
          value: 'john@example.com',
        },
        notificationEmail: 'john@example.com',
      }),
      requestContext: {
        identity: { sourceIp: '127.0.0.1' },
        authorizer: { claims: { sub: 'user-123' } },
      },
      headers: { 'User-Agent': 'test-agent' },
    } as any as APIGatewayProxyEvent;

    // Call handler directly (middy wrapper is tested separately)
    const { handler } = await import('./create-data-request');
    const response = await handler(event, {} as any, {} as any);

    expect(response.statusCode).toBe(202);
    const body = JSON.parse(response.body);
    expect(body.type).toBe('export');
    expect(body.status).toBe('processing');
    expect(body.requestId).toMatch(/^dsr_/);
  });

  it('should create deletion request successfully', async () => {
    const event = {
      pathParameters: { type: 'deletion' },
      body: JSON.stringify({
        subjectIdentifier: {
          type: 'omangNumber',
          value: '123456789',
        },
        reason: 'user_request',
        confirmDeletion: true,
      }),
      requestContext: {
        identity: { sourceIp: '127.0.0.1' },
        authorizer: { claims: { sub: 'user-123' } },
      },
      headers: { 'User-Agent': 'test-agent' },
    } as any as APIGatewayProxyEvent;

    const { handler } = await import('./create-data-request');
    const response = await handler(event, {} as any, {} as any);

    expect(response.statusCode).toBe(202);
    const body = JSON.parse(response.body);
    expect(body.type).toBe('deletion');
    expect(body.estimatedCompletionTime).toBeDefined();
  });

  it('should reject deletion without confirmation', async () => {
    const event = {
      pathParameters: { type: 'deletion' },
      body: JSON.stringify({
        subjectIdentifier: {
          type: 'email',
          value: 'john@example.com',
        },
        reason: 'user_request',
      }),
      requestContext: {
        identity: { sourceIp: '127.0.0.1' },
      },
      headers: {},
    } as any as APIGatewayProxyEvent;

    const { handler } = await import('./create-data-request');
    const response = await handler(event, {} as any, {} as any);

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('confirmDeletion must be true');
  });

  it('should reject invalid request type', async () => {
    const event = {
      pathParameters: { type: 'invalid' },
      body: JSON.stringify({
        subjectIdentifier: {
          type: 'email',
          value: 'john@example.com',
        },
      }),
      requestContext: {
        identity: { sourceIp: '127.0.0.1' },
      },
      headers: {},
    } as any as APIGatewayProxyEvent;

    const { handler } = await import('./create-data-request');
    const response = await handler(event, {} as any, {} as any);

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('Invalid request type');
  });

  it('should reject missing subject identifier', async () => {
    const event = {
      pathParameters: { type: 'export' },
      body: JSON.stringify({}),
      requestContext: {
        identity: { sourceIp: '127.0.0.1' },
      },
      headers: {},
    } as any as APIGatewayProxyEvent;

    const { handler } = await import('./create-data-request');
    const response = await handler(event, {} as any, {} as any);

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('subjectIdentifier is required');
  });

  it('should handle errors gracefully', async () => {
    const event = {
      pathParameters: { type: 'export' },
      body: 'invalid json',
      requestContext: {
        identity: { sourceIp: '127.0.0.1' },
      },
      headers: {},
    } as any as APIGatewayProxyEvent;

    const { handler } = await import('./create-data-request');
    const response = await handler(event, {} as any, {} as any);

    expect(response.statusCode).toBe(500);
    expect(response.body).toContain('Failed to create data request');
  });
});
