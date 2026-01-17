import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
const REGION = process.env.AWS_REGION || 'af-south-1';
/**
 * SQS service wrapper for sending OCR processing messages
 * Handles message delivery to the OCR processing queue
 */
export class SqsService {
    client;
    queueUrl;
    constructor(queueUrl) {
        this.client = new SQSClient({ region: REGION });
        this.queueUrl = queueUrl || process.env.OCR_QUEUE_URL || '';
    }
    /**
     * Send OCR processing message to queue
     * @param message - OCR processing message containing document details
     * @throws Error if queue URL is not configured or SQS send fails
     */
    async sendOcrMessage(message) {
        if (!this.queueUrl) {
            throw new Error('OCR_QUEUE_URL is not configured');
        }
        const command = new SendMessageCommand({
            QueueUrl: this.queueUrl,
            MessageBody: JSON.stringify(message),
        });
        await this.client.send(command);
    }
    /**
     * Send a generic message to a specified queue
     * @param queueUrl - The URL of the SQS queue
     * @param message - The message object to send
     * @throws Error if SQS send fails
     */
    async sendMessage(queueUrl, message) {
        const command = new SendMessageCommand({
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify(message),
        });
        await this.client.send(command);
    }
}
//# sourceMappingURL=sqs.js.map