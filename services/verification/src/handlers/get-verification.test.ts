import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

describe('get-verification handler', () => {
  const mockContext = {
    awsRequestId: 'ctx_req_123',
  } as Context;

  const mockVerification = {
    verificationId: 'ver_test123',
    status: 'created',
    clientId: 'client_abc',
    documentType: 'omang',
    customerMetadata: { email: 'test@example.com' },
    createdAt: '2026-01-14T10:00:00Z',
    updatedAt: '2026-01-14T10:00:00Z',
    expiresAt: '2026-02-13T10:00:00Z',
  };

  const mockGetVerification = vi.fn();

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    vi.doMock('../services/verification', () => ({
      VerificationService: vi.fn(function() {
        return {
          getVerification: mockGetVerification,
        };
      }),
    }));

    // Mock RBAC middleware to allow all requests
    vi.doMock('../middleware/rbac', () => ({
      rbacMiddleware: vi.fn((handler: any) => handler),
    }));

    // Default mock implementation
    mockGetVerification.mockResolvedValue(mockVerification);
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should return verification for valid request', async () => {
    const { handler } = await import('./get-verification');

    const event: Partial<APIGatewayProxyEvent> = {
      pathParameters: { verificationId: 'ver_test123' },
      requestContext: {
        requestId: 'req_123',
        authorizer: { clientId: 'client_abc' },
      } as any,
    };

    const result = await handler(event as APIGatewayProxyEvent, mockContext);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.verificationId).toBe('ver_test123');
    expect(body.status).toBe('created');
    expect(body.documentType).toBe('omang');
    expect(mockGetVerification).toHaveBeenCalledWith('ver_test123');
  });

  it('should return 401 if no clientId in authorizer', async () => {
    const { handler } = await import('./get-verification');

    const event: Partial<APIGatewayProxyEvent> = {
      pathParameters: { verificationId: 'ver_test123' },
      requestContext: {
        requestId: 'req_123',
        authorizer: {},
      } as any,
    };

    const result = await handler(event as APIGatewayProxyEvent, mockContext);

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 400 if verificationId is missing', async () => {
    const { handler } = await import('./get-verification');

    const event: Partial<APIGatewayProxyEvent> = {
      pathParameters: {},
      requestContext: {
        requestId: 'req_123',
        authorizer: { clientId: 'client_abc' },
      } as any,
    };

    const result = await handler(event as APIGatewayProxyEvent, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 404 if verification not found', async () => {
    mockGetVerification.mockResolvedValue(null);

    const { handler } = await import('./get-verification');

    const event: Partial<APIGatewayProxyEvent> = {
      pathParameters: { verificationId: 'ver_nonexistent' },
      requestContext: {
        requestId: 'req_123',
        authorizer: { clientId: 'client_abc' },
      } as any,
    };

    const result = await handler(event as APIGatewayProxyEvent, mockContext);

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('should return 403 if client does not own verification', async () => {
    mockGetVerification.mockResolvedValue({
      ...mockVerification,
      clientId: 'client_other', // Different client
    });

    const { handler } = await import('./get-verification');

    const event: Partial<APIGatewayProxyEvent> = {
      pathParameters: { verificationId: 'ver_test123' },
      requestContext: {
        requestId: 'req_123',
        authorizer: { clientId: 'client_abc' },
      } as any,
    };

    const result = await handler(event as APIGatewayProxyEvent, mockContext);

    expect(result.statusCode).toBe(403);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('should return 500 on service error', async () => {
    mockGetVerification.mockRejectedValue(new Error('DynamoDB error'));

    const { handler } = await import('./get-verification');

    const event: Partial<APIGatewayProxyEvent> = {
      pathParameters: { verificationId: 'ver_test123' },
      requestContext: {
        requestId: 'req_123',
        authorizer: { clientId: 'client_abc' },
      } as any,
    };

    const result = await handler(event as APIGatewayProxyEvent, mockContext);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('should include CORS headers in response', async () => {
    const { handler } = await import('./get-verification');

    const event: Partial<APIGatewayProxyEvent> = {
      pathParameters: { verificationId: 'ver_test123' },
      requestContext: {
        requestId: 'req_123',
        authorizer: { clientId: 'client_abc' },
      } as any,
    };

    const result = await handler(event as APIGatewayProxyEvent, mockContext);

    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
    expect(result.headers?.['Content-Type']).toBe('application/json');
  });
});
