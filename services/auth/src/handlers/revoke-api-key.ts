import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { ApiKeyService } from '../services/api-key.js';
import { handleError, CORS_HEADERS } from '../middleware/error-handler.js';
import { ValidationError, UnauthorizedError } from '../utils/errors.js';
import { auditService } from '../services/audit.js';
import { logger } from '../utils/logger.js';

const apiKeyService = new ApiKeyService();

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const requestId = event.requestContext.requestId || randomUUID();

  try {
    const clientId = event.requestContext.authorizer?.clientId;
    const keyId = event.pathParameters?.keyId;

    if (!clientId) {
      throw new UnauthorizedError('Client ID not found in authorization context');
    }

    if (!keyId) {
      throw new ValidationError('Missing required parameter', [
        { field: 'keyId', message: 'keyId is required in path' },
      ]);
    }

    // Revoke the API key
    await apiKeyService.revokeApiKey(clientId, keyId);

    // Audit log
    await auditService.logApiKeyRevoke(clientId, keyId);

    logger.info('API key revoked', {
      requestId,
      clientId,
      keyId,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
      body: JSON.stringify({
        message: 'API key revoked successfully',
        keyId,
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
