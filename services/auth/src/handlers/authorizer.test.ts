import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './authorizer.js';
import type { APIGatewayTokenAuthorizerEvent } from 'aws-lambda';

// Mock environment variables
process.env.COGNITO_USER_POOL_ID = 'test-pool';
process.env.COGNITO_CLIENT_ID = 'test-client';
process.env.AWS_REGION = 'af-south-1';
process.env.JWT_SECRET = 'test-secret';

describe('Lambda Authorizer', () => {
  const mockEvent: APIGatewayTokenAuthorizerEvent = {
    type: 'TOKEN',
    methodArn: 'arn:aws:execute-api:af-south-1:123456789012:api-id/stage/GET/resource',
    authorizationToken: '',
  };

  it('should return Allow policy for valid token', async () => {
    // Generate a valid token
    const { CognitoService } = await import('../services/cognito.js');
    const cognitoService = new CognitoService({
      userPoolId: 'test-pool',
      clientId: 'test-client',
      region: 'af-south-1',
    });

    const token = await cognitoService.generateToken('user_123', 'client_456');

    const event = {
      ...mockEvent,
      authorizationToken: `Bearer ${token}`,
    };

    const result = await handler(event);

    expect(result.principalId).toBe('user_123');
    expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
    expect(result.context?.userId).toBe('user_123');
    expect(result.context?.clientId).toBe('client_456');
  });

  it('should throw Unauthorized for missing token', async () => {
    const event = {
      ...mockEvent,
      authorizationToken: '',
    };

    await expect(handler(event)).rejects.toThrow('Unauthorized');
  });

  it('should throw Unauthorized for invalid token', async () => {
    const event = {
      ...mockEvent,
      authorizationToken: 'Bearer invalid.token.here',
    };

    await expect(handler(event)).rejects.toThrow('Unauthorized');
  });

  it('should throw Unauthorized for expired token', async () => {
    const { CognitoService } = await import('../services/cognito.js');
    const cognitoService = new CognitoService({
      userPoolId: 'test-pool',
      clientId: 'test-client',
      region: 'af-south-1',
    });

    const expiredToken = await cognitoService.generateToken('user_123', 'client_456', -1);

    const event = {
      ...mockEvent,
      authorizationToken: `Bearer ${expiredToken}`,
    };

    await expect(handler(event)).rejects.toThrow('Unauthorized');
  });
});
