/**
 * User Login Handler
 *
 * Initiates passwordless authentication for Backoffice users.
 * Sends OTP to user's email via AWS Cognito.
 *
 * POST /auth/login
 */
import { z } from 'zod';
import { UserAuthService } from '../services/user-auth.js';
import { AuditService } from '../services/audit.js';
import { logger } from '../utils/logger.js';
// Request validation schema
const loginRequestSchema = z.object({
    email: z.string().email('Invalid email format'),
});
// Initialize services
const userAuthService = new UserAuthService();
const auditService = new AuditService();
export async function handler(event) {
    const requestId = event.requestContext.requestId;
    try {
        // Parse and validate request body
        if (!event.body) {
            return {
                statusCode: 400,
                headers: corsHeaders(),
                body: JSON.stringify({
                    error: 'Request body is required',
                    meta: { requestId },
                }),
            };
        }
        const body = JSON.parse(event.body);
        const validation = loginRequestSchema.safeParse(body);
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
        const { email } = validation.data;
        // Block free email domains for Backoffice
        if (isFreeEmailDomain(email)) {
            logger.warn('Free email domain blocked', { email: maskEmail(email) });
            return {
                statusCode: 400,
                headers: corsHeaders(),
                body: JSON.stringify({
                    error: 'Please use a work email address',
                    meta: { requestId },
                }),
            };
        }
        // Initiate authentication
        const result = await userAuthService.initiateAuth(email);
        // Audit log
        await auditService.logEvent({
            action: 'LOGIN',
            resourceType: 'user',
            resourceId: email,
            status: 'success',
            ipAddress: event.requestContext.identity?.sourceIp,
            userAgent: event.headers['User-Agent'],
            metadata: {
                challengeName: result.challengeName,
                stage: 'initiated',
            },
        });
        logger.info('Login initiated', { email: maskEmail(email), requestId });
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                data: {
                    session: result.session,
                    challengeName: result.challengeName,
                    message: 'Verification code sent to your email',
                },
                meta: { requestId },
            }),
        };
    }
    catch (error) {
        logger.error('Login failed', { error, requestId });
        // Don't reveal if user exists or not
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                data: {
                    message: 'If the email exists, a verification code has been sent',
                },
                meta: { requestId },
            }),
        };
    }
}
// Helper functions
function corsHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
    };
}
function maskEmail(email) {
    const [local, domain] = email.split('@');
    if (!domain)
        return '***';
    const maskedLocal = local.length > 2
        ? `${local[0]}***${local[local.length - 1]}`
        : '***';
    return `${maskedLocal}@${domain}`;
}
function isFreeEmailDomain(email) {
    const freeEmailDomains = [
        'gmail.com',
        'yahoo.com',
        'hotmail.com',
        'outlook.com',
        'aol.com',
        'icloud.com',
        'mail.com',
        'protonmail.com',
        'zoho.com',
    ];
    const domain = email.split('@')[1]?.toLowerCase();
    return freeEmailDomains.includes(domain);
}
