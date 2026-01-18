import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use vi.hoisted to define mock functions that will be used in vi.mock factories
const { mockDynamoDBSend } = vi.hoisted(() => ({
  mockDynamoDBSend: vi.fn(),
}));

// Mock all AWS SDK modules before any imports
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(function() { return { send: mockDynamoDBSend }; }),
  GetItemCommand: vi.fn(function(params) { return { ...params, _type: 'GetItemCommand' }; }),
  PutItemCommand: vi.fn(function(params) { return { ...params, _type: 'PutItemCommand' }; }),
  UpdateItemCommand: vi.fn(function(params) { return { ...params, _type: 'UpdateItemCommand' }; }),
}));

vi.mock('@aws-sdk/util-dynamodb', () => ({
  marshall: vi.fn(function(obj) { return obj; }),
  unmarshall: vi.fn(function(obj) { return obj; }),
}));

// Import the module once after mocks are set up
import { rateLimitMiddleware } from './rate-limit';

describe('rateLimitMiddleware', () => {
  beforeEach(() => {
    mockDynamoDBSend.mockReset();
  });

  const createRequest = (userId?: string, sourceIp = '127.0.0.1') => ({
    event: {
      requestContext: {
        authorizer: userId ? { claims: { sub: userId } } : undefined,
        identity: { sourceIp },
      },
    },
    context: {},
    response: undefined,
    error: undefined,
    internal: {},
  });

  it('should allow first request and create rate limit record', async () => {
    mockDynamoDBSend.mockResolvedValueOnce({ Item: null });
    mockDynamoDBSend.mockResolvedValueOnce({});

    const request = createRequest('user-123');
    const middleware = rateLimitMiddleware({ maxRequests: 100, windowHours: 1 });

    await middleware.before(request);

    expect(mockDynamoDBSend).toHaveBeenCalledTimes(2);
  });

  it('should increment counter for subsequent requests', async () => {
    const now = Date.now();
    mockDynamoDBSend.mockResolvedValueOnce({
      Item: {
        PK: 'RATE_LIMIT#user-123',
        SK: 'WINDOW',
        requestCount: 5,
        windowStart: now - 30000,
        expiresAt: Math.floor((now + 3600000) / 1000),
      },
    });
    mockDynamoDBSend.mockResolvedValueOnce({});

    const request = createRequest('user-123');
    const middleware = rateLimitMiddleware({ maxRequests: 100, windowHours: 1 });

    await middleware.before(request);

    expect(mockDynamoDBSend).toHaveBeenCalledTimes(2);
  });

  it('should reject request when rate limit exceeded', async () => {
    const now = Date.now();
    mockDynamoDBSend.mockResolvedValueOnce({
      Item: {
        PK: 'RATE_LIMIT#user-123#data-request',
        SK: 'COUNTER',
        requestCount: 100,
        lastReset: now - 30000,
        ttl: Math.floor((now + 3600000) / 1000),
      },
    });

    const request = createRequest('user-123');
    const middleware = rateLimitMiddleware({ maxRequests: 100, windowHours: 1 });

    await expect(middleware.before(request)).rejects.toThrow('Rate limit exceeded');
  });

  it('should reset counter when window expires', async () => {
    const now = Date.now();
    mockDynamoDBSend.mockResolvedValueOnce({
      Item: {
        PK: 'RATE_LIMIT#user-123',
        SK: 'WINDOW',
        requestCount: 50,
        windowStart: now - 70000,
        expiresAt: Math.floor((now - 10000) / 1000),
      },
    });
    mockDynamoDBSend.mockResolvedValueOnce({});

    const request = createRequest('user-123');
    const middleware = rateLimitMiddleware({ maxRequests: 100, windowHours: 1 });

    await middleware.before(request);

    expect(mockDynamoDBSend).toHaveBeenCalledTimes(2);
  });

  it('should use sourceIp when user ID not available', async () => {
    mockDynamoDBSend.mockResolvedValueOnce({ Item: null });
    mockDynamoDBSend.mockResolvedValueOnce({});

    const request = createRequest(undefined, '192.168.1.1');
    const middleware = rateLimitMiddleware({ maxRequests: 100, windowHours: 1 });

    await middleware.before(request);

    expect(mockDynamoDBSend).toHaveBeenCalled();
  });

  it('should handle DynamoDB errors gracefully (fail open)', async () => {
    mockDynamoDBSend.mockRejectedValueOnce(new Error('DynamoDB error'));

    const request = createRequest('user-123');
    const middleware = rateLimitMiddleware({ maxRequests: 100, windowHours: 1 });

    await middleware.before(request);

    expect(mockDynamoDBSend).toHaveBeenCalledTimes(1);
  });

  it('should handle rate limit error in onError handler', async () => {
    const error = new Error('Rate limit exceeded');
    (error as any).statusCode = 429;

    const request = createRequest('user-123');
    request.error = error;

    const middleware = rateLimitMiddleware({ maxRequests: 100, windowHours: 1 });
    await middleware.onError(request);

    expect(request.response).toBeDefined();
    expect(request.response?.statusCode).toBe(429);
  });

  it('should not handle non-rate-limit errors', async () => {
    const error = new Error('Some other error');

    const request = createRequest('user-123');
    request.error = error;

    const middleware = rateLimitMiddleware({ maxRequests: 100, windowHours: 1 });
    await middleware.onError(request);

    expect(request.response).toBeUndefined();
  });
});
