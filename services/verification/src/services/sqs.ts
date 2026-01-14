import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const REGION = process.env.AWS_REGION || 'af-south-1';

/**
 * SQS service wrapper for sending OCR processing messages
 * Handles message delivery to the OCR processing queue
 */
export class SqsService {
  private client: SQSClient;
  private queueUrl: string;

  constructor(queueUrl?: string) {
    this.client = new SQSClient({ region: REGION });
    this.queueUrl = queueUrl || process.env.OCR_QUEUE_URL || '';
  }

  /**
   * Send OCR processing message to queue
   * @param message - OCR processing message containing document details
   * @throws Error if queue URL is not configured or SQS send fails
   */
  async sendOcrMessage(message: {
    verificationId: string;
    documentId: string;
    s3Bucket: string;
    s3Key: string;
    documentType: string;
  }): Promise<void> {
    if (!this.queueUrl) {
      throw new Error('OCR_QUEUE_URL is not configured');
    }

    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(message),
    });

    await this.client.send(command);
  }
}
