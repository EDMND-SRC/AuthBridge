/**
 * Biometric matching service for face liveness and comparison
 */
import type { RekognitionService } from './rekognition';
import type { BiometricData } from '../types/biometric';
export declare class BiometricService {
    private readonly rekognitionService;
    constructor(rekognitionService: RekognitionService);
    /**
     * Process biometric verification (liveness + face comparison)
     * @param bucketName S3 bucket containing images
     * @param livenessSessionId Liveness session ID from Web SDK
     * @param selfieKey Selfie S3 key
     * @param idPhotoKey ID photo S3 key
     * @returns Complete biometric verification result
     */
    processBiometric(bucketName: string, livenessSessionId: string, selfieKey: string, idPhotoKey: string): Promise<BiometricData>;
    /**
     * Calculate weighted overall biometric score
     * @param livenessScore Liveness confidence (0-100)
     * @param similarityScore Face similarity (0-100)
     * @returns Weighted overall score (0-100)
     */
    calculateOverallScore(livenessScore: number, similarityScore: number): number;
}
//# sourceMappingURL=biometric.d.ts.map