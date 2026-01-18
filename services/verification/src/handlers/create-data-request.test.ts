import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

// Use vi.hoisted to define mock functions that will be used in vi.mock factories
const { mockDynamoDBSend, mockLambdaSend, mockAuditLogEvent } = vi.hoisted(() => ({
  mockDynamoDBSend: vi.fn(),
  mockLambdaSend: vi.fn(),
  mockAuditLogEvent: vi.fn(),
}));

// Mock all AWS SDK modules before any imports
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(function() { return { send: mockDynamoDBSend }; }),
  PutItemCommand: vi.fn(function(params) { return { ...params, _type: 'PutItemCommand' }; }),
  GetItemCommand: vi.fn(function(params) { return { ...params, _type: 'GetItemCommand' }; }),
}));

vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: vi.fn(function() { return { send: mockLambdaSend }; }),
  InvokeCommand: vi.fn(function(params) { return { ...params, _type: 'InvokeCommand' }; }),
}));

vi.mock('@aws-sdk/util-dynamodb', () => ({
  marshall: vi.fn(function(obj) { return obj; }),
  unmarshall: vi.fn(function(obj) { return obj; }),
}));

vi.mock('../services/audit', () => ({
  AuditService: vi.fn(function() { return { logEvent: mockAuditLogEvent }; }),
}));

vi.mock('../middleware/audit-context', () => ({
  auditContextMiddleware: vi.fn(function() { return { before: vi.fn() }; }),
  getAuditContext: vi.fn(function() {
    return {
      userId: 'user-123',
      clientId: 'CLIENT#acme-corp',
      ipAddress: '127.0.0.1',
    };
  }),
}));

vi.mock('../middleware/security-headers', () => ({
  securityHeadersMiddleware: vi.fn(function() { return { after: vi.fn() }; }),
}));

vi.mock('../middleware/rate-limit', () => ({
  rateLimitMiddleware: vi.fn(function() { return { before: vi.fn(), onError: vi.fn() }; }),
}));

vi.mock('../middleware/rbac.js', () => ({
  requirePermission: vi.fn(function() { return { before: vi.fn() }; }),
}));

// Import the module once after mocks are set up
import { handler } from './create-data-request';

describe('createDataRequest', () => {
  beforeEach(() => {
    mockDynamoDBSend.mockReset();
    mockLambdaSend.mockReset();
    mockAuditLogEvent.mockReset();
    mockDynamoDBSend.mockResolvedValue({});
    mockLambdaSend.mockResolvedValue({});
    mockAuditLogEvent.mockResolvedValue({});
  });

  const createEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
    pathParameters: { type: 'export' },
    body: JSON.stringify({
      subjectIdentifier: { type: 'email', value: 'john@example.com' },
    }),
    requestContext: {
      identity: { sourceIp: '127.0.0.1' },
      authorizer: { claims: { sub: 'user-123' } },
    } as any,
    headers: { 'User-Agent': 'test-agent' },
    ...overrides,
  } as APIGatewayProxyEvent);

  it('should create export request successfully', async () => {
    const event = createEvent();

    const response = await handler(event, {} as Context);

    expect(response.statusCode).toBe(202);
    const body = JSON.parse(response.body);
    expect(body.type).toBe('export');
    expect(body.status).toBe('processing');
    expect(body.requestId).toMatch(/^dsr_/);
  });

  it('should create deletion request successfully', async () => {
    const event = createEvent({
      pathParameters: { type: 'deletion' },
      body: JSON.stringify({
        subjectIdentifier: { type: 'omangNumber', value: '123456789' },
        reason: 'user_request',
        confirmDeletion: true,
      }),
    });

    const response = await handler(event, {} as Context);

    expect(response.statusCode).toBe(202);
    const body = JSON.parse(response.body);
    expect(body.type).toBe('deletion');
    expect(body.estimatedCompletionTime).toBeDefined();
  });

  it('should reject deletion without confirmation', async () => {
    const event = createEvent({
      pathParameters: { type: 'deletion' },
      body: JSON.stringify({
        subjectIdentifier: { type: 'email', value: 'john@example.com' },
        reason: 'user_request',
      }),
    });

    const response = await handler(event, {} as Context);

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('confirmDeletion must be true');
  });

  it('should reject invalid request type', async () => {
    const event = createEvent({
      pathParameters: { type: 'invalid' },
    });

    const response = await handler(event, {} as Context);

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('Invalid request type');
  });

  it('should reject missing subject identifier', async () => {
    const event = createEvent({
      body: JSON.stringify({}),
    });

    const response = await handler(event, {} as Context);

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('subjectIdentifier is required');
  });

  it('should handle errors gracefully', async () => {
    const event = createEvent({
      body: 'invalid json',
    });

    const response = await handler(event, {} as Context);

    expect(response.statusCode).toBe(500);
    expect(response.body).toContain('Failed to create data request');
  });
});
