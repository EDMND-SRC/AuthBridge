/**
 * Lambda handler for processing biometric verification
 * Triggered by SQS queue after OCR validation completes
 */
import type { SQSHandler, SQSBatchResponse } from 'aws-lambda';
import { createRekognitionClient, RekognitionService } from '../services/rekognition';
import { BiometricService } from '../services/biometric';
import { BiometricStorageService } from '../services/biometric-storage';
import { DynamoDBService } from '../services/dynamodb';
import { recordBiometricMetrics, recordRekognitionError } from '../utils/metrics';
import { logger } from '../utils/logger';

const rekognitionClient = createRekognitionClient();
const rekognitionService = new RekognitionService(rekognitionClient);
const biometricService = new BiometricService(rekognitionService);
const biometricStorageService = new BiometricStorageService();
const dynamoDBService = new DynamoDBService();

const BUCKET_NAME = process.env.BUCKET_NAME || '';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

interface BiometricMessage {
  verificationId: string;
  selfieDocumentId: string;
  omangFrontDocumentId: string;
  livenessSessionId: string;
  attemptCount?: number;
}

/**
 * Process biometric verification with exponential backoff retry
 */
async function processBiometricWithRetry(
  message: BiometricMessage,
  retries = 0
): Promise<void> {
  const { verificationId, selfieDocumentId, omangFrontDocumentId, livenessSessionId } =
    message;

  try {
    logger.info('Processing biometric verification', {
      verificationId,
      selfieDocumentId,
      omangFrontDocumentId,
      attemptCount: retries + 1,
    });

    // Get document S3 keys from DynamoDB
    const [selfieDoc, omangDoc] = await Promise.all([
      dynamoDBService.getItem({
        Key: {
          PK: `CASE#${verificationId}`,
          SK: `DOC#${selfieDocumentId}`,
        },
      }),
      dynamoDBService.getItem({
        Key: {
          PK: `CASE#${verificationId}`,
          SK: `DOC#${omangFrontDocumentId}`,
        },
      }),
    ]);

    if (!selfieDoc?.Item || !omangDoc?.Item) {
      throw new Error('Document not found in DynamoDB');
    }

    const selfieS3Key = selfieDoc.Item.s3Key as string;
    const omangS3Key = omangDoc.Item.s3Key as string;

    // Process biometric verification
    const startTime = Date.now();
    const biometricData = await biometricService.processBiometric(
      BUCKET_NAME,
      livenessSessionId,
      selfieS3Key,
      omangS3Key
    );
    const processingTimeMs = Date.now() - startTime;

    // Store results
    await Promise.all([
      biometricStorageService.storeBiometricResults(
        verificationId,
        selfieDocumentId,
        biometricData
      ),
      biometricStorageService.updateVerificationWithBiometricSummary(
        verificationId,
        biometricData
      ),
    ]);

    // Record metrics
    await recordBiometricMetrics(
      true,
      processingTimeMs,
      biometricData.liveness.confidence,
      biometricData.faceComparison.similarity,
      biometricData.overallScore,
      biometricData.passed,
      biometricData.requiresManualReview
    );

    logger.info('Biometric processing completed', {
      verificationId,
      passed: biometricData.passed,
      requiresManualReview: biometricData.requiresManualReview,
      overallScore: biometricData.overallScore,
      processingTimeMs,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorName = error instanceof Error ? error.name : 'UnknownError';

    logger.error('Biometric processing failed', {
      verificationId,
      selfieDocumentId,
      omangFrontDocumentId,
      attemptCount: retries + 1,
      error: errorMessage,
      errorName,
    });

    // Check if error is retryable
    const isRetryable =
      error instanceof Error && rekognitionService.isRetryableError(error);

    if (isRetryable && retries < MAX_RETRIES) {
      // Exponential backoff
      const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, retries);
      logger.info('Retrying biometric processing', {
        verificationId,
        attemptCount: retries + 2,
        backoffMs,
      });

      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return processBiometricWithRetry(message, retries + 1);
    }

    // Record error metrics
    let errorType: 'THROTTLING' | 'NO_FACE_DETECTED' | 'MULTIPLE_FACES' | 'POOR_QUALITY' | 'UNKNOWN' = 'UNKNOWN';
    if (errorName.includes('Throttl')) {
      errorType = 'THROTTLING';
    } else if (errorMessage.includes('no face')) {
      errorType = 'NO_FACE_DETECTED';
    } else if (errorMessage.includes('multiple faces')) {
      errorType = 'MULTIPLE_FACES';
    } else if (errorMessage.includes('quality')) {
      errorType = 'POOR_QUALITY';
    }

    await recordRekognitionError(errorType, 'COMPARE_FACES');
    await recordBiometricMetrics(false, 0, 0, 0, 0, false, true);

    throw error;
  }
}

/**
 * SQS handler for biometric processing
 */
export const handler: SQSHandler = async (event): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];

  for (const record of event.Records) {
    const messageId = record.messageId;

    try {
      const message: BiometricMessage = JSON.parse(record.body);

      await processBiometricWithRetry(message);
    } catch (error) {
      logger.error('Failed to process biometric message', {
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Add to batch item failures for SQS retry
      batchItemFailures.push({ itemIdentifier: messageId });
    }
  }

  return { batchItemFailures };
};
