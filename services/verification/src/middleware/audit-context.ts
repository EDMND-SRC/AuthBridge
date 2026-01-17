import middy from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

export interface AuditContext {
  userId: string | null;
  clientId: string | null;
  ipAddress: string;
  userAgent: string;
}

export const auditContextMiddleware = (): middy.MiddlewareObj<APIGatewayProxyEvent, any, Error, Context> => ({
  before: async (request) => {
    const event = request.event;

    // Extract IP address (API Gateway provides this)
    const ipAddress =
      event.requestContext?.identity?.sourceIp ||
      event.headers?.['X-Forwarded-For']?.split(',')[0] ||
      event.headers?.['x-forwarded-for']?.split(',')[0] ||
      'unknown';

    // Extract user agent
    const userAgent = event.headers?.['User-Agent'] || event.headers?.['user-agent'] || 'unknown';

    // Extract user ID from JWT token (if authenticated)
    let userId: string | null = null;
    let clientId: string | null = null;

    if (event.requestContext?.authorizer?.claims) {
      userId = event.requestContext.authorizer.claims.sub || null;
      clientId = event.requestContext.authorizer.claims['custom:clientId'] || null;
    }

    // Attach to request context for handlers to use
    (request as any).auditContext = {
      userId,
      clientId,
      ipAddress,
      userAgent,
    } as AuditContext;
  },
});

// Helper to get audit context from request
export function getAuditContext(request: any): AuditContext {
  return request.auditContext || {
    userId: null,
    clientId: null,
    ipAddress: 'unknown',
    userAgent: 'unknown',
  };
}
