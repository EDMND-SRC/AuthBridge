import type { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
import { CognitoService } from '../services/cognito.js';
import type { CognitoConfig } from '../types/auth.js';

const cognitoConfig: CognitoConfig = {
  userPoolId: process.env.COGNITO_USER_POOL_ID || '',
  clientId: process.env.COGNITO_CLIENT_ID || '',
  region: process.env.AWS_REGION || 'af-south-1',
};

const cognitoService = new CognitoService(cognitoConfig);

export async function handler(
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> {
  const token = event.authorizationToken?.replace('Bearer ', '');

  if (!token) {
    throw new Error('Unauthorized');
  }

  const validation = await cognitoService.validateToken(token);

  if (!validation.valid || !validation.payload) {
    throw new Error('Unauthorized');
  }

  const { endUserId, clientId } = validation.payload;

  return {
    principalId: endUserId,
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
      userId: endUserId,
      clientId,
    },
  };
}
