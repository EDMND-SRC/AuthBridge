import { createRekognitionClient, RekognitionService } from '../services/rekognition';
import { BiometricService } from '../services/biometric';
import { BiometricStorageService } from '../services/biometric-storage';
import { DuplicateDetectionService } from '../services/duplicate-detection';
import { DuplicateStorageService } from '../services/duplicate-storage';
import { DynamoDBService } from '../services/dynamodb';
import { recordBiometricMetrics, recordRekognitionError, recordDuplicateDetectionMetrics, recordDuplicateCheckError, } from '../utils/metrics';
import { logger } from '../utils/logger';
const rekognitionClient = createRekognitionClient();
const rekognitionService = new RekognitionService(rekognitionClient);
const biometricService = new BiometricService(rekognitionService);
const biometricStorageService = new BiometricStorageService();
const dynamoDBService = new DynamoDBService();
const duplicateDetectionService = new DuplicateDetectionService(dynamoDBService);
const duplicateStorageService = new DuplicateStorageService(dynamoDBService);
const BUCKET_NAME = process.env.BUCKET_NAME || '';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
/**
 * Process biometric verification with exponential backoff retry
 */
async function processBiometricWithRetry(message, retries = 0) {
    const { verificationId, selfieDocumentId, omangFrontDocumentId, livenessSessionId } = message;
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
        if (typeof selfieDoc.Item !== 'object' || !('s3Key' in selfieDoc.Item) || typeof selfieDoc.Item.s3Key !== 'string') {
            throw new Error('Selfie document missing s3Key');
        }
        if (typeof omangDoc.Item !== 'object' || !('s3Key' in omangDoc.Item) || typeof omangDoc.Item.s3Key !== 'string') {
            throw new Error('Omang document missing s3Key');
        }
        const selfieS3Key = selfieDoc.Item.s3Key;
        const omangS3Key = omangDoc.Item.s3Key;
        // Process biometric verification
        const startTime = Date.now();
        const biometricData = await biometricService.processBiometric(BUCKET_NAME, livenessSessionId, selfieS3Key, omangS3Key);
        const processingTimeMs = Date.now() - startTime;
        // Store results
        await Promise.all([
            biometricStorageService.storeBiometricResults(verificationId, selfieDocumentId, biometricData),
            biometricStorageService.updateVerificationWithBiometricSummary(verificationId, biometricData),
        ]);
        // Record metrics
        await recordBiometricMetrics(true, processingTimeMs, biometricData.liveness.confidence, biometricData.faceComparison.similarity, biometricData.overallScore, biometricData.passed, biometricData.requiresManualReview);
        logger.info('Biometric processing completed', {
            verificationId,
            passed: biometricData.passed,
            requiresManualReview: biometricData.requiresManualReview,
            overallScore: biometricData.overallScore,
            processingTimeMs,
        });
        // NEW: Trigger duplicate detection if biometric passed
        if (biometricData.passed) {
            try {
                const duplicateStartTime = Date.now();
                // Get verification case to extract Omang number and client ID
                const verification = await dynamoDBService.getVerification(verificationId);
                if (!verification) {
                    logger.warn('Verification not found for duplicate check', { verificationId });
                    return;
                }
                // Extract Omang number from customer data
                const omangNumber = verification.customerData?.omangNumber;
                const clientId = verification.clientId;
                if (!omangNumber) {
                    logger.warn('No Omang number found for duplicate check', { verificationId });
                    return;
                }
                // Check for duplicates
                const duplicateResult = await duplicateDetectionService.checkDuplicates(omangNumber, verificationId, clientId, biometricData.overallScore);
                const duplicateCheckTimeMs = Date.now() - duplicateStartTime;
                // Store duplicate detection results
                await duplicateStorageService.storeDuplicateResults(verificationId, duplicateResult);
                // Record metrics
                await recordDuplicateDetectionMetrics(duplicateResult.checked, duplicateResult.duplicatesFound, duplicateResult.sameClientDuplicates, duplicateResult.crossClientDuplicates, duplicateResult.riskLevel, duplicateResult.riskScore, duplicateResult.requiresManualReview, duplicateCheckTimeMs);
                logger.info('Duplicate detection completed', {
                    verificationId,
                    duplicatesFound: duplicateResult.duplicatesFound,
                    riskLevel: duplicateResult.riskLevel,
                    requiresManualReview: duplicateResult.requiresManualReview,
                    checkTimeMs: duplicateCheckTimeMs,
                });
            }
            catch (duplicateError) {
                // Log error but don't fail biometric processing
                const errorMessage = duplicateError instanceof Error ? duplicateError.message : 'Unknown error';
                logger.error('Duplicate detection failed', {
                    verificationId,
                    error: errorMessage,
                });
                await recordDuplicateCheckError('UNKNOWN');
            }
        }
    }
    catch (error) {
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
        const isRetryable = error instanceof Error && rekognitionService.isRetryableError(error);
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
        let errorType = 'UNKNOWN';
        if (errorName.includes('Throttl')) {
            errorType = 'THROTTLING';
        }
        else if (errorMessage.includes('no face')) {
            errorType = 'NO_FACE_DETECTED';
        }
        else if (errorMessage.includes('multiple faces')) {
            errorType = 'MULTIPLE_FACES';
        }
        else if (errorMessage.includes('quality')) {
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
export const handler = async (event) => {
    const batchItemFailures = [];
    for (const record of event.Records) {
        const messageId = record.messageId;
        try {
            const message = JSON.parse(record.body);
            await processBiometricWithRetry(message);
        }
        catch (error) {
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
//# sourceMappingURL=process-biometric.js.map