import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

// Set environment variables before importing handler
process.env.TABLE_NAME = 'TestTable';
process.env.BUCKET_NAME = 'test-bucket';
process.env.AWS_REGION = 'af-south-1';

// Mock RBAC middleware before importing handler
vi.mock('../middleware/rbac', () => ({
  requirePermission: vi.fn(() => ({
    before: vi.fn(),
    after: vi.fn(),
    onError: vi.fn(),
  })),
}));

// Mock services before importing handler - use inline mocks to avoid hoisting issues
vi.mock('../services/dynamodb', () => {
  const mockUpdateItemFn = vi.fn();
  return {
    DynamoDBService: vi.fn(function() {
      return {
        updateItem: mockUpdateItemFn,
      };
    }),
    __mockUpdateItem: mockUpdateItemFn,
  };
});

vi.mock('../services/s3', () => ({
  S3Service: vi.fn(function() {
    return {};
  }),
}));

vi.mock('../services/sqs', () => {
  const mockSendOcrMessageFn = vi.fn();
  return {
    SqsService: vi.fn(function() {
      return {
        sendOcrMessage: mockSendOcrMessageFn,
      };
    }),
    __mockSendOcrMessage: mockSendOcrMessageFn,
  };
});

vi.mock('../services/verification', () => {
  const mockGetVerificationFn = vi.fn();
  const mockUpdateStatusFn = vi.fn();
  return {
    VerificationService: vi.fn(function() {
      return {
        getVerification: mockGetVerificationFn,
        updateStatus: mockUpdateStatusFn,
      };
    }),
    __mockGetVerification: mockGetVerificationFn,
    __mockUpdateStatus: mockUpdateStatusFn,
  };
});

vi.mock('../services/document', () => {
  const mockUploadDocumentFn = vi.fn();
  const mockCountDocumentsFn = vi.fn();
  return {
    DocumentService: vi.fn(function() {
      return {
        uploadDocument: mockUploadDocumentFn,
        countDocuments: mockCountDocumentsFn,
      };
    }),
    __mockUploadDocument: mockUploadDocumentFn,
    __mockCountDocuments: mockCountDocumentsFn,
  };
});

// Mock file validation - return valid results by default
const mockValidateUploadDocumentRequest = vi.fn();
const mockParseBase64DataUri = vi.fn();
const mockParseMultipartFormData = vi.fn();
const mockValidateFileSize = vi.fn();
const mockValidateMimeType = vi.fn();
const mockGetImageDimensions = vi.fn();
const mockValidateImageDimensions = vi.fn();
const mockScanForViruses = vi.fn();
const mockCheckImageQuality = vi.fn();

vi.mock('../services/file-validation', () => ({
  validateUploadDocumentRequest: (...args: unknown[]) => mockValidateUploadDocumentRequest(...args),
  parseBase64DataUri: (...args: unknown[]) => mockParseBase64DataUri(...args),
  parseMultipartFormData: (...args: unknown[]) => mockParseMultipartFormData(...args),
  validateFileSize: (...args: unknown[]) => mockValidateFileSize(...args),
  validateMimeType: (...args: unknown[]) => mockValidateMimeType(...args),
  getImageDimensions: (...args: unknown[]) => mockGetImageDimensions(...args),
  validateImageDimensions: (...args: unknown[]) => mockValidateImageDimensions(...args),
  scanForViruses: (...args: unknown[]) => mockScanForViruses(...args),
  checkImageQuality: (...args: unknown[]) => mockCheckImageQuality(...args),
}));

// Mock metrics - no-op in tests
vi.mock('../utils/metrics', () => ({
  recordUploadMetrics: vi.fn().mockResolvedValue(undefined),
  recordValidationFailure: vi.fn().mockResolvedValue(undefined),
}));

// Import handler after mocks are set up
import { handler, resetServices } from './upload-document';
import * as dynamodbMock from '../services/dynamodb';
import * as sqsMock from '../services/sqs';
import * as verificationMock from '../services/verification';
import * as documentMock from '../services/document';

// Extract mock functions
const mockUpdateItem = (dynamodbMock as any).__mockUpdateItem;
const mockSendOcrMessage = (sqsMock as any).__mockSendOcrMessage;
const mockGetVerification = (verificationMock as any).__mockGetVerification;
const mockUpdateStatus = (verificationMock as any).__mockUpdateStatus;
const mockUploadDocument = (documentMock as any).__mockUploadDocument;
const mockCountDocuments = (documentMock as any).__mockCountDocuments;

describe('upload-document handler', () => {
  let mockEvent: APIGatewayProxyEvent;
  let mockContext: Context;

  const validBase64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

  beforeEach(() => {
    vi.clearAllMocks();
    resetServices(); // Reset services to use fresh mocks

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
      },
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        documentType: 'omang_front',
        imageData: validBase64Image,
      }),
    } as unknown as APIGatewayProxyEvent;

    // Setup default mock responses for file validation
    mockValidateUploadDocumentRequest.mockReturnValue({
      success: true,
      data: { documentType: 'omang_front', imageData: validBase64Image },
    });
    mockParseBase64DataUri.mockReturnValue({
      mimeType: 'image/jpeg',
      data: Buffer.from('test'),
      size: 1024,
    });
    mockParseMultipartFormData.mockReturnValue(null); // Default to null, set in specific tests
    mockValidateFileSize.mockReturnValue({ valid: true });
    mockValidateMimeType.mockReturnValue({ valid: true });
    mockGetImageDimensions.mockReturnValue({ width: 800, height: 600 });
    mockValidateImageDimensions.mockReturnValue({ valid: true });
    mockScanForViruses.mockReturnValue({ clean: true });
    mockCheckImageQuality.mockReturnValue({ acceptable: true, metrics: { blur: 0.3, brightness: 0.5, contrast: 0.6 } });

    // Setup default mock responses for services
    mockGetVerification.mockResolvedValue({
      verificationId: 'ver_456',
      clientId: 'client_123',
      status: 'created',
    });

    mockCountDocuments.mockResolvedValue(0);
    mockSendOcrMessage.mockResolvedValue(undefined);
    mockUpdateItem.mockResolvedValue(undefined);

    mockUploadDocument.mockResolvedValue({
      documentId: 'doc_789',
      verificationId: 'ver_456',
      documentType: 'omang_front',
      s3Key: 'client_123/ver_456/omang_front-123.jpg',
      fileSize: 1024,
      mimeType: 'image/jpeg',
      uploadedAt: '2026-01-14T10:00:00Z',
      status: 'uploaded',
      presignedUrl: 'https://presigned.url',
      presignedUrlExpiresAt: '2026-01-14T10:15:00Z',
      meta: {
        requestId: 'test-request-id',
        timestamp: '2026-01-14T10:00:00Z',
      },
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
    mockEvent.pathParameters = {};

    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('Verification ID');
  });

  it('should return 400 when body is missing', async () => {
    mockEvent.body = null;

    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('Request body');
  });

  it('should return 400 when documentType is invalid', async () => {
    mockEvent.body = JSON.stringify({
      documentType: 'invalid_type',
      imageData: validBase64Image,
    });

    mockValidateUploadDocumentRequest.mockReturnValue({
      success: false,
      errors: [{ field: 'documentType', message: 'Invalid document type' }],
    });

    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 when imageData is missing', async () => {
    mockEvent.body = JSON.stringify({
      documentType: 'omang_front',
    });

    mockValidateUploadDocumentRequest.mockReturnValue({
      success: false,
      errors: [{ field: 'imageData', message: 'Required' }],
    });

    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(400);
  });

  it('should return 400 when imageData is invalid base64', async () => {
    mockEvent.body = JSON.stringify({
      documentType: 'omang_front',
      imageData: 'not-a-valid-base64-uri',
    });

    mockValidateUploadDocumentRequest.mockReturnValue({
      success: true,
      data: { documentType: 'omang_front', imageData: 'not-a-valid-base64-uri' },
    });
    mockParseBase64DataUri.mockReturnValue(null);

    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('should return 400 when mime type is not allowed', async () => {
    mockEvent.body = JSON.stringify({
      documentType: 'omang_front',
      imageData: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    });

    mockValidateUploadDocumentRequest.mockReturnValue({
      success: true,
      data: { documentType: 'omang_front', imageData: 'data:image/gif;base64,...' },
    });
    mockParseBase64DataUri.mockReturnValue({
      mimeType: 'image/gif',
      data: Buffer.from('test'),
      size: 100,
    });
    mockValidateMimeType.mockReturnValue({
      valid: false,
      message: 'Supported types: image/jpeg, image/png, application/pdf',
    });

    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('should return 413 when file size exceeds limit', async () => {
    mockValidateFileSize.mockReturnValue({
      valid: false,
      message: 'File size: 15.00MB, Maximum: 10MB',
    });

    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(413);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('should return 400 when image dimensions are too small', async () => {
    mockGetImageDimensions.mockReturnValue({ width: 320, height: 240 });
    mockValidateImageDimensions.mockReturnValue({
      valid: false,
      message: 'Image dimensions: 320x240, Minimum: 640x480',
    });

    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('IMAGE_TOO_SMALL');
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
      status: 'created',
    });

    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(403);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('should return 400 when verification status does not allow uploads', async () => {
    mockGetVerification.mockResolvedValue({
      verificationId: 'ver_456',
      clientId: 'client_123',
      status: 'submitted',
    });

    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('INVALID_STATE');
  });

  it('should return 400 when document limit exceeded', async () => {
    mockCountDocuments.mockResolvedValue(20);

    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('DOCUMENT_LIMIT_EXCEEDED');
  });

  it('should return 201 on successful upload', async () => {
    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.documentId).toBe('doc_789');
    expect(body.verificationId).toBe('ver_456');
    expect(body.documentType).toBe('omang_front');
    expect(body.presignedUrl).toBeDefined();
  });

  it('should include CORS headers in response', async () => {
    const result = await handler(mockEvent, mockContext);

    expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
    expect(result.headers).toHaveProperty('Content-Type', 'application/json');
  });

  it('should include meta with requestId in response', async () => {
    const result = await handler(mockEvent, mockContext);

    const body = JSON.parse(result.body);
    expect(body.meta).toBeDefined();
    expect(body.meta.requestId).toBe('test-request-id');
  });

  it('should update verification status to documents_uploading on first upload', async () => {
    await handler(mockEvent, mockContext);

    expect(mockUpdateStatus).toHaveBeenCalledWith('ver_456', 'documents_uploading');
  });

  it('should not update status if already documents_uploading', async () => {
    mockGetVerification.mockResolvedValue({
      verificationId: 'ver_456',
      clientId: 'client_123',
      status: 'documents_uploading',
    });

    await handler(mockEvent, mockContext);

    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });

  it('should skip dimension validation for PDF files', async () => {
    mockParseBase64DataUri.mockReturnValue({
      mimeType: 'application/pdf',
      data: Buffer.from('test'),
      size: 1024,
    });
    mockGetImageDimensions.mockReturnValue(null);
    mockValidateImageDimensions.mockReturnValue({ valid: true });

    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(201);
    expect(mockValidateImageDimensions).toHaveBeenCalledWith(null, 'application/pdf');
  });

  it('should return 400 when virus/malware is detected', async () => {
    mockScanForViruses.mockReturnValue({
      clean: false,
      threat: 'Windows executable (MZ)',
    });

    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('MALWARE_DETECTED');
    expect(body.error.details[0].message).toContain('Windows executable');
  });

  it('should return 400 when image quality is poor (too blurry)', async () => {
    mockCheckImageQuality.mockReturnValue({
      acceptable: false,
      reason: 'Image is too blurry (score: 85%, max: 70%)',
      metrics: { blur: 0.85, brightness: 0.5, contrast: 0.6 },
    });

    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('IMAGE_QUALITY_POOR');
    expect(body.error.details[0].message).toContain('blurry');
  });

  it('should return 400 when image is too dark', async () => {
    mockCheckImageQuality.mockReturnValue({
      acceptable: false,
      reason: 'Image is too dark (brightness: 10%, min: 15%)',
      metrics: { blur: 0.3, brightness: 0.1, contrast: 0.6 },
    });

    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('IMAGE_QUALITY_POOR');
    expect(body.error.details[0].message).toContain('dark');
  });

  it('should return 400 when image has low contrast', async () => {
    mockCheckImageQuality.mockReturnValue({
      acceptable: false,
      reason: 'Image has insufficient contrast (score: 10%, min: 20%)',
      metrics: { blur: 0.3, brightness: 0.5, contrast: 0.1 },
    });

    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('IMAGE_QUALITY_POOR');
    expect(body.error.details[0].message).toContain('contrast');
  });

  it('should include rate limit headers in response', async () => {
    const result = await handler(mockEvent, mockContext);

    expect(result.headers).toHaveProperty('X-RateLimit-Limit', '50');
    expect(result.headers).toHaveProperty('X-RateLimit-Remaining', '49');
    expect(result.headers).toHaveProperty('X-RateLimit-Reset');
  });

  it('should include rate limit headers in error responses', async () => {
    mockEvent.body = null;

    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(400);
    expect(result.headers).toHaveProperty('X-RateLimit-Limit', '50');
    expect(result.headers).toHaveProperty('X-RateLimit-Remaining', '49');
  });

  describe('Multipart Form Data Upload', () => {
    it('should handle valid multipart/form-data upload', async () => {
      mockEvent.headers = {
        'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
      };
      mockEvent.body = '------WebKitFormBoundary\r\nContent-Disposition: form-data; name="documentType"\r\n\r\nomang_front\r\n------WebKitFormBoundary\r\nContent-Disposition: form-data; name="file"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\n[binary]\r\n------WebKitFormBoundary--';

      mockParseMultipartFormData.mockReturnValue({
        documentType: 'omang_front',
        imageBuffer: Buffer.from('test-image-data'),
        mimeType: 'image/jpeg',
        metadata: { captureMethod: 'upload' },
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(201);
      expect(mockParseMultipartFormData).toHaveBeenCalled();
    });

    it('should return 400 when multipart parsing fails', async () => {
      mockEvent.headers = {
        'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
      };
      mockEvent.body = 'invalid-multipart-data';

      mockParseMultipartFormData.mockReturnValue(null);

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('multipart');
    });

    it('should return 400 when multipart has invalid document type', async () => {
      mockEvent.headers = {
        'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
      };
      mockEvent.body = 'multipart-data';

      mockParseMultipartFormData.mockReturnValue({
        documentType: 'invalid_type',
        imageBuffer: Buffer.from('test'),
        mimeType: 'image/jpeg',
      });

      mockValidateUploadDocumentRequest.mockReturnValue({
        success: false,
        errors: [{ field: 'documentType', message: 'Invalid document type' }],
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('SQS OCR Queue Integration', () => {
    it('should send OCR message to queue on successful upload', async () => {
      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(201);
      expect(mockSendOcrMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          verificationId: 'ver_456',
          documentId: 'doc_789',
        })
      );
    });

    it('should set ocrQueued to true when SQS succeeds', async () => {
      mockSendOcrMessage.mockResolvedValue(undefined);

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.ocrQueued).toBe(true);
    });

    it('should set ocrQueued to false when SQS fails', async () => {
      mockSendOcrMessage.mockRejectedValue(new Error('SQS error'));

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.ocrQueued).toBe(false);
    });

    it('should still return 201 when SQS fails (graceful degradation)', async () => {
      mockSendOcrMessage.mockRejectedValue(new Error('SQS unavailable'));

      const result = await handler(mockEvent, mockContext);

      // Upload should still succeed even if OCR queue fails
      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.documentId).toBe('doc_789');
    });

    it('should mark document as ocrPending when SQS fails', async () => {
      mockSendOcrMessage.mockRejectedValue(new Error('SQS unavailable'));

      await handler(mockEvent, mockContext);

      // Verify DynamoDB was called to mark document as pending OCR
      expect(mockUpdateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          Key: {
            PK: 'CASE#ver_456',
            SK: 'DOC#doc_789',
          },
          UpdateExpression: 'SET #ocrPending = :pending, #ocrError = :error',
        })
      );
    });
  });
});
