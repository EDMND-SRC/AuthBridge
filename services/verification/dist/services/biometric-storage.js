/**
 * Service for storing biometric results in DynamoDB
 */
import { DynamoDBService } from './dynamodb';
import { logger } from '../utils/logger';
export class BiometricStorageService {
    dynamoDBService;
    constructor() {
        this.dynamoDBService = new DynamoDBService();
    }
    /**
     * Store biometric results in document entity
     * @param verificationId Verification case ID
     * @param documentId Selfie document ID
     * @param biometricData Complete biometric verification result
     */
    async storeBiometricResults(verificationId, documentId, biometricData) {
        const now = new Date().toISOString();
        try {
            // Update selfie document with biometric data
            await this.dynamoDBService.updateItem({
                Key: {
                    PK: `CASE#${verificationId}`,
                    SK: `DOC#${documentId}`,
                },
                UpdateExpression: 'SET #biometricData = :biometricData, #status = :status, #processedAt = :processedAt',
                ExpressionAttributeNames: {
                    '#biometricData': 'biometricData',
                    '#status': 'status',
                    '#processedAt': 'processedAt',
                },
                ExpressionAttributeValues: {
                    ':biometricData': biometricData,
                    ':status': 'biometric_processed',
                    ':processedAt': now,
                },
            });
            logger.info('Biometric results stored in document', {
                verificationId,
                documentId,
                passed: biometricData.passed,
                requiresManualReview: biometricData.requiresManualReview,
            });
        }
        catch (error) {
            logger.error('Failed to store biometric results in document', {
                verificationId,
                documentId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    /**
     * Update verification case with biometric summary
     * @param verificationId Verification case ID
     * @param biometricData Complete biometric verification result
     */
    async updateVerificationWithBiometricSummary(verificationId, biometricData) {
        const now = new Date().toISOString();
        const biometricSummary = {
            livenessScore: biometricData.liveness.confidence,
            similarityScore: biometricData.faceComparison.similarity,
            overallScore: biometricData.overallScore,
            passed: biometricData.passed,
            requiresManualReview: biometricData.requiresManualReview,
            processedAt: biometricData.processedAt,
        };
        // Determine verification status based on biometric results
        const verificationStatus = biometricData.passed
            ? 'biometric_complete'
            : 'biometric_failed';
        try {
            await this.dynamoDBService.updateItem({
                Key: {
                    PK: `CASE#${verificationId}`,
                    SK: 'META',
                },
                UpdateExpression: 'SET #biometricSummary = :biometricSummary, #status = :status, #updatedAt = :updatedAt',
                ExpressionAttributeNames: {
                    '#biometricSummary': 'biometricSummary',
                    '#status': 'status',
                    '#updatedAt': 'updatedAt',
                },
                ExpressionAttributeValues: {
                    ':biometricSummary': biometricSummary,
                    ':status': verificationStatus,
                    ':updatedAt': now,
                },
            });
            logger.info('Verification updated with biometric summary', {
                verificationId,
                status: verificationStatus,
                passed: biometricData.passed,
                requiresManualReview: biometricData.requiresManualReview,
            });
        }
        catch (error) {
            logger.error('Failed to update verification with biometric summary', {
                verificationId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
}
//# sourceMappingURL=biometric-storage.js.map