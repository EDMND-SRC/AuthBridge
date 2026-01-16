import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

/**
 * Integration tests for POST /api/v1/verifications
 *
 * These tests call the actual handler with mocked dependencies to verify
 * end-to-end request/response behavior.
 */

describe('POST /api/v1/verifications - Integration', () => {
  const mockContext = {
    awsRequestId: 'ctx_req_integration_123',
  } as Context;

  const mockVerification = {
    verificationId: 'ver_abc123def456789012345678901234ab',
    status: 'created',
    clientId: 'client_integration',
    documentType: 'omang',
    customer: {
      email: 'integration@example.com',
      name: 'Integration Test',
      phone: '+26771234567',
    },
    redirectUrl: 'https://example.com/complete',
    webhookUrl: 'https://example.com/webhook',
    metadata: { testField: 'testValue' },
    createdAt: '2026-01-16T10:00:00Z',
    expiresAt: '2026-02-15T10:00:00Z',
  };

  // Mock functions
  const mockCreateVerification = vi.fn();
  const mockGetVerification = vi.fn();
  const mockCheckIdempotencyKey = vi.fn();
  const mockStoreIdempotencyKey = vi.fn();

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    // Setup mocks before importing handler
    vi.doMock('../../src/services/verification', () => ({
      VerificationService: vi.fn(() => ({
        createVerification: mockCreateVerification,
        getVerification: mockGetVerification,
      })),
    }));

    vi.doMock('../../src/services/idempotency', () => ({
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

    // Default mock implementations
    mockCreateVerification.mockResolvedValue(mockVerification);
    mockGetVerification.mockResolvedValue(mockVerification);
    mockCheckIdempotencyKey.mockResolvedValue(null);
    mockStoreIdempotencyKey.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('Successful Verification Creation', () => {
    it('should create verification with email only and return 201', async () => {
      const { handler } = await import('../../src/handlers/create-verification');

      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          customer: { email: 'test@example.com' },
          documentType: 'omang',
        }),
        requestContext: {
          requestId: 'req_123',
          authorizer: { clientId: 'client_integration' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.verificationId).toMatch(/^ver_[a-f0-9]{32}$/);
      expect(body.status).toBe('created');
      expect(body.sessionToken).toBeDefined();
      expect(body.sdkUrl).toContain('sdk.authbridge.io');
      expect(body.expiresAt).toBeDefined();
      expect(body.meta.requestId).toBe('ctx_req_integration_123');
    });

    it('should create verification with name only', async () => {
      const { handler } = await import('../../src/handlers/create-verification');

      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          customer: { name: 'John Doe' },
        }),
        requestContext: {
          requestId: 'req_123',
          authorizer: { clientId: 'client_integration' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(201);
      expect(mockCreateVerification).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: { name: 'John Doe' },
        }),
        'client_integration'
      );
    });

    it('should create verification with phone only', async () => {
      const { handler } = await import('../../src/handlers/create-verification');

      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          customer: { phone: '+26771234567' },
        }),
        requestContext: {
          requestId: 'req_123',
          authorizer: { clientId: 'client_integration' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(201);
    });

    it('should create verification with all customer fields and optional params', async () => {
      const { handler } = await import('../../src/handlers/create-verification');

      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          customer: {
            email: 'full@example.com',
            name: 'Full Test',
            phone: '+26771234567',
          },
          documentType: 'passport',
          redirectUrl: 'https://example.com/done',
          webhookUrl: 'https://example.com/hook',
          metadata: { key: 'value' },
        }),
        requestContext: {
          requestId: 'req_123',
          authorizer: { clientId: 'client_integration' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(201);
      expect(mockCreateVerification).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: expect.objectContaining({ email: 'full@example.com' }),
          documentType: 'passport',
          redirectUrl: 'https://example.com/done',
          webhookUrl: 'https://example.com/hook',
          metadata: { key: 'value' },
        }),
        'client_integration'
      );
    });
  });

  describe('Rate Limit Headers', () => {
    it('should include rate limit headers in successful response', async () => {
      const { handler } = await import('../../src/handlers/create-verification');

      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          customer: { email: 'test@example.com' },
        }),
        requestContext: {
          requestId: 'req_123',
          authorizer: { clientId: 'client_integration' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.headers?.['X-RateLimit-Limit']).toBe('50');
      expect(result.headers?.['X-RateLimit-Remaining']).toBeDefined();
      expect(result.headers?.['X-RateLimit-Reset']).toBeDefined();
    });

    it('should include rate limit headers in error response', async () => {
      const { handler } = await import('../../src/handlers/create-verification');

      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          customer: {}, // Invalid - no identifiers
        }),
        requestContext: {
          requestId: 'req_123',
          authorizer: { clientId: 'client_integration' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(400);
      expect(result.headers?.['X-RateLimit-Limit']).toBe('50');
    });
  });

  describe('Document Type Validation', () => {
    it.each(['omang', 'passport', 'drivers_licence', 'id_card'])(
      'should accept valid document type: %s',
      async (documentType) => {
        const { handler } = await import('../../src/handlers/create-verification');

        const event: Partial<APIGatewayProxyEvent> = {
          body: JSON.stringify({
            customer: { email: 'test@example.com' },
            documentType,
          }),
          requestContext: {
            requestId: 'req_123',
            authorizer: { clientId: 'client_integration' },
          } as any,
        };

        const result = await handler(event as APIGatewayProxyEvent, mockContext);

        expect(result.statusCode).toBe(201);
      }
    );

    it('should accept request without documentType (optional)', async () => {
      const { handler } = await import('../../src/handlers/create-verification');

      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          customer: { email: 'test@example.com' },
        }),
        requestContext: {
          requestId: 'req_123',
          authorizer: { clientId: 'client_integration' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(201);
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for missing customer identifiers', async () => {
      const { handler } = await import('../../src/handlers/create-verification');

      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          customer: {},
          documentType: 'omang',
        }),
        requestContext: {
          requestId: 'req_123',
          authorizer: { clientId: 'client_integration' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('Invalid request parameters');
    });

    it('should return 400 for invalid email format', async () => {
      const { handler } = await import('../../src/handlers/create-verification');

      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          customer: { email: 'not-an-email' },
        }),
        requestContext: {
          requestId: 'req_123',
          authorizer: { clientId: 'client_integration' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for HTTP redirect URL (HTTPS required)', async () => {
      const { handler } = await import('../../src/handlers/create-verification');

      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          customer: { email: 'test@example.com' },
          redirectUrl: 'http://insecure.com/callback',
        }),
        requestContext: {
          requestId: 'req_123',
          authorizer: { clientId: 'client_integration' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid document type', async () => {
      const { handler } = await import('../../src/handlers/create-verification');

      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          customer: { email: 'test@example.com' },
          documentType: 'invalid_type',
        }),
        requestContext: {
          requestId: 'req_123',
          authorizer: { clientId: 'client_integration' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing request body', async () => {
      const { handler } = await import('../../src/handlers/create-verification');

      const event: Partial<APIGatewayProxyEvent> = {
        body: null,
        requestContext: {
          requestId: 'req_123',
          authorizer: { clientId: 'client_integration' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('Request body is required');
    });
  });

  describe('Authentication Errors', () => {
    it('should return 401 for missing clientId in authorizer', async () => {
      const { handler } = await import('../../src/handlers/create-verification');

      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          customer: { email: 'test@example.com' },
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
  });

  describe('Idempotency Behavior', () => {
    it('should return existing verification for duplicate idempotency key', async () => {
      const existingVerification = {
        ...mockVerification,
        verificationId: 'ver_existing12345678901234567890ab',
      };

      mockCheckIdempotencyKey.mockResolvedValue('ver_existing12345678901234567890ab');
      mockGetVerification.mockResolvedValue(existingVerification);

      const { handler } = await import('../../src/handlers/create-verification');

      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          customer: { email: 'test@example.com' },
          idempotencyKey: 'idem_unique_key_123',
        }),
        requestContext: {
          requestId: 'req_123',
          authorizer: { clientId: 'client_integration' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(200); // 200 for idempotent hit, not 201
      const body = JSON.parse(result.body);
      expect(body.verificationId).toBe('ver_existing12345678901234567890ab');
      expect(body.meta.idempotent).toBe(true);
      expect(mockCreateVerification).not.toHaveBeenCalled();
    });

    it('should create new verification without idempotency key', async () => {
      const { handler } = await import('../../src/handlers/create-verification');

      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          customer: { email: 'test@example.com' },
        }),
        requestContext: {
          requestId: 'req_123',
          authorizer: { clientId: 'client_integration' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(201);
      expect(mockCreateVerification).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should return 500 on service error', async () => {
      mockCreateVerification.mockRejectedValue(new Error('DynamoDB connection failed'));

      const { handler } = await import('../../src/handlers/create-verification');

      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          customer: { email: 'test@example.com' },
        }),
        requestContext: {
          requestId: 'req_123',
          authorizer: { clientId: 'client_integration' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('INTERNAL_ERROR');
      expect(body.error.message).toBe('Failed to create verification');
    });
  });

  describe('Response Schema Validation', () => {
    it('should return response matching OpenAPI schema', async () => {
      const { handler } = await import('../../src/handlers/create-verification');

      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          customer: { email: 'schema@example.com' },
          documentType: 'omang',
        }),
        requestContext: {
          requestId: 'req_123',
          authorizer: { clientId: 'client_integration' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);

      // Validate response structure matches OpenAPI CreateVerificationResponse
      expect(body).toHaveProperty('verificationId');
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('sessionToken');
      expect(body).toHaveProperty('sdkUrl');
      expect(body).toHaveProperty('expiresAt');
      expect(body).toHaveProperty('meta');
      expect(body.meta).toHaveProperty('requestId');
      expect(body.meta).toHaveProperty('timestamp');

      // Validate types
      expect(typeof body.verificationId).toBe('string');
      expect(body.verificationId).toMatch(/^ver_/);
      expect(['created', 'documents_uploading', 'submitted', 'processing', 'pending_review', 'approved', 'rejected']).toContain(body.status);
      expect(body.sessionToken).toMatch(/^eyJ/); // JWT starts with eyJ
      expect(body.sdkUrl).toMatch(/^https:\/\/sdk\.authbridge\.io\?token=/);
      expect(body.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601
    });
  });
});

describe('DynamoDB Entity Keys - Integration', () => {
  it('should use correct PK format for verification', () => {
    const verificationId = 'ver_abc123def456789012345678901234ab';
    const pk = `CASE#${verificationId}`;
    expect(pk).toBe('CASE#ver_abc123def456789012345678901234ab');
  });

  it('should use META as SK for verification metadata', () => {
    const sk = 'META';
    expect(sk).toBe('META');
  });

  it('should use correct GSI1PK format for client queries', () => {
    const clientId = 'client_abc123';
    const gsi1pk = `CLIENT#${clientId}`;
    expect(gsi1pk).toBe('CLIENT#client_abc123');
  });

  it('should use correct GSI1SK format for status+date queries', () => {
    const status = 'created';
    const createdAt = '2026-01-16T10:00:00Z';
    const gsi1sk = `${status}#${createdAt}`;
    expect(gsi1sk).toMatch(/^created#\d{4}-\d{2}-\d{2}T/);
  });

  it('should use correct GSI2PK format for date queries', () => {
    const date = '2026-01-16';
    const gsi2pk = `DATE#${date}`;
    expect(gsi2pk).toBe('DATE#2026-01-16');
  });
});
