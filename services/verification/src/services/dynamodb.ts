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

  constructor(tableName: string, region: string) {
    const dynamoClient = new DynamoDBClient({ region });
    this.client = DynamoDBDocumentClient.from(dynamoClient, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
    this.tableName = tableName;
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
}
