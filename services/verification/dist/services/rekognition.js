/**
 * AWS Rekognition service wrapper for face liveness and comparison
 */
import { RekognitionClient, CompareFacesCommand, GetFaceLivenessSessionResultsCommand, } from '@aws-sdk/client-rekognition';
import { logger } from '../utils/logger';
// Configurable thresholds via environment variables
const SIMILARITY_THRESHOLD = parseInt(process.env.BIOMETRIC_SIMILARITY_THRESHOLD || '80', 10);
const LIVENESS_THRESHOLD = parseInt(process.env.BIOMETRIC_LIVENESS_THRESHOLD || '80', 10);
export class RekognitionService {
    client;
    constructor(client) {
        this.client = client;
    }
    /**
     * Compare two faces using AWS Rekognition CompareFaces API
     * @param bucketName S3 bucket containing images
     * @param sourceImageKey Selfie S3 key
     * @param targetImageKey ID photo S3 key
     * @returns Face comparison result with similarity score
     */
    async compareFaces(bucketName, sourceImageKey, targetImageKey) {
        const startTime = Date.now();
        try {
            const params = {
                SourceImage: {
                    S3Object: {
                        Bucket: bucketName,
                        Name: sourceImageKey,
                    },
                },
                TargetImage: {
                    S3Object: {
                        Bucket: bucketName,
                        Name: targetImageKey,
                    },
                },
                SimilarityThreshold: SIMILARITY_THRESHOLD,
                QualityFilter: 'AUTO',
            };
            const command = new CompareFacesCommand(params);
            const response = await this.client.send(command);
            const processingTime = Date.now() - startTime;
            // Extract best match (highest similarity)
            const bestMatch = response.FaceMatches?.[0];
            const similarity = bestMatch?.Similarity ?? 0;
            const result = {
                similarity,
                passed: similarity >= SIMILARITY_THRESHOLD,
                sourceImageFace: {
                    confidence: response.SourceImageFace?.Confidence ?? 0,
                    boundingBox: {
                        width: response.SourceImageFace?.BoundingBox?.Width ?? 0,
                        height: response.SourceImageFace?.BoundingBox?.Height ?? 0,
                        left: response.SourceImageFace?.BoundingBox?.Left ?? 0,
                        top: response.SourceImageFace?.BoundingBox?.Top ?? 0,
                    },
                },
                targetImageFace: bestMatch
                    ? {
                        confidence: bestMatch.Face?.Confidence ?? 0,
                        boundingBox: {
                            width: bestMatch.Face?.BoundingBox?.Width ?? 0,
                            height: bestMatch.Face?.BoundingBox?.Height ?? 0,
                            left: bestMatch.Face?.BoundingBox?.Left ?? 0,
                            top: bestMatch.Face?.BoundingBox?.Top ?? 0,
                        },
                    }
                    : undefined,
                processedAt: new Date().toISOString(),
            };
            logger.info('Face comparison completed', {
                similarity,
                passed: result.passed,
                processingTimeMs: processingTime,
                hasTargetFace: !!result.targetImageFace,
            });
            return result;
        }
        catch (error) {
            logger.error('Face comparison failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                errorName: error instanceof Error ? error.name : undefined,
                sourceImageKey,
                targetImageKey,
            });
            throw error;
        }
    }
    /**
     * Validate face liveness session results
     * @param sessionId Liveness session ID from Web SDK
     * @returns Liveness validation result
     */
    async detectFaceLiveness(sessionId) {
        const startTime = Date.now();
        try {
            const params = {
                SessionId: sessionId,
            };
            const command = new GetFaceLivenessSessionResultsCommand(params);
            const response = await this.client.send(command);
            const processingTime = Date.now() - startTime;
            const confidence = response.Confidence ?? 0;
            const status = response.Status ?? 'UNKNOWN';
            // Extract audit image S3 URLs
            const auditImages = response.AuditImages?.map((img) => `s3://${img.S3Object?.Bucket}/${img.S3Object?.Name}`) ?? [];
            const result = {
                confidence,
                status: status,
                passed: status === 'SUCCEEDED' && confidence >= LIVENESS_THRESHOLD,
                sessionId,
                auditImages,
                processedAt: new Date().toISOString(),
            };
            logger.info('Liveness detection completed', {
                confidence,
                status,
                passed: result.passed,
                processingTimeMs: processingTime,
                sessionId,
            });
            return result;
        }
        catch (error) {
            logger.error('Liveness detection failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                errorName: error instanceof Error ? error.name : undefined,
                sessionId,
            });
            throw error;
        }
    }
    /**
     * Check if an error is retryable
     * @param error Error from Rekognition API
     * @returns True if error should be retried
     */
    isRetryableError(error) {
        const retryableErrors = [
            'ProvisionedThroughputExceededException',
            'ThrottlingException',
            'ServiceUnavailableException',
            'InternalServerError',
        ];
        return retryableErrors.includes(error.name);
    }
}
/**
 * Create a Rekognition client configured for af-south-1
 */
export function createRekognitionClient() {
    return new RekognitionClient({
        region: process.env.AWS_REGION || 'af-south-1',
    });
}
//# sourceMappingURL=rekognition.js.map