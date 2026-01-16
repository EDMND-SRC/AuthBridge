import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ApiKeyService } from '../../src/services/api-key.js';
import { handler as createHandler } from '../../src/handlers/create-api-key.js';
import { handler as listHandler } from '../../src/handlers/list-api-keys.js';
import { handler as revokeHandler } from '../../src/handlers/revoke-api-key.js';
import { handler as rotateHandler } from '../../src/handlers/rotate-api-key.js';
import { handler as authorizerHandler } from '../../src/handlers/api-key-authorizer.js';
import type { APIGatewayProxyEvent, APIGatewayTokenAuthorizerEvent } from 'aws-lambda';

const dynamoClient = new DynamoDBClient({
  region: 'af-south-1',
  endpoint: 'http://localhost:8000',
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TEST_CLIENT_ID = 'test-client-integration';
const TEST_TABLE = 'AuthBridgeTable';

describe('API Key Flow Integration Tests', () => {
  let createdKeyId: string;
  let createdApiKey: string;

  afterAll(async () => {
    // Cleanup: Delete test API keys
    if (createdKeyId) {
      await docClient.send(
        new DeleteCommand({
          TableName: TEST_TABLE,
          Key: {
            PK: `APIKEY#${TEST_CLIENT_ID}`,
            SK: `KEY#${createdKeyId}`,
          },
        })
      );
    }
  });

  it('should create an API key', async () => {
    const event = {
      requestContext: {
        requestId: 'test-request-1',
        authorizer: {
          clientId: TEST_CLIENT_ID,
        },
      },
      body: JSON.stringify({
        clientId: TEST_CLIENT_ID,
        name: 'Integration Test Key',
        scopes: ['read', 'write'],
        rateLimit: 50,
      }),
    } as unknown as APIGatewayProxyEvent;

    const result = await createHandler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.keyId).toBeDefined();
    expect(body.apiKey).toMatch(/^ab_(live|test)_[a-f0-9]{32}$/);
    expect(body.name).toBe('Integration Test Key');
    expect(body.scopes).toEqual(['read', 'write']);
    expect(body.rateLimit).toBe(50);

    // Store for subsequent tests
    createdKeyId = body.keyId;
    createdApiKey = body.apiKey;
  });

  it('should validate the created API key via authorizer', async () => {
    const event = {
      type: 'TOKEN',
      methodArn: 'arn:aws:execute-api:af-south-1:123456789012:abcdef123/staging/POST/verifications',
      authorizationToken: `Bearer ${createdApiKey}`,
    } as APIGatewayTokenAuthorizerEvent;

    const result = await authorizerHandler(event);

    expect(result.principalId).toBe(TEST_CLIENT_ID);
    expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
    expect(result.context.clientId).toBe(TEST_CLIENT_ID);
    expect(result.context.keyId).toBe(createdKeyId);
    expect(result.context.scopes).toBe('read,write');
    expect(result.context.rateLimit).toBe('50');
  });

  it('should list API keys for the client', async () => {
    const event = {
      requestContext: {
        requestId: 'test-request-2',
        authorizer: {
          clientId: TEST_CLIENT_ID,
        },
      },
      queryStringParameters: null,
    } as unknown as APIGatewayProxyEvent;

    const result = await listHandler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.keys).toBeInstanceOf(Array);
    expect(body.keys.length).toBeGreaterThan(0);

    const key = body.keys.find((k: any) => k.keyId === createdKeyId);
    expect(key).toBeDefined();
    expect(key.name).toBe('Integration Test Key');
    expect(key.status).toBe('active');
  });

  it('should rotate an API key', async () => {
    const event = {
      requestContext: {
        requestId: 'test-request-3',
        authorizer: {
          clientId: TEST_CLIENT_ID,
        },
      },
      pathParameters: {
        keyId: createdKeyId,
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await rotateHandler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.keyId).not.toBe(createdKeyId); // New key ID
    expect(body.apiKey).toMatch(/^ab_(live|test)_[a-f0-9]{32}$/);
    expect(body.apiKey).not.toBe(createdApiKey); // New API key
    expect(body.name).toBe('Integration Test Key'); // Same name

    // Store old key for validation test
    const oldApiKey = createdApiKey;

    // Update for cleanup and subsequent tests
    createdKeyId = body.keyId;
    createdApiKey = body.apiKey;

    // Verify old key is revoked (use oldApiKey, not createdApiKey)
    const apiKeyService = new ApiKeyService();
    const validation = await apiKeyService.validateApiKey(oldApiKey, TEST_CLIENT_ID);
    expect(validation.valid).toBe(false);
  });

  it('should reject invalid API key via authorizer', async () => {
    const event = {
      type: 'TOKEN',
      methodArn: 'arn:aws:execute-api:af-south-1:123456789012:abcdef123/staging/POST/verifications',
      authorizationToken: 'Bearer ab_live_invalid1234567890abcdef1234',
    } as APIGatewayTokenAuthorizerEvent;

    await expect(authorizerHandler(event)).rejects.toThrow('Unauthorized');
  });

  it('should revoke an API key', async () => {
    const event = {
      requestContext: {
        requestId: 'test-request-4',
        authorizer: {
          clientId: TEST_CLIENT_ID,
        },
      },
      pathParameters: {
        keyId: createdKeyId,
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await revokeHandler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('API key revoked successfully');
    expect(body.keyId).toBe(createdKeyId);

    // Verify key is revoked
    const apiKeyService = new ApiKeyService();
    const validation = await apiKeyService.validateApiKey(createdApiKey, TEST_CLIENT_ID);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('revoked');
  });

  it('should reject revoked API key via authorizer', async () => {
    const event = {
      type: 'TOKEN',
      methodArn: 'arn:aws:execute-api:af-south-1:123456789012:abcdef123/staging/POST/verifications',
      authorizationToken: `Bearer ${createdApiKey}`,
    } as APIGatewayTokenAuthorizerEvent;

    await expect(authorizerHandler(event)).rejects.toThrow('Unauthorized');
  });
});
