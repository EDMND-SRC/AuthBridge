import type { VerificationEntity, VerificationStatus } from '../types/verification';
import type { DocumentEntity } from '../types/document';
import { EncryptionService } from './encryption';
export declare class DynamoDBService {
    private client;
    private tableName;
    private encryptionService;
    constructor(tableName?: string, region?: string, endpoint?: string, encryptionService?: EncryptionService);
    /**
     * Put verification entity with conditional write to prevent duplicates
     * Encrypts sensitive fields before storage
     */
    putVerification(verification: VerificationEntity): Promise<void>;
    /**
     * Get verification by ID
     * Decrypts sensitive fields after retrieval
     */
    getVerification(verificationId: string): Promise<VerificationEntity | null>;
    /**
     * Query verifications by client ID and status (GSI1)
     * Decrypts sensitive fields for all results
     */
    queryByClientAndStatus(clientId: string, status?: VerificationStatus): Promise<VerificationEntity[]>;
    /**
     * Query verifications by creation date (GSI2)
     * Decrypts sensitive fields for all results
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
    /**
     * Query verifications by Omang hash (GSI2)
     * Used for duplicate detection
     *
     * @param omangHashKey - GSI2PK key (OMANG#<hash>)
     * @returns Array of verification entities with matching Omang
     */
    queryByOmangHash(omangHashKey: string): Promise<VerificationEntity[]>;
    /**
     * Generic update item method for flexible updates
     */
    updateItem(params: {
        Key: Record<string, string>;
        UpdateExpression: string;
        ExpressionAttributeNames?: Record<string, string>;
        ExpressionAttributeValues?: Record<string, unknown>;
        ConditionExpression?: string;
    }): Promise<void>;
    /**
     * Generic get item method
     */
    getItem(params: {
        Key: Record<string, string>;
    }): Promise<{
        Item?: unknown;
    }>;
    /**
     * Generic put item method
     */
    putItem(item: any): Promise<void>;
}
//# sourceMappingURL=dynamodb.d.ts.map