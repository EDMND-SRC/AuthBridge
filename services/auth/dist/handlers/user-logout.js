/**
 * User Logout Handler
 *
 * Signs out user globally (invalidates all tokens).
 *
 * POST /auth/logout
 */
import { UserAuthService } from '../services/user-auth.js';
import { AuditService } from '../services/audit.js';
import { logger } from '../utils/logger.js';
const userAuthService = new UserAuthService();
const auditService = new AuditService();
export async function handler(event) {
    const requestId = event.requestContext.requestId;
    try {
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers: corsHeaders(),
                body: JSON.stringify({ error: 'Authorization header required', meta: { requestId } }),
            };
        }
        const accessToken = authHeader.substring(7);
        await userAuthService.signOut(accessToken);
        await auditService.logEvent({
            action: 'LOGOUT',
            status: 'success',
            ipAddress: event.requestContext.identity?.sourceIp,
            userAgent: event.headers['User-Agent'],
        });
        logger.info('User logged out', { requestId });
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                data: { message: 'Logged out successfully' },
                meta: { requestId },
            }),
        };
    }
    catch (error) {
        logger.error('Logout failed', { error, requestId });
        return {
            statusCode: 500,
            headers: corsHeaders(),
            body: JSON.stringify({ error: 'Logout failed', meta: { requestId } }),
        };
    }
}
function corsHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
    };
}
