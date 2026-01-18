import middy from '@middy/core';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { checkPermission, getUserRoles } from '../services/rbac-enforcer.js';
import { AuditService } from '../services/audit.js';
import { getAuditContext } from './audit-context.js';
import type { CasbinAction } from '../types/rbac.js';

const auditService = new AuditService();

/**
 * Custom error for forbidden access
 */
export class ForbiddenError extends Error {
  statusCode: number;
  details?: Record<string, any>;

  constructor(message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
    this.details = details;
  }
}

/**
 * Middleware to check RBAC permissions
 *
 * Usage:
 * ```typescript
 * export const handler = middy(baseHandler)
 *   .use(auditContextMiddleware())
 *   .use(requirePermission('/api/v1/cases/*', 'read'))
 *   .use(securityHeadersMiddleware());
 * ```
 */
export function requirePermission(resource: string, action: CasbinAction) {
  const middleware: middy.MiddlewareObj<APIGatewayProxyEvent, APIGatewayProxyResult> = {
    before: async request => {
      const event = request.event;
      const auditContext = getAuditContext(event);

      // Extract userId from request context (set by auth middleware)
      const userId =
        event.requestContext.authorizer?.userId || event.requestContext.authorizer?.principalId;

      if (!userId) {
        throw new ForbiddenError('User not authenticated', {
          resource,
          action,
        });
      }

      // Replace path parameters in resource pattern
      const actualResource = replacePathParameters(resource, event.pathParameters || {});

      // Check permission
      const result = await checkPermission(userId, actualResource, action);

      if (!result.allowed) {
        // Audit log - permission denied
        await auditService.logEvent({
          action: 'RBAC_PERMISSION_DENIED',
          userId: auditContext.userId || userId,
          resourceId: actualResource,
          resourceType: 'api_endpoint',
          ipAddress: auditContext.ipAddress,
          status: 'failure',
          errorCode: 'FORBIDDEN',
          metadata: {
            resource: actualResource,
            action,
            roles: result.roles,
          },
        });

        throw new ForbiddenError(`Permission denied: ${action} on ${actualResource}`, {
          userId,
          resource: actualResource,
          action,
          roles: result.roles,
        });
      }

      // Audit log - permission granted
      await auditService.logEvent({
        action: 'RBAC_PERMISSION_GRANTED',
        userId: auditContext.userId || userId,
        resourceId: actualResource,
        resourceType: 'api_endpoint',
        ipAddress: auditContext.ipAddress,
        status: 'success',
        metadata: {
          resource: actualResource,
          action,
          roles: result.roles,
        },
      });

      // Store permission check result in request context for handler use
      (request.event as any).permissionCheck = result;
    },

    onError: async request => {
      // Handle ForbiddenError
      if (request.error instanceof ForbiddenError) {
        request.response = {
          statusCode: 403,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            error: request.error.message,
            details: request.error.details,
            meta: {
              timestamp: new Date().toISOString(),
            },
          }),
        };
      }
    },
  };

  return middleware;
}

/**
 * Replace path parameters in resource pattern
 *
 * Example:
 * - resource: /api/v1/cases/{caseId}
 * - pathParameters: { caseId: 'case_abc123' }
 * - result: /api/v1/cases/case_abc123
 */
function replacePathParameters(
  resource: string,
  pathParameters: Record<string, string | undefined>
): string {
  let result = resource;

  for (const [key, value] of Object.entries(pathParameters)) {
    if (value) {
      result = result.replace(`{${key}}`, value);
    }
  }

  return result;
}

/**
 * Middleware to check if user has admin role
 * Shorthand for requirePermission with admin-only resources
 */
export function requireAdmin() {
  return requirePermission('/admin/*', 'read');
}

/**
 * Middleware to filter resources by clientId for api_user role
 * Ensures api_user can only access their own client's data
 */
export function enforceClientIsolation() {
  const middleware: middy.MiddlewareObj<APIGatewayProxyEvent, APIGatewayProxyResult> = {
    before: async request => {
      const event = request.event;
      const userId = event.requestContext.authorizer?.userId;
      const clientId = event.requestContext.authorizer?.clientId;

      if (!userId || !clientId) {
        return; // Skip if not authenticated
      }

      // Get user roles (imported at module level to avoid dynamic import)
      const roles = await getUserRoles(userId);

      // If user is api_user, enforce client isolation
      if (roles.includes('api_user')) {
        // Store clientId filter in request context
        (request.event as any).clientIdFilter = clientId;
      }
    },
  };

  return middleware;
}
