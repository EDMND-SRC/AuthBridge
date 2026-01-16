import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { ApiKeyService } from '../services/api-key.js';
import { handleError, CORS_HEADERS } from '../middleware/error-handler.js';
import { ValidationError, UnauthorizedError, NotFoundError } from '../utils/errors.js';
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

    // Rotate the API key
    const result = await apiKeyService.rotateApiKey(clientId, keyId);

    if (!result) {
      throw new NotFoundError('API key not found');
    }

    // Audit log
    await auditService.logApiKeyRotate(clientId, keyId, result.apiKey.keyId);

    logger.info('API key rotated', {
      requestId,
      clientId,
      oldKeyId: keyId,
      newKeyId: result.apiKey.keyId,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
      body: JSON.stringify({
        keyId: result.apiKey.keyId,
        apiKey: result.plainTextKey, // Only returned once on creation!
        name: result.apiKey.name,
        scopes: result.apiKey.scopes,
        rateLimit: result.apiKey.rateLimit,
        expiresAt: result.apiKey.expiresAt,
        createdAt: result.apiKey.createdAt,
        warning: 'Store this API key securely. It cannot be retrieved again.',
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
