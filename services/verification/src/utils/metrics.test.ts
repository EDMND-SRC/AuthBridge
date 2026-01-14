import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  recordMetric,
  recordUploadMetrics,
  recordPresignedUrlMetrics,
  recordValidationFailure,
  recordOcrMetrics,
  recordTextractError,
  recordPoorQualityImage,
} from './metrics';

// Mock CloudWatch client
vi.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
  PutMetricDataCommand: vi.fn(),
}));

describe('metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recordMetric', () => {
    it('should not throw on success', async () => {
      await expect(recordMetric('TestMetric', 1, 'Count')).resolves.not.toThrow();
    });

    it('should not throw on failure', async () => {
      // Even if CloudWatch fails, we shouldn't throw
      await expect(recordMetric('TestMetric', 1, 'Count')).resolves.not.toThrow();
    });

    it('should accept dimensions', async () => {
      await expect(
        recordMetric('TestMetric', 1, 'Count', [{ Name: 'Test', Value: 'Value' }])
      ).resolves.not.toThrow();
    });
  });

  describe('recordUploadMetrics', () => {
    it('should record success metrics', async () => {
      await expect(
        recordUploadMetrics(true, 1000, 1024, 'omang_front')
      ).resolves.not.toThrow();
    });

    it('should record failure metrics', async () => {
      await expect(
        recordUploadMetrics(false, 500, 0, 'selfie')
      ).resolves.not.toThrow();
    });
  });

  describe('recordPresignedUrlMetrics', () => {
    it('should record duration', async () => {
      await expect(recordPresignedUrlMetrics(50)).resolves.not.toThrow();
    });
  });

  describe('recordValidationFailure', () => {
    it('should record FILE_TOO_LARGE', async () => {
      await expect(recordValidationFailure('FILE_TOO_LARGE')).resolves.not.toThrow();
    });

    it('should record INVALID_FILE_TYPE', async () => {
      await expect(recordValidationFailure('INVALID_FILE_TYPE')).resolves.not.toThrow();
    });

    it('should record IMAGE_TOO_SMALL', async () => {
      await expect(recordValidationFailure('IMAGE_TOO_SMALL')).resolves.not.toThrow();
    });

    it('should record VALIDATION_ERROR', async () => {
      await expect(recordValidationFailure('VALIDATION_ERROR')).resolves.not.toThrow();
    });
  });

  describe('recordOcrMetrics', () => {
    it('should record success metrics', async () => {
      await expect(
        recordOcrMetrics(true, 4500, 98.5, 'omang_front', false)
      ).resolves.not.toThrow();
    });

    it('should record failure metrics', async () => {
      await expect(
        recordOcrMetrics(false, 2000, 0, 'omang_front', false)
      ).resolves.not.toThrow();
    });

    it('should record manual review required', async () => {
      await expect(
        recordOcrMetrics(true, 4500, 75.0, 'omang_front', true)
      ).resolves.not.toThrow();
    });
  });

  describe('recordTextractError', () => {
    it('should record THROTTLING error', async () => {
      await expect(recordTextractError('THROTTLING')).resolves.not.toThrow();
    });

    it('should record INVALID_S3_OBJECT error', async () => {
      await expect(recordTextractError('INVALID_S3_OBJECT')).resolves.not.toThrow();
    });

    it('should record UNSUPPORTED_DOCUMENT error', async () => {
      await expect(recordTextractError('UNSUPPORTED_DOCUMENT')).resolves.not.toThrow();
    });

    it('should record POOR_QUALITY error', async () => {
      await expect(recordTextractError('POOR_QUALITY')).resolves.not.toThrow();
    });

    it('should record UNKNOWN error', async () => {
      await expect(recordTextractError('UNKNOWN')).resolves.not.toThrow();
    });
  });

  describe('recordPoorQualityImage', () => {
    it('should record poor quality image metrics', async () => {
      await expect(
        recordPoorQualityImage('omang_front', 25)
      ).resolves.not.toThrow();
    });

    it('should record with different document types', async () => {
      await expect(
        recordPoorQualityImage('omang_back', 45)
      ).resolves.not.toThrow();
    });
  });
});
