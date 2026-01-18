import middy from '@middy/core';
import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { auditContextMiddleware } from '../middleware/audit-context';
import { securityHeadersMiddleware } from '../middleware/security-headers';
import { requirePermission } from '../middleware/rbac';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'af-south-1' }));

async function baseHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { id: caseId } = event.pathParameters || {};

  if (!caseId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Case ID required' })
    };
  }

  try {
    // Query all notes for this case
    const result = await ddbClient.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `CASE#${caseId}`,
        ':sk': 'NOTE#'
      },
      ScanIndexForward: false // Sort descending (newest first)
    }));

    const notes = (result.Items || []).map(item => ({
      noteId: item.noteId,
      caseId: item.caseId,
      content: item.content,
      author: item.author,
      timestamp: item.timestamp
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: notes,
        meta: {
          requestId: event.requestContext.requestId,
          timestamp: new Date().toISOString(),
          count: notes.length
        }
      })
    };
  } catch (error) {
    console.error('Error fetching notes:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}

export const handler = middy(baseHandler)
  .use(auditContextMiddleware())
  .use(requirePermission('/api/v1/cases/*/notes', 'read'))
  .use(securityHeadersMiddleware());
