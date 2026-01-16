import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { VerificationEntity, VerificationStatus } from '../types/verification';
import type { DocumentEntity } from '../types/document';

export class DynamoDBService {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor(tableName?: string, region?: string, endpoint?: string) {
    // Only use test credentials for local DynamoDB (when endpoint is explicitly set)
    const isLocalDynamoDB = !!(endpoint || process.env.DYNAMODB_ENDPOINT);

    const dynamoClient = new DynamoDBClient({
      region: region || process.env.AWS_REGION || 'af-south-1',
      ...(isLocalDynamoDB
        ? {
            endpoint: endpoint || process.env.DYNAMODB_ENDPOINT,
            // Local DynamoDB requires dummy credentials
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
            },
          }
        : {}),
      // In production, AWS SDK uses default credential chain (IAM role, env vars, etc.)
    });
    this.client = DynamoDBDocumentClient.from(dynamoClient, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
    this.tableName = tableName || process.env.TABLE_NAME || 'AuthBridgeTable';
  }

  /**
   * Put verification entity with conditional write to prevent duplicates
   */
  async putVerification(verification: VerificationEntity): Promise<void> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: verification,
      ConditionExpression: 'attribute_not_exists(PK)',
    });

    try {
      await this.client.send(command);
    } catch (error) {
      if ((error as { name: string }).name === 'ConditionalCheckFailedException') {
        throw new Error('Verification already exists');
      }
      throw error;
    }
  }

  /**
   * Get verification by ID
   */
  async getVerification(verificationId: string): Promise<VerificationEntity | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `CASE#${verificationId}`,
        SK: 'META',
      },
    });

    const result = await this.client.send(command);
    return (result.Item as VerificationEntity) || null;
  }

  /**
   * Query verifications by client ID and status (GSI1)
   */
  async queryByClientAndStatus(
    clientId: string,
    status?: VerificationStatus
  ): Promise<VerificationEntity[]> {
    const keyConditionExpression = status
      ? 'GSI1PK = :pk AND begins_with(GSI1SK, :status)'
      : 'GSI1PK = :pk';

    const expressionAttributeValues: Record<string, string> = {
      ':pk': `CLIENT#${clientId}`,
    };

    if (status) {
      expressionAttributeValues[':status'] = status;
    }

    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    const result = await this.client.send(command);
    return (result.Items as VerificationEntity[]) || [];
  }

  /**
   * Query verifications by creation date (GSI2)
   */
  async queryByDate(date: string): Promise<VerificationEntity[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `DATE#${date}`,
      },
    });

    const result = await this.client.send(command);
    return (result.Items as VerificationEntity[]) || [];
  }

  /**
   * Update verification status
   */
  async updateVerificationStatus(
    verificationId: string,
    status: VerificationStatus,
    updatedAt: string
  ): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: `CASE#${verificationId}`,
        SK: 'META',
      },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': updatedAt,
      },
    });

    await this.client.send(command);
  }

  /**
   * Put document entity
   */
  async putDocument(document: DocumentEntity): Promise<void> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: document,
    });

    await this.client.send(command);
  }

  /**
   * Get document by verification ID and document ID
   */
  async getDocument(
    verificationId: string,
    documentId: string
  ): Promise<DocumentEntity | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `CASE#${verificationId}`,
        SK: `DOC#${documentId}`,
      },
    });

    const result = await this.client.send(command);
    return (result.Item as DocumentEntity) || null;
  }

  /**
   * Query all documents for a verification
   */
  async queryDocuments(verificationId: string): Promise<DocumentEntity[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `CASE#${verificationId}`,
        ':skPrefix': 'DOC#',
      },
    });

    const result = await this.client.send(command);
    return (result.Items as DocumentEntity[]) || [];
  }

  /**
   * Query verifications by Omang hash (GSI2)
   * Used for duplicate detection
   *
   * @param omangHashKey - GSI2PK key (OMANG#<hash>)
   * @returns Array of verification entities with matching Omang
   */
  async queryByOmangHash(omangHashKey: string): Promise<VerificationEntity[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'OmangHashIndex',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: {
        ':pk': omangHashKey,
      },
      ProjectionExpression:
        'verificationId, clientId, #status, createdAt, biometricSummary',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
    });

    const result = await this.client.send(command);
    return (result.Items as VerificationEntity[]) || [];
  }

  /**
   * Generic update item method for flexible updates
   */
  async updateItem(params: {
    Key: Record<string, string>;
    UpdateExpression: string;
    ExpressionAttributeNames?: Record<string, string>;
    ExpressionAttributeValues?: Record<string, unknown>;
    ConditionExpression?: string;
  }): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.tableName,
      ...params,
    });

    await this.client.send(command);
  }

  /**
   * Generic get item method
   */
  async getItem(params: { Key: Record<string, string> }): Promise<{ Item?: unknown }> {
    const command = new GetCommand({
      TableName: this.tableName,
      ...params,
    });

    return await this.client.send(command);
  }

  /**
   * Generic put item method
   */
  async putItem(item: any): Promise<void> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    });

    await this.client.send(command);
  }
}
