/**
 * User Logout Handler Tests
 * TD-011: Unit tests for user-logout handler
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// Create mock functions
const mockSignOut = vi.fn();
const mockLogEvent = vi.fn();

// Mock dependencies before imports
vi.mock('../services/user-auth.js', () => ({
  UserAuthService: vi.fn(() => ({
    signOut: mockSignOut,
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
import { handler } from './user-logout.js';

describe('user-logout handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogEvent.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);
  });

  const createEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
    httpMethod: 'POST',
    path: '/auth/logout',
    headers: {
      Authorization: 'Bearer valid-token',
      'User-Agent': 'test-agent',
    },
    body: null,
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
      path: '/auth/logout',
      stage: 'test',
      requestTimeEpoch: Date.now(),
      resourceId: 'test',
      resourcePath: '/auth/logout',
    },
    resource: '/auth/logout',
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    ...overrides,
  });

  it('should return 401 when Authorization header is missing', async () => {
    const event = createEvent({ headers: {} });
    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Authorization header required');
  });

  it('should return 401 when Authorization header does not start with Bearer', async () => {
    const event = createEvent({ headers: { Authorization: 'Basic token' } });
    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Authorization header required');
  });

  it('should successfully logout user', async () => {
    mockSignOut.mockResolvedValue(undefined);

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.message).toBe('Logged out successfully');
    expect(mockSignOut).toHaveBeenCalledWith('valid-token');
  });

  it('should log audit event on successful logout', async () => {
    mockSignOut.mockResolvedValue(undefined);

    const event = createEvent();
    await handler(event);

    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOGOUT',
        status: 'success',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      })
    );
  });

  it('should return 500 on signOut failure', async () => {
    mockSignOut.mockRejectedValue(new Error('Cognito error'));

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Logout failed');
  });

  it('should include CORS headers in response', async () => {
    mockSignOut.mockResolvedValue(undefined);

    const event = createEvent();
    const result = await handler(event);

    expect(result.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
    });
  });

  it('should handle lowercase authorization header', async () => {
    mockSignOut.mockResolvedValue(undefined);

    const event = createEvent({
      headers: { authorization: 'Bearer valid-token', 'User-Agent': 'test' },
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockSignOut).toHaveBeenCalledWith('valid-token');
  });
});
