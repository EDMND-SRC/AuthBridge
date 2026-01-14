import { v4 as uuidv4 } from 'uuid';
import { generateVerificationPK, generateDocumentSK } from '../utils/entity-keys';
export class DocumentService {
    db;
    s3;
    constructor(db, s3) {
        this.db = db;
        this.s3 = s3;
    }
    /**
     * Generate document ID with doc_ prefix
     */
    generateDocumentId() {
        return `doc_${uuidv4().replace(/-/g, '')}`;
    }
    /**
     * Upload document and store metadata
     */
    async uploadDocument(verification, documentType, imageData, mimeType, metadata, requestId) {
        const documentId = this.generateDocumentId();
        const uploadedAt = new Date().toISOString();
        // Generate S3 key
        const s3Key = this.s3.generateS3Key(verification.clientId, verification.verificationId, documentType, mimeType);
        // Upload to S3
        await this.s3.uploadDocument(s3Key, imageData, mimeType, {
            verificationId: verification.verificationId,
            documentId,
            documentType,
        });
        // Create document entity
        const documentEntity = {
            PK: generateVerificationPK(verification.verificationId),
            SK: generateDocumentSK(documentId),
            documentId,
            verificationId: verification.verificationId,
            documentType,
            s3Key,
            s3Bucket: this.s3.getBucketName(),
            fileSize: imageData.length,
            mimeType,
            uploadedAt,
            status: 'uploaded',
            metadata,
        };
        // Store in DynamoDB
        try {
            await this.db.putDocument(documentEntity);
        }
        catch (error) {
            // Cleanup S3 on DynamoDB failure
            await this.s3.deleteDocument(s3Key);
            throw error;
        }
        // Generate presigned URL
        const { url: presignedUrl, expiresAt: presignedUrlExpiresAt } = await this.s3.generatePresignedUrl(s3Key);
        return {
            documentId,
            verificationId: verification.verificationId,
            documentType,
            s3Key,
            fileSize: imageData.length,
            mimeType,
            uploadedAt,
            status: 'uploaded',
            presignedUrl,
            presignedUrlExpiresAt,
            meta: {
                requestId: requestId || '',
                timestamp: uploadedAt,
            },
        };
    }
    /**
     * Get document by ID
     */
    async getDocument(verificationId, documentId) {
        return this.db.getDocument(verificationId, documentId);
    }
    /**
     * List documents for a verification
     */
    async listDocuments(verificationId) {
        return this.db.queryDocuments(verificationId);
    }
    /**
     * Count documents for a verification
     */
    async countDocuments(verificationId) {
        const documents = await this.listDocuments(verificationId);
        return documents.length;
    }
}
//# sourceMappingURL=document.js.map