import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { SessionService } from '../services/session.js';
import { handleError, CORS_HEADERS } from '../middleware/error-handler.js';
import { AuthError } from '../utils/errors.js';
import { auditService } from '../services/audit.js';
import { logger } from '../utils/logger.js';

const sessionService = new SessionService();

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const requestId = event.requestContext.requestId || randomUUID();

  try {
    const sessionId = event.pathParameters?.sessionId;

    if (!sessionId) {
      throw new AuthError('INVALID_REQUEST', 'Session ID is required', 400);
    }

    const result = await sessionService.validateSession(sessionId);

    if (!result.valid) {
      await auditService.logSessionValidate(sessionId, false, undefined, result.error);
      throw new AuthError('SESSION_INVALID', result.error || 'Session is invalid', 401);
    }

    await auditService.logSessionValidate(sessionId, true, result.session?.userId);

    logger.info('Session validated', {
      requestId,
      sessionId,
      userId: result.session?.userId,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
      body: JSON.stringify({
        session: result.session,
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      }),
    };
  } catch (error) {
    return handleError(error, requestId);
  }
}
