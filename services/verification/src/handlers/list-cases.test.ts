import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

// Mock the verification service before importing handler
const mockListVerificationsByClient = vi.fn();

vi.mock('../services/verification', () => ({
  VerificationService: vi.fn().mockImplementation(() => ({
    listVerificationsByClient: mockListVerificationsByClient,
  })),
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import handler after mocks are set up
import { handler } from './list-cases';

const mockContext: Context = {
  awsRequestId: 'test-request-id',
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'list-cases',
  functionVersion: '1',
  invokedFunctionArn: 'arn:aws:lambda:af-south-1:123456789:function:list-cases',
  memoryLimitInMB: '512',
  logGroupName: '/aws/lambda/list-cases',
  logStreamName: '2024/01/01/[$LATEST]abc123',
  getRemainingTimeInMillis: () => 30000,
  done: vi.fn(),
  fail: vi.fn(),
  succeed: vi.fn(),
};

const createMockEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
  body: null,
  headers: {},
  multiValueHeaders: {},
  httpMethod: 'GET',
  isBase64Encoded: false,
  path: '/api/v1/cases',
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: {
    accountId: '123456789',
    apiId: 'test-api',
    authorizer: {
      clientId: 'test-client-id',
    },
    httpMethod: 'GET',
    identity: {
      accessKey: null,
      accountId: null,
      apiKey: null,
      apiKeyId: null,
      caller: null,
      clientCert: null,
      cognitoAuthenticationProvider: null,
      cognitoAuthenticationType: null,
      cognitoIdentityId: null,
      cognitoIdentityPoolId: null,
      principalOrgId: null,
      sourceIp: '127.0.0.1',
      user: null,
      userAgent: 'test-agent',
      userArn: null,
    },
    path: '/api/v1/cases',
    protocol: 'HTTP/1.1',
    requestId: 'test-request-id',
    requestTimeEpoch: Date.now(),
    resourceId: 'test-resource',
    resourcePath: '/api/v1/cases',
    stage: 'test',
  },
  resource: '/api/v1/cases',
  ...overrides,
});

describe('list-cases handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when clientId is missing', async () => {
    const event = createMockEvent({
      requestContext: {
        ...createMockEvent().requestContext,
        authorizer: {},
      },
    });

    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return empty list when no cases exist', async () => {
    mockListVerificationsByClient.mockResolvedValue([]);

    const event = createMockEvent();
    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data).toEqual([]);
    expect(body.meta.pagination.total).toBe(0);
  });

  it('should mask Omang numbers in response', async () => {
    mockListVerificationsByClient.mockResolvedValue([
      {
        verificationId: 'ver_123',
        clientId: 'test-client-id',
        status: 'created',
        documentType: 'omang',
        customerMetadata: { name: 'John Doe', email: 'john@example.com' },
        extractedData: { idNumber: '123456789' },
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      },
    ]);

    const event = createMockEvent();
    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data[0].omangNumber).toBe('***6789');
    expect(body.data[0].omangNumber).not.toBe('123456789');
  });

  it('should filter by status', async () => {
    mockListVerificationsByClient.mockResolvedValue([
      {
        verificationId: 'ver_123',
        clientId: 'test-client-id',
        status: 'approved',
        documentType: 'omang',
        customerMetadata: { name: 'John Doe' },
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      },
    ]);

    const event = createMockEvent({
      queryStringParameters: { status: 'approved' },
    });
    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data[0].status).toBe('approved');
  });

  it('should paginate results', async () => {
    // Create 25 mock verifications
    const mockVerifications = Array.from({ length: 25 }, (_, i) => ({
      verificationId: `ver_${i}`,
      clientId: 'test-client-id',
      status: 'created',
      documentType: 'omang',
      customerMetadata: { name: `User ${i}` },
      createdAt: new Date(Date.now() - i * 1000).toISOString(),
      updatedAt: new Date(Date.now() - i * 1000).toISOString(),
    }));

    mockListVerificationsByClient.mockResolvedValue(mockVerifications);

    const event = createMockEvent({
      queryStringParameters: { limit: '10' },
    });
    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.length).toBe(10);
    expect(body.meta.pagination.hasMore).toBe(true);
    expect(body.meta.pagination.cursor).toBeTruthy();
    expect(body.meta.pagination.total).toBe(25);
  });

  it('should search by customer name', async () => {
    mockListVerificationsByClient.mockResolvedValue([
      {
        verificationId: 'ver_1',
        clientId: 'test-client-id',
        status: 'created',
        documentType: 'omang',
        customerMetadata: { name: 'John Doe', email: 'john@example.com' },
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      },
      {
        verificationId: 'ver_2',
        clientId: 'test-client-id',
        status: 'created',
        documentType: 'omang',
        customerMetadata: { name: 'Jane Smith', email: 'jane@example.com' },
        createdAt: '2024-01-15T11:00:00Z',
        updatedAt: '2024-01-15T11:00:00Z',
      },
    ]);

    const event = createMockEvent({
      queryStringParameters: { search: 'john' },
    });
    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.length).toBe(1);
    expect(body.data[0].customerName).toBe('John Doe');
  });

  it('should map internal status to case status', async () => {
    mockListVerificationsByClient.mockResolvedValue([
      {
        verificationId: 'ver_1',
        clientId: 'test-client-id',
        status: 'pending_review',
        documentType: 'omang',
        customerMetadata: { name: 'Test User' },
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      },
    ]);

    const event = createMockEvent();
    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data[0].status).toBe('in-review');
  });

  it('should return 500 on internal error', async () => {
    mockListVerificationsByClient.mockRejectedValue(new Error('Database error'));

    const event = createMockEvent();
    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});
