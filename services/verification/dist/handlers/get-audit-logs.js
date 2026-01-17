import middy from '@middy/core';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { auditContextMiddleware } from '../middleware/audit-context';
import { addSecurityHeaders } from '../middleware/security-headers';
const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION || 'af-south-1' });
const tableName = process.env.TABLE_NAME || 'AuthBridgeTable';
async function handler(event) {
    try {
        const { startDate, endDate, userId, action, resourceId, resourceType, limit = '100', nextToken } = event.queryStringParameters || {};
        // Validate required parameters
        if (!startDate || !endDate) {
            return addSecurityHeaders({
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'startDate and endDate are required (format: YYYY-MM-DD)' }),
            });
        }
        // Query strategy based on filters
        let queryParams;
        if (userId) {
            // Query by user (GSI5)
            queryParams = {
                TableName: tableName,
                IndexName: 'GSI5-AuditByUser',
                KeyConditionExpression: 'GSI5PK = :userId AND GSI5SK BETWEEN :start AND :end',
                ExpressionAttributeValues: {
                    ':userId': { S: `USER#${userId}` },
                    ':start': { S: `${startDate}T00:00:00.000Z#` },
                    ':end': { S: `${endDate}T23:59:59.999Z#~` },
                },
            };
        }
        else if (action) {
            // Query by action (GSI7)
            queryParams = {
                TableName: tableName,
                IndexName: 'GSI7-AuditByAction',
                KeyConditionExpression: 'GSI7PK = :action AND GSI7SK BETWEEN :start AND :end',
                ExpressionAttributeValues: {
                    ':action': { S: `ACTION#${action}` },
                    ':start': { S: `${startDate}T00:00:00.000Z#` },
                    ':end': { S: `${endDate}T23:59:59.999Z#~` },
                },
            };
        }
        else if (resourceId) {
            // Query by resource (GSI6) - requires resourceType
            if (!resourceType) {
                return addSecurityHeaders({
                    statusCode: 400,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ error: 'resourceType is required when querying by resourceId' }),
                });
            }
            queryParams = {
                TableName: tableName,
                IndexName: 'GSI6-AuditByResource',
                KeyConditionExpression: 'GSI6PK = :resource AND GSI6SK BETWEEN :start AND :end',
                ExpressionAttributeValues: {
                    ':resource': { S: `${resourceType}#${resourceId}` },
                    ':start': { S: `${startDate}T00:00:00.000Z#` },
                    ':end': { S: `${endDate}T23:59:59.999Z#~` },
                },
            };
        }
        else {
            // Query by date range (primary key)
            queryParams = {
                TableName: tableName,
                KeyConditionExpression: 'PK = :date',
                ExpressionAttributeValues: {
                    ':date': { S: `AUDIT#${startDate}` },
                },
            };
        }
        queryParams.Limit = parseInt(limit);
        queryParams.ScanIndexForward = false; // Descending order (newest first)
        if (nextToken) {
            queryParams.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
        }
        const response = await dynamodb.send(new QueryCommand(queryParams));
        const items = response.Items?.map(item => unmarshall(item)) || [];
        return addSecurityHeaders({
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items,
                count: items.length,
                nextToken: response.LastEvaluatedKey
                    ? Buffer.from(JSON.stringify(response.LastEvaluatedKey)).toString('base64')
                    : null,
            }),
        });
    }
    catch (error) {
        console.error('Error querying audit logs:', error);
        return addSecurityHeaders({
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Failed to query audit logs' }),
        });
    }
}
export const getAuditLogs = middy(handler)
    .use(auditContextMiddleware());
//# sourceMappingURL=get-audit-logs.js.map