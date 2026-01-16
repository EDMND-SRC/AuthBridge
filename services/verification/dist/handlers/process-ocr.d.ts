import { SQSEvent, SQSBatchResponse } from 'aws-lambda';
/**
 * Lambda handler for processing OCR from SQS queue
 * Triggered by document upload events
 */
export declare function handler(event: SQSEvent): Promise<SQSBatchResponse>;
//# sourceMappingURL=process-ocr.d.ts.map