export declare class S3Service {
    private client;
    private bucketName;
    constructor(bucketName: string, region: string);
    /**
     * Generate S3 object key following pattern: {clientId}/{verificationId}/{documentType}-{timestamp}.{ext}
     */
    generateS3Key(clientId: string, verificationId: string, documentType: string, mimeType: string): string;
    /**
     * Get file extension from mime type
     */
    private getExtensionFromMimeType;
    /**
     * Upload document to S3
     */
    uploadDocument(s3Key: string, data: Buffer, mimeType: string, metadata?: Record<string, string>): Promise<void>;
    /**
     * Generate presigned URL for document access (15-minute expiry)
     */
    generatePresignedUrl(s3Key: string): Promise<{
        url: string;
        expiresAt: string;
    }>;
    /**
     * Delete document from S3 (for cleanup on failure)
     */
    deleteDocument(s3Key: string): Promise<void>;
    /**
     * Get bucket name
     */
    getBucketName(): string;
}
//# sourceMappingURL=s3.d.ts.map