import { DynamoDBService } from './dynamodb';
import { S3Service } from './s3';
import type { DocumentEntity, DocumentSide, DocumentMetadata, UploadDocumentResponse } from '../types/document';
import type { VerificationEntity } from '../types/verification';
export declare class DocumentService {
    private db;
    private s3;
    constructor(db: DynamoDBService, s3: S3Service);
    /**
     * Generate document ID with doc_ prefix
     */
    generateDocumentId(): string;
    /**
     * Upload document and store metadata
     */
    uploadDocument(verification: VerificationEntity, documentType: DocumentSide, imageData: Buffer, mimeType: string, metadata?: DocumentMetadata, requestId?: string): Promise<UploadDocumentResponse>;
    /**
     * Get document by ID
     */
    getDocument(verificationId: string, documentId: string): Promise<DocumentEntity | null>;
    /**
     * List documents for a verification
     */
    listDocuments(verificationId: string): Promise<DocumentEntity[]>;
    /**
     * Count documents for a verification
     */
    countDocuments(verificationId: string): Promise<number>;
}
//# sourceMappingURL=document.d.ts.map