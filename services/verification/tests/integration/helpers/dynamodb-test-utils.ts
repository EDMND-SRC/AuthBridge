/**
 * DynamoDB Test Utilities
 *
 * Provides utilities for setting up and tearing down test data in DynamoDB.
 * Uses DynamoDB Local for integration tests.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
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

  /**
   * Insert a test item and track it for cleanup
   */
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

  /**
   * Delete a specific item
   */
  async deleteItem(pk: string, sk: string): Promise<void> {
    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk },
      })
    );
  }

  /**
   * Query items by partition key
   */
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

  /**
   * Clean up all items created during the test
   */
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
   * Create a test verification entity
   */
  async createTestVerification(overrides: Partial<Record<string, unknown>> = {}): Promise<Record<string, unknown>> {
    const verificationId = `ver_test_${Date.now()}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const verification = {
      PK: `CASE#${verificationId}`,
      SK: 'META',
      verificationId,
      clientId: 'client_test',
      status: 'created',
      documentType: 'omang',
      customerMetadata: {},
      createdAt: now,
      updatedAt: now,
      expiresAt,
      ttl: Math.floor(new Date(expiresAt).getTime() / 1000),
      GSI1PK: 'CLIENT#client_test',
      GSI1SK: `created#${now}`,
      GSI2PK: `DATE#${now.split('T')[0]}`,
      GSI2SK: `${now}#${verificationId}`,
      ...overrides,
    };

    await this.putItem(verification);
    return verification;
  }

  /**
   * Create a test document entity
   */
  async createTestDocument(
    verificationId: string,
    overrides: Partial<Record<string, unknown>> = {}
  ): Promise<Record<string, unknown>> {
    const documentId = `doc_test_${Date.now()}`;
    const now = new Date().toISOString();

    const document = {
      PK: `CASE#${verificationId}`,
      SK: `DOC#${documentId}`,
      documentId,
      documentType: 'omang_front',
      s3Key: `test/${verificationId}/${documentId}.jpg`,
      status: 'uploaded',
      uploadedAt: now,
      mimeType: 'image/jpeg',
      fileSize: 1024,
      ...overrides,
    };

    await this.putItem(document);
    return document;
  }
}

// Singleton instance for convenience
export const dynamoDBTestUtils = new DynamoDBTestUtils();
