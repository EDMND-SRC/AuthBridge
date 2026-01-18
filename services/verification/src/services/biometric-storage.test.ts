import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BiometricStorageService } from './biometric-storage';
import type { BiometricData } from '../types/biometric';

// Mock DynamoDBService
vi.mock('./dynamodb', () => ({
  DynamoDBService: vi.fn(function() {
    return {
      updateItem: vi.fn().mockResolvedValue({}),
    };
  }),
}));

describe('BiometricStorageService', () => {
  let biometricStorageService: BiometricStorageService;

  beforeEach(() => {
    vi.clearAllMocks();
    biometricStorageService = new BiometricStorageService();
  });

  describe('storeBiometricResults', () => {
    it('should store biometric results in document', async () => {
      const biometricData: BiometricData = {
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
      };

      await expect(
        biometricStorageService.storeBiometricResults(
          'ver_123',
          'doc_selfie_456',
          biometricData
        )
      ).resolves.not.toThrow();
    });

    it('should handle storage errors gracefully', async () => {
      const biometricData: BiometricData = {
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
      };

      // Mock DynamoDB error
      const mockUpdateItem = vi.fn().mockRejectedValue(new Error('DynamoDB error'));
      (biometricStorageService as any).dynamoDBService.updateItem = mockUpdateItem;

      await expect(
        biometricStorageService.storeBiometricResults(
          'ver_123',
          'doc_selfie_456',
          biometricData
        )
      ).rejects.toThrow('DynamoDB error');
    });
  });

  describe('updateVerificationWithBiometricSummary', () => {
    it('should update verification with biometric summary when passed', async () => {
      const biometricData: BiometricData = {
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
      };

      await expect(
        biometricStorageService.updateVerificationWithBiometricSummary(
          'ver_123',
          biometricData
        )
      ).resolves.not.toThrow();
    });

    it('should update verification with biometric_failed status when not passed', async () => {
      const biometricData: BiometricData = {
        liveness: {
          confidence: 65.0,
          status: 'SUCCEEDED',
          passed: false,
          sessionId: 'session-456',
          processedAt: '2026-01-15T10:00:00Z',
        },
        faceComparison: {
          similarity: 70.0,
          passed: false,
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
        overallScore: 68.5,
        passed: false,
        requiresManualReview: true,
        processedAt: '2026-01-15T10:00:01Z',
        processingTimeMs: 2500,
      };

      await expect(
        biometricStorageService.updateVerificationWithBiometricSummary(
          'ver_456',
          biometricData
        )
      ).resolves.not.toThrow();
    });

    it('should handle update errors gracefully', async () => {
      const biometricData: BiometricData = {
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
      };

      // Mock DynamoDB error
      const mockUpdateItem = vi.fn().mockRejectedValue(new Error('DynamoDB error'));
      (biometricStorageService as any).dynamoDBService.updateItem = mockUpdateItem;

      await expect(
        biometricStorageService.updateVerificationWithBiometricSummary(
          'ver_123',
          biometricData
        )
      ).rejects.toThrow('DynamoDB error');
    });
  });
});
