import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { PRESIGNED_URL_EXPIRY_SECONDS } from '../types/document';

export class S3Service {
  private client: S3Client;
  private bucketName: string;

  constructor(bucketName: string, region: string) {
    this.client = new S3Client({ region });
    this.bucketName = bucketName;
  }

  /**
   * Generate S3 object key following pattern: {clientId}/{verificationId}/{documentType}-{timestamp}.{ext}
   */
  generateS3Key(
    clientId: string,
    verificationId: string,
    documentType: string,
    mimeType: string
  ): string {
    const timestamp = Date.now();
    const extension = this.getExtensionFromMimeType(mimeType);
    return `${clientId}/${verificationId}/${documentType}-${timestamp}.${extension}`;
  }

  /**
   * Get file extension from mime type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'application/pdf': 'pdf',
    };
    return mimeToExt[mimeType] || 'bin';
  }

  /**
   * Upload document to S3
   */
  async uploadDocument(
    s3Key: string,
    data: Buffer,
    mimeType: string,
    metadata?: Record<string, string>
  ): Promise<void> {
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
  async generatePresignedUrl(s3Key: string): Promise<{ url: string; expiresAt: string }> {
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
  async deleteDocument(s3Key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    await this.client.send(command);
  }

  /**
   * Get bucket name
   */
  getBucketName(): string {
    return this.bucketName;
  }
}
