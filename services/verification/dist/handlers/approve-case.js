import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'af-south-1' }));
const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'af-south-1' });
export const handler = async (event) => {
    const { id } = event.pathParameters || {};
    const userId = event.requestContext.authorizer?.claims?.sub;
    const userName = event.requestContext.authorizer?.claims?.name || 'Unknown';
    const ipAddress = event.requestContext.identity.sourceIp;
    const timestamp = new Date().toISOString();
    if (!id) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Case ID required' })
        };
    }
    try {
        // Update case status with conditional check
        const updateResult = await ddbClient.send(new UpdateCommand({
            TableName: process.env.TABLE_NAME,
            Key: { PK: `CASE#${id}`, SK: `CASE#${id}` },
            UpdateExpression: 'SET #status = :approved, #updatedAt = :timestamp, #updatedBy = :userId',
            ConditionExpression: '#status IN (:pending, :inReview)',
            ExpressionAttributeNames: {
                '#status': 'status',
                '#updatedAt': 'updatedAt',
                '#updatedBy': 'updatedBy'
            },
            ExpressionAttributeValues: {
                ':approved': 'approved',
                ':pending': 'pending',
                ':inReview': 'in-review',
                ':timestamp': timestamp,
                ':userId': userId
            },
            ReturnValues: 'ALL_NEW'
        }));
        // Create audit log entry
        await ddbClient.send(new PutCommand({
            TableName: process.env.TABLE_NAME,
            Item: {
                PK: `CASE#${id}`,
                SK: `AUDIT#${timestamp}`,
                action: 'CASE_APPROVED',
                resourceType: 'CASE',
                resourceId: id,
                userId,
                userName,
                ipAddress,
                timestamp,
                details: {
                    previousStatus: updateResult.Attributes?.status || 'pending',
                    newStatus: 'approved'
                }
            }
        }));
        // Queue webhook notification
        await sqsClient.send(new SendMessageCommand({
            QueueUrl: process.env.WEBHOOK_QUEUE_URL,
            MessageBody: JSON.stringify({
                event: 'verification.approved',
                caseId: id,
                timestamp,
                userId
            })
        }));
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: {
                    caseId: id,
                    status: 'approved',
                    updatedAt: timestamp,
                    updatedBy: userId
                },
                meta: {
                    requestId: event.requestContext.requestId,
                    timestamp
                }
            })
        };
    }
    catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
            return {
                statusCode: 409,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Case already decided or invalid status' })
            };
        }
        console.error('Error approving case:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
//# sourceMappingURL=approve-case.js.map