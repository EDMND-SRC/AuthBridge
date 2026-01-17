import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, ScanCommand, } from '@aws-sdk/lib-dynamodb';
export class DynamoDBService {
    client;
    tableName;
    constructor(tableName, region, endpoint) {
        const dynamoClient = new DynamoDBClient({
            region: region || process.env.AWS_REGION || 'af-south-1',
            ...(endpoint || process.env.DYNAMODB_ENDPOINT
                ? { endpoint: endpoint || process.env.DYNAMODB_ENDPOINT }
                : {}),
        });
        this.client = DynamoDBDocumentClient.from(dynamoClient, {
            marshallOptions: {
                removeUndefinedValues: true,
            },
        });
        this.tableName = tableName || process.env.TABLE_NAME || 'AuthBridgeTable';
    }
    // ============================================
    // SESSION OPERATIONS
    // ============================================
    async putSession(session) {
        const item = {
            PK: `SESSION#${session.sessionId}`,
            SK: 'META',
            GSI1PK: `USER#${session.userId}`,
            GSI1SK: `${session.createdAt}#${session.sessionId}`,
            ...session,
        };
        const command = new PutCommand({
            TableName: this.tableName,
            Item: item,
        });
        await this.client.send(command);
    }
    async getSession(sessionId) {
        const command = new GetCommand({
            TableName: this.tableName,
            Key: {
                PK: `SESSION#${sessionId}`,
                SK: 'META',
            },
        });
        const result = await this.client.send(command);
        if (!result.Item)
            return null;
        // Remove DynamoDB-specific keys
        const { PK, SK, GSI1PK, GSI1SK, ...session } = result.Item;
        return session;
    }
    async updateSession(session) {
        const command = new UpdateCommand({
            TableName: this.tableName,
            Key: {
                PK: `SESSION#${session.sessionId}`,
                SK: 'META',
            },
            UpdateExpression: 'SET #status = :status, lastActivity = :lastActivity, expiresAt = :expiresAt, #ttl = :ttl',
            ExpressionAttributeNames: {
                '#status': 'status',
                '#ttl': 'ttl',
            },
            ExpressionAttributeValues: {
                ':status': session.status,
                ':lastActivity': session.lastActivity,
                ':expiresAt': session.expiresAt,
                ':ttl': session.ttl,
            },
        });
        await this.client.send(command);
    }
    async queryUserSessions(userId) {
        const command = new QueryCommand({
            TableName: this.tableName,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :pk',
            ExpressionAttributeValues: {
                ':pk': `USER#${userId}`,
            },
        });
        const result = await this.client.send(command);
        if (!result.Items)
            return [];
        return result.Items.map((item) => {
            const { PK, SK, GSI1PK, GSI1SK, ...session } = item;
            return session;
        });
    }
    async countActiveUserSessions(userId) {
        const sessions = await this.queryUserSessions(userId);
        return sessions.filter((s) => s.status === 'active').length;
    }
    // ============================================
    // API KEY OPERATIONS
    // ============================================
    async putApiKey(apiKey) {
        const item = {
            PK: `APIKEY#${apiKey.clientId}`,
            SK: `KEY#${apiKey.keyId}`,
            GSI2PK: `CLIENT#${apiKey.clientId}`,
            GSI2SK: `${apiKey.createdAt}#${apiKey.keyId}`,
            // GSI4 for O(1) API key lookup by hash
            GSI4PK: `KEYHASH#${apiKey.keyHash}`,
            GSI4SK: `KEY#${apiKey.keyId}`,
            ...apiKey,
        };
        const command = new PutCommand({
            TableName: this.tableName,
            Item: item,
        });
        await this.client.send(command);
    }
    async getApiKey(clientId, keyId) {
        const command = new GetCommand({
            TableName: this.tableName,
            Key: {
                PK: `APIKEY#${clientId}`,
                SK: `KEY#${keyId}`,
            },
        });
        const result = await this.client.send(command);
        if (!result.Item)
            return null;
        const { PK, SK, GSI2PK, GSI2SK, GSI4PK, GSI4SK, ...apiKey } = result.Item;
        return apiKey;
    }
    /**
     * Query API key by hash using GSI4 - O(1) lookup
     * This replaces the expensive scanAllApiKeys() for API key validation
     */
    async queryByApiKeyHash(keyHash) {
        const command = new QueryCommand({
            TableName: this.tableName,
            IndexName: 'GSI4-ApiKeyLookup',
            KeyConditionExpression: 'GSI4PK = :pk',
            ExpressionAttributeValues: {
                ':pk': `KEYHASH#${keyHash}`,
            },
            Limit: 1,
        });
        const result = await this.client.send(command);
        if (!result.Items || result.Items.length === 0)
            return null;
        const { PK, SK, GSI2PK, GSI2SK, GSI4PK, GSI4SK, ...apiKey } = result.Items[0];
        return apiKey;
    }
    async queryClientApiKeys(clientId) {
        const command = new QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
            ExpressionAttributeValues: {
                ':pk': `APIKEY#${clientId}`,
                ':skPrefix': 'KEY#',
            },
        });
        const result = await this.client.send(command);
        if (!result.Items)
            return [];
        return result.Items.map((item) => {
            const { PK, SK, GSI2PK, GSI2SK, GSI4PK, GSI4SK, ...apiKey } = item;
            return apiKey;
        });
    }
    async updateApiKey(apiKey) {
        const command = new UpdateCommand({
            TableName: this.tableName,
            Key: {
                PK: `APIKEY#${apiKey.clientId}`,
                SK: `KEY#${apiKey.keyId}`,
            },
            UpdateExpression: 'SET #status = :status, lastUsed = :lastUsed, keyHash = :keyHash, GSI4PK = :gsi4pk, GSI4SK = :gsi4sk',
            ExpressionAttributeNames: {
                '#status': 'status',
            },
            ExpressionAttributeValues: {
                ':status': apiKey.status,
                ':lastUsed': apiKey.lastUsed,
                ':keyHash': apiKey.keyHash,
                ':gsi4pk': `KEYHASH#${apiKey.keyHash}`,
                ':gsi4sk': `KEY#${apiKey.keyId}`,
            },
        });
        await this.client.send(command);
    }
    /**
     * Scan all API keys across all clients
     * @deprecated Use queryByApiKeyHash() instead for O(1) lookup via GSI4
     * Kept for backward compatibility during migration
     */
    async scanAllApiKeys() {
        const command = new ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'begins_with(PK, :pkPrefix) AND begins_with(SK, :skPrefix)',
            ExpressionAttributeValues: {
                ':pkPrefix': 'APIKEY#',
                ':skPrefix': 'KEY#',
            },
        });
        const result = await this.client.send(command);
        if (!result.Items)
            return [];
        return result.Items.map((item) => {
            const { PK, SK, GSI2PK, GSI2SK, GSI4PK, GSI4SK, ...apiKey } = item;
            return apiKey;
        });
    }
    // ============================================
    // AUDIT LOG OPERATIONS
    // ============================================
    async putAuditLog(entry) {
        const date = entry.timestamp.split('T')[0]; // Extract YYYY-MM-DD
        const item = {
            PK: `AUDIT#${date}`,
            SK: `${entry.timestamp}#${entry.eventId}`,
            GSI3PK: `USER#${entry.userId}`,
            GSI3SK: `${entry.timestamp}#${entry.eventId}`,
            ...entry,
        };
        const command = new PutCommand({
            TableName: this.tableName,
            Item: item,
        });
        await this.client.send(command);
    }
    async queryAuditLogsByDate(date) {
        const command = new QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: {
                ':pk': `AUDIT#${date}`,
            },
        });
        const result = await this.client.send(command);
        if (!result.Items)
            return [];
        return result.Items.map((item) => {
            const { PK, SK, GSI3PK, GSI3SK, ...entry } = item;
            return entry;
        });
    }
    async queryAuditLogsByUser(userId) {
        const command = new QueryCommand({
            TableName: this.tableName,
            IndexName: 'GSI3',
            KeyConditionExpression: 'GSI3PK = :pk',
            ExpressionAttributeValues: {
                ':pk': `USER#${userId}`,
            },
        });
        const result = await this.client.send(command);
        if (!result.Items)
            return [];
        return result.Items.map((item) => {
            const { PK, SK, GSI3PK, GSI3SK, ...entry } = item;
            return entry;
        });
    }
}
