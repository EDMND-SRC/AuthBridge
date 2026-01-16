/**
 * AWS Rekognition service wrapper for face liveness and comparison
 */
import { RekognitionClient } from '@aws-sdk/client-rekognition';
import type { FaceComparisonResult, LivenessResult } from '../types/biometric';
export declare class RekognitionService {
    private readonly client;
    constructor(client: RekognitionClient);
    /**
     * Compare two faces using AWS Rekognition CompareFaces API
     * @param bucketName S3 bucket containing images
     * @param sourceImageKey Selfie S3 key
     * @param targetImageKey ID photo S3 key
     * @returns Face comparison result with similarity score
     */
    compareFaces(bucketName: string, sourceImageKey: string, targetImageKey: string): Promise<FaceComparisonResult>;
    /**
     * Validate face liveness session results
     * @param sessionId Liveness session ID from Web SDK
     * @returns Liveness validation result
     */
    detectFaceLiveness(sessionId: string): Promise<LivenessResult>;
    /**
     * Check if an error is retryable
     * @param error Error from Rekognition API
     * @returns True if error should be retried
     */
    isRetryableError(error: Error): boolean;
}
/**
 * Create a Rekognition client configured for af-south-1
 */
export declare function createRekognitionClient(): RekognitionClient;
//# sourceMappingURL=rekognition.d.ts.map