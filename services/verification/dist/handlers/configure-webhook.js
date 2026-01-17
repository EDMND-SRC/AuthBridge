import crypto from 'crypto';
import { DynamoDBService } from '../services/dynamodb.js';
const dynamoDBService = new DynamoDBService();
// Valid webhook event types
const VALID_WEBHOOK_EVENTS = [
    'verification.created',
    'verification.submitted',
    'verification.approved',
    'verification.rejected',
    'verification.resubmission_required',
    'verification.expired',
];
// Minimum webhook secret length for security
const MIN_SECRET_LENGTH = 32;
// Rate limit headers (per project-context.md)
const getRateLimitHeaders = () => ({
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': '99',
    'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60),
});
export async function handler(event) {
    const baseHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        ...getRateLimitHeaders(),
    };
    try {
        // Extract client ID from authorizer context
        const clientId = event.requestContext.authorizer?.clientId;
        if (!clientId) {
            return {
                statusCode: 401,
                headers: baseHeaders,
                body: JSON.stringify({
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Client ID not found in request context',
                    },
                    meta: {
                        requestId: event.requestContext.requestId,
                        timestamp: new Date().toISOString(),
                    },
                }),
            };
        }
        // Parse request body
        const body = JSON.parse(event.body || '{}');
        const { webhookUrl, webhookSecret, webhookEnabled, webhookEvents } = body;
        // Validate webhook URL (HTTPS required)
        if (webhookUrl && !webhookUrl.startsWith('https://')) {
            return {
                statusCode: 400,
                headers: baseHeaders,
                body: JSON.stringify({
                    error: {
                        code: 'INVALID_WEBHOOK_URL',
                        message: 'Webhook URL must use HTTPS',
                        details: {
                            field: 'webhookUrl',
                            value: webhookUrl,
                        },
                    },
                    meta: {
                        requestId: event.requestContext.requestId,
                        timestamp: new Date().toISOString(),
                    },
                }),
            };
        }
        // Validate webhook URL format
        if (webhookUrl) {
            try {
                new URL(webhookUrl);
            }
            catch {
                return {
                    statusCode: 400,
                    headers: baseHeaders,
                    body: JSON.stringify({
                        error: {
                            code: 'INVALID_WEBHOOK_URL',
                            message: 'Invalid webhook URL format',
                            details: {
                                field: 'webhookUrl',
                                value: webhookUrl,
                            },
                        },
                        meta: {
                            requestId: event.requestContext.requestId,
                            timestamp: new Date().toISOString(),
                        },
                    }),
                };
            }
        }
        // Validate webhook secret length if provided
        if (webhookSecret && webhookSecret.length < MIN_SECRET_LENGTH) {
            return {
                statusCode: 400,
                headers: baseHeaders,
                body: JSON.stringify({
                    error: {
                        code: 'INVALID_WEBHOOK_SECRET',
                        message: `Webhook secret must be at least ${MIN_SECRET_LENGTH} characters`,
                        details: {
                            field: 'webhookSecret',
                            minLength: MIN_SECRET_LENGTH,
                            providedLength: webhookSecret.length,
                        },
                    },
                    meta: {
                        requestId: event.requestContext.requestId,
                        timestamp: new Date().toISOString(),
                    },
                }),
            };
        }
        // Validate webhook events if provided
        if (webhookEvents && Array.isArray(webhookEvents)) {
            const invalidEvents = webhookEvents.filter((e) => !VALID_WEBHOOK_EVENTS.includes(e));
            if (invalidEvents.length > 0) {
                return {
                    statusCode: 400,
                    headers: baseHeaders,
                    body: JSON.stringify({
                        error: {
                            code: 'INVALID_WEBHOOK_EVENTS',
                            message: 'Invalid webhook event types provided',
                            details: {
                                field: 'webhookEvents',
                                invalidEvents,
                                validEvents: VALID_WEBHOOK_EVENTS,
                            },
                        },
                        meta: {
                            requestId: event.requestContext.requestId,
                            timestamp: new Date().toISOString(),
                        },
                    }),
                };
            }
        }
        // Generate webhook secret if not provided (64 chars = 32 bytes hex)
        const secret = webhookSecret || crypto.randomBytes(32).toString('hex');
        // Load existing client configuration
        const result = await dynamoDBService.getItem({
            Key: {
                PK: `CLIENT#${clientId}`,
                SK: 'CONFIG',
            },
        });
        const clientConfig = result.Item;
        if (!clientConfig) {
            return {
                statusCode: 404,
                headers: baseHeaders,
                body: JSON.stringify({
                    error: {
                        code: 'CLIENT_NOT_FOUND',
                        message: 'Client configuration not found',
                    },
                    meta: {
                        requestId: event.requestContext.requestId,
                        timestamp: new Date().toISOString(),
                    },
                }),
            };
        }
        // Update webhook configuration
        const updatedConfig = {
            ...clientConfig,
            webhookUrl: webhookUrl || clientConfig.webhookUrl,
            webhookSecret: secret,
            webhookEnabled: webhookEnabled !== undefined ? webhookEnabled : true,
            webhookEvents: webhookEvents || [
                'verification.approved',
                'verification.rejected',
                'verification.resubmission_required',
                'verification.expired',
            ],
            updatedAt: new Date().toISOString(),
        };
        // Save updated configuration
        await dynamoDBService.putItem(updatedConfig);
        // Return response (don't expose secret in response if it was provided)
        return {
            statusCode: 200,
            headers: baseHeaders,
            body: JSON.stringify({
                webhookUrl: updatedConfig.webhookUrl,
                webhookEnabled: updatedConfig.webhookEnabled,
                webhookEvents: updatedConfig.webhookEvents,
                webhookSecret: webhookSecret ? undefined : secret, // Only return if auto-generated
                meta: {
                    requestId: event.requestContext.requestId,
                    timestamp: new Date().toISOString(),
                },
            }),
        };
    }
    catch (error) {
        console.error('Error configuring webhook:', error);
        return {
            statusCode: 500,
            headers: baseHeaders,
            body: JSON.stringify({
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to configure webhook',
                },
                meta: {
                    requestId: event.requestContext.requestId,
                    timestamp: new Date().toISOString(),
                },
            }),
        };
    }
}
//# sourceMappingURL=configure-webhook.js.map