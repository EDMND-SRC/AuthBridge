import middy from '@middy/core';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { auditContextMiddleware } from '../middleware/audit-context';
import { securityHeadersMiddleware } from '../middleware/security-headers';
import { requirePermission } from '../middleware/rbac.js';

const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });
const tableName = process.env.TABLE_NAME || 'AuthBridgeTable';

/**
 * Retrieves the status of a data export or deletion request.
 * Returns download URL for completed exports, scheduled deletion date for deletions.
 * @param event - API Gateway event with requestId in path parameters
 * @returns 200 OK with request status and relevant details
 */
async function baseHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const { requestId } = event.pathParameters || {};

    if (!requestId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'requestId is required' }),
      };
    }

    // Validate requestId format
    if (!requestId.startsWith('dsr_')) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid requestId format. Must start with dsr_' }),
      };
    }

    // Get data request from DynamoDB
    const response = await dynamodb.send(
      new GetItemCommand({
        TableName: tableName,
        Key: {
          PK: { S: `DSR#${requestId}` },
          SK: { S: 'META' },
        },
      })
    );

    if (!response.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Data request not found' }),
      };
    }

    const dataRequest = unmarshall(response.Item);

    // Build response based on type and status
    const responseBody: any = {
      requestId: dataRequest.requestId,
      type: dataRequest.type,
      status: dataRequest.status,
      createdAt: dataRequest.createdAt,
      meta: {
        requestId: dataRequest.requestId,
        timestamp: new Date().toISOString(),
      },
    };

    if (dataRequest.type === 'export' && dataRequest.status === 'completed') {
      responseBody.downloadUrl = dataRequest.exportUrl;
      responseBody.downloadExpiresAt = dataRequest.exportExpiresAt;
      responseBody.completedAt = dataRequest.completedAt;
    }

    if (dataRequest.type === 'deletion') {
      responseBody.scheduledDeletionDate = dataRequest.scheduledDeletionDate;
      if (dataRequest.status === 'completed') {
        responseBody.completedAt = dataRequest.completedAt;
      }
    }

    if (dataRequest.status === 'failed') {
      responseBody.errorMessage = dataRequest.errorMessage;
    }

    return {
      statusCode: 200,
      body: JSON.stringify(responseBody),
    };
  } catch (error) {
    console.error('Error getting data request status:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get data request status' }),
    };
  }
}

export const handler = middy(baseHandler)
  .use(auditContextMiddleware())
  .use(requirePermission('/api/v1/data-requests/*', 'read'))
  .use(securityHeadersMiddleware());
