import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { ApiKeyService } from '../services/api-key.js';
import { handleError, CORS_HEADERS } from '../middleware/error-handler.js';
import { UnauthorizedError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const apiKeyService = new ApiKeyService();

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const requestId = event.requestContext.requestId || randomUUID();

  try {
    const clientId = event.requestContext.authorizer?.clientId;

    if (!clientId) {
      throw new UnauthorizedError('Client ID not found in authorization context');
    }

    // Get all API keys for the client
    const keys = await apiKeyService.getClientApiKeys(clientId);

    // Remove sensitive fields before returning
    const sanitizedKeys = keys.map(key => ({
      keyId: key.keyId,
      name: key.name,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
      lastUsed: key.lastUsed,
      status: key.status,
      scopes: key.scopes,
      rateLimit: key.rateLimit,
    }));

    logger.info('API keys listed', {
      requestId,
      clientId,
      count: sanitizedKeys.length,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
      body: JSON.stringify({
        keys: sanitizedKeys,
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
