import type { DynamoDBService } from './dynamodb';
import type { DuplicateDetectionResult } from '../types/duplicate';
export declare class DuplicateDetectionService {
    private dynamoDBService;
    constructor(dynamoDBService: DynamoDBService);
    /**
     * Check for duplicate Omang numbers across verifications
     *
     * @param omangNumber - The Omang number to check
     * @param currentVerificationId - Current verification ID (excluded from results)
     * @param currentClientId - Current client ID
     * @param currentBiometricScore - Current biometric score
     * @returns Duplicate detection result with risk assessment
     */
    checkDuplicates(omangNumber: string, currentVerificationId: string, currentClientId: string, currentBiometricScore: number): Promise<DuplicateDetectionResult>;
}
//# sourceMappingURL=duplicate-detection.d.ts.map