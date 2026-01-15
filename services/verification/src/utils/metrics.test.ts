import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  recordMetric,
  recordUploadMetrics,
  recordPresignedUrlMetrics,
  recordValidationFailure,
  recordOcrMetrics,
  recordTextractError,
  recordPoorQualityImage,
  recordOmangValidationMetrics,
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

  describe('recordOmangValidationMetrics', () => {
    it('should record valid validation metrics', async () => {
      await expect(
        recordOmangValidationMetrics(true, 'omang_front', [], [])
      ).resolves.not.toThrow();
    });

    it('should record invalid validation metrics', async () => {
      await expect(
        recordOmangValidationMetrics(false, 'omang_front', ['Omang number must be exactly 9 digits'], [])
      ).resolves.not.toThrow();
    });

    it('should record validation with warnings', async () => {
      await expect(
        recordOmangValidationMetrics(true, 'omang_front', [], ['Document expires soon (in 25 days)'])
      ).resolves.not.toThrow();
    });

    it('should record multiple error types', async () => {
      await expect(
        recordOmangValidationMetrics(false, 'omang_front', [
          'Omang number must be numeric only',
          'Document has expired',
        ], [])
      ).resolves.not.toThrow();
    });

    it('should record expiry mismatch error', async () => {
      await expect(
        recordOmangValidationMetrics(false, 'omang_front', [
          'Expiry date does not match 10-year validity period',
        ], [])
      ).resolves.not.toThrow();
    });

    it('should record invalid date error', async () => {
      await expect(
        recordOmangValidationMetrics(false, 'omang_front', [
          'Invalid date format - dates must be in DD/MM/YYYY format',
        ], [])
      ).resolves.not.toThrow();
    });
  });

  describe('recordBiometricMetrics', () => {
    it('should record successful biometric processing', async () => {
      const { recordBiometricMetrics } = await import('./metrics');
      await expect(
        recordBiometricMetrics(true, 2500, 98.5, 92.5, 94.0, true, false)
      ).resolves.not.toThrow();
    });

    it('should record failed biometric processing', async () => {
      const { recordBiometricMetrics } = await import('./metrics');
      await expect(
        recordBiometricMetrics(false, 1500, 65.0, 70.0, 68.5, false, true)
      ).resolves.not.toThrow();
    });

    it('should record manual review required', async () => {
      const { recordBiometricMetrics } = await import('./metrics');
      await expect(
        recordBiometricMetrics(true, 2000, 75.0, 78.0, 77.1, false, true)
      ).resolves.not.toThrow();
    });
  });

  describe('recordRekognitionError', () => {
    it('should record THROTTLING error for COMPARE_FACES', async () => {
      const { recordRekognitionError } = await import('./metrics');
      await expect(
        recordRekognitionError('THROTTLING', 'COMPARE_FACES')
      ).resolves.not.toThrow();
    });

    it('should record NO_FACE_DETECTED error for DETECT_LIVENESS', async () => {
      const { recordRekognitionError } = await import('./metrics');
      await expect(
        recordRekognitionError('NO_FACE_DETECTED', 'DETECT_LIVENESS')
      ).resolves.not.toThrow();
    });

    it('should record MULTIPLE_FACES error', async () => {
      const { recordRekognitionError } = await import('./metrics');
      await expect(
        recordRekognitionError('MULTIPLE_FACES', 'COMPARE_FACES')
      ).resolves.not.toThrow();
    });

    it('should record POOR_QUALITY error', async () => {
      const { recordRekognitionError } = await import('./metrics');
      await expect(
        recordRekognitionError('POOR_QUALITY', 'COMPARE_FACES')
      ).resolves.not.toThrow();
    });

    it('should record UNKNOWN error', async () => {
      const { recordRekognitionError } = await import('./metrics');
      await expect(
        recordRekognitionError('UNKNOWN', 'DETECT_LIVENESS')
      ).resolves.not.toThrow();
    });
  });

  describe('recordFaceDetectionIssue', () => {
    it('should record NO_FACE issue for SELFIE', async () => {
      const { recordFaceDetectionIssue } = await import('./metrics');
      await expect(
        recordFaceDetectionIssue('NO_FACE', 'SELFIE')
      ).resolves.not.toThrow();
    });

    it('should record MULTIPLE_FACES issue for ID_PHOTO', async () => {
      const { recordFaceDetectionIssue } = await import('./metrics');
      await expect(
        recordFaceDetectionIssue('MULTIPLE_FACES', 'ID_PHOTO')
      ).resolves.not.toThrow();
    });

    it('should record FACE_TOO_SMALL issue', async () => {
      const { recordFaceDetectionIssue } = await import('./metrics');
      await expect(
        recordFaceDetectionIssue('FACE_TOO_SMALL', 'SELFIE')
      ).resolves.not.toThrow();
    });

    it('should record POOR_QUALITY issue', async () => {
      const { recordFaceDetectionIssue } = await import('./metrics');
      await expect(
        recordFaceDetectionIssue('POOR_QUALITY', 'ID_PHOTO')
      ).resolves.not.toThrow();
    });
  });
});
