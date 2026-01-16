import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, } from '@aws-sdk/lib-dynamodb';
export class DynamoDBService {
    client;
    tableName;
    constructor(tableName, region, endpoint) {
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
    async putVerification(verification) {
        const command = new PutCommand({
            TableName: this.tableName,
            Item: verification,
            ConditionExpression: 'attribute_not_exists(PK)',
        });
        try {
            await this.client.send(command);
        }
        catch (error) {
            if (error.name === 'ConditionalCheckFailedException') {
                throw new Error('Verification already exists');
            }
            throw error;
        }
    }
    /**
     * Get verification by ID
     */
    async getVerification(verificationId) {
        const command = new GetCommand({
            TableName: this.tableName,
            Key: {
                PK: `CASE#${verificationId}`,
                SK: 'META',
            },
        });
        const result = await this.client.send(command);
        return result.Item || null;
    }
    /**
     * Query verifications by client ID and status (GSI1)
     */
    async queryByClientAndStatus(clientId, status) {
        const keyConditionExpression = status
            ? 'GSI1PK = :pk AND begins_with(GSI1SK, :status)'
            : 'GSI1PK = :pk';
        const expressionAttributeValues = {
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
        return result.Items || [];
    }
    /**
     * Query verifications by creation date (GSI2)
     */
    async queryByDate(date) {
        const command = new QueryCommand({
            TableName: this.tableName,
            IndexName: 'GSI2',
            KeyConditionExpression: 'GSI2PK = :pk',
            ExpressionAttributeValues: {
                ':pk': `DATE#${date}`,
            },
        });
        const result = await this.client.send(command);
        return result.Items || [];
    }
    /**
     * Update verification status
     */
    async updateVerificationStatus(verificationId, status, updatedAt) {
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
    async putDocument(document) {
        const command = new PutCommand({
            TableName: this.tableName,
            Item: document,
        });
        await this.client.send(command);
    }
    /**
     * Get document by verification ID and document ID
     */
    async getDocument(verificationId, documentId) {
        const command = new GetCommand({
            TableName: this.tableName,
            Key: {
                PK: `CASE#${verificationId}`,
                SK: `DOC#${documentId}`,
            },
        });
        const result = await this.client.send(command);
        return result.Item || null;
    }
    /**
     * Query all documents for a verification
     */
    async queryDocuments(verificationId) {
        const command = new QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
            ExpressionAttributeValues: {
                ':pk': `CASE#${verificationId}`,
                ':skPrefix': 'DOC#',
            },
        });
        const result = await this.client.send(command);
        return result.Items || [];
    }
    /**
     * Query verifications by Omang hash (GSI2)
     * Used for duplicate detection
     *
     * @param omangHashKey - GSI2PK key (OMANG#<hash>)
     * @returns Array of verification entities with matching Omang
     */
    async queryByOmangHash(omangHashKey) {
        const command = new QueryCommand({
            TableName: this.tableName,
            IndexName: 'OmangHashIndex',
            KeyConditionExpression: 'GSI2PK = :pk',
            ExpressionAttributeValues: {
                ':pk': omangHashKey,
            },
            ProjectionExpression: 'verificationId, clientId, #status, createdAt, biometricSummary',
            ExpressionAttributeNames: {
                '#status': 'status',
            },
        });
        const result = await this.client.send(command);
        return result.Items || [];
    }
    /**
     * Generic update item method for flexible updates
     */
    async updateItem(params) {
        const command = new UpdateCommand({
            TableName: this.tableName,
            ...params,
        });
        await this.client.send(command);
    }
    /**
     * Generic get item method
     */
    async getItem(params) {
        const command = new GetCommand({
            TableName: this.tableName,
            ...params,
        });
        return await this.client.send(command);
    }
    /**
     * Generic put item method
     */
    async putItem(item) {
        const command = new PutCommand({
            TableName: this.tableName,
            Item: item,
        });
        await this.client.send(command);
    }
}
//# sourceMappingURL=dynamodb.js.map