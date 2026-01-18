import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './process-ocr';
import { OmangOcrService } from '../services/omang-ocr';
import { OcrStorageService } from '../services/ocr-storage';
import { SQSEvent } from 'aws-lambda';

const mockOmangOcrService = {
  extractOmangFront: vi.fn(),
  extractOmangBack: vi.fn(),
};

const mockOcrStorageService = {
  storeOcrResults: vi.fn(),
  updateVerificationWithExtractedData: vi.fn(),
};

vi.mock('../services/omang-ocr', () => ({
  OmangOcrService: vi.fn(function() {
    return mockOmangOcrService;
  }),
}));

vi.mock('../services/ocr-storage', () => ({
  OcrStorageService: vi.fn(function() {
    return mockOcrStorageService;
  }),
}));
vi.mock('../services/image-quality', () => ({
  assessImageQuality: vi.fn().mockReturnValue({
    isReadable: true,
    qualityScore: 95,
    issues: [],
    recommendation: 'Image quality is acceptable.',
  }),
  shouldRequestRecapture: vi.fn().mockReturnValue(false),
}));
vi.mock('../services/notification', () => ({
  notifyOcrFailure: vi.fn(),
  notifyPoorQualityImage: vi.fn(),
}));
vi.mock('../utils/metrics', () => ({
  recordOcrMetrics: vi.fn(),
  recordTextractError: vi.fn(),
  recordPoorQualityImage: vi.fn(),
  recordOmangValidationMetrics: vi.fn(),
}));

describe('process-ocr handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock implementations
    mockOmangOcrService.extractOmangFront.mockReset();
    mockOmangOcrService.extractOmangBack.mockReset();
    mockOcrStorageService.storeOcrResults.mockReset();
    mockOcrStorageService.updateVerificationWithExtractedData.mockReset();
  });

  it('should process OCR for omang_front document', async () => {
    const mockOcrResult = {
      extractedFields: {
        surname: 'MOEPSWA',
        idNumber: '059016012',
      },
      confidence: { overall: 98.5 },
      rawTextractResponse: {},
      extractionMethod: 'pattern' as const,
      processingTimeMs: 4500,
      requiresManualReview: false,
      missingFields: [],
    };

    mockOmangOcrService.extractOmangFront.mockResolvedValue(mockOcrResult);
    mockOcrStorageService.storeOcrResults.mockResolvedValue(undefined);
    mockOcrStorageService.updateVerificationWithExtractedData.mockResolvedValue(undefined);

    const event: SQSEvent = {
      Records: [
        {
          messageId: 'msg-123',
          receiptHandle: 'receipt-123',
          body: JSON.stringify({
            verificationId: 'ver_123',
            documentId: 'doc_456',
            s3Bucket: 'test-bucket',
            s3Key: 'client_abc/ver_123/omang_front.jpg',
            documentType: 'omang_front',
          }),
          attributes: {} as any,
          messageAttributes: {},
          md5OfBody: '',
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:af-south-1:123456789:test-queue',
          awsRegion: 'af-south-1',
        },
      ],
    };

    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(0);
    expect(mockOmangOcrService.extractOmangFront).toHaveBeenCalledWith(
      'test-bucket',
      'client_abc/ver_123/omang_front.jpg'
    );
    expect(mockOcrStorageService.storeOcrResults).toHaveBeenCalledWith(
      'ver_123',
      'doc_456',
      'omang_front',
      mockOcrResult,
      expect.any(Object),  // qualityResult
      expect.any(Object)   // validationResult
    );
    expect(mockOcrStorageService.updateVerificationWithExtractedData).toHaveBeenCalledWith(
      'ver_123',
      mockOcrResult
    );
  });

  it('should process OCR for omang_back document', async () => {
    const mockOcrResult = {
      extractedFields: {
        nationality: 'MOTSWANA',
        sex: 'M',
        dateOfExpiry: '22/05/2032',
      },
      confidence: { overall: 97.5 },
      rawTextractResponse: {},
      extractionMethod: 'pattern' as const,
      processingTimeMs: 4200,
      requiresManualReview: false,
      missingFields: [],
    };

    mockOmangOcrService.extractOmangBack.mockResolvedValue(mockOcrResult);
    mockOcrStorageService.storeOcrResults.mockResolvedValue(undefined);
    mockOcrStorageService.updateVerificationWithExtractedData.mockResolvedValue(undefined);

    const event: SQSEvent = {
      Records: [
        {
          messageId: 'msg-123',
          receiptHandle: 'receipt-123',
          body: JSON.stringify({
            verificationId: 'ver_123',
            documentId: 'doc_456',
            s3Bucket: 'test-bucket',
            s3Key: 'client_abc/ver_123/omang_back.jpg',
            documentType: 'omang_back',
          }),
          attributes: {} as any,
          messageAttributes: {},
          md5OfBody: '',
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:af-south-1:123456789:test-queue',
          awsRegion: 'af-south-1',
        },
      ],
    };

    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(0);
    expect(mockOmangOcrService.extractOmangBack).toHaveBeenCalled();
  });

  it('should skip OCR extraction for selfie documents', async () => {
    mockOcrStorageService.storeOcrResults.mockResolvedValue(undefined);
    mockOcrStorageService.updateVerificationWithExtractedData.mockResolvedValue(undefined);

    const event: SQSEvent = {
      Records: [
        {
          messageId: 'msg-selfie',
          receiptHandle: 'receipt-selfie',
          body: JSON.stringify({
            verificationId: 'ver_123',
            documentId: 'doc_selfie',
            s3Bucket: 'test-bucket',
            s3Key: 'client_abc/ver_123/selfie.jpg',
            documentType: 'selfie',
          }),
          attributes: {} as any,
          messageAttributes: {},
          md5OfBody: '',
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:af-south-1:123456789:test-queue',
          awsRegion: 'af-south-1',
        },
      ],
    };

    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(0);
    // Selfie should NOT call Textract OCR services
    expect(mockOmangOcrService.extractOmangFront).not.toHaveBeenCalled();
    expect(mockOmangOcrService.extractOmangBack).not.toHaveBeenCalled();
    // But should still store results
    expect(mockOcrStorageService.storeOcrResults).toHaveBeenCalledWith(
      'ver_123',
      'doc_selfie',
      'selfie',
      expect.objectContaining({
        extractedFields: {},
        confidence: { overall: 100 },
        requiresManualReview: false,
      }),
      null,  // No quality result for selfies
      null   // No validation result for selfies
    );
  });

  it('should return batch item failure on error', async () => {
    mockOmangOcrService.extractOmangFront.mockRejectedValue(new Error('Textract error'));

    const event: SQSEvent = {
      Records: [
        {
          messageId: 'msg-123',
          receiptHandle: 'receipt-123',
          body: JSON.stringify({
            verificationId: 'ver_123',
            documentId: 'doc_456',
            s3Bucket: 'test-bucket',
            s3Key: 'client_abc/ver_123/omang_front.jpg',
            documentType: 'omang_front',
          }),
          attributes: {} as any,
          messageAttributes: {},
          md5OfBody: '',
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:af-south-1:123456789:test-queue',
          awsRegion: 'af-south-1',
        },
      ],
    };

    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0].itemIdentifier).toBe('msg-123');
  });

  it('should process multiple messages in batch', async () => {
    const mockOcrResult = {
      extractedFields: {},
      confidence: { overall: 98.5 },
      rawTextractResponse: {},
      extractionMethod: 'pattern' as const,
      processingTimeMs: 4500,
      requiresManualReview: false,
      missingFields: [],
    };

    mockOmangOcrService.extractOmangFront.mockResolvedValue(mockOcrResult);
    mockOcrStorageService.storeOcrResults.mockResolvedValue(undefined);
    mockOcrStorageService.updateVerificationWithExtractedData.mockResolvedValue(undefined);

    const event: SQSEvent = {
      Records: [
        {
          messageId: 'msg-1',
          receiptHandle: 'receipt-1',
          body: JSON.stringify({
            verificationId: 'ver_1',
            documentId: 'doc_1',
            s3Bucket: 'test-bucket',
            s3Key: 'test1.jpg',
            documentType: 'omang_front',
          }),
          attributes: {} as any,
          messageAttributes: {},
          md5OfBody: '',
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:af-south-1:123456789:test-queue',
          awsRegion: 'af-south-1',
        },
        {
          messageId: 'msg-2',
          receiptHandle: 'receipt-2',
          body: JSON.stringify({
            verificationId: 'ver_2',
            documentId: 'doc_2',
            s3Bucket: 'test-bucket',
            s3Key: 'test2.jpg',
            documentType: 'omang_front',
          }),
          attributes: {} as any,
          messageAttributes: {},
          md5OfBody: '',
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:af-south-1:123456789:test-queue',
          awsRegion: 'af-south-1',
        },
      ],
    };

    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(0);
    expect(mockOmangOcrService.extractOmangFront).toHaveBeenCalledTimes(2);
  });

  it('should run validation for omang_front with complete OCR data', async () => {
    const mockOcrResult = {
      extractedFields: {
        surname: 'MOEPSWA',
        idNumber: '059016012',
        dateOfExpiry: '22/05/2032',
      },
      confidence: { overall: 98.5 },
      rawTextractResponse: { Blocks: [] },
      extractionMethod: 'pattern' as const,
      processingTimeMs: 4500,
      requiresManualReview: false,
      missingFields: [],
    };

    mockOmangOcrService.extractOmangFront.mockResolvedValue(mockOcrResult);
    mockOcrStorageService.storeOcrResults.mockResolvedValue(undefined);
    mockOcrStorageService.updateVerificationWithExtractedData.mockResolvedValue(undefined);

    const event: SQSEvent = {
      Records: [
        {
          messageId: 'msg-validation',
          receiptHandle: 'receipt-validation',
          body: JSON.stringify({
            verificationId: 'ver_validation',
            documentId: 'doc_validation',
            s3Bucket: 'test-bucket',
            s3Key: 'client_abc/ver_validation/omang_front.jpg',
            documentType: 'omang_front',
          }),
          attributes: {} as any,
          messageAttributes: {},
          md5OfBody: '',
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:af-south-1:123456789:test-queue',
          awsRegion: 'af-south-1',
        },
      ],
    };

    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(0);
    // Validation should have been called and result passed to storage
    expect(mockOcrStorageService.storeOcrResults).toHaveBeenCalledWith(
      'ver_validation',
      'doc_validation',
      'omang_front',
      expect.any(Object),
      expect.any(Object),
      expect.objectContaining({
        overall: expect.objectContaining({
          valid: true,
        }),
      })
    );
  });

  it('should mark document for manual review when validation fails', async () => {
    const mockOcrResult = {
      extractedFields: {
        surname: 'MOEPSWA',
        idNumber: '12345678', // Invalid: 8 digits
        dateOfExpiry: '22/05/2032',
      },
      confidence: { overall: 98.5 },
      rawTextractResponse: { Blocks: [] },
      extractionMethod: 'pattern' as const,
      processingTimeMs: 4500,
      requiresManualReview: false,
      missingFields: [],
    };

    mockOmangOcrService.extractOmangFront.mockResolvedValue(mockOcrResult);
    mockOcrStorageService.storeOcrResults.mockResolvedValue(undefined);
    mockOcrStorageService.updateVerificationWithExtractedData.mockResolvedValue(undefined);

    const event: SQSEvent = {
      Records: [
        {
          messageId: 'msg-invalid',
          receiptHandle: 'receipt-invalid',
          body: JSON.stringify({
            verificationId: 'ver_invalid',
            documentId: 'doc_invalid',
            s3Bucket: 'test-bucket',
            s3Key: 'client_abc/ver_invalid/omang_front.jpg',
            documentType: 'omang_front',
          }),
          attributes: {} as any,
          messageAttributes: {},
          md5OfBody: '',
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:af-south-1:123456789:test-queue',
          awsRegion: 'af-south-1',
        },
      ],
    };

    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(0);
    // Validation should fail and result passed to storage
    expect(mockOcrStorageService.storeOcrResults).toHaveBeenCalledWith(
      'ver_invalid',
      'doc_invalid',
      'omang_front',
      expect.objectContaining({
        requiresManualReview: true,
        missingFields: expect.arrayContaining([
          expect.stringContaining('VALIDATION:'),
        ]),
      }),
      expect.any(Object),
      expect.objectContaining({
        overall: expect.objectContaining({
          valid: false,
        }),
      })
    );
  });

  it('should skip validation when OCR data is incomplete', async () => {
    const mockOcrResult = {
      extractedFields: {
        surname: 'MOEPSWA',
        idNumber: '059016012',
        // Missing dateOfExpiry
      },
      confidence: { overall: 98.5 },
      rawTextractResponse: { Blocks: [] },
      extractionMethod: 'pattern' as const,
      processingTimeMs: 4500,
      requiresManualReview: false,
      missingFields: ['dateOfExpiry'],
    };

    mockOmangOcrService.extractOmangFront.mockResolvedValue(mockOcrResult);
    mockOcrStorageService.storeOcrResults.mockResolvedValue(undefined);
    mockOcrStorageService.updateVerificationWithExtractedData.mockResolvedValue(undefined);

    const event: SQSEvent = {
      Records: [
        {
          messageId: 'msg-incomplete',
          receiptHandle: 'receipt-incomplete',
          body: JSON.stringify({
            verificationId: 'ver_incomplete',
            documentId: 'doc_incomplete',
            s3Bucket: 'test-bucket',
            s3Key: 'client_abc/ver_incomplete/omang_front.jpg',
            documentType: 'omang_front',
          }),
          attributes: {} as any,
          messageAttributes: {},
          md5OfBody: '',
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:af-south-1:123456789:test-queue',
          awsRegion: 'af-south-1',
        },
      ],
    };

    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(0);
    // Validation should be skipped (null) when data is incomplete
    expect(mockOcrStorageService.storeOcrResults).toHaveBeenCalledWith(
      'ver_incomplete',
      'doc_incomplete',
      'omang_front',
      expect.any(Object),
      expect.any(Object),
      null // No validation result
    );
  });
});
