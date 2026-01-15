import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RekognitionService } from './rekognition';
import type { RekognitionClient } from '@aws-sdk/client-rekognition';

describe('RekognitionService', () => {
  let rekognitionService: RekognitionService;
  let mockRekognitionClient: RekognitionClient;

  beforeEach(() => {
    mockRekognitionClient = {
      send: vi.fn(),
    } as unknown as RekognitionClient;

    rekognitionService = new RekognitionService(mockRekognitionClient);
  });

  describe('compareFaces', () => {
    it('should return high similarity for matching faces', async () => {
      const mockResponse = {
        FaceMatches: [
          {
            Similarity: 95.5,
            Face: {
              BoundingBox: { Width: 0.3, Height: 0.4, Left: 0.35, Top: 0.2 },
              Confidence: 99.8,
            },
          },
        ],
        SourceImageFace: {
          BoundingBox: { Width: 0.3, Height: 0.4, Left: 0.35, Top: 0.2 },
          Confidence: 99.9,
        },
      };

      vi.mocked(mockRekognitionClient.send).mockResolvedValue(mockResponse);

      const result = await rekognitionService.compareFaces(
        'bucket-name',
        'selfie-key',
        'id-photo-key'
      );

      expect(result.similarity).toBe(95.5);
      expect(result.passed).toBe(true);
      expect(result.sourceImageFace.confidence).toBe(99.9);
      expect(result.targetImageFace?.confidence).toBe(99.8);
    });

    it('should return low similarity for non-matching faces', async () => {
      const mockResponse = {
        FaceMatches: [
          {
            Similarity: 65.0,
            Face: {
              BoundingBox: { Width: 0.3, Height: 0.4, Left: 0.35, Top: 0.2 },
              Confidence: 99.5,
            },
          },
        ],
        SourceImageFace: {
          BoundingBox: { Width: 0.3, Height: 0.4, Left: 0.35, Top: 0.2 },
          Confidence: 99.9,
        },
      };

      vi.mocked(mockRekognitionClient.send).mockResolvedValue(mockResponse);

      const result = await rekognitionService.compareFaces(
        'bucket-name',
        'selfie-key',
        'different-person-key'
      );

      expect(result.similarity).toBe(65.0);
      expect(result.passed).toBe(false);
    });

    it('should handle no face matches', async () => {
      const mockResponse = {
        FaceMatches: [],
        UnmatchedFaces: [
          {
            BoundingBox: { Width: 0.3, Height: 0.4, Left: 0.35, Top: 0.2 },
            Confidence: 99.5,
          },
        ],
        SourceImageFace: {
          BoundingBox: { Width: 0.3, Height: 0.4, Left: 0.35, Top: 0.2 },
          Confidence: 99.9,
        },
      };

      vi.mocked(mockRekognitionClient.send).mockResolvedValue(mockResponse);

      const result = await rekognitionService.compareFaces(
        'bucket-name',
        'selfie-key',
        'no-match-key'
      );

      expect(result.similarity).toBe(0);
      expect(result.passed).toBe(false);
      expect(result.targetImageFace).toBeUndefined();
    });

    it('should handle Rekognition API errors', async () => {
      const error = new Error('ProvisionedThroughputExceededException');
      error.name = 'ProvisionedThroughputExceededException';

      vi.mocked(mockRekognitionClient.send).mockRejectedValue(error);

      await expect(
        rekognitionService.compareFaces('bucket-name', 'selfie-key', 'id-photo-key')
      ).rejects.toThrow('ProvisionedThroughputExceededException');
    });
  });

  describe('detectFaceLiveness', () => {
    it('should validate successful liveness session', async () => {
      const mockResponse = {
        Confidence: 98.5,
        Status: 'SUCCEEDED',
        AuditImages: [
          {
            S3Object: {
              Bucket: 'audit-bucket',
              Name: 'audit-image-1.jpg',
            },
          },
        ],
      };

      vi.mocked(mockRekognitionClient.send).mockResolvedValue(mockResponse);

      const result = await rekognitionService.detectFaceLiveness('session-123');

      expect(result.confidence).toBe(98.5);
      expect(result.status).toBe('SUCCEEDED');
      expect(result.passed).toBe(true);
      expect(result.sessionId).toBe('session-123');
      expect(result.auditImages).toHaveLength(1);
    });

    it('should flag low confidence liveness', async () => {
      const mockResponse = {
        Confidence: 65.0,
        Status: 'SUCCEEDED',
      };

      vi.mocked(mockRekognitionClient.send).mockResolvedValue(mockResponse);

      const result = await rekognitionService.detectFaceLiveness('session-456');

      expect(result.confidence).toBe(65.0);
      expect(result.passed).toBe(false);
    });

    it('should handle failed liveness status', async () => {
      const mockResponse = {
        Confidence: 50.0,
        Status: 'FAILED',
      };

      vi.mocked(mockRekognitionClient.send).mockResolvedValue(mockResponse);

      const result = await rekognitionService.detectFaceLiveness('session-789');

      expect(result.status).toBe('FAILED');
      expect(result.passed).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable errors', () => {
      const retryableErrors = [
        'ProvisionedThroughputExceededException',
        'ThrottlingException',
        'ServiceUnavailableException',
        'InternalServerError',
      ];

      retryableErrors.forEach((errorName) => {
        const error = new Error(errorName);
        error.name = errorName;
        expect(rekognitionService.isRetryableError(error)).toBe(true);
      });
    });

    it('should identify non-retryable errors', () => {
      const nonRetryableErrors = [
        'InvalidImageFormatException',
        'ImageTooLargeException',
        'InvalidParameterException',
      ];

      nonRetryableErrors.forEach((errorName) => {
        const error = new Error(errorName);
        error.name = errorName;
        expect(rekognitionService.isRetryableError(error)).toBe(false);
      });
    });
  });
});
