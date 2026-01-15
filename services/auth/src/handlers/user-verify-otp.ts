/**
 * User Verify OTP Handler
 *
 * Verifies OTP and completes authentication for Backoffice users.
 * Returns JWT tokens on successful verification.
 *
 * POST /auth/verify-otp
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import { UserAuthService } from '../services/user-auth.js';
import { AuditService } from '../services/audit.js';
import { logger } from '../utils/logger.js';

// Request validation schema
const verifyOtpRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  session: z.string().min(1, 'Session is required'),
});

// Initialize services
const userAuthService = new UserAuthService();
const auditService = new AuditService();

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
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
    const validation = verifyOtpRequestSchema.safeParse(body);

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

    const { email, otp, session } = validation.data;

    // Verify OTP
    const result = await userAuthService.verifyOtp(email, otp, session);

    // Audit log
    await auditService.logEvent({
      action: 'LOGIN',
      resourceType: 'user',
      resourceId: result.user.userId,
      userId: result.user.userId,
      status: 'success',
      ipAddress: event.requestContext.identity?.sourceIp,
      userAgent: event.headers['User-Agent'],
      metadata: {
        email: maskEmail(email),
        role: result.user.role,
      },
    });

    logger.info('Login successful', {
      userId: result.user.userId,
      email: maskEmail(email),
      requestId,
    });

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        data: {
          user: {
            id: result.user.userId,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role,
          },
          tokens: {
            accessToken: result.tokens.accessToken,
            idToken: result.tokens.idToken,
            refreshToken: result.tokens.refreshToken,
            expiresIn: result.tokens.expiresIn,
          },
        },
        meta: { requestId },
      }),
    };
  } catch (error: any) {
    logger.error('OTP verification failed', { error, requestId });

    // Audit failed attempt
    try {
      const body = JSON.parse(event.body || '{}');
      await auditService.logEvent({
        action: 'LOGIN',
        resourceType: 'user',
        resourceId: body.email || 'unknown',
        status: 'failure',
        errorCode: error.name || 'UNKNOWN_ERROR',
        ipAddress: event.requestContext.identity?.sourceIp,
        userAgent: event.headers['User-Agent'],
        metadata: {
          error: error.message,
        },
      });
    } catch {
      // Ignore audit errors
    }

    const statusCode = error.name === 'CodeMismatchException' ? 400 : 401;
    const message = error.name === 'CodeMismatchException'
      ? 'Invalid verification code'
      : error.name === 'ExpiredCodeException'
        ? 'Verification code expired'
        : 'Authentication failed';

    return {
      statusCode,
      headers: corsHeaders(),
      body: JSON.stringify({
        error: message,
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

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const maskedLocal = local.length > 2
    ? `${local[0]}***${local[local.length - 1]}`
    : '***';
  return `${maskedLocal}@${domain}`;
}
