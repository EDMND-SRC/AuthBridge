import { SQSEvent, SQSBatchResponse } from 'aws-lambda';
import { OmangOcrService } from '../services/omang-ocr';
import { OcrStorageService } from '../services/ocr-storage';
import { assessImageQuality, shouldRequestRecapture } from '../services/image-quality';
import { notifyOcrFailure, notifyPoorQualityImage } from '../services/notification';
import { recordOcrMetrics, recordTextractError, recordPoorQualityImage } from '../utils/metrics';
import { TextractBlock } from '../types/ocr';

interface OcrMessage {
  verificationId: string;
  documentId: string;
  s3Bucket: string;
  s3Key: string;
  documentType: string;
  attemptCount?: number;
}

const REQUIRED_FRONT_FIELDS = 7;
const REQUIRED_BACK_FIELDS = 3;

/**
 * Lambda handler for processing OCR from SQS queue
 * Triggered by document upload events
 */
export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const ocrService = new OmangOcrService();
  const storageService = new OcrStorageService();
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];

  // Process each message in the batch
  for (const record of event.Records) {
    try {
      const message: OcrMessage = JSON.parse(record.body);
      const attemptCount = message.attemptCount || 1;

      console.log('Processing OCR', {
        verificationId: message.verificationId,
        documentId: message.documentId,
        documentType: message.documentType,
        attemptCount,
      });

      const startTime = Date.now();

      // Extract fields based on document type
      let ocrResult;
      if (message.documentType === 'omang_back') {
        ocrResult = await ocrService.extractOmangBack(message.s3Bucket, message.s3Key);
      } else if (message.documentType === 'selfie') {
        // Selfies don't need OCR extraction - just mark as processed
        ocrResult = {
          extractedFields: {},
          confidence: { overall: 100 },
          rawTextractResponse: null,
          extractionMethod: 'pattern' as const,
          processingTimeMs: 0,
          requiresManualReview: false,
          missingFields: [],
        };
      } else {
        // omang_front, passport, drivers_license, etc.
        ocrResult = await ocrService.extractOmangFront(message.s3Bucket, message.s3Key);
      }

      // Assess image quality for non-selfie documents
      let qualityResult = null;
      if (message.documentType !== 'selfie' && ocrResult.rawTextractResponse) {
        const blocks = (ocrResult.rawTextractResponse.Blocks || []) as TextractBlock[];
        qualityResult = assessImageQuality(blocks);

        // Check if we should request recapture
        const requiredFields = message.documentType === 'omang_back'
          ? REQUIRED_BACK_FIELDS
          : REQUIRED_FRONT_FIELDS;
        const extractedFieldCount = Object.keys(ocrResult.extractedFields).length;

        if (shouldRequestRecapture(qualityResult, extractedFieldCount, requiredFields)) {
          ocrResult.requiresManualReview = true;
          ocrResult.missingFields = [
            ...ocrResult.missingFields,
            `QUALITY_ISSUE:${qualityResult.issues.join(',')}`,
          ];

          // Record poor quality metric and notify
          await recordPoorQualityImage(message.documentType, qualityResult.qualityScore);
          await notifyPoorQualityImage(
            message.verificationId,
            message.documentId,
            qualityResult.qualityScore,
            qualityResult.issues
          );
        }
      }

      // Store OCR results in document entity
      await storageService.storeOcrResults(
        message.verificationId,
        message.documentId,
        message.documentType,
        ocrResult,
        qualityResult
      );

      // Update verification case with extracted customer data
      await storageService.updateVerificationWithExtractedData(
        message.verificationId,
        ocrResult
      );

      const durationMs = Date.now() - startTime;

      // Record metrics
      await recordOcrMetrics(
        true,
        durationMs,
        ocrResult.confidence.overall,
        message.documentType,
        ocrResult.requiresManualReview
      );

      console.log('OCR processing complete', {
        verificationId: message.verificationId,
        documentId: message.documentId,
        confidence: ocrResult.confidence.overall,
        requiresManualReview: ocrResult.requiresManualReview,
        qualityScore: qualityResult?.qualityScore,
        durationMs,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      let message: OcrMessage;

      try {
        message = JSON.parse(record.body);
      } catch {
        message = {
          verificationId: 'unknown',
          documentId: 'unknown',
          s3Bucket: 'unknown',
          s3Key: 'unknown',
          documentType: 'unknown',
        };
      }

      const attemptCount = message.attemptCount || 1;

      console.error('OCR processing failed', {
        messageId: record.messageId,
        verificationId: message.verificationId,
        documentId: message.documentId,
        attemptCount,
        error: errorMessage,
      });

      // Classify error type for metrics
      let errorType: 'THROTTLING' | 'INVALID_S3_OBJECT' | 'UNSUPPORTED_DOCUMENT' | 'POOR_QUALITY' | 'UNKNOWN' = 'UNKNOWN';

      if (errorMessage.includes('Throttling') || errorMessage.includes('ThroughputExceeded')) {
        errorType = 'THROTTLING';
      } else if (errorMessage.includes('InvalidS3Object')) {
        errorType = 'INVALID_S3_OBJECT';
      } else if (errorMessage.includes('UnsupportedDocument')) {
        errorType = 'UNSUPPORTED_DOCUMENT';
      }

      await recordTextractError(errorType);

      // Notify on repeated failures (after 3 attempts, message goes to DLQ)
      await notifyOcrFailure({
        verificationId: message.verificationId,
        documentId: message.documentId,
        documentType: message.documentType,
        errorType,
        errorMessage,
        attemptCount,
        timestamp: new Date().toISOString(),
      });

      // Add to batch item failures for retry
      batchItemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }

  return { batchItemFailures };
}
