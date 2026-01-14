import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { PRESIGNED_URL_EXPIRY_SECONDS } from '../types/document';
export class S3Service {
    client;
    bucketName;
    constructor(bucketName, region) {
        this.client = new S3Client({ region });
        this.bucketName = bucketName;
    }
    /**
     * Generate S3 object key following pattern: {clientId}/{verificationId}/{documentType}-{timestamp}.{ext}
     */
    generateS3Key(clientId, verificationId, documentType, mimeType) {
        const timestamp = Date.now();
        const extension = this.getExtensionFromMimeType(mimeType);
        return `${clientId}/${verificationId}/${documentType}-${timestamp}.${extension}`;
    }
    /**
     * Get file extension from mime type
     */
    getExtensionFromMimeType(mimeType) {
        const mimeToExt = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'application/pdf': 'pdf',
        };
        return mimeToExt[mimeType] || 'bin';
    }
    /**
     * Upload document to S3
     */
    async uploadDocument(s3Key, data, mimeType, metadata) {
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: s3Key,
            Body: data,
            ContentType: mimeType,
            Metadata: metadata,
            ServerSideEncryption: 'AES256',
        });
        await this.client.send(command);
    }
    /**
     * Generate presigned URL for document access (15-minute expiry)
     */
    async generatePresignedUrl(s3Key) {
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: s3Key,
            ResponseContentDisposition: 'inline',
        });
        const url = await getSignedUrl(this.client, command, {
            expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
        });
        const expiresAt = new Date(Date.now() + PRESIGNED_URL_EXPIRY_SECONDS * 1000).toISOString();
        return { url, expiresAt };
    }
    /**
     * Delete document from S3 (for cleanup on failure)
     */
    async deleteDocument(s3Key) {
        const command = new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: s3Key,
        });
        await this.client.send(command);
    }
    /**
     * Get bucket name
     */
    getBucketName() {
        return this.bucketName;
    }
}
//# sourceMappingURL=s3.js.map