import middy from '@middy/core';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { addSecurityHeaders } from '../middleware/security-headers';
import { auditContextMiddleware, getAuditContext } from '../middleware/audit-context';
import { requirePermission } from '../middleware/rbac.js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { AuditService } from '../services/audit';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'af-south-1' }));
const auditService = new AuditService();

async function baseHandler(event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> {
  const { id: caseId } = event.pathParameters || {};
  const userId = event.requestContext.authorizer?.claims?.sub;
  const userName = event.requestContext.authorizer?.claims?.name || 'Unknown';
  const userRole = event.requestContext.authorizer?.claims?.['custom:role'] || 'analyst';
  const auditContext = getAuditContext(context);
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
        ipAddress: auditContext.ipAddress,
        ttl
      }
    }));

    // Audit log using AuditService
    await auditService.logCaseNoteAdded(caseId, userId, auditContext.ipAddress, noteId);

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

    // Audit system error
    await auditService.logSystemError(
      'NOTE_CREATION_ERROR',
      (error as Error).message,
      { caseId, userId }
    ).catch(err => console.error('Failed to log audit event:', err));

    return addSecurityHeaders({
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' })
    });
  }
}

export const handler = middy(baseHandler)
  .use(auditContextMiddleware())
  .use(requirePermission('/api/v1/cases/*/notes', 'create'));
