import { DetectDocumentTextCommandOutput } from '@aws-sdk/client-textract';
/**
 * AWS Textract service wrapper for OCR operations
 * Configured for af-south-1 region (DPA 2024 compliance)
 */
export declare class TextractService {
    private client;
    constructor();
    /**
     * Extract text from document using AWS Textract DetectDocumentText API
     * @param bucket - S3 bucket name
     * @param key - S3 object key
     * @returns Textract response with extracted text blocks
     */
    detectDocumentText(bucket: string, key: string): Promise<DetectDocumentTextCommandOutput>;
    /**
     * Extract text with automatic retry on throttling errors
     * Implements exponential backoff for ProvisionedThroughputExceededException
     * @param bucket - S3 bucket name
     * @param key - S3 object key
     * @param retries - Current retry attempt (internal use)
     * @returns Textract response with extracted text blocks
     */
    detectDocumentTextWithRetry(bucket: string, key: string, retries?: number): Promise<DetectDocumentTextCommandOutput>;
    /**
     * Sleep utility for retry backoff
     */
    private sleep;
}
//# sourceMappingURL=textract.d.ts.map