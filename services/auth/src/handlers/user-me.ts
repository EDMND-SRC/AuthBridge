/**
 * User Me Handler
 *
 * Returns current authenticated user's information.
 *
 * GET /auth/me
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UserAuthService } from '../services/user-auth.js';
import { logger } from '../utils/logger.js';

const userAuthService = new UserAuthService();

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
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
    const user = await userAuthService.getUserInfo(accessToken);

    logger.info('User info retrieved', { userId: user.userId, requestId });

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        data: {
          id: user.userId,
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        },
        meta: { requestId },
      }),
    };
  } catch (error: any) {
    logger.error('Get user info failed', { error, requestId });

    const statusCode = error.name === 'NotAuthorizedException' ? 401 : 500;

    return {
      statusCode,
      headers: corsHeaders(),
      body: JSON.stringify({
        error: statusCode === 401 ? 'Invalid or expired token' : 'Failed to get user info',
        meta: { requestId },
      }),
    };
  }
}

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
  };
}
