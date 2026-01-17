import { addSecurityHeaders } from '../middleware/security-headers';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'af-south-1' }));
const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'af-south-1' });
const VALID_REASONS = [
    'blurry_image',
    'face_mismatch',
    'invalid_document',
    'duplicate_detected',
    'incomplete_data',
    'fraudulent',
    'other'
];
export const handler = async (event) => {
    const { id } = event.pathParameters || {};
    const userId = event.requestContext.authorizer?.claims?.sub;
    const userName = event.requestContext.authorizer?.claims?.name || 'Unknown';
    const ipAddress = event.requestContext.identity.sourceIp;
    const timestamp = new Date().toISOString();
    if (!id) {
        return addSecurityHeaders({
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Case ID required' })
        });
    }
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { reason, notes } = body;
    // Validate reason code
    if (!reason || !VALID_REASONS.includes(reason)) {
        return addSecurityHeaders({
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: 'Invalid reason code',
                validReasons: VALID_REASONS
            })
        });
    }
    // Validate notes length
    if (notes && notes.length > 500) {
        return addSecurityHeaders({
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Notes must be 500 characters or less' })
        });
    }
    try {
        // Update case status with conditional check
        const updateResult = await ddbClient.send(new UpdateCommand({
            TableName: process.env.TABLE_NAME,
            Key: { PK: `CASE#${id}`, SK: `CASE#${id}` },
            UpdateExpression: 'SET #status = :rejected, #updatedAt = :timestamp, #updatedBy = :userId, #reason = :reason, #notes = :notes',
            ConditionExpression: '#status IN (:pending, :inReview)',
            ExpressionAttributeNames: {
                '#status': 'status',
                '#updatedAt': 'updatedAt',
                '#updatedBy': 'updatedBy',
                '#reason': 'rejectionReason',
                '#notes': 'rejectionNotes'
            },
            ExpressionAttributeValues: {
                ':rejected': 'rejected',
                ':pending': 'pending',
                ':inReview': 'in-review',
                ':timestamp': timestamp,
                ':userId': userId,
                ':reason': reason,
                ':notes': notes || ''
            },
            ReturnValues: 'ALL_NEW'
        }));
        // Create audit log entry
        await ddbClient.send(new PutCommand({
            TableName: process.env.TABLE_NAME,
            Item: {
                PK: `CASE#${id}`,
                SK: `AUDIT#${timestamp}`,
                action: 'CASE_REJECTED',
                resourceType: 'CASE',
                resourceId: id,
                userId,
                userName,
                ipAddress,
                timestamp,
                details: {
                    previousStatus: updateResult.Attributes?.status || 'pending',
                    newStatus: 'rejected',
                    reason,
                    notes: notes || ''
                }
            }
        }));
        // Queue webhook notification
        await sqsClient.send(new SendMessageCommand({
            QueueUrl: process.env.WEBHOOK_QUEUE_URL,
            MessageBody: JSON.stringify({
                event: 'verification.rejected',
                caseId: id,
                timestamp,
                userId,
                reason,
                notes
            })
        }));
        return addSecurityHeaders({
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: {
                    caseId: id,
                    status: 'rejected',
                    reason,
                    notes: notes || '',
                    updatedAt: timestamp,
                    updatedBy: userId
                },
                meta: {
                    requestId: event.requestContext.requestId,
                    timestamp
                }
            })
        });
    }
    catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
            return addSecurityHeaders({
                statusCode: 409,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Case already decided or invalid status' })
            });
        }
        console.error('Error rejecting case:', error);
        return addSecurityHeaders({
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal server error' })
        });
    }
};
//# sourceMappingURL=reject-case.js.map