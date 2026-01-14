import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, } from '@aws-sdk/lib-dynamodb';
export class IdempotencyService {
    client;
    tableName;
    constructor(tableName, region) {
        const dynamoClient = new DynamoDBClient({ region });
        this.client = DynamoDBDocumentClient.from(dynamoClient, {
            marshallOptions: { removeUndefinedValues: true },
        });
        this.tableName = tableName;
    }
    /**
     * Generate PK for idempotency record
     */
    generatePK(clientId, idempotencyKey) {
        return `IDEM#${clientId}#${idempotencyKey}`;
    }
    /**
     * Check if idempotency key exists and return existing verification ID
     * Returns null if key doesn't exist
     */
    async checkIdempotencyKey(clientId, idempotencyKey) {
        const command = new GetCommand({
            TableName: this.tableName,
            Key: {
                PK: this.generatePK(clientId, idempotencyKey),
                SK: 'IDEM',
            },
        });
        const result = await this.client.send(command);
        if (result.Item) {
            return result.Item.verificationId;
        }
        return null;
    }
    /**
     * Store idempotency key with verification ID
     * Uses conditional write to prevent race conditions
     */
    async storeIdempotencyKey(clientId, idempotencyKey, verificationId) {
        const now = new Date();
        const ttl = Math.floor(now.getTime() / 1000) + 24 * 60 * 60; // 24 hours
        const record = {
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
        }
        catch (error) {
            if (error.name === 'ConditionalCheckFailedException') {
                // Key already exists - this is expected in race conditions
                // The caller should re-check and return existing verification
                throw new IdempotencyConflictError(idempotencyKey);
            }
            throw error;
        }
    }
}
export class IdempotencyConflictError extends Error {
    idempotencyKey;
    constructor(idempotencyKey) {
        super(`Idempotency key already exists: ${idempotencyKey}`);
        this.idempotencyKey = idempotencyKey;
        this.name = 'IdempotencyConflictError';
    }
}
//# sourceMappingURL=idempotency.js.map