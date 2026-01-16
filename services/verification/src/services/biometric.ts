/**
 * Biometric matching service for face liveness and comparison
 */
import type { RekognitionService } from './rekognition';
import type { BiometricData } from '../types/biometric';
import { logger } from '../utils/logger';

// Configurable weights and thresholds via environment variables
const LIVENESS_WEIGHT = parseFloat(process.env.BIOMETRIC_LIVENESS_WEIGHT || '0.3');
const SIMILARITY_WEIGHT = parseFloat(process.env.BIOMETRIC_SIMILARITY_WEIGHT || '0.7');
const OVERALL_THRESHOLD = parseInt(process.env.BIOMETRIC_OVERALL_THRESHOLD || '80', 10);

export class BiometricService {
  constructor(private readonly rekognitionService: RekognitionService) {}

  /**
   * Process biometric verification (liveness + face comparison)
   * @param bucketName S3 bucket containing images
   * @param livenessSessionId Liveness session ID from Web SDK
   * @param selfieKey Selfie S3 key
   * @param idPhotoKey ID photo S3 key
   * @returns Complete biometric verification result
   */
  async processBiometric(
    bucketName: string,
    livenessSessionId: string,
    selfieKey: string,
    idPhotoKey: string
  ): Promise<BiometricData> {
    const startTime = Date.now();

    try {
      // Step 1: Validate liveness
      logger.info('Starting liveness detection', { livenessSessionId });
      const livenessResult = await this.rekognitionService.detectFaceLiveness(
        livenessSessionId
      );

      // Step 2: Compare faces
      logger.info('Starting face comparison', { selfieKey, idPhotoKey });
      const faceComparisonResult = await this.rekognitionService.compareFaces(
        bucketName,
        selfieKey,
        idPhotoKey
      );

      // Step 3: Calculate overall score
      const overallScore = this.calculateOverallScore(
        livenessResult.confidence,
        faceComparisonResult.similarity
      );

      // Step 4: Determine if passed and requires manual review
      const passed =
        livenessResult.passed &&
        faceComparisonResult.passed &&
        overallScore >= OVERALL_THRESHOLD;

      const requiresManualReview =
        !livenessResult.passed ||
        !faceComparisonResult.passed ||
        overallScore < OVERALL_THRESHOLD ||
        livenessResult.status !== 'SUCCEEDED' ||
        !faceComparisonResult.targetImageFace; // No face match found

      const processingTimeMs = Date.now() - startTime;

      const result: BiometricData = {
        liveness: livenessResult,
        faceComparison: faceComparisonResult,
        overallScore,
        passed,
        requiresManualReview,
        processedAt: new Date().toISOString(),
        processingTimeMs,
      };

      logger.info('Biometric processing completed', {
        overallScore,
        passed,
        requiresManualReview,
        processingTimeMs,
        livenessScore: livenessResult.confidence,
        similarityScore: faceComparisonResult.similarity,
      });

      return result;
    } catch (error) {
      logger.error('Biometric processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorName: error instanceof Error ? error.name : undefined,
        livenessSessionId,
        selfieKey,
        idPhotoKey,
      });
      throw error;
    }
  }

  /**
   * Calculate weighted overall biometric score
   * @param livenessScore Liveness confidence (0-100)
   * @param similarityScore Face similarity (0-100)
   * @returns Weighted overall score (0-100)
   */
  calculateOverallScore(livenessScore: number, similarityScore: number): number {
    return livenessScore * LIVENESS_WEIGHT + similarityScore * SIMILARITY_WEIGHT;
  }
}
