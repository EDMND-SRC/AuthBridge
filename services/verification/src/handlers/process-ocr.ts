import { SQSEvent, SQSBatchResponse } from 'aws-lambda';
import { OmangOcrService } from '../services/omang-ocr';
import { OcrStorageService } from '../services/ocr-storage';
import { OmangValidationService } from '../services/omang-validation';
import { SqsService } from '../services/sqs';
import { assessImageQuality, shouldRequestRecapture } from '../services/image-quality';
import { notifyOcrFailure, notifyPoorQualityImage } from '../services/notification';
import { recordOcrMetrics, recordTextractError, recordPoorQualityImage, recordOmangValidationMetrics } from '../utils/metrics';
import { TextractBlock } from '../types/ocr';

const BIOMETRIC_QUEUE_URL = process.env.BIOMETRIC_QUEUE_URL || '';

interface OcrMessage {
  verificationId: string;
  documentId: string;
  s3Bucket: string;
  s3Key: string;
  documentType: string;
  attemptCount?: number;
  livenessSessionId?: string;  // For selfie documents
  selfieDocumentId?: string;   // For triggering biometric after omang_front
  omangFrontDocumentId?: string; // For triggering biometric after selfie
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
  const validationService = new OmangValidationService();
  const sqsService = new SqsService();
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

      // Validate Omang data (for omang_front documents only)
      let validationResult = null;
      if (
        message.documentType === 'omang_front' &&
        ocrResult.extractedFields.omangNumber &&
        ocrResult.extractedFields.dateOfIssue &&
        ocrResult.extractedFields.dateOfExpiry
      ) {
        validationResult = validationService.validate({
          omangNumber: ocrResult.extractedFields.omangNumber as string,
          dateOfIssue: ocrResult.extractedFields.dateOfIssue as string,
          dateOfExpiry: ocrResult.extractedFields.dateOfExpiry as string,
        });

        // Record validation metrics
        await recordOmangValidationMetrics(
          validationResult.overall.valid,
          message.documentType,
          validationResult.overall.errors,
          validationResult.overall.warnings
        );

        // If validation fails, mark for manual review
        if (!validationResult.overall.valid) {
          ocrResult.requiresManualReview = true;
          ocrResult.missingFields = [
            ...ocrResult.missingFields,
            ...validationResult.overall.errors.map(err => `VALIDATION:${err}`),
          ];

          console.log('Validation failed', {
            verificationId: message.verificationId,
            documentId: message.documentId,
            errors: validationResult.overall.errors,
          });
        }

        // Log warnings even if validation passes
        if (validationResult.overall.warnings.length > 0) {
          console.log('Validation warnings', {
            verificationId: message.verificationId,
            documentId: message.documentId,
            warnings: validationResult.overall.warnings,
          });
        }
      }

      // Store OCR results in document entity
      await storageService.storeOcrResults(
        message.verificationId,
        message.documentId,
        message.documentType,
        ocrResult,
        qualityResult,
        validationResult
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

      // Trigger biometric processing if validation passed and we have both documents
      // This happens when omang_front validation passes and selfie info is available
      if (
        message.documentType === 'omang_front' &&
        validationResult?.overall.valid &&
        !ocrResult.requiresManualReview &&
        message.selfieDocumentId &&
        message.livenessSessionId &&
        BIOMETRIC_QUEUE_URL
      ) {
        await sqsService.sendMessage(BIOMETRIC_QUEUE_URL, {
          verificationId: message.verificationId,
          selfieDocumentId: message.selfieDocumentId,
          omangFrontDocumentId: message.documentId,
          livenessSessionId: message.livenessSessionId,
        });

        console.log('Biometric processing triggered', {
          verificationId: message.verificationId,
          selfieDocumentId: message.selfieDocumentId,
          omangFrontDocumentId: message.documentId,
        });
      }
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
