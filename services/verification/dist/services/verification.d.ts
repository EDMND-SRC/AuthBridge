import type { VerificationEntity, CreateVerificationRequest, VerificationStatus } from '../types/verification';
export declare class VerificationService {
    private db;
    constructor(tableName: string, region: string);
    /**
     * Generate verification ID with ver_ prefix
     */
    generateVerificationId(): string;
    /**
     * Calculate TTL (30 days from creation)
     */
    calculateTTL(createdAt: string): number;
    /**
     * Create new verification case
     */
    createVerification(request: CreateVerificationRequest, clientId: string): Promise<VerificationEntity>;
    /**
     * Get verification by ID
     */
    getVerification(verificationId: string): Promise<VerificationEntity | null>;
    /**
     * List verifications for a client (optionally filtered by status)
     */
    listVerificationsByClient(clientId: string, status?: VerificationStatus): Promise<VerificationEntity[]>;
    /**
     * List verifications created on a specific date
     */
    listVerificationsByDate(date: string): Promise<VerificationEntity[]>;
    /**
     * Update verification status
     */
    updateStatus(verificationId: string, status: VerificationStatus): Promise<void>;
}
//# sourceMappingURL=verification.d.ts.map