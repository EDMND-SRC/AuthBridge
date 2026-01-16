import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { v4 as uuidv4 } from 'uuid';
const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'af-south-1' });
const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'af-south-1' }));
// Transient error types that should be retried
const TRANSIENT_ERRORS = [
    'ProvisionedThroughputExceededException',
    'ThrottlingException',
    'ServiceUnavailable',
    'InternalServerError',
    'RequestLimitExceeded'
];
/**
 * Retry helper with exponential backoff for transient errors
 */
async function withRetry(operation, maxRetries = 2, baseDelayMs = 100) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            const isTransient = TRANSIENT_ERRORS.includes(error.name) ||
                error.name === 'TimeoutError' ||
                error.$metadata?.httpStatusCode >= 500;
            if (!isTransient || attempt === maxRetries) {
                throw error;
            }
            // Exponential backoff: 100ms, 200ms, 400ms...
            await new Promise(resolve => setTimeout(resolve, baseDelayMs * Math.pow(2, attempt)));
        }
    }
    throw lastError;
}
export const handler = async (event) => {
    const userId = event.requestContext.authorizer?.claims?.sub;
    const userName = event.requestContext.authorizer?.claims?.name || 'Unknown';
    const ipAddress = event.requestContext.identity.sourceIp;
    const timestamp = new Date().toISOString();
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { caseIds, reason, notes } = body;
    // Validate request
    if (!caseIds || !Array.isArray(caseIds) || caseIds.length === 0) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'caseIds array is required' })
        };
    }
    if (!reason || !reason.trim()) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Rejection reason is required' })
        };
    }
    if (caseIds.length > 50) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Maximum 50 cases per bulk operation' })
        };
    }
    const bulkOperationId = uuidv4();
    const results = [];
    // Process each case individually with retry for transient errors
    for (const caseId of caseIds) {
        try {
            // Update case status with conditional check (with retry)
            await withRetry(() => ddbClient.send(new UpdateCommand({
                TableName: process.env.TABLE_NAME,
                Key: {
                    PK: `CASE#${caseId}`,
                    SK: 'META'
                },
                UpdateExpression: 'SET #status = :rejected, updatedAt = :timestamp, rejectedBy = :userId, rejectedAt = :timestamp, rejectionReason = :reason, rejectionNotes = :notes',
                ConditionExpression: '#status IN (:pending, :inReview)',
                ExpressionAttributeNames: {
                    '#status': 'status'
                },
                ExpressionAttributeValues: {
                    ':rejected': 'rejected',
                    ':pending': 'pending_review',
                    ':inReview': 'in_review',
                    ':timestamp': timestamp,
                    ':userId': userId,
                    ':reason': reason,
                    ':notes': notes || ''
                }
            })));
            // Create audit log entry with unique SK (timestamp + auditId to prevent collisions)
            const auditId = uuidv4();
            await withRetry(() => ddbClient.send(new PutCommand({
                TableName: process.env.TABLE_NAME,
                Item: {
                    PK: `CASE#${caseId}`,
                    SK: `AUDIT#${timestamp}#${auditId}`,
                    action: 'CASE_BULK_REJECTED',
                    resourceType: 'CASE',
                    resourceId: caseId,
                    userId,
                    userName,
                    ipAddress,
                    timestamp,
                    details: {
                        bulkOperationId,
                        totalCasesInBulk: caseIds.length,
                        reason,
                        notes: notes || ''
                    }
                }
            })));
            // Trigger webhook notification (async via SQS) - no retry needed, SQS handles it
            if (process.env.WEBHOOK_QUEUE_URL) {
                await sqsClient.send(new SendMessageCommand({
                    QueueUrl: process.env.WEBHOOK_QUEUE_URL,
                    MessageBody: JSON.stringify({
                        type: 'CASE_BULK_REJECTED',
                        caseId,
                        userId,
                        timestamp,
                        bulkOperationId,
                        totalCasesInBulk: caseIds.length,
                        reason,
                        notes: notes || ''
                    })
                }));
            }
            results.push({ caseId, success: true });
        }
        catch (error) {
            // Handle conditional check failure or other errors
            const errorMessage = error.name === 'ConditionalCheckFailedException'
                ? 'Case is not in a valid status for rejection'
                : 'Failed to reject case';
            results.push({
                caseId,
                success: false,
                error: errorMessage
            });
        }
    }
    // Calculate summary
    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
            data: {
                results,
                summary: {
                    total: caseIds.length,
                    succeeded,
                    failed
                }
            },
            meta: {
                requestId: event.requestContext.requestId,
                timestamp,
                bulkOperationId
            }
        })
    };
};
//# sourceMappingURL=bulk-reject.js.map