import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

describe('create-verification handler', () => {
  const mockContext = {
    awsRequestId: 'ctx_req_123',
  } as Context;

  const mockVerification = {
    verificationId: 'ver_test123',
    status: 'created',
    clientId: 'client_abc',
    documentType: 'omang',
    customer: {
      email: 'test@example.com',
      name: 'John Doe',
      phone: '+26771234567',
    },
    redirectUrl: 'https://example.com/complete',
    webhookUrl: 'https://example.com/webhook',
    metadata: { customField: 'value' },
    createdAt: '2026-01-14T10:00:00Z',
    expiresAt: '2026-02-13T10:00:00Z',
  };

  // Mock functions
  const mockCreateVerification = vi.fn();
  const mockGetVerification = vi.fn();
  const mockCheckIdempotencyKey = vi.fn();
  const mockStoreIdempotencyKey = vi.fn();
  const mockValidate = vi.fn();

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    // Setup mocks before importing handler
    vi.doMock('../services/verification', () => ({
      VerificationService: vi.fn(() => ({
        createVerification: mockCreateVerification,
        getVerification: mockGetVerification,
      })),
    }));

    vi.doMock('../services/idempotency', () => ({
      IdempotencyService: vi.fn(() => ({
        checkIdempotencyKey: mockCheckIdempotencyKey,
        storeIdempotencyKey: mockStoreIdempotencyKey,
      })),
      IdempotencyConflictError: class IdempotencyConflictError extends Error {
        constructor(public idempotencyKey: string) {
          super(`Idempotency key already exists: ${idempotencyKey}`);
          this.name = 'IdempotencyConflictError';
        }
      },
    }));

    vi.doMock('../services/validation', () => ({
      validateCreateVerificationRequest: mockValidate,
    }));

    // Default mock implementations
    mockCreateVerification.mockResolvedValue(mockVerification);
    mockGetVerification.mockResolvedValue(mockVerification);
    mockCheckIdempotencyKey.mockResolvedValue(null);
    mockStoreIdempotencyKey.mockResolvedValue(undefined);
    mockValidate.mockImplementation((req) => {
      if (req.documentType === 'invalid') {
        return {
          success: false,
          errors: {
            errors: [{ path: ['documentType'], message: 'Invalid document type' }],
          },
        };
      }
      if (!req.customer || (!req.customer.email && !req.customer.name && !req.customer.phone)) {
        return {
          success: false,
          errors: {
            errors: [{ path: ['customer'], message: 'At least one customer identifier required' }],
          },
        };
      }
      return { success: true, data: req };
    });
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should create verification with valid request', async () => {
    const { handler } = await import('./create-verification');

    const event: Partial<APIGatewayProxyEvent> = {
      body: JSON.stringify({
        customer: {
          email: 'test@example.com',
          name: 'John Doe',
          phone: '+26771234567',
        },
        documentType: 'omang',
        redirectUrl: 'https://example.com/complete',
        webhookUrl: 'https://example.com/webhook',
        metadata: {
          customField: 'value',
        },
      }),
      requestContext: {
        requestId: 'req_123',
        authorizer: { clientId: 'client_abc' },
      } as any,
    };

    const result = await handler(event as APIGatewayProxyEvent, mockContext);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.verificationId).toBe('ver_test123');
    expect(body.status).toBe('created');
    expect(body.sessionToken).toBeDefined();
    expect(body.sdkUrl).toContain('sdk.authbridge.io');
    expect(body.expiresAt).toBeDefined();
    expect(body.meta.requestId).toBe('ctx_req_123');
  });

  it('should return 400 for invalid document type', async () => {
    const { handler } = await import('./create-verification');

    const event: Partial<APIGatewayProxyEvent> = {
      body: JSON.stringify({
        documentType: 'invalid',
        customer: { email: 'test@example.com' },
      }),
      requestContext: {
        requestId: 'req_123',
        authorizer: { clientId: 'client_abc' },
      } as any,
    };

    const result = await handler(event as APIGatewayProxyEvent, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toBeDefined();
    expect(body.error.details[0].field).toBe('documentType');
  });

  it('should return 400 when no customer identifiers provided', async () => {
    const { handler } = await import('./create-verification');

    const event: Partial<APIGatewayProxyEvent> = {
      body: JSON.stringify({
        documentType: 'omang',
        customer: {},
      }),
      requestContext: {
        requestId: 'req_123',
        authorizer: { clientId: 'client_abc' },
      } as any,
    };

    const result = await handler(event as APIGatewayProxyEvent, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Invalid request parameters');
    expect(body.error.details).toBeDefined();
    expect(body.error.details[0].field).toBe('customer');
  });

  it('should accept verification with only email', async () => {
    const { handler } = await import('./create-verification');

    const event: Partial<APIGatewayProxyEvent> = {
      body: JSON.stringify({
        customer: { email: 'test@example.com' },
        documentType: 'omang',
      }),
      requestContext: {
        requestId: 'req_123',
        authorizer: { clientId: 'client_abc' },
      } as any,
    };

    const result = await handler(event as APIGatewayProxyEvent, mockContext);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.verificationId).toBeDefined();
  });

  it('should accept verification with only name', async () => {
    const { handler } = await import('./create-verification');

    const event: Partial<APIGatewayProxyEvent> = {
      body: JSON.stringify({
        customer: { name: 'John Doe' },
        documentType: 'omang',
      }),
      requestContext: {
        requestId: 'req_123',
        authorizer: { clientId: 'client_abc' },
      } as any,
    };

    const result = await handler(event as APIGatewayProxyEvent, mockContext);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.verificationId).toBeDefined();
  });

  it('should accept verification with only phone', async () => {
    const { handler } = await import('./create-verification');

    const event: Partial<APIGatewayProxyEvent> = {
      body: JSON.stringify({
        customer: { phone: '+26771234567' },
        documentType: 'omang',
      }),
      requestContext: {
        requestId: 'req_123',
        authorizer: { clientId: 'client_abc' },
      } as any,
    };

    const result = await handler(event as APIGatewayProxyEvent, mockContext);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.verificationId).toBeDefined();
  });

  it('should return 401 if no clientId in authorizer', async () => {
    const { handler } = await import('./create-verification');

    const event: Partial<APIGatewayProxyEvent> = {
      body: JSON.stringify({
        documentType: 'omang',
        customerMetadata: {},
      }),
      requestContext: {
        requestId: 'req_123',
        authorizer: {},
      } as any,
    };

    const result = await handler(event as APIGatewayProxyEvent, mockContext);

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toBe('Missing client authentication');
  });

  it('should return 400 if request body is missing', async () => {
    const { handler } = await import('./create-verification');

    const event: Partial<APIGatewayProxyEvent> = {
      body: null,
      requestContext: {
        requestId: 'req_123',
        authorizer: { clientId: 'client_abc' },
      } as any,
    };

    const result = await handler(event as APIGatewayProxyEvent, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Request body is required');
  });

  it('should return existing verification for duplicate idempotency key', async () => {
    const existingVerification = {
      ...mockVerification,
      verificationId: 'ver_existing',
    };

    mockCheckIdempotencyKey.mockResolvedValue('ver_existing');
    mockGetVerification.mockResolvedValue(existingVerification);

    const { handler } = await import('./create-verification');

    const event: Partial<APIGatewayProxyEvent> = {
      body: JSON.stringify({
        customer: { email: 'test@example.com' },
        documentType: 'omang',
        idempotencyKey: 'idem_abc123',
      }),
      requestContext: {
        requestId: 'req_123',
        authorizer: { clientId: 'client_abc' },
      } as any,
    };

    const result = await handler(event as APIGatewayProxyEvent, mockContext);

    expect(result.statusCode).toBe(200); // 200 for idempotent hit
    const body = JSON.parse(result.body);
    expect(body.verificationId).toBe('ver_existing');
    expect(body.meta.idempotent).toBe(true);
    expect(mockCreateVerification).not.toHaveBeenCalled();
  });

  it('should return 500 on service error', async () => {
    mockCreateVerification.mockRejectedValue(new Error('DynamoDB error'));

    const { handler } = await import('./create-verification');

    const event: Partial<APIGatewayProxyEvent> = {
      body: JSON.stringify({
        customer: { email: 'test@example.com' },
        documentType: 'omang',
      }),
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
    const { handler } = await import('./create-verification');

    const event: Partial<APIGatewayProxyEvent> = {
      body: JSON.stringify({
        customer: { email: 'test@example.com' },
        documentType: 'omang',
      }),
      requestContext: {
        requestId: 'req_123',
        authorizer: { clientId: 'client_abc' },
      } as any,
    };

    const result = await handler(event as APIGatewayProxyEvent, mockContext);

    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
    expect(result.headers?.['Content-Type']).toBe('application/json');
  });

  it('should include rate limit headers in response', async () => {
    const { handler } = await import('./create-verification');

    const event: Partial<APIGatewayProxyEvent> = {
      body: JSON.stringify({
        customer: { email: 'test@example.com' },
        documentType: 'omang',
      }),
      requestContext: {
        requestId: 'req_123',
        authorizer: { clientId: 'client_abc' },
      } as any,
    };

    const result = await handler(event as APIGatewayProxyEvent, mockContext);

    expect(result.headers?.['X-RateLimit-Limit']).toBe('50');
    expect(result.headers?.['X-RateLimit-Remaining']).toBeDefined();
    expect(result.headers?.['X-RateLimit-Reset']).toBeDefined();
  });
});
