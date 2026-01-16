/**
 * User Refresh Token Handler
 *
 * Refreshes access tokens using refresh token.
 *
 * POST /auth/refresh
 */
import { z } from 'zod';
import { UserAuthService } from '../services/user-auth.js';
import { AuditService } from '../services/audit.js';
import { logger } from '../utils/logger.js';
const refreshRequestSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});
const userAuthService = new UserAuthService();
const auditService = new AuditService();
export async function handler(event) {
    const requestId = event.requestContext.requestId;
    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers: corsHeaders(),
                body: JSON.stringify({ error: 'Request body is required', meta: { requestId } }),
            };
        }
        const body = JSON.parse(event.body);
        const validation = refreshRequestSchema.safeParse(body);
        if (!validation.success) {
            return {
                statusCode: 400,
                headers: corsHeaders(),
                body: JSON.stringify({
                    error: 'Validation failed',
                    details: validation.error.errors,
                    meta: { requestId },
                }),
            };
        }
        const { refreshToken } = validation.data;
        const tokens = await userAuthService.refreshTokens(refreshToken);
        await auditService.logEvent({
            action: 'TOKEN_REFRESH',
            status: 'success',
            ipAddress: event.requestContext.identity?.sourceIp,
            userAgent: event.headers['User-Agent'],
        });
        logger.info('Token refreshed', { requestId });
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                data: {
                    accessToken: tokens.accessToken,
                    idToken: tokens.idToken,
                    expiresIn: tokens.expiresIn,
                },
                meta: { requestId },
            }),
        };
    }
    catch (error) {
        logger.error('Token refresh failed', { error, requestId });
        await auditService.logEvent({
            action: 'TOKEN_REFRESH',
            status: 'failure',
            errorCode: error.name || 'UNKNOWN_ERROR',
            ipAddress: event.requestContext.identity?.sourceIp,
        }).catch(() => { });
        return {
            statusCode: 401,
            headers: corsHeaders(),
            body: JSON.stringify({ error: 'Token refresh failed', meta: { requestId } }),
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
