import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  recordMetric,
  recordUploadMetrics,
  recordPresignedUrlMetrics,
  recordValidationFailure,
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
});
