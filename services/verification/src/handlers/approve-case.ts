import middy from '@middy/core';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { addSecurityHeaders } from '../middleware/security-headers';
import { auditContextMiddleware, getAuditContext } from '../middleware/audit-context';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { AuditService } from '../services/audit';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'af-south-1' }));
const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'af-south-1' });
const auditService = new AuditService();

async function baseHandler(event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> {
  const { id } = event.pathParameters || {};
  const userId = event.requestContext.authorizer?.claims?.sub;
  const userName = event.requestContext.authorizer?.claims?.name || 'Unknown';
  const auditContext = getAuditContext(context);
  const timestamp = new Date().toISOString();

  if (!id) {
    return addSecurityHeaders({
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Case ID required' })
    });
  }

  try {
    // Update case status with conditional check
    const updateResult = await ddbClient.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: { PK: `CASE#${id}`, SK: `CASE#${id}` },
      UpdateExpression: 'SET #status = :approved, #updatedAt = :timestamp, #updatedBy = :userId',
      ConditionExpression: '#status IN (:pending, :inReview)',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt',
        '#updatedBy': 'updatedBy'
      },
      ExpressionAttributeValues: {
        ':approved': 'approved',
        ':pending': 'pending',
        ':inReview': 'in-review',
        ':timestamp': timestamp,
        ':userId': userId
      },
      ReturnValues: 'ALL_NEW'
    }));

    // Audit log using AuditService
    await auditService.logCaseApproved(id, userId, auditContext.ipAddress, 'Case approved by analyst');

    // Queue webhook notification
    await sqsClient.send(new SendMessageCommand({
      QueueUrl: process.env.WEBHOOK_QUEUE_URL,
      MessageBody: JSON.stringify({
        event: 'verification.approved',
        caseId: id,
        timestamp,
        userId
      })
    }));

    return addSecurityHeaders({
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          caseId: id,
          status: 'approved',
          updatedAt: timestamp,
          updatedBy: userId
        },
        meta: {
          requestId: event.requestContext.requestId,
          timestamp
        }
      })
    });
  } catch (error: any) {
    if (error.name === 'ConditionalCheckFailedException') {
      // Audit failed approval attempt
      await auditService.logCaseStatusChanged(
        id,
        userId,
        auditContext.ipAddress,
        'unknown',
        'approved-failed'
      ).catch(err => console.error('Failed to log audit event:', err));

      return addSecurityHeaders({
        statusCode: 409,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Case already decided or invalid status' })
      });
    }

    console.error('Error approving case:', error);

    // Audit system error
    await auditService.logSystemError(
      'CASE_APPROVAL_ERROR',
      error.message,
      { caseId: id, userId }
    ).catch(err => console.error('Failed to log audit event:', err));

    return addSecurityHeaders({
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' })
    });
  }
}

export const handler = middy(baseHandler)
  .use(auditContextMiddleware());
