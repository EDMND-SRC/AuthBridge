import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { SQSEvent } from 'aws-lambda';
import { handler } from '../../src/handlers/process-ocr';
import { OmangOcrService } from '../../src/services/omang-ocr';
import { OcrStorageService } from '../../src/services/ocr-storage';

/**
 * Integration tests for OCR processing async flow
 * Tests the complete flow: SQS message → OCR processing → DynamoDB storage
 */

vi.mock('../../src/services/omang-ocr');
vi.mock('../../src/services/ocr-storage');
vi.mock('../../src/services/image-quality', () => ({
  assessImageQuality: vi.fn().mockReturnValue({
    isReadable: true,
    qualityScore: 95,
    issues: [],
    recommendation: 'Image quality is acceptable.',
  }),
  shouldRequestRecapture: vi.fn().mockReturnValue(false),
}));
vi.mock('../../src/services/notification', () => ({
  notifyOcrFailure: vi.fn(),
  notifyPoorQualityImage: vi.fn(),
}));
vi.mock('../../src/utils/metrics', () => ({
  recordOcrMetrics: vi.fn(),
  recordTextractError: vi.fn(),
  recordPoorQualityImage: vi.fn(),
}));

describe('OCR Processing Integration Tests', () => {
  let mockOmangOcrService: any;
  let mockOcrStorageService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockOmangOcrService = {
      extractOmangFront: vi.fn().mockResolvedValue({
        extractedFields: {
          surname: 'MOGOROSI',
          firstNames: 'KGOSI THABO',
          omangNumber: '123456789',
          dateOfBirth: '15/03/1985',
          sex: 'M',
        },
        confidence: { overall: 98.5 },
        rawTextractResponse: { Blocks: [] },
        extractionMethod: 'pattern',
        processingTimeMs: 4500,
        requiresManualReview: false,
        missingFields: [],
      }),
      extractOmangBack: vi.fn().mockResolvedValue({
        extractedFields: {
          plot: '12345',
          locality: 'GABORONE',
          district: 'SOUTH EAST DISTRICT',
        },
        confidence: { overall: 97.5 },
        rawTextractResponse: { Blocks: [] },
        extractionMethod: 'pattern',
        processingTimeMs: 4200,
        requiresManualReview: false,
        missingFields: [],
      }),
    };

    mockOcrStorageService = {
      storeOcrResults: vi.fn().mockResolvedValue(undefined),
      updateVerificationWithExtractedData: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(OmangOcrService).mockImplementation(() => mockOmangOcrService as any);
    vi.mocked(OcrStorageService).mockImplementation(() => mockOcrStorageService as any);
  });

  describe('Complete OCR Flow', () => {
    it('should process omang_front document through complete flow', async () => {
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'int-test-msg-1',
            receiptHandle: 'receipt-1',
            body: JSON.stringify({
              verificationId: 'ver_integration_test',
              documentId: 'doc_integration_test',
              s3Bucket: 'authbridge-documents-staging',
              s3Key: 'client_abc/ver_integration_test/omang_front.jpg',
              documentType: 'omang_front',
            }),
            attributes: {} as any,
            messageAttributes: {},
            md5OfBody: '',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:af-south-1:123456789:authbridge-ocr-queue-staging',
            awsRegion: 'af-south-1',
          },
        ],
      };

      const result = await handler(event);

      // Should complete without batch failures
      expect(result.batchItemFailures).toHaveLength(0);
      expect(mockOmangOcrService.extractOmangFront).toHaveBeenCalledWith(
        'authbridge-documents-staging',
        'client_abc/ver_integration_test/omang_front.jpg'
      );
      expect(mockOcrStorageService.storeOcrResults).toHaveBeenCalled();
      expect(mockOcrStorageService.updateVerificationWithExtractedData).toHaveBeenCalled();
    });

    it('should process omang_back document through complete flow', async () => {
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'int-test-msg-2',
            receiptHandle: 'receipt-2',
            body: JSON.stringify({
              verificationId: 'ver_integration_test',
              documentId: 'doc_integration_back',
              s3Bucket: 'authbridge-documents-staging',
              s3Key: 'client_abc/ver_integration_test/omang_back.jpg',
              documentType: 'omang_back',
            }),
            attributes: {} as any,
            messageAttributes: {},
            md5OfBody: '',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:af-south-1:123456789:authbridge-ocr-queue-staging',
            awsRegion: 'af-south-1',
          },
        ],
      };

      const result = await handler(event);

      expect(result.batchItemFailures).toHaveLength(0);
      expect(mockOmangOcrService.extractOmangBack).toHaveBeenCalled();
    });

    it('should skip OCR extraction for selfie documents', async () => {
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'int-test-msg-selfie',
            receiptHandle: 'receipt-selfie',
            body: JSON.stringify({
              verificationId: 'ver_integration_test',
              documentId: 'doc_selfie',
              s3Bucket: 'authbridge-documents-staging',
              s3Key: 'client_abc/ver_integration_test/selfie.jpg',
              documentType: 'selfie',
            }),
            attributes: {} as any,
            messageAttributes: {},
            md5OfBody: '',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:af-south-1:123456789:authbridge-ocr-queue-staging',
            awsRegion: 'af-south-1',
          },
        ],
      };

      const result = await handler(event);

      // Selfie should process without calling Textract
      expect(result.batchItemFailures).toHaveLength(0);
      // Selfie should NOT call Textract OCR services
      expect(mockOmangOcrService.extractOmangFront).not.toHaveBeenCalled();
      expect(mockOmangOcrService.extractOmangBack).not.toHaveBeenCalled();
      // But should still store results
      expect(mockOcrStorageService.storeOcrResults).toHaveBeenCalledWith(
        'ver_integration_test',
        'doc_selfie',
        'selfie',
        expect.objectContaining({
          extractedFields: {},
          confidence: { overall: 100 },
          requiresManualReview: false,
        }),
        null  // No quality result for selfies
      );
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple documents in a single batch', async () => {
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'batch-msg-1',
            receiptHandle: 'receipt-batch-1',
            body: JSON.stringify({
              verificationId: 'ver_batch_test',
              documentId: 'doc_batch_1',
              s3Bucket: 'authbridge-documents-staging',
              s3Key: 'client_abc/ver_batch_test/omang_front.jpg',
              documentType: 'omang_front',
            }),
            attributes: {} as any,
            messageAttributes: {},
            md5OfBody: '',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:af-south-1:123456789:authbridge-ocr-queue-staging',
            awsRegion: 'af-south-1',
          },
          {
            messageId: 'batch-msg-2',
            receiptHandle: 'receipt-batch-2',
            body: JSON.stringify({
              verificationId: 'ver_batch_test',
              documentId: 'doc_batch_2',
              s3Bucket: 'authbridge-documents-staging',
              s3Key: 'client_abc/ver_batch_test/omang_back.jpg',
              documentType: 'omang_back',
            }),
            attributes: {} as any,
            messageAttributes: {},
            md5OfBody: '',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:af-south-1:123456789:authbridge-ocr-queue-staging',
            awsRegion: 'af-south-1',
          },
        ],
      };

      const result = await handler(event);

      expect(result.batchItemFailures).toHaveLength(0);
      expect(mockOmangOcrService.extractOmangFront).toHaveBeenCalledTimes(1);
      expect(mockOmangOcrService.extractOmangBack).toHaveBeenCalledTimes(1);
    });

    it('should report partial batch failures correctly', async () => {
      // Make second call fail
      mockOmangOcrService.extractOmangBack.mockRejectedValueOnce(new Error('Textract throttling'));

      const event: SQSEvent = {
        Records: [
          {
            messageId: 'partial-fail-1',
            receiptHandle: 'receipt-pf-1',
            body: JSON.stringify({
              verificationId: 'ver_partial_fail',
              documentId: 'doc_pf_1',
              s3Bucket: 'authbridge-documents-staging',
              s3Key: 'client_abc/ver_partial_fail/omang_front.jpg',
              documentType: 'omang_front',
            }),
            attributes: {} as any,
            messageAttributes: {},
            md5OfBody: '',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:af-south-1:123456789:authbridge-ocr-queue-staging',
            awsRegion: 'af-south-1',
          },
          {
            messageId: 'partial-fail-2',
            receiptHandle: 'receipt-pf-2',
            body: JSON.stringify({
              verificationId: 'ver_partial_fail',
              documentId: 'doc_pf_2',
              s3Bucket: 'authbridge-documents-staging',
              s3Key: 'client_abc/ver_partial_fail/omang_back.jpg',
              documentType: 'omang_back',
            }),
            attributes: {} as any,
            messageAttributes: {},
            md5OfBody: '',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:af-south-1:123456789:authbridge-ocr-queue-staging',
            awsRegion: 'af-south-1',
          },
        ],
      };

      const result = await handler(event);

      // First should succeed, second should fail
      expect(result.batchItemFailures).toHaveLength(1);
      expect(result.batchItemFailures[0].itemIdentifier).toBe('partial-fail-2');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed SQS message body', async () => {
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'malformed-msg',
            receiptHandle: 'receipt-malformed',
            body: 'not-valid-json',
            attributes: {} as any,
            messageAttributes: {},
            md5OfBody: '',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:af-south-1:123456789:authbridge-ocr-queue-staging',
            awsRegion: 'af-south-1',
          },
        ],
      };

      const result = await handler(event);

      // Malformed message should be reported as failure
      expect(result.batchItemFailures).toHaveLength(1);
      expect(result.batchItemFailures[0].itemIdentifier).toBe('malformed-msg');
    });

    it('should handle Textract service errors', async () => {
      mockOmangOcrService.extractOmangFront.mockRejectedValue(
        new Error('ProvisionedThroughputExceededException')
      );

      const event: SQSEvent = {
        Records: [
          {
            messageId: 'throttle-msg',
            receiptHandle: 'receipt-throttle',
            body: JSON.stringify({
              verificationId: 'ver_throttle',
              documentId: 'doc_throttle',
              s3Bucket: 'authbridge-documents-staging',
              s3Key: 'client_abc/ver_throttle/omang_front.jpg',
              documentType: 'omang_front',
            }),
            attributes: {} as any,
            messageAttributes: {},
            md5OfBody: '',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:af-south-1:123456789:authbridge-ocr-queue-staging',
            awsRegion: 'af-south-1',
          },
        ],
      };

      const result = await handler(event);

      expect(result.batchItemFailures).toHaveLength(1);
      expect(result.batchItemFailures[0].itemIdentifier).toBe('throttle-msg');
    });

    it('should handle storage service errors', async () => {
      mockOcrStorageService.storeOcrResults.mockRejectedValue(
        new Error('DynamoDB connection failed')
      );

      const event: SQSEvent = {
        Records: [
          {
            messageId: 'storage-fail-msg',
            receiptHandle: 'receipt-storage-fail',
            body: JSON.stringify({
              verificationId: 'ver_storage_fail',
              documentId: 'doc_storage_fail',
              s3Bucket: 'authbridge-documents-staging',
              s3Key: 'client_abc/ver_storage_fail/omang_front.jpg',
              documentType: 'omang_front',
            }),
            attributes: {} as any,
            messageAttributes: {},
            md5OfBody: '',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:af-south-1:123456789:authbridge-ocr-queue-staging',
            awsRegion: 'af-south-1',
          },
        ],
      };

      const result = await handler(event);

      expect(result.batchItemFailures).toHaveLength(1);
    });
  });

  describe('Document Status Transitions', () => {
    it('should update document status from uploaded to processed', async () => {
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'status-test-msg',
            receiptHandle: 'receipt-status',
            body: JSON.stringify({
              verificationId: 'ver_status_test',
              documentId: 'doc_status_test',
              s3Bucket: 'authbridge-documents-staging',
              s3Key: 'client_abc/ver_status_test/omang_front.jpg',
              documentType: 'omang_front',
            }),
            attributes: {} as any,
            messageAttributes: {},
            md5OfBody: '',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:af-south-1:123456789:authbridge-ocr-queue-staging',
            awsRegion: 'af-south-1',
          },
        ],
      };

      const result = await handler(event);

      expect(result.batchItemFailures).toHaveLength(0);
      // Verify storage was called to update status
      expect(mockOcrStorageService.storeOcrResults).toHaveBeenCalledWith(
        'ver_status_test',
        'doc_status_test',
        'omang_front',
        expect.any(Object),
        expect.any(Object)  // qualityResult
      );
    });
  });
});
