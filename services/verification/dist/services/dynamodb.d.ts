import type { VerificationEntity, VerificationStatus } from '../types/verification';
export declare class DynamoDBService {
    private client;
    private tableName;
    constructor(tableName: string, region: string);
    /**
     * Put verification entity with conditional write to prevent duplicates
     */
    putVerification(verification: VerificationEntity): Promise<void>;
    /**
     * Get verification by ID
     */
    getVerification(verificationId: string): Promise<VerificationEntity | null>;
    /**
     * Query verifications by client ID and status (GSI1)
     */
    queryByClientAndStatus(clientId: string, status?: VerificationStatus): Promise<VerificationEntity[]>;
    /**
     * Query verifications by creation date (GSI2)
     */
    queryByDate(date: string): Promise<VerificationEntity[]>;
    /**
     * Update verification status
     */
    updateVerificationStatus(verificationId: string, status: VerificationStatus, updatedAt: string): Promise<void>;
}
//# sourceMappingURL=dynamodb.d.ts.map