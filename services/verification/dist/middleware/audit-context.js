export const auditContextMiddleware = () => ({
    before: async (request) => {
        const event = request.event;
        // Extract IP address (API Gateway provides this)
        const ipAddress = event.requestContext?.identity?.sourceIp ||
            event.headers?.['X-Forwarded-For']?.split(',')[0] ||
            event.headers?.['x-forwarded-for']?.split(',')[0] ||
            'unknown';
        // Extract user agent
        const userAgent = event.headers?.['User-Agent'] || event.headers?.['user-agent'] || 'unknown';
        // Extract user ID from JWT token (if authenticated)
        let userId = null;
        let clientId = null;
        if (event.requestContext?.authorizer?.claims) {
            userId = event.requestContext.authorizer.claims.sub || null;
            clientId = event.requestContext.authorizer.claims['custom:clientId'] || null;
        }
        // Attach to request context for handlers to use
        request.auditContext = {
            userId,
            clientId,
            ipAddress,
            userAgent,
        };
    },
});
// Helper to get audit context from request
export function getAuditContext(request) {
    return request.auditContext || {
        userId: null,
        clientId: null,
        ipAddress: 'unknown',
        userAgent: 'unknown',
    };
}
//# sourceMappingURL=audit-context.js.map