import middy from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
export interface AuditContext {
    userId: string | null;
    clientId: string | null;
    ipAddress: string;
    userAgent: string;
}
export declare const auditContextMiddleware: () => middy.MiddlewareObj<APIGatewayProxyEvent, any, Error, Context>;
export declare function getAuditContext(request: any): AuditContext;
//# sourceMappingURL=audit-context.d.ts.map