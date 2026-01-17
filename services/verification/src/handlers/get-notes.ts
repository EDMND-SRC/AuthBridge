import { APIGatewayProxyHandler } from 'aws-lambda';
import { addSecurityHeaders } from '../middleware/security-headers';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'af-south-1' }));

export const handler: APIGatewayProxyHandler = async (event) => {
  const { id: caseId } = event.pathParameters || {};

  if (!caseId) {
    return addSecurityHeaders({
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Case ID required' })
    });
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

    return addSecurityHeaders({
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
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return addSecurityHeaders({
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' })
    });
  }
};
