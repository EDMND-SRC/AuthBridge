/**
 * User Refresh Token Handler Tests
 * TD-011: Unit tests for user-refresh-token handler
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// Create mock functions
const mockRefreshTokens = vi.fn();
const mockLogEvent = vi.fn();

// Mock dependencies before imports
vi.mock('../services/user-auth.js', () => ({
  UserAuthService: vi.fn(() => ({
    refreshTokens: mockRefreshTokens,
  })),
}));

vi.mock('../services/audit.js', () => ({
  AuditService: vi.fn(() => ({
    logEvent: mockLogEvent,
  })),
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Import handler after mocks are set up
import { handler } from './user-refresh-token.js';

describe('user-refresh-token handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogEvent.mockResolvedValue(undefined);
  });

  const createEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
    httpMethod: 'POST',
    path: '/auth/refresh',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'test-agent',
    },
    body: JSON.stringify({ refreshToken: 'valid-refresh-token' }),
    queryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    requestContext: {
      requestId: 'test-request-id',
      accountId: '123456789',
      apiId: 'test-api',
      authorizer: null,
      protocol: 'HTTP/1.1',
      httpMethod: 'POST',
      identity: {
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
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
        user: null,
        userArn: null,
      },
      path: '/auth/refresh',
      stage: 'test',
      requestTimeEpoch: Date.now(),
      resourceId: 'test',
      resourcePath: '/auth/refresh',
    },
    resource: '/auth/refresh',
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    ...overrides,
  });

  it('should return 400 when request body is missing', async () => {
    const event = createEvent({ body: null });
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Request body is required');
  });

  it('should return 400 when refreshToken is missing', async () => {
    const event = createEvent({ body: JSON.stringify({}) });
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Validation failed');
  });

  it('should return 400 when refreshToken is empty', async () => {
    const event = createEvent({ body: JSON.stringify({ refreshToken: '' }) });
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Validation failed');
  });

  it('should successfully refresh tokens', async () => {
    const mockTokens = {
      accessToken: 'new-access-token',
      idToken: 'new-id-token',
      expiresIn: 3600,
    };
    mockRefreshTokens.mockResolvedValue(mockTokens);

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.accessToken).toBe('new-access-token');
    expect(body.data.idToken).toBe('new-id-token');
    expect(body.data.expiresIn).toBe(3600);
    expect(mockRefreshTokens).toHaveBeenCalledWith('valid-refresh-token');
  });

  it('should log audit event on successful refresh', async () => {
    mockRefreshTokens.mockResolvedValue({
      accessToken: 'new-token',
      idToken: 'new-id',
      expiresIn: 3600,
    });

    const event = createEvent();
    await handler(event);

    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TOKEN_REFRESH',
        status: 'success',
        ipAddress: '127.0.0.1',
      })
    );
  });

  it('should return 401 on refresh failure', async () => {
    mockRefreshTokens.mockRejectedValue(new Error('Token expired'));

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Token refresh failed');
  });

  it('should log audit event on refresh failure', async () => {
    const error = new Error('Token expired');
    error.name = 'NotAuthorizedException';
    mockRefreshTokens.mockRejectedValue(error);

    const event = createEvent();
    await handler(event);

    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TOKEN_REFRESH',
        status: 'failure',
        errorCode: 'NotAuthorizedException',
      })
    );
  });

  it('should include CORS headers in response', async () => {
    mockRefreshTokens.mockResolvedValue({
      accessToken: 'token',
      idToken: 'id',
      expiresIn: 3600,
    });

    const event = createEvent();
    const result = await handler(event);

    expect(result.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
    });
  });

  it('should handle malformed JSON body gracefully', async () => {
    const event = createEvent({ body: 'not-json' });

    // JSON.parse throws, caught by outer try/catch, returns 401
    const result = await handler(event);
    expect(result.statusCode).toBe(401);
  });

  it('should not include refreshToken in response', async () => {
    mockRefreshTokens.mockResolvedValue({
      accessToken: 'new-access-token',
      idToken: 'new-id-token',
      refreshToken: 'should-not-appear',
      expiresIn: 3600,
    });

    const event = createEvent();
    const result = await handler(event);

    const body = JSON.parse(result.body);
    expect(body.data.refreshToken).toBeUndefined();
  });
});
