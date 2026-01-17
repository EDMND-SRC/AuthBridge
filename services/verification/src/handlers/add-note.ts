import { APIGatewayProxyHandler } from 'aws-lambda';
import { addSecurityHeaders } from '../middleware/security-headers';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'af-south-1' }));

export const handler: APIGatewayProxyHandler = async (event) => {
  const { id: caseId } = event.pathParameters || {};
  const userId = event.requestContext.authorizer?.claims?.sub;
  const userName = event.requestContext.authorizer?.claims?.name || 'Unknown';
  const userRole = event.requestContext.authorizer?.claims?.['custom:role'] || 'analyst';
  const ipAddress = event.requestContext.identity.sourceIp;
  const timestamp = new Date().toISOString();

  if (!caseId) {
    return addSecurityHeaders({
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Case ID required' })
    });
  }

  // Parse request body
  const body = JSON.parse(event.body || '{}');
  const { content } = body;

  // Validate content
  if (!content || !content.trim()) {
    return addSecurityHeaders({
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Note content is required' })
    });
  }

  if (content.length > 2000) {
    return addSecurityHeaders({
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Note content must be 2000 characters or less' })
    });
  }

  const noteId = uuidv4();
  const ttl = Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60); // 90 days

  try {
    // Create immutable note entity
    await ddbClient.send(new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: {
        PK: `CASE#${caseId}`,
        SK: `NOTE#${timestamp}#${noteId}`,
        noteId,
        caseId,
        content: content.trim(),
        author: {
          userId,
          userName,
          role: userRole
        },
        timestamp,
        ipAddress,
        ttl
      }
    }));

    // Create audit log entry
    await ddbClient.send(new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: {
        PK: `CASE#${caseId}`,
        SK: `AUDIT#${timestamp}`,
        action: 'CASE_NOTE_ADDED',
        resourceType: 'CASE',
        resourceId: caseId,
        userId,
        userName,
        ipAddress,
        timestamp,
        details: {
          noteId,
          contentLength: content.length,
          contentPreview: content.substring(0, 100)
        }
      }
    }));

    return addSecurityHeaders({
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          noteId,
          caseId,
          content: content.trim(),
          author: {
            userId,
            userName,
            role: userRole
          },
          timestamp
        },
        meta: {
          requestId: event.requestContext.requestId,
          timestamp
        }
      })
    });
  } catch (error) {
    console.error('Error adding note:', error);
    return addSecurityHeaders({
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' })
    });
  }
};
