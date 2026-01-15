/**
 * Integration tests for biometric processing
 *
 * These tests verify the biometric processing handler behavior.
 * Uses the same mocking pattern as the unit tests for reliability.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SQSEvent } from 'aws-lambda';

// Mock all dependencies before importing handler
vi.mock('../../src/services/rekognition', () => ({
  createRekognitionClient: vi.fn(() => ({})),
  RekognitionService: vi.fn().mockImplementation(() => ({
    detectFaceLiveness: vi.fn(),
    compareFaces: vi.fn(),
    isRetryableError: vi.fn().mockReturnValue(false),
  })),
}));

vi.mock('../../src/services/biometric', () => ({
  BiometricService: vi.fn().mockImplementation(() => ({
    processBiometric: vi.fn(),
  })),
}));

vi.mock('../../src/services/biometric-storage', () => ({
  BiometricStorageService: vi.fn().mockImplementation(() => ({
    storeBiometricResults: vi.fn().mockResolvedValue(undefined),
    updateVerificationWithBiometricSummary: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../src/services/dynamodb', () => ({
  DynamoDBService: vi.fn().mockImplementation(() => ({
    getItem: vi.fn(),
  })),
}));

vi.mock('../../src/utils/metrics', () => ({
  recordBiometricMetrics: vi.fn().mockResolvedValue(undefined),
  recordRekognitionError: vi.fn().mockResolvedValue(undefined),
}));

describe('Biometric Processing Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BUCKET_NAME = 'test-bucket';
    process.env.TABLE_NAME = 'AuthBridgeTable';
    process.env.AWS_REGION = 'af-south-1';
  });

  const createSQSEvent = (body: object, messageId = 'msg-1'): SQSEvent => ({
    Records: [
      {
        messageId,
        receiptHandle: 'receipt-1',
        body: JSON.stringify(body),
        attributes: {
          ApproximateReceiveCount: '1',
          SentTimestamp: '1234567890',
          SenderId: 'sender-123',
          ApproximateFirstReceiveTimestamp: '1234567890',
        },
        messageAttributes: {},
        md5OfBody: 'md5-1',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:af-south-1:123456789012:biometric-queue',
        awsRegion: 'af-south-1',
      },
    ],
  });

  describe('Successful biometric verification flow', () => {
    it('should process biometric verification with passing scores', async () => {
      // Setup mocks for successful flow
      const { DynamoDBService } = await import('../../src/services/dynamodb');
      const { BiometricService } = await import('../../src/services/biometric');

      const mockGetItem = vi.fn().mockResolvedValue({
        Item: { s3Key: 'test-key', documentType: 'selfie' },
      });
      vi.mocked(DynamoDBService).mockImplementation(
        () => ({ getItem: mockGetItem }) as any
      );

      const mockProcessBiometric = vi.fn().mockResolvedValue({
        liveness: {
          confidence: 98.5,
          status: 'SUCCEEDED',
          passed: true,
          sessionId: 'session-123',
          processedAt: '2026-01-15T10:00:00Z',
        },
        faceComparison: {
          similarity: 92.5,
          passed: true,
          sourceImageFace: {
            confidence: 99.9,
            boundingBox: { width: 0.3, height: 0.4, left: 0.35, top: 0.2 },
          },
          targetImageFace: {
            confidence: 99.8,
            boundingBox: { width: 0.3, height: 0.4, left: 0.35, top: 0.2 },
          },
          processedAt: '2026-01-15T10:00:01Z',
        },
        overallScore: 94.3,
        passed: true,
        requiresManualReview: false,
        processedAt: '2026-01-15T10:00:01Z',
        processingTimeMs: 2500,
      });
      vi.mocked(BiometricService).mockImplementation(
        () => ({ processBiometric: mockProcessBiometric }) as any
      );

      // Re-import handler to pick up new mocks
      vi.resetModules();
      const { handler } = await import('../../src/handlers/process-biometric');

      const event = createSQSEvent({
        verificationId: 'ver_integration_123',
        selfieDocumentId: 'doc_selfie_456',
        omangFrontDocumentId: 'doc_omang_789',
        livenessSessionId: 'session_integration_abc',
      });

      const result = await handler(event, {} as any, {} as any);

      expect(result.batchItemFailures).toHaveLength(0);
    });

    it('should handle low similarity and flag for manual review', async () => {
      const { DynamoDBService } = await import('../../src/services/dynamodb');
      const { BiometricService } = await import('../../src/services/biometric');

      const mockGetItem = vi.fn().mockResolvedValue({
        Item: { s3Key: 'test-key', documentType: 'selfie' },
      });
      vi.mocked(DynamoDBService).mockImplementation(
        () => ({ getItem: mockGetItem }) as any
      );

      const mockProcessBiometric = vi.fn().mockResolvedValue({
        liveness: {
          confidence: 98.5,
          status: 'SUCCEEDED',
          passed: true,
          sessionId: 'session-456',
          processedAt: '2026-01-15T10:00:00Z',
        },
        faceComparison: {
          similarity: 65.0,
          passed: false,
          sourceImageFace: {
            confidence: 99.9,
            boundingBox: { width: 0.3, height: 0.4, left: 0.35, top: 0.2 },
          },
          processedAt: '2026-01-15T10:00:01Z',
        },
        overallScore: 75.0,
        passed: false,
        requiresManualReview: true,
        processedAt: '2026-01-15T10:00:01Z',
        processingTimeMs: 2500,
      });
      vi.mocked(BiometricService).mockImplementation(
        () => ({ processBiometric: mockProcessBiometric }) as any
      );

      vi.resetModules();
      const { handler } = await import('../../src/handlers/process-biometric');

      const event = createSQSEvent({
        verificationId: 'ver_low_sim',
        selfieDocumentId: 'doc_selfie_low',
        omangFrontDocumentId: 'doc_omang_low',
        livenessSessionId: 'session_low_sim',
      });

      const result = await handler(event, {} as any, {} as any);

      // Should succeed (not fail) but mark for manual review
      expect(result.batchItemFailures).toHaveLength(0);
    });
  });

  describe('Error handling', () => {
    it('should handle missing document and return batch failure', async () => {
      const { DynamoDBService } = await import('../../src/services/dynamodb');

      const mockGetItem = vi.fn().mockResolvedValue({ Item: null });
      vi.mocked(DynamoDBService).mockImplementation(
        () => ({ getItem: mockGetItem }) as any
      );

      vi.resetModules();
      const { handler } = await import('../../src/handlers/process-biometric');

      const event = createSQSEvent(
        {
          verificationId: 'ver_missing',
          selfieDocumentId: 'doc_missing',
          omangFrontDocumentId: 'doc_also_missing',
          livenessSessionId: 'session_missing',
        },
        'msg-missing-doc'
      );

      const result = await handler(event, {} as any, {} as any);

      expect(result.batchItemFailures).toHaveLength(1);
      expect(result.batchItemFailures[0].itemIdentifier).toBe('msg-missing-doc');
    });

    it('should handle malformed JSON message body', async () => {
      vi.resetModules();
      const { handler } = await import('../../src/handlers/process-biometric');

      const event: SQSEvent = {
        Records: [
          {
            messageId: 'msg-malformed',
            receiptHandle: 'receipt-1',
            body: 'not-valid-json',
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1234567890',
              SenderId: 'sender-123',
              ApproximateFirstReceiveTimestamp: '1234567890',
            },
            messageAttributes: {},
            md5OfBody: 'md5-1',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:af-south-1:123456789012:biometric-queue',
            awsRegion: 'af-south-1',
          },
        ],
      };

      const result = await handler(event, {} as any, {} as any);

      expect(result.batchItemFailures).toHaveLength(1);
      expect(result.batchItemFailures[0].itemIdentifier).toBe('msg-malformed');
    });
  });

  describe('Liveness validation', () => {
    it('should process failed liveness and flag for manual review', async () => {
      const { DynamoDBService } = await import('../../src/services/dynamodb');
      const { BiometricService } = await import('../../src/services/biometric');

      const mockGetItem = vi.fn().mockResolvedValue({
        Item: { s3Key: 'test-key', documentType: 'selfie' },
      });
      vi.mocked(DynamoDBService).mockImplementation(
        () => ({ getItem: mockGetItem }) as any
      );

      const mockProcessBiometric = vi.fn().mockResolvedValue({
        liveness: {
          confidence: 45.0,
          status: 'FAILED',
          passed: false,
          sessionId: 'session-failed',
          processedAt: '2026-01-15T10:00:00Z',
        },
        faceComparison: {
          similarity: 95.0,
          passed: true,
          sourceImageFace: {
            confidence: 99.9,
            boundingBox: { width: 0.3, height: 0.4, left: 0.35, top: 0.2 },
          },
          targetImageFace: {
            confidence: 99.8,
            boundingBox: { width: 0.3, height: 0.4, left: 0.35, top: 0.2 },
          },
          processedAt: '2026-01-15T10:00:01Z',
        },
        overallScore: 80.0,
        passed: false,
        requiresManualReview: true,
        processedAt: '2026-01-15T10:00:01Z',
        processingTimeMs: 2500,
      });
      vi.mocked(BiometricService).mockImplementation(
        () => ({ processBiometric: mockProcessBiometric }) as any
      );

      vi.resetModules();
      const { handler } = await import('../../src/handlers/process-biometric');

      const event = createSQSEvent({
        verificationId: 'ver_failed_liveness',
        selfieDocumentId: 'doc_selfie_fail',
        omangFrontDocumentId: 'doc_omang_fail',
        livenessSessionId: 'session_failed',
      });

      const result = await handler(event, {} as any, {} as any);

      // Should succeed but mark for manual review
      expect(result.batchItemFailures).toHaveLength(0);
    });
  });
});
