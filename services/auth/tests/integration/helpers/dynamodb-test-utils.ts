/**
 * DynamoDB Test Utilities for Auth Service
 *
 * Provides utilities for setting up and tearing down test data in DynamoDB.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';

export interface DynamoDBTestConfig {
  endpoint?: string;
  region?: string;
  tableName?: string;
}

const DEFAULT_CONFIG: DynamoDBTestConfig = {
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
  region: process.env.AWS_REGION || 'af-south-1',
  tableName: process.env.TABLE_NAME || 'AuthBridgeTable',
};

export class DynamoDBTestUtils {
  private client: DynamoDBDocumentClient;
  private tableName: string;
  private createdItems: Array<{ PK: string; SK: string }> = [];

  constructor(config: Partial<DynamoDBTestConfig> = {}) {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    const dynamoClient = new DynamoDBClient({
      endpoint: mergedConfig.endpoint,
      region: mergedConfig.region,
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    });

    this.client = DynamoDBDocumentClient.from(dynamoClient, {
      marshallOptions: { removeUndefinedValues: true },
    });

    this.tableName = mergedConfig.tableName!;
  }

  async putItem(item: Record<string, unknown>): Promise<void> {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      })
    );

    if (item.PK && item.SK) {
      this.createdItems.push({ PK: item.PK as string, SK: item.SK as string });
    }
  }

  async deleteItem(pk: string, sk: string): Promise<void> {
    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk },
      })
    );
  }

  async queryByPK(pk: string): Promise<Record<string, unknown>[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': pk },
      })
    );
    return (result.Items || []) as Record<string, unknown>[];
  }

  async cleanup(): Promise<void> {
    for (const item of this.createdItems) {
      try {
        await this.deleteItem(item.PK, item.SK);
      } catch {
        // Ignore errors during cleanup
      }
    }
    this.createdItems = [];
  }

  /**
   * Create a test session entity
   */
  async createTestSession(overrides: Partial<Record<string, unknown>> = {}): Promise<Record<string, unknown>> {
    const sessionId = `session_test_${Date.now()}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const session = {
      PK: `SESSION#${sessionId}`,
      SK: 'META',
      sessionId,
      userId: 'user_test',
      clientId: 'client_test',
      status: 'active',
      createdAt: now,
      expiresAt,
      lastActivity: now,
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      deviceType: 'desktop',
      ttl: Math.floor(new Date(expiresAt).getTime() / 1000),
      GSI1PK: 'USER#user_test',
      GSI1SK: `${now}#${sessionId}`,
      ...overrides,
    };

    await this.putItem(session);
    return session;
  }

  /**
   * Create a test API key entity
   */
  async createTestApiKey(overrides: Partial<Record<string, unknown>> = {}): Promise<Record<string, unknown>> {
    const keyId = `key_test_${Date.now()}`;
    const now = new Date().toISOString();

    const apiKey = {
      PK: 'APIKEY#client_test',
      SK: `KEY#${keyId}`,
      keyId,
      clientId: 'client_test',
      keyHash: 'test_hash_' + keyId,
      name: 'Test API Key',
      status: 'active',
      createdAt: now,
      expiresAt: null,
      lastUsed: null,
      scopes: ['read', 'write'],
      rateLimit: 100,
      GSI2PK: 'CLIENT#client_test',
      GSI2SK: `${now}#${keyId}`,
      ...overrides,
    };

    await this.putItem(apiKey);
    return apiKey;
  }

  /**
   * Create a test audit log entry
   */
  async createTestAuditLog(overrides: Partial<Record<string, unknown>> = {}): Promise<Record<string, unknown>> {
    const eventId = `event_test_${Date.now()}`;
    const now = new Date().toISOString();
    const date = now.split('T')[0];

    const auditLog = {
      PK: `AUDIT#${date}`,
      SK: `${now}#${eventId}`,
      eventId,
      timestamp: now,
      date,
      userId: 'user_test',
      clientId: 'client_test',
      action: 'LOGIN',
      resourceId: null,
      resourceType: null,
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      status: 'success',
      errorCode: null,
      metadata: {},
      GSI3PK: 'USER#user_test',
      GSI3SK: `${now}#${eventId}`,
      ...overrides,
    };

    await this.putItem(auditLog);
    return auditLog;
  }
}

export const dynamoDBTestUtils = new DynamoDBTestUtils();
