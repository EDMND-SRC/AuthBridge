import type { VerificationEntity, VerificationStatus } from '../types/verification';
import type { DocumentEntity } from '../types/document';
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
    /**
     * Put document entity
     */
    putDocument(document: DocumentEntity): Promise<void>;
    /**
     * Get document by verification ID and document ID
     */
    getDocument(verificationId: string, documentId: string): Promise<DocumentEntity | null>;
    /**
     * Query all documents for a verification
     */
    queryDocuments(verificationId: string): Promise<DocumentEntity[]>;
}
//# sourceMappingURL=dynamodb.d.ts.map