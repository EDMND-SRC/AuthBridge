/**
 * Shared utilities for data request operations
 * Story 5.3 - Extracted to avoid code duplication
 */

import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

/**
 * Updates the status of a data request in DynamoDB.
 * @param dynamodb - DynamoDB client instance
 * @param tableName - DynamoDB table name
 * @param requestId - The data request ID (without DSR# prefix)
 * @param status - New status value
 * @param errorMessage - Optional error message for failed status
 */
export async function updateRequestStatus(
  dynamodb: DynamoDBClient,
  tableName: string,
  requestId: string,
  status: string,
  errorMessage?: string
): Promise<void> {
  const updateExpression = errorMessage
    ? 'SET #status = :status, errorMessage = :error, updatedAt = :updated'
    : 'SET #status = :status, updatedAt = :updated';

  const expressionAttributeValues: Record<string, string> = {
    ':status': status,
    ':updated': new Date().toISOString(),
  };

  if (errorMessage) {
    expressionAttributeValues[':error'] = errorMessage;
  }

  await dynamodb.send(
    new UpdateItemCommand({
      TableName: tableName,
      Key: {
        PK: { S: `DSR#${requestId}` },
        SK: { S: 'META' },
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: marshall(expressionAttributeValues),
    })
  );
}
