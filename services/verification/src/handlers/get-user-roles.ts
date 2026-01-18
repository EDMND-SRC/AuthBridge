import middy from '@middy/core';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getUserRoles as fetchUserRoles } from '../services/rbac-enforcer.js';
import { auditContextMiddleware } from '../middleware/audit-context.js';
import { securityHeadersMiddleware } from '../middleware/security-headers.js';
import { requirePermission } from '../middleware/rbac.js';

async function baseHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const { userId } = event.pathParameters || {};

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'userId is required' }),
      };
    }

    // Get user roles from Casbin
    const roles = await fetchUserRoles(userId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        userId,
        roles,
        meta: {
          timestamp: new Date().toISOString(),
        },
      }),
    };
  } catch (error) {
    console.error('Error getting user roles:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get user roles' }),
    };
  }
}

export const handler = middy(baseHandler)
  .use(auditContextMiddleware())
  .use(requirePermission('/api/v1/users/*/roles', 'read'))
  .use(securityHeadersMiddleware());
