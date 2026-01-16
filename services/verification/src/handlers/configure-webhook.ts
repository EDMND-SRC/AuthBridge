import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import crypto from 'crypto';
import { DynamoDBService } from '../services/dynamodb.js';
import type { ClientConfiguration, WebhookEventType } from '../types/webhook.js';

const dynamoDBService = new DynamoDBService();

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // Extract client ID from authorizer context
    const clientId = event.requestContext.authorizer?.clientId;
    if (!clientId) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
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
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
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
      } catch {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
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

    // Generate webhook secret if not provided
    const secret = webhookSecret || crypto.randomBytes(32).toString('hex');

    // Load existing client configuration
    const result = await dynamoDBService.getItem({
      Key: {
        PK: `CLIENT#${clientId}`,
        SK: 'CONFIG',
      },
    });

    const clientConfig = result.Item as ClientConfiguration | undefined;

    if (!clientConfig) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
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
    const updatedConfig: ClientConfiguration = {
      ...clientConfig,
      webhookUrl: webhookUrl || clientConfig.webhookUrl,
      webhookSecret: secret,
      webhookEnabled: webhookEnabled !== undefined ? webhookEnabled : true,
      webhookEvents: (webhookEvents as WebhookEventType[]) || [
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
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
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
  } catch (error) {
    console.error('Error configuring webhook:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
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
