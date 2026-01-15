import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BiometricService } from './biometric';
import type { RekognitionService } from './rekognition';
import type { LivenessResult, FaceComparisonResult } from '../types/biometric';

describe('BiometricService', () => {
  let biometricService: BiometricService;
  let mockRekognitionService: RekognitionService;

  beforeEach(() => {
    mockRekognitionService = {
      detectFaceLiveness: vi.fn(),
      compareFaces: vi.fn(),
      isRetryableError: vi.fn(),
    } as unknown as RekognitionService;

    biometricService = new BiometricService(mockRekognitionService);
  });

  describe('processBiometric', () => {
    it('should process biometric with high scores', async () => {
      const mockLivenessResult: LivenessResult = {
        confidence: 98.5,
        status: 'SUCCEEDED',
        passed: true,
        sessionId: 'session-123',
        processedAt: '2026-01-15T10:00:00Z',
      };

      const mockComparisonResult: FaceComparisonResult = {
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
      };

      vi.mocked(mockRekognitionService.detectFaceLiveness).mockResolvedValue(
        mockLivenessResult
      );
      vi.mocked(mockRekognitionService.compareFaces).mockResolvedValue(
        mockComparisonResult
      );

      const result = await biometricService.processBiometric(
        'bucket-name',
        'session-123',
        'selfie-key',
        'id-photo-key'
      );

      expect(result.passed).toBe(true);
      expect(result.requiresManualReview).toBe(false);
      expect(result.overallScore).toBeCloseTo(94.3, 1); // (98.5 * 0.3) + (92.5 * 0.7)
      expect(result.liveness.confidence).toBe(98.5);
      expect(result.faceComparison.similarity).toBe(92.5);
    });

    it('should flag low liveness confidence for manual review', async () => {
      const mockLivenessResult: LivenessResult = {
        confidence: 65.0,
        status: 'SUCCEEDED',
        passed: false,
        sessionId: 'session-456',
        processedAt: '2026-01-15T10:00:00Z',
      };

      const mockComparisonResult: FaceComparisonResult = {
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
      };

      vi.mocked(mockRekognitionService.detectFaceLiveness).mockResolvedValue(
        mockLivenessResult
      );
      vi.mocked(mockRekognitionService.compareFaces).mockResolvedValue(
        mockComparisonResult
      );

      const result = await biometricService.processBiometric(
        'bucket-name',
        'session-456',
        'selfie-key',
        'id-photo-key'
      );

      expect(result.passed).toBe(false);
      expect(result.requiresManualReview).toBe(true);
      expect(result.liveness.passed).toBe(false);
    });

    it('should flag low similarity for manual review', async () => {
      const mockLivenessResult: LivenessResult = {
        confidence: 98.5,
        status: 'SUCCEEDED',
        passed: true,
        sessionId: 'session-789',
        processedAt: '2026-01-15T10:00:00Z',
      };

      const mockComparisonResult: FaceComparisonResult = {
        similarity: 65.0,
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
      };

      vi.mocked(mockRekognitionService.detectFaceLiveness).mockResolvedValue(
        mockLivenessResult
      );
      vi.mocked(mockRekognitionService.compareFaces).mockResolvedValue(
        mockComparisonResult
      );

      const result = await biometricService.processBiometric(
        'bucket-name',
        'session-789',
        'selfie-key',
        'id-photo-key'
      );

      expect(result.passed).toBe(false);
      expect(result.requiresManualReview).toBe(true);
      expect(result.faceComparison.passed).toBe(false);
    });

    it('should flag failed liveness status for manual review', async () => {
      const mockLivenessResult: LivenessResult = {
        confidence: 50.0,
        status: 'FAILED',
        passed: false,
        sessionId: 'session-fail',
        processedAt: '2026-01-15T10:00:00Z',
      };

      const mockComparisonResult: FaceComparisonResult = {
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
      };

      vi.mocked(mockRekognitionService.detectFaceLiveness).mockResolvedValue(
        mockLivenessResult
      );
      vi.mocked(mockRekognitionService.compareFaces).mockResolvedValue(
        mockComparisonResult
      );

      const result = await biometricService.processBiometric(
        'bucket-name',
        'session-fail',
        'selfie-key',
        'id-photo-key'
      );

      expect(result.passed).toBe(false);
      expect(result.requiresManualReview).toBe(true);
      expect(result.liveness.status).toBe('FAILED');
    });

    it('should flag no face match for manual review', async () => {
      const mockLivenessResult: LivenessResult = {
        confidence: 98.5,
        status: 'SUCCEEDED',
        passed: true,
        sessionId: 'session-no-match',
        processedAt: '2026-01-15T10:00:00Z',
      };

      const mockComparisonResult: FaceComparisonResult = {
        similarity: 0,
        passed: false,
        sourceImageFace: {
          confidence: 99.9,
          boundingBox: { width: 0.3, height: 0.4, left: 0.35, top: 0.2 },
        },
        processedAt: '2026-01-15T10:00:01Z',
      };

      vi.mocked(mockRekognitionService.detectFaceLiveness).mockResolvedValue(
        mockLivenessResult
      );
      vi.mocked(mockRekognitionService.compareFaces).mockResolvedValue(
        mockComparisonResult
      );

      const result = await biometricService.processBiometric(
        'bucket-name',
        'session-no-match',
        'selfie-key',
        'id-photo-key'
      );

      expect(result.passed).toBe(false);
      expect(result.requiresManualReview).toBe(true);
      expect(result.faceComparison.targetImageFace).toBeUndefined();
    });
  });

  describe('calculateOverallScore', () => {
    it('should calculate weighted average correctly', () => {
      const score = biometricService.calculateOverallScore(90, 85);
      expect(score).toBeCloseTo(86.5, 1); // (90 * 0.3) + (85 * 0.7)
    });

    it('should handle perfect scores', () => {
      const score = biometricService.calculateOverallScore(100, 100);
      expect(score).toBe(100);
    });

    it('should handle zero scores', () => {
      const score = biometricService.calculateOverallScore(0, 0);
      expect(score).toBe(0);
    });

    it('should weight similarity more heavily', () => {
      const score1 = biometricService.calculateOverallScore(100, 80);
      const score2 = biometricService.calculateOverallScore(80, 100);
      expect(score2).toBeGreaterThan(score1);
    });
  });
});
