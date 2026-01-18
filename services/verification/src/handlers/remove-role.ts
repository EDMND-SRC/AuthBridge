import middy from '@middy/core';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { removeRole as removeRoleFromUser } from '../services/rbac-enforcer.js';
import { AuditService } from '../services/audit.js';
import { auditContextMiddleware, getAuditContext } from '../middleware/audit-context.js';
import { securityHeadersMiddleware } from '../middleware/security-headers.js';
import { requirePermission } from '../middleware/rbac.js';
import type { RoleName } from '../types/rbac.js';

const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });
const auditService = new AuditService();
const tableName = process.env.TABLE_NAME || 'AuthBridgeTable';

async function baseHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const { userId, role } = event.pathParameters || {};
    const auditContext = getAuditContext(event);

    if (!userId || !role) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'userId and role are required' }),
      };
    }

    // Remove role from Casbin
    await removeRoleFromUser(userId, role as RoleName);

    // Remove role assignment from DynamoDB
    await dynamodb.send(
      new DeleteItemCommand({
        TableName: tableName,
        Key: {
          PK: { S: `USER#${userId}` },
          SK: { S: `ROLE#${role}` },
        },
      })
    );

    // Audit log
    await auditService.logEvent({
      action: 'RBAC_ROLE_REMOVED',
      userId: auditContext.userId || 'system',
      resourceId: userId,
      resourceType: 'user',
      ipAddress: auditContext.ipAddress,
      status: 'success',
      metadata: {
        role,
        targetUserId: userId,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Role removed successfully',
        userId,
        role,
        meta: {
          timestamp: new Date().toISOString(),
        },
      }),
    };
  } catch (error) {
    console.error('Error removing role:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to remove role' }),
    };
  }
}

export const handler = middy(baseHandler)
  .use(auditContextMiddleware())
  .use(requirePermission('/api/v1/users/*/roles/*', 'delete'))
  .use(securityHeadersMiddleware());
