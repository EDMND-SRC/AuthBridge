import middy from '@middy/core';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { assignRole as assignRoleToUser } from '../services/rbac-enforcer.js';
import { AuditService } from '../services/audit.js';
import { auditContextMiddleware, getAuditContext } from '../middleware/audit-context.js';
import { securityHeadersMiddleware } from '../middleware/security-headers.js';
import { requirePermission } from '../middleware/rbac.js';
import type { RoleName, RoleAssignment } from '../types/rbac.js';

const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });
const auditService = new AuditService();
const tableName = process.env.TABLE_NAME || 'AuthBridgeTable';

async function baseHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const { userId } = event.pathParameters || {};
    const body: { role: RoleName; expiresAt?: string } = JSON.parse(event.body || '{}');
    const auditContext = getAuditContext(event);

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'userId is required' }),
      };
    }

    if (!body.role) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'role is required' }),
      };
    }

    // Validate role
    const validRoles: RoleName[] = [
      'admin',
      'compliance_officer',
      'analyst',
      'reviewer',
      'developer',
      'api_user',
      'audit_viewer',
    ];

    if (!validRoles.includes(body.role)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid role',
          validRoles,
        }),
      };
    }

    // Assign role in Casbin
    await assignRoleToUser(userId, body.role);

    // Store role assignment in DynamoDB for audit trail
    const now = new Date().toISOString();
    const roleAssignment: RoleAssignment = {
      PK: `USER#${userId}`,
      SK: `ROLE#${body.role}`,
      userId,
      role: body.role,
      assignedBy: auditContext.userId || 'system',
      assignedAt: now,
      expiresAt: body.expiresAt,
    };

    await dynamodb.send(
      new PutItemCommand({
        TableName: tableName,
        Item: marshall(roleAssignment, { removeUndefinedValues: true }),
      })
    );

    // Audit log
    await auditService.logEvent({
      action: 'RBAC_ROLE_ASSIGNED',
      userId: auditContext.userId || 'system',
      resourceId: userId,
      resourceType: 'user',
      ipAddress: auditContext.ipAddress,
      status: 'success',
      metadata: {
        role: body.role,
        targetUserId: userId,
        expiresAt: body.expiresAt,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Role assigned successfully',
        userId,
        role: body.role,
        assignedAt: now,
        meta: {
          timestamp: now,
        },
      }),
    };
  } catch (error) {
    console.error('Error assigning role:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to assign role' }),
    };
  }
}

export const handler = middy(baseHandler)
  .use(auditContextMiddleware())
  .use(requirePermission('/api/v1/users/*/roles', 'create'))
  .use(securityHeadersMiddleware());
