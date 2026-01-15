import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SQSEvent } from 'aws-lambda';

// Mock all dependencies before importing handler
vi.mock('../services/rekognition', () => ({
  createRekognitionClient: vi.fn(() => ({})),
  RekognitionService: vi.fn().mockImplementation(() => ({
    detectFaceLiveness: vi.fn().mockResolvedValue({
      confidence: 98.5,
      status: 'SUCCEEDED',
      passed: true,
      sessionId: 'session-123',
      processedAt: '2026-01-15T10:00:00Z',
    }),
    compareFaces: vi.fn().mockResolvedValue({
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
    }),
    isRetryableError: vi.fn().mockReturnValue(false),
  })),
}));

vi.mock('../services/biometric', () => ({
  BiometricService: vi.fn().mockImplementation(() => ({
    processBiometric: vi.fn().mockResolvedValue({
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
    }),
  })),
}));

vi.mock('../services/biometric-storage', () => ({
  BiometricStorageService: vi.fn().mockImplementation(() => ({
    storeBiometricResults: vi.fn().mockResolvedValue(undefined),
    updateVerificationWithBiometricSummary: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../services/dynamodb', () => ({
  DynamoDBService: vi.fn().mockImplementation(() => ({
    getItem: vi.fn().mockResolvedValue({
      Item: {
        s3Key: 'test-key',
      },
    }),
  })),
}));

vi.mock('../utils/metrics', () => ({
  recordBiometricMetrics: vi.fn().mockResolvedValue(undefined),
  recordRekognitionError: vi.fn().mockResolvedValue(undefined),
}));

import { handler } from './process-biometric';

describe('process-biometric handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process biometric verification successfully', async () => {
    const event: SQSEvent = {
      Records: [
        {
          messageId: 'msg-123',
          receiptHandle: 'receipt-123',
          body: JSON.stringify({
            verificationId: 'ver_123',
            selfieDocumentId: 'doc_selfie_456',
            omangFrontDocumentId: 'doc_omang_789',
            livenessSessionId: 'session_abc',
          }),
          attributes: {
            ApproximateReceiveCount: '1',
            SentTimestamp: '1234567890',
            SenderId: 'sender-123',
            ApproximateFirstReceiveTimestamp: '1234567890',
          },
          messageAttributes: {},
          md5OfBody: 'md5-123',
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:af-south-1:123456789012:queue-name',
          awsRegion: 'af-south-1',
        },
      ],
    };

    const result = await handler(event, {} as any, {} as any);

    expect(result.batchItemFailures).toHaveLength(0);
  });

  it('should handle processing errors and return batch item failures', async () => {
    // Temporarily override mock to throw error
    const { DynamoDBService } = await import('../services/dynamodb');
    const mockGetItem = vi.fn().mockRejectedValue(new Error('DynamoDB error'));

    // Create a new instance with error
    const originalImpl = vi.mocked(DynamoDBService);
    vi.mocked(DynamoDBService).mockImplementationOnce(
      () =>
        ({
          getItem: mockGetItem,
        }) as any
    );

    const event: SQSEvent = {
      Records: [
        {
          messageId: 'msg-fail',
          receiptHandle: 'receipt-fail',
          body: 'invalid-json-to-trigger-error',
          attributes: {
            ApproximateReceiveCount: '1',
            SentTimestamp: '1234567890',
            SenderId: 'sender-123',
            ApproximateFirstReceiveTimestamp: '1234567890',
          },
          messageAttributes: {},
          md5OfBody: 'md5-fail',
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:af-south-1:123456789012:queue-name',
          awsRegion: 'af-south-1',
        },
      ],
    };

    const result = await handler(event, {} as any, {} as any);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0].itemIdentifier).toBe('msg-fail');

    // Restore original mock
    vi.mocked(DynamoDBService).mockImplementation(originalImpl as any);
  });

  it('should handle malformed message body', async () => {
    const event: SQSEvent = {
      Records: [
        {
          messageId: 'msg-malformed',
          receiptHandle: 'receipt-malformed',
          body: 'not-valid-json',
          attributes: {
            ApproximateReceiveCount: '1',
            SentTimestamp: '1234567890',
            SenderId: 'sender-123',
            ApproximateFirstReceiveTimestamp: '1234567890',
          },
          messageAttributes: {},
          md5OfBody: 'md5-malformed',
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:af-south-1:123456789012:queue-name',
          awsRegion: 'af-south-1',
        },
      ],
    };

    const result = await handler(event, {} as any, {} as any);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0].itemIdentifier).toBe('msg-malformed');
  });

  it('should process multiple messages in batch', async () => {
    const event: SQSEvent = {
      Records: [
        {
          messageId: 'msg-1',
          receiptHandle: 'receipt-1',
          body: JSON.stringify({
            verificationId: 'ver_1',
            selfieDocumentId: 'doc_selfie_1',
            omangFrontDocumentId: 'doc_omang_1',
            livenessSessionId: 'session_1',
          }),
          attributes: {
            ApproximateReceiveCount: '1',
            SentTimestamp: '1234567890',
            SenderId: 'sender-123',
            ApproximateFirstReceiveTimestamp: '1234567890',
          },
          messageAttributes: {},
          md5OfBody: 'md5-1',
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:af-south-1:123456789012:queue-name',
          awsRegion: 'af-south-1',
        },
        {
          messageId: 'msg-2',
          receiptHandle: 'receipt-2',
          body: JSON.stringify({
            verificationId: 'ver_2',
            selfieDocumentId: 'doc_selfie_2',
            omangFrontDocumentId: 'doc_omang_2',
            livenessSessionId: 'session_2',
          }),
          attributes: {
            ApproximateReceiveCount: '1',
            SentTimestamp: '1234567890',
            SenderId: 'sender-123',
            ApproximateFirstReceiveTimestamp: '1234567890',
          },
          messageAttributes: {},
          md5OfBody: 'md5-2',
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:af-south-1:123456789012:queue-name',
          awsRegion: 'af-south-1',
        },
      ],
    };

    const result = await handler(event, {} as any, {} as any);

    expect(result.batchItemFailures).toHaveLength(0);
  });
});
