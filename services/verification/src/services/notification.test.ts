import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock SNS before any imports - define mockSend at module level
const mockSend = vi.fn().mockResolvedValue({});

vi.mock('@aws-sdk/client-sns', () => ({
  SNSClient: vi.fn(function() {
    return {
      send: mockSend,
    };
  }),
  PublishCommand: vi.fn(),
}));

import { notifyOcrFailure, notifyPoorQualityImage, OcrFailureContext } from './notification';

describe('notification', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('notifyOcrFailure', () => {
    it('should skip notification when no topic configured', async () => {
      process.env.OCR_ALERT_TOPIC_ARN = '';

      const context: OcrFailureContext = {
        verificationId: 'ver_123',
        documentId: 'doc_456',
        documentType: 'omang_front',
        errorType: 'THROTTLING',
        errorMessage: 'Rate exceeded',
        attemptCount: 5,
        timestamp: new Date().toISOString(),
      };

      await expect(notifyOcrFailure(context)).resolves.not.toThrow();
    });

    it('should skip notification when below threshold', async () => {
      process.env.OCR_ALERT_TOPIC_ARN = 'arn:aws:sns:af-south-1:123456789:alerts';
      process.env.OCR_FAILURE_NOTIFICATION_THRESHOLD = '5';

      const context: OcrFailureContext = {
        verificationId: 'ver_123',
        documentId: 'doc_456',
        documentType: 'omang_front',
        errorType: 'THROTTLING',
        errorMessage: 'Rate exceeded',
        attemptCount: 2,
        timestamp: new Date().toISOString(),
      };

      await expect(notifyOcrFailure(context)).resolves.not.toThrow();
    });

    it('should handle notification when threshold exceeded', async () => {
      process.env.OCR_ALERT_TOPIC_ARN = 'arn:aws:sns:af-south-1:123456789:alerts';
      process.env.OCR_FAILURE_NOTIFICATION_THRESHOLD = '3';

      const context: OcrFailureContext = {
        verificationId: 'ver_123',
        documentId: 'doc_456',
        documentType: 'omang_front',
        errorType: 'THROTTLING',
        errorMessage: 'Rate exceeded',
        attemptCount: 3,
        timestamp: new Date().toISOString(),
      };

      // Should not throw
      await expect(notifyOcrFailure(context)).resolves.not.toThrow();
    });

    it('should include correct context in notification', async () => {
      process.env.OCR_ALERT_TOPIC_ARN = 'arn:aws:sns:af-south-1:123456789:alerts';
      process.env.OCR_FAILURE_NOTIFICATION_THRESHOLD = '3';

      const context: OcrFailureContext = {
        verificationId: 'ver_abc123',
        documentId: 'doc_xyz789',
        documentType: 'omang_back',
        errorType: 'INVALID_S3_OBJECT',
        errorMessage: 'Object not found',
        attemptCount: 5,
        timestamp: '2026-01-14T10:00:00Z',
      };

      await expect(notifyOcrFailure(context)).resolves.not.toThrow();
    });

    it('should not throw on SNS error', async () => {
      process.env.OCR_ALERT_TOPIC_ARN = 'arn:aws:sns:af-south-1:123456789:alerts';
      process.env.OCR_FAILURE_NOTIFICATION_THRESHOLD = '3';

      // Make the mock throw
      mockSend.mockRejectedValueOnce(new Error('SNS error'));

      const context: OcrFailureContext = {
        verificationId: 'ver_123',
        documentId: 'doc_456',
        documentType: 'omang_front',
        errorType: 'UNKNOWN',
        errorMessage: 'Unknown error',
        attemptCount: 3,
        timestamp: new Date().toISOString(),
      };

      await expect(notifyOcrFailure(context)).resolves.not.toThrow();
    });
  });

  describe('notifyPoorQualityImage', () => {
    it('should skip when no topic configured', async () => {
      process.env.OCR_ALERT_TOPIC_ARN = '';

      await expect(
        notifyPoorQualityImage('ver_123', 'doc_456', 25, ['BLURRY_IMAGE'])
      ).resolves.not.toThrow();
    });

    it('should handle notification for poor quality image', async () => {
      process.env.OCR_ALERT_TOPIC_ARN = 'arn:aws:sns:af-south-1:123456789:alerts';

      await expect(
        notifyPoorQualityImage('ver_123', 'doc_456', 25, ['BLURRY_IMAGE', 'POOR_LIGHTING'])
      ).resolves.not.toThrow();
    });

    it('should handle multiple quality issues', async () => {
      process.env.OCR_ALERT_TOPIC_ARN = 'arn:aws:sns:af-south-1:123456789:alerts';

      await expect(
        notifyPoorQualityImage('ver_123', 'doc_456', 15, [
          'NO_TEXT_DETECTED',
          'VERY_LOW_CONFIDENCE',
          'BLURRY_IMAGE',
        ])
      ).resolves.not.toThrow();
    });
  });
});
