/**
 * SQS service wrapper for sending OCR processing messages
 * Handles message delivery to the OCR processing queue
 */
export declare class SqsService {
    private client;
    private queueUrl;
    constructor(queueUrl?: string);
    /**
     * Send OCR processing message to queue
     * @param message - OCR processing message containing document details
     * @throws Error if queue URL is not configured or SQS send fails
     */
    sendOcrMessage(message: {
        verificationId: string;
        documentId: string;
        s3Bucket: string;
        s3Key: string;
        documentType: string;
    }): Promise<void>;
    /**
     * Send a generic message to a specified queue
     * @param queueUrl - The URL of the SQS queue
     * @param message - The message object to send
     * @throws Error if SQS send fails
     */
    sendMessage(queueUrl: string, message: Record<string, unknown>): Promise<void>;
}
//# sourceMappingURL=sqs.d.ts.map