import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import crypto from 'crypto';
const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'af-south-1' }));
const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'af-south-1' });
const MAX_RETRY_ATTEMPTS = 3;
export const handler = async (event) => {
    for (const record of event.Records) {
        const message = JSON.parse(record.body);
        const { event: eventType, caseId, timestamp, userId, reason, notes, attemptCount = 1 } = message;
        try {
            // Get case data to find client webhook URL
            const caseResult = await ddbClient.send(new GetCommand({
                TableName: process.env.TABLE_NAME,
                Key: { PK: `CASE#${caseId}`, SK: `CASE#${caseId}` }
            }));
            if (!caseResult.Item) {
                console.error(`Case not found: ${caseId}`);
                continue;
            }
            const clientId = caseResult.Item.metadata?.clientId;
            if (!clientId) {
                console.error(`No client ID for case: ${caseId}`);
                continue;
            }
            // Get client webhook configuration
            const clientResult = await ddbClient.send(new GetCommand({
                TableName: process.env.TABLE_NAME,
                Key: { PK: `CLIENT#${clientId}`, SK: `CLIENT#${clientId}` }
            }));
            const webhookUrl = clientResult.Item?.webhookUrl;
            const webhookSecret = clientResult.Item?.webhookSecret;
            if (!webhookUrl) {
                console.log(`No webhook URL configured for client: ${clientId}`);
                continue;
            }
            // Build webhook payload
            const payload = {
                event: eventType,
                timestamp,
                data: {
                    verificationId: caseId,
                    status: eventType === 'verification.approved' ? 'approved' : 'rejected',
                    ...(reason && { reason }),
                    ...(notes && { notes }),
                    decidedBy: userId,
                    decidedAt: timestamp
                }
            };
            // Generate HMAC signature
            const signature = crypto
                .createHmac('sha256', webhookSecret || '')
                .update(JSON.stringify(payload))
                .digest('hex');
            // Send webhook
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-AuthBridge-Signature': `sha256=${signature}`,
                    'User-Agent': 'AuthBridge-Webhook/1.0'
                },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                console.log(`Webhook delivered successfully on attempt ${attemptCount}`);
                // Log successful delivery
                await ddbClient.send(new PutCommand({
                    TableName: process.env.TABLE_NAME,
                    Item: {
                        PK: `WEBHOOK#${caseId}`,
                        SK: `DELIVERY#${timestamp}`,
                        event: eventType,
                        caseId,
                        clientId,
                        webhookUrl,
                        status: 'delivered',
                        timestamp,
                        attempts: attemptCount
                    }
                }));
            }
            else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        }
        catch (error) {
            console.error(`Webhook attempt ${attemptCount} failed for case ${caseId}:`, error);
            // Schedule retry via SQS with delay if under max attempts
            if (attemptCount < MAX_RETRY_ATTEMPTS) {
                const delaySeconds = attemptCount === 1 ? 30 : 300; // 30s, then 5min
                await sqsClient.send(new SendMessageCommand({
                    QueueUrl: process.env.WEBHOOK_QUEUE_URL,
                    MessageBody: JSON.stringify({
                        ...message,
                        attemptCount: attemptCount + 1
                    }),
                    DelaySeconds: Math.min(delaySeconds, 900) // SQS max delay is 15 min
                }));
                console.log(`Scheduled retry ${attemptCount + 1} for case ${caseId} in ${delaySeconds}s`);
            }
            else {
                // Log failed delivery after max retries
                await ddbClient.send(new PutCommand({
                    TableName: process.env.TABLE_NAME,
                    Item: {
                        PK: `WEBHOOK#${caseId}`,
                        SK: `DELIVERY#${timestamp}`,
                        event: eventType,
                        caseId,
                        status: 'failed',
                        error: error.message,
                        timestamp,
                        attempts: attemptCount
                    }
                }));
                console.error(`Webhook delivery failed after ${MAX_RETRY_ATTEMPTS} attempts for case ${caseId}`);
            }
        }
    }
};
//# sourceMappingURL=send-webhook.js.map