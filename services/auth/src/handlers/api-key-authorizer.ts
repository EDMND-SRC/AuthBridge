import type { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
import { ApiKeyService } from '../services/api-key.js';

const apiKeyService = new ApiKeyService();

export async function handler(
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> {
  const token = event.authorizationToken?.replace('Bearer ', '');

  if (!token) {
    throw new Error('Unauthorized');
  }

  // Validate API key (clientId is '*' to search all clients)
  const validation = await apiKeyService.validateApiKey(token, '*');

  if (!validation.valid || !validation.apiKey) {
    throw new Error('Unauthorized');
  }

  // Return IAM policy allowing access
  return {
    principalId: validation.apiKey.clientId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: event.methodArn,
        },
      ],
    },
    context: {
      clientId: validation.apiKey.clientId,
      keyId: validation.apiKey.keyId,
      scopes: validation.apiKey.scopes.join(','),
      rateLimit: String(validation.apiKey.rateLimit),
    },
  };
}
