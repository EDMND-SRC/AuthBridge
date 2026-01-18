import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

// Create mock functions
const mockGetVerification = vi.fn();
const mockGetDocument = vi.fn();
const mockGeneratePresignedUrl = vi.fn();

// Mock services before importing handler
vi.mock('../services/dynamodb', () => ({
  DynamoDBService: vi.fn(function() {
    return {
      getDocument: mockGetDocument,
    };
  }),
}));

vi.mock('../services/s3', () => ({
  S3Service: vi.fn(function() {
    return {
      generatePresignedUrl: mockGeneratePresignedUrl,
    };
  }),
}));

vi.mock('../services/verification', () => ({
  VerificationService: vi.fn(function() {
    return {
      getVerification: mockGetVerification,
    };
  }),
}));

// Import handler after mocks are set up
import { handler } from './refresh-document-url';

describe('refresh-document-url handler', () => {
  let mockEvent: APIGatewayProxyEvent;
  let mockContext: Context;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContext = {
      awsRequestId: 'test-request-id',
    } as Context;

    mockEvent = {
      requestContext: {
        requestId: 'test-request-id',
        authorizer: {
          clientId: 'client_123',
        },
      },
      pathParameters: {
        verificationId: 'ver_456',
        documentId: 'doc_789',
      },
      body: null,
    } as unknown as APIGatewayProxyEvent;

    // Setup default mock responses
    mockGetVerification.mockResolvedValue({
      verificationId: 'ver_456',
      clientId: 'client_123',
      status: 'documents_uploading',
    });

    mockGetDocument.mockResolvedValue({
      documentId: 'doc_789',
      verificationId: 'ver_456',
      s3Key: 'client_123/ver_456/omang_front-123.jpg',
      documentType: 'omang_front',
    });

    mockGeneratePresignedUrl.mockResolvedValue({
      url: 'https://new-presigned.url',
      expiresAt: '2026-01-14T10:15:00Z',
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return 401 when clientId is missing', async () => {
    mockEvent.requestContext.authorizer = {};

    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 400 when verificationId is missing', async () => {
    mockEvent.pathParameters = { documentId: 'doc_789' };

    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 when documentId is missing', async () => {
    mockEvent.pathParameters = { verificationId: 'ver_456' };

    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 404 when verification not found', async () => {
    mockGetVerification.mockResolvedValue(null);

    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('should return 403 when client does not own verification', async () => {
    mockGetVerification.mockResolvedValue({
      verificationId: 'ver_456',
      clientId: 'different_client',
    });

    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(403);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('should return 404 when document not found', async () => {
    mockGetDocument.mockResolvedValue(null);

    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('should return 200 with new presigned URL on success', async () => {
    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.documentId).toBe('doc_789');
    expect(body.verificationId).toBe('ver_456');
    expect(body.presignedUrl).toBe('https://new-presigned.url');
    expect(body.presignedUrlExpiresAt).toBe('2026-01-14T10:15:00Z');
  });

  it('should include CORS headers in response', async () => {
    const result = await handler(mockEvent, mockContext);

    expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
    expect(result.headers).toHaveProperty('Content-Type', 'application/json');
  });

  it('should call generatePresignedUrl with correct s3Key', async () => {
    await handler(mockEvent, mockContext);

    expect(mockGeneratePresignedUrl).toHaveBeenCalledWith('client_123/ver_456/omang_front-123.jpg');
  });
});
