/**
 * Service for storing duplicate detection results in DynamoDB
 */
import { DynamoDBService } from './dynamodb';
import type { DuplicateDetectionResult } from '../types/duplicate';
import { logger } from '../utils/logger';

export class DuplicateStorageService {
  private dynamoDBService: DynamoDBService;

  constructor(dynamoDBService?: DynamoDBService) {
    this.dynamoDBService = dynamoDBService || new DynamoDBService();
  }

  /**
   * Store duplicate detection results in verification entity
   *
   * @param verificationId - Verification case ID
   * @param duplicateResult - Duplicate detection result
   */
  async storeDuplicateResults(
    verificationId: string,
    duplicateResult: DuplicateDetectionResult
  ): Promise<void> {
    const now = new Date().toISOString();

    try {
      // Build update expression
      const updateExpression =
        'SET duplicateDetection = :duplicateDetection, updatedAt = :updatedAt';

      const expressionAttributeValues: Record<string, unknown> = {
        ':duplicateDetection': duplicateResult,
        ':updatedAt': now,
      };

      // If manual review required, update status and flag reason
      if (duplicateResult.requiresManualReview) {
        await this.dynamoDBService.updateItem({
          Key: {
            PK: `CASE#${verificationId}`,
            SK: 'META',
          },
          UpdateExpression:
            'SET duplicateDetection = :duplicateDetection, requiresManualReview = :requiresManualReview, flagReason = :flagReason, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':duplicateDetection': duplicateResult,
            ':requiresManualReview': true,
            ':flagReason': duplicateResult.flagReason || 'Duplicate detected',
            ':updatedAt': now,
          },
        });
      } else {
        await this.dynamoDBService.updateItem({
          Key: {
            PK: `CASE#${verificationId}`,
            SK: 'META',
          },
          UpdateExpression: updateExpression,
          ExpressionAttributeValues: expressionAttributeValues,
        });
      }

      logger.info('Duplicate detection results stored', {
        verificationId,
        duplicatesFound: duplicateResult.duplicatesFound,
        riskLevel: duplicateResult.riskLevel,
        requiresManualReview: duplicateResult.requiresManualReview,
      });
    } catch (error) {
      logger.error('Failed to store duplicate detection results', {
        verificationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
