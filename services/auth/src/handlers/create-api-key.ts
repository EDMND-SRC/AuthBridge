import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { ApiKeyService } from '../services/api-key.js';
import { handleError } from '../middleware/error-handler.js';
import { ValidationError } from '../utils/errors.js';
import { auditService } from '../services/audit.js';
import { logger } from '../utils/logger.js';

const apiKeyService = new ApiKeyService();

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const requestId = event.requestContext.requestId || randomUUID();

  try {
    const body = JSON.parse(event.body || '{}');

    // Validate input
    if (!body.clientId || !body.name) {
      throw new ValidationError('Missing required fields', [
        ...(!body.clientId ? [{ field: 'clientId', message: 'clientId is required' }] : []),
        ...(!body.name ? [{ field: 'name', message: 'name is required' }] : []),
      ]);
    }

    // Create API key
    const { apiKey, plainTextKey } = await apiKeyService.createApiKey({
      clientId: body.clientId,
      name: body.name,
      scopes: body.scopes,
      rateLimit: body.rateLimit,
      expiresInDays: body.expiresInDays,
    });

    // Audit log
    await auditService.logApiKeyCreate(body.clientId, apiKey.keyId, body.name);

    logger.info('API key created', {
      requestId,
      clientId: body.clientId,
      keyId: apiKey.keyId,
      name: body.name,
    });

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keyId: apiKey.keyId,
        apiKey: plainTextKey, // Only returned once on creation!
        name: apiKey.name,
        scopes: apiKey.scopes,
        rateLimit: apiKey.rateLimit,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
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
