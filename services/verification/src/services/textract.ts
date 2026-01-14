import {
  TextractClient,
  DetectDocumentTextCommand,
  DetectDocumentTextCommandOutput,
} from '@aws-sdk/client-textract';

const REGION = 'af-south-1'; // DPA 2024 compliance - mandatory region
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

/**
 * AWS Textract service wrapper for OCR operations
 * Configured for af-south-1 region (DPA 2024 compliance)
 */
export class TextractService {
  private client: TextractClient;

  constructor() {
    this.client = new TextractClient({
      region: REGION,
    });
  }

  /**
   * Extract text from document using AWS Textract DetectDocumentText API
   * @param bucket - S3 bucket name
   * @param key - S3 object key
   * @returns Textract response with extracted text blocks
   */
  async detectDocumentText(
    bucket: string,
    key: string
  ): Promise<DetectDocumentTextCommandOutput> {
    const command = new DetectDocumentTextCommand({
      Document: {
        S3Object: {
          Bucket: bucket,
          Name: key,
        },
      },
    });

    return await this.client.send(command);
  }

  /**
   * Extract text with automatic retry on throttling errors
   * Implements exponential backoff for ProvisionedThroughputExceededException
   * @param bucket - S3 bucket name
   * @param key - S3 object key
   * @param retries - Current retry attempt (internal use)
   * @returns Textract response with extracted text blocks
   */
  async detectDocumentTextWithRetry(
    bucket: string,
    key: string,
    retries = 0
  ): Promise<DetectDocumentTextCommandOutput> {
    try {
      return await this.detectDocumentText(bucket, key);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if error is retryable (throttling)
      const isRetryable =
        errorMessage.includes('ProvisionedThroughputExceededException') ||
        errorMessage.includes('ThrottlingException');

      if (isRetryable && retries < MAX_RETRIES) {
        // Exponential backoff: 1s, 2s, 4s
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, retries);
        await this.sleep(backoffMs);
        return this.detectDocumentTextWithRetry(bucket, key, retries + 1);
      }

      // Non-retryable error or max retries exceeded
      throw error;
    }
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
