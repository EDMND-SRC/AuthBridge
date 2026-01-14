import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';

export interface IdempotencyRecord {
  PK: string;
  SK: string;
  idempotencyKey: string;
  clientId: string;
  verificationId: string;
  createdAt: string;
  ttl: number;
}

export class IdempotencyService {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor(tableName: string, region: string) {
    const dynamoClient = new DynamoDBClient({ region });
    this.client = DynamoDBDocumentClient.from(dynamoClient, {
      marshallOptions: { removeUndefinedValues: true },
    });
    this.tableName = tableName;
  }

  /**
   * Generate PK for idempotency record
   */
  private generatePK(clientId: string, idempotencyKey: string): string {
    return `IDEM#${clientId}#${idempotencyKey}`;
  }

  /**
   * Check if idempotency key exists and return existing verification ID
   * Returns null if key doesn't exist
   */
  async checkIdempotencyKey(
    clientId: string,
    idempotencyKey: string
  ): Promise<string | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: this.generatePK(clientId, idempotencyKey),
        SK: 'IDEM',
      },
    });

    const result = await this.client.send(command);
    if (result.Item) {
      return (result.Item as IdempotencyRecord).verificationId;
    }
    return null;
  }

  /**
   * Store idempotency key with verification ID
   * Uses conditional write to prevent race conditions
   */
  async storeIdempotencyKey(
    clientId: string,
    idempotencyKey: string,
    verificationId: string
  ): Promise<void> {
    const now = new Date();
    const ttl = Math.floor(now.getTime() / 1000) + 24 * 60 * 60; // 24 hours

    const record: IdempotencyRecord = {
      PK: this.generatePK(clientId, idempotencyKey),
      SK: 'IDEM',
      idempotencyKey,
      clientId,
      verificationId,
      createdAt: now.toISOString(),
      ttl,
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: record,
      ConditionExpression: 'attribute_not_exists(PK)',
    });

    try {
      await this.client.send(command);
    } catch (error) {
      if ((error as { name: string }).name === 'ConditionalCheckFailedException') {
        // Key already exists - this is expected in race conditions
        // The caller should re-check and return existing verification
        throw new IdempotencyConflictError(idempotencyKey);
      }
      throw error;
    }
  }
}

export class IdempotencyConflictError extends Error {
  constructor(public idempotencyKey: string) {
    super(`Idempotency key already exists: ${idempotencyKey}`);
    this.name = 'IdempotencyConflictError';
  }
}
