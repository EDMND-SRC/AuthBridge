import middy from '@middy/core';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { marshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';
import { auditContextMiddleware, getAuditContext } from '../middleware/audit-context';
import { securityHeadersMiddleware } from '../middleware/security-headers';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import { requirePermission } from '../middleware/rbac.js';
import { AuditService } from '../services/audit';
import type { CreateDataRequestInput, DataRequestEntity } from '../types/data-request';

/** Data request TTL in days (90 days) */
const DATA_REQUEST_TTL_DAYS = 90;

/** Hard delete delay in days after soft delete */
const HARD_DELETE_DELAY_DAYS = 30;

/** Export SLA in minutes */
const EXPORT_SLA_MINUTES = 5;

const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });
const lambda = new LambdaClient({ region: process.env.AWS_REGION });
const auditService = new AuditService();
const tableName = process.env.TABLE_NAME || 'AuthBridgeTable';

/**
 * Creates a data export or deletion request.
 * Validates input, stores request in DynamoDB, and invokes background worker.
 * @param event - API Gateway event with type in request body
 * @returns 202 Accepted with request ID and estimated completion time
 */
async function baseHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body: CreateDataRequestInput = JSON.parse(event.body || '{}');
    const auditContext = getAuditContext(event);
    const { type } = body;

    // Validate request type
    if (type !== 'export' && type !== 'deletion') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid request type. Must be "export" or "deletion"' }),
      };
    }

    // Validate subject identifier
    if (!body.subjectIdentifier || !body.subjectIdentifier.type || !body.subjectIdentifier.value) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'subjectIdentifier is required with type and value' }),
      };
    }

    // Validate subject identifier type
    const validTypes = ['email', 'omangNumber', 'verificationId'];
    if (!validTypes.includes(body.subjectIdentifier.type)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: `Invalid subject identifier type. Must be one of: ${validTypes.join(', ')}`
        }),
      };
    }

    // For deletion, require confirmation
    if (type === 'deletion' && !body.confirmDeletion) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'confirmDeletion must be true for deletion requests' }),
      };
    }

    // Create data request entity
    const requestId = `dsr_${randomUUID()}`;
    const now = new Date().toISOString();
    const ttl = Math.floor(Date.now() / 1000) + (DATA_REQUEST_TTL_DAYS * 24 * 60 * 60);

    const dataRequest: DataRequestEntity = {
      PK: `DSR#${requestId}`,
      SK: 'META',
      GSI1PK: `SUBJECT#${body.subjectIdentifier.value}`,
      GSI1SK: `${now}#${requestId}`,
      requestId,
      type,
      status: 'pending',
      subjectIdentifier: body.subjectIdentifier,
      requestedBy: auditContext.clientId || auditContext.userId || 'system',
      reason: body.reason,
      createdAt: now,
      updatedAt: now,
      ttl,
    };

    // Add scheduled deletion date for deletion requests
    if (type === 'deletion') {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + HARD_DELETE_DELAY_DAYS);
      dataRequest.scheduledDeletionDate = scheduledDate.toISOString();
    }

    // Save to DynamoDB
    await dynamodb.send(
      new PutItemCommand({
        TableName: tableName,
        Item: marshall(dataRequest, { removeUndefinedValues: true }),
      })
    );

    // Invoke background worker asynchronously
    const workerFunction = type === 'export' ? 'processExport' : 'processDeletion';
    const functionName = process.env[`${workerFunction.toUpperCase()}_FUNCTION_NAME`] ||
      `authbridge-verification-${process.env.STAGE}-${workerFunction}`;

    await lambda.send(
      new InvokeCommand({
        FunctionName: functionName,
        InvocationType: 'Event', // Async invoke
        Payload: JSON.stringify({ requestId }),
      })
    );

    // Audit log
    await auditService.logEvent({
      action: type === 'export' ? 'DATA_EXPORT_REQUESTED' : 'DATA_DELETION_REQUESTED',
      userId: auditContext.userId,
      resourceId: requestId,
      resourceType: 'data_request',
      ipAddress: auditContext.ipAddress,
      status: 'success',
      metadata: {
        subjectIdentifier: body.subjectIdentifier,
        reason: body.reason,
      },
    });

    return {
      statusCode: 202, // Accepted
      body: JSON.stringify({
        requestId,
        type,
        status: 'processing',
        estimatedCompletionTime: type === 'export'
          ? new Date(Date.now() + EXPORT_SLA_MINUTES * 60 * 1000).toISOString()
          : dataRequest.scheduledDeletionDate,
        meta: {
          requestId,
          timestamp: now,
        },
      }),
    };
  } catch (error) {
    console.error('Error creating data request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create data request' }),
    };
  }
}

export const handler = middy(baseHandler)
  .use(rateLimitMiddleware({ maxRequests: 10, windowHours: 1 })) // 10 requests/hour per client
  .use(auditContextMiddleware())
  .use(requirePermission('/api/v1/data-requests/*', 'create'))
  .use(securityHeadersMiddleware());
