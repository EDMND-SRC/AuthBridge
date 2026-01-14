import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { SessionService } from '../services/session.js';
import { CognitoService } from '../services/cognito.js';
import { handleError, CORS_HEADERS } from '../middleware/error-handler.js';
import { ValidationError } from '../utils/errors.js';
import { auditService } from '../services/audit.js';
import { logger } from '../utils/logger.js';
import type { CognitoConfig } from '../types/auth.js';

const sessionService = new SessionService();

const cognitoConfig: CognitoConfig = {
  userPoolId: process.env.COGNITO_USER_POOL_ID || '',
  clientId: process.env.COGNITO_CLIENT_ID || '',
  region: process.env.AWS_REGION || 'af-south-1',
};

const cognitoService = new CognitoService(cognitoConfig);

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const requestId = event.requestContext.requestId || randomUUID();

  try {
    const body = JSON.parse(event.body || '{}');

    // Validate input
    if (!body.userId || !body.clientId) {
      throw new ValidationError('Missing required fields', [
        { field: 'userId', message: 'userId is required' },
        { field: 'clientId', message: 'clientId is required' },
      ]);
    }

    // Create session
    const session = await sessionService.createSession({
      userId: body.userId,
      clientId: body.clientId,
      ipAddress: event.requestContext.identity?.sourceIp || 'unknown',
      userAgent: event.headers['User-Agent'] || 'unknown',
      deviceType: body.deviceType || 'unknown',
    });

    // Generate JWT token
    const token = await cognitoService.generateToken(body.userId, body.clientId);

    // Audit log
    await auditService.logSessionCreate(
      body.userId,
      body.clientId,
      session.sessionId,
      event.requestContext.identity?.sourceIp,
      event.headers['User-Agent']
    );

    logger.info('Session created', {
      requestId,
      sessionId: session.sessionId,
      userId: body.userId,
      clientId: body.clientId,
    });

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
      body: JSON.stringify({
        sessionId: session.sessionId,
        token,
        expiresAt: session.expiresAt,
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
