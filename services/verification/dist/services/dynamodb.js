import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, } from '@aws-sdk/lib-dynamodb';
export class DynamoDBService {
    client;
    tableName;
    constructor(tableName, region) {
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
}
//# sourceMappingURL=dynamodb.js.map