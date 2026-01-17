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
import { EncryptionService } from './encryption';

export class DynamoDBService {
  private client: DynamoDBDocumentClient;
  private tableName: string;
  private encryptionService: EncryptionService;

  constructor(tableName?: string, region?: string, endpoint?: string, encryptionService?: EncryptionService) {
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
    this.encryptionService = encryptionService || new EncryptionService();
  }

  /**
   * Put verification entity with conditional write to prevent duplicates
   * Encrypts sensitive fields before storage
   */
  async putVerification(verification: VerificationEntity): Promise<void> {
    // Clone to avoid mutating original
    const encryptedVerification = { ...verification };

    // Encrypt sensitive fields if present
    if (encryptedVerification.extractedData) {
      const extractedData = { ...encryptedVerification.extractedData };

      // Encrypt address if present
      if (extractedData.address && typeof extractedData.address === 'string') {
        extractedData.address = await this.encryptionService.encryptField(
          extractedData.address,
          3,
          verification.verificationId,
          'address'
        );
      }

      // Encrypt ID number if present (Omang number)
      if (extractedData.idNumber) {
        // CRITICAL: Hash plaintext FIRST for duplicate detection (GSI2PK)
        if (!encryptedVerification.GSI2PK) {
          encryptedVerification.GSI2PK = `OMANG#${this.encryptionService.hashField(extractedData.idNumber)}`;
        }

        // Then encrypt for storage
        extractedData.idNumber = await this.encryptionService.encryptField(
          extractedData.idNumber,
          3,
          verification.verificationId,
          'idNumber'
        );
      }

      // Encrypt date of birth if present
      if (extractedData.dateOfBirth && typeof extractedData.dateOfBirth === 'string') {
        extractedData.dateOfBirth = await this.encryptionService.encryptField(
          extractedData.dateOfBirth,
          3,
          verification.verificationId,
          'dateOfBirth'
        );
      }

      // Encrypt phone number if present
      if (extractedData.phoneNumber && typeof extractedData.phoneNumber === 'string') {
        extractedData.phoneNumber = await this.encryptionService.encryptField(
          extractedData.phoneNumber,
          3,
          verification.verificationId,
          'phoneNumber'
        );
      }

      encryptedVerification.extractedData = extractedData;
    }

    const command = new PutCommand({
      TableName: this.tableName,
      Item: encryptedVerification,
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
   * Decrypts sensitive fields after retrieval
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
    if (!result.Item) {
      return null;
    }

    const verification = result.Item as VerificationEntity;

    // Decrypt sensitive fields if present
    if (verification.extractedData) {
      const extractedData = { ...verification.extractedData };

      // Decrypt address if present
      if (extractedData.address && typeof extractedData.address === 'string') {
        try {
          extractedData.address = await this.encryptionService.decryptField(
            extractedData.address,
            3,
            verificationId,
            'address'
          );
        } catch (error) {
          console.error('Failed to decrypt address:', error);
          // Mark as decryption error instead of keeping encrypted value
          extractedData.address = '[DECRYPTION_ERROR]';
        }
      }

      // Decrypt ID number if present
      if (extractedData.idNumber) {
        try {
          extractedData.idNumber = await this.encryptionService.decryptField(
            extractedData.idNumber,
            3,
            verificationId,
            'idNumber'
          );
        } catch (error) {
          console.error('Failed to decrypt idNumber:', error);
          extractedData.idNumber = '[DECRYPTION_ERROR]';
        }
      }

      // Decrypt date of birth if present
      if (extractedData.dateOfBirth && typeof extractedData.dateOfBirth === 'string') {
        try {
          extractedData.dateOfBirth = await this.encryptionService.decryptField(
            extractedData.dateOfBirth,
            3,
            verificationId,
            'dateOfBirth'
          );
        } catch (error) {
          console.error('Failed to decrypt dateOfBirth:', error);
          extractedData.dateOfBirth = '[DECRYPTION_ERROR]';
        }
      }

      // Decrypt phone number if present
      if (extractedData.phoneNumber && typeof extractedData.phoneNumber === 'string') {
        try {
          extractedData.phoneNumber = await this.encryptionService.decryptField(
            extractedData.phoneNumber,
            3,
            verificationId,
            'phoneNumber'
          );
        } catch (error) {
          console.error('Failed to decrypt phoneNumber:', error);
          extractedData.phoneNumber = '[DECRYPTION_ERROR]';
        }
      }

      verification.extractedData = extractedData;
    }

    return verification;
  }

  /**
   * Query verifications by client ID and status (GSI1)
   * Decrypts sensitive fields for all results
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
    const verifications = (result.Items as VerificationEntity[]) || [];

    // Decrypt sensitive fields for all results
    return await Promise.all(
      verifications.map(async (verification) => {
        if (verification.extractedData) {
          const extractedData = { ...verification.extractedData };

          if (extractedData.address && typeof extractedData.address === 'string') {
            try {
              extractedData.address = await this.encryptionService.decryptField(
                extractedData.address,
                3,
                verification.verificationId,
                'address'
              );
            } catch (error) {
              console.error('Failed to decrypt address:', error);
              extractedData.address = '[DECRYPTION_ERROR]';
            }
          }

          if (extractedData.idNumber) {
            try {
              extractedData.idNumber = await this.encryptionService.decryptField(
                extractedData.idNumber,
                3,
                verification.verificationId,
                'idNumber'
              );
            } catch (error) {
              console.error('Failed to decrypt idNumber:', error);
              extractedData.idNumber = '[DECRYPTION_ERROR]';
            }
          }

          if (extractedData.dateOfBirth && typeof extractedData.dateOfBirth === 'string') {
            try {
              extractedData.dateOfBirth = await this.encryptionService.decryptField(
                extractedData.dateOfBirth,
                3,
                verification.verificationId,
                'dateOfBirth'
              );
            } catch (error) {
              console.error('Failed to decrypt dateOfBirth:', error);
              extractedData.dateOfBirth = '[DECRYPTION_ERROR]';
            }
          }

          if (extractedData.phoneNumber && typeof extractedData.phoneNumber === 'string') {
            try {
              extractedData.phoneNumber = await this.encryptionService.decryptField(
                extractedData.phoneNumber,
                3,
                verification.verificationId,
                'phoneNumber'
              );
            } catch (error) {
              console.error('Failed to decrypt phoneNumber:', error);
              extractedData.phoneNumber = '[DECRYPTION_ERROR]';
            }
          }

          verification.extractedData = extractedData;
        }
        return verification;
      })
    );
  }

  /**
   * Query verifications by creation date (GSI2)
   * Decrypts sensitive fields for all results
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
    const verifications = (result.Items as VerificationEntity[]) || [];

    // Decrypt sensitive fields for all results
    return await Promise.all(
      verifications.map(async (verification) => {
        if (verification.extractedData) {
          const extractedData = { ...verification.extractedData };

          if (extractedData.address && typeof extractedData.address === 'string') {
            try {
              extractedData.address = await this.encryptionService.decryptField(
                extractedData.address,
                3,
                verification.verificationId,
                'address'
              );
            } catch (error) {
              console.error('Failed to decrypt address:', error);
              extractedData.address = '[DECRYPTION_ERROR]';
            }
          }

          if (extractedData.idNumber) {
            try {
              extractedData.idNumber = await this.encryptionService.decryptField(
                extractedData.idNumber,
                3,
                verification.verificationId,
                'idNumber'
              );
            } catch (error) {
              console.error('Failed to decrypt idNumber:', error);
              extractedData.idNumber = '[DECRYPTION_ERROR]';
            }
          }

          if (extractedData.dateOfBirth && typeof extractedData.dateOfBirth === 'string') {
            try {
              extractedData.dateOfBirth = await this.encryptionService.decryptField(
                extractedData.dateOfBirth,
                3,
                verification.verificationId,
                'dateOfBirth'
              );
            } catch (error) {
              console.error('Failed to decrypt dateOfBirth:', error);
              extractedData.dateOfBirth = '[DECRYPTION_ERROR]';
            }
          }

          if (extractedData.phoneNumber && typeof extractedData.phoneNumber === 'string') {
            try {
              extractedData.phoneNumber = await this.encryptionService.decryptField(
                extractedData.phoneNumber,
                3,
                verification.verificationId,
                'phoneNumber'
              );
            } catch (error) {
              console.error('Failed to decrypt phoneNumber:', error);
              extractedData.phoneNumber = '[DECRYPTION_ERROR]';
            }
          }

          verification.extractedData = extractedData;
        }
        return verification;
      })
    );
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
