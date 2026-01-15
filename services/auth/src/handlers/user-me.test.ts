/**
 * User Me Handler Tests
 * TD-011: Unit tests for user-me handler
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// Create mock function
const mockGetUserInfo = vi.fn();

// Mock dependencies before imports
vi.mock('../services/user-auth.js', () => ({
  UserAuthService: vi.fn(() => ({
    getUserInfo: mockGetUserInfo,
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
import { handler } from './user-me.js';

describe('user-me handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
    httpMethod: 'GET',
    path: '/auth/me',
    headers: {
      Authorization: 'Bearer valid-token',
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
      httpMethod: 'GET',
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
      path: '/auth/me',
      stage: 'test',
      requestTimeEpoch: Date.now(),
      resourceId: 'test',
      resourcePath: '/auth/me',
    },
    resource: '/auth/me',
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

  it('should return user info on successful authentication', async () => {
    const mockUser = {
      userId: 'user-123',
      email: 'test@authbridge.io',
      emailVerified: true,
      name: 'Test User',
      role: 'compliance_officer',
      createdAt: '2026-01-01T00:00:00Z',
      lastLogin: '2026-01-15T10:00:00Z',
    };
    mockGetUserInfo.mockResolvedValue(mockUser);

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.id).toBe('user-123');
    expect(body.data.email).toBe('test@authbridge.io');
    expect(body.data.role).toBe('compliance_officer');
    expect(mockGetUserInfo).toHaveBeenCalledWith('valid-token');
  });

  it('should return 401 when token is invalid', async () => {
    const error = new Error('Token invalid');
    error.name = 'NotAuthorizedException';
    mockGetUserInfo.mockRejectedValue(error);

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Invalid or expired token');
  });

  it('should return 500 on unexpected errors', async () => {
    mockGetUserInfo.mockRejectedValue(new Error('Database error'));

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Failed to get user info');
  });

  it('should include CORS headers in response', async () => {
    const mockUser = { userId: 'user-123', email: 'test@authbridge.io' };
    mockGetUserInfo.mockResolvedValue(mockUser);

    const event = createEvent();
    const result = await handler(event);

    expect(result.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
  });

  it('should handle lowercase authorization header', async () => {
    const mockUser = { userId: 'user-123', email: 'test@authbridge.io' };
    mockGetUserInfo.mockResolvedValue(mockUser);

    const event = createEvent({
      headers: { authorization: 'Bearer valid-token' },
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockGetUserInfo).toHaveBeenCalledWith('valid-token');
  });
});
