import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { WebhookService } from '../services/webhook.js';
import { DynamoDBService } from '../services/dynamodb.js';
import type { VerificationEntity } from '../types/verification.js';
import type { ClientConfiguration } from '../types/webhook.js';

const webhookService = new WebhookService();
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

    // Load client configuration
    const result = await dynamoDBService.getItem({
      PK: `CLIENT#${clientId}`,
      SK: 'CONFIG',
    });

    const clientConfig = result.Item as ClientConfiguration | undefined;

    if (!clientConfig?.webhookUrl) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'WEBHOOK_NOT_CONFIGURED',
            message: 'Webhook URL not configured for this client',
          },
          meta: {
            requestId: event.requestContext.requestId,
            timestamp: new Date().toISOString(),
          },
        }),
      };
    }

    // Create test verification case
    const testCase: VerificationEntity = {
      PK: `CASE#ver_test_${Date.now()}`,
      SK: 'META',
      verificationId: `ver_test_${Date.now()}`,
      clientId,
      status: 'approved',
      documentType: 'omang',
      customer: {
        email: 'test@example.com',
        name: 'Test User',
      },
      extractedData: {
        idNumber: '123456789',
        surname: 'User',
        forenames: 'Test',
        dateOfBirth: '1990-01-15',
        sex: 'M',
        dateOfExpiry: '2030-01-15',
      },
      biometricSummary: {
        livenessScore: 95,
        similarityScore: 90,
        overallScore: 92.5,
        passed: true,
        requiresManualReview: false,
        processedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      GSI1PK: `CLIENT#${clientId}`,
      GSI1SK: `approved#${new Date().toISOString()}`,
      GSI2PK: `DATE#${new Date().toISOString().split('T')[0]}`,
      GSI2SK: `${new Date().toISOString()}#ver_test_${Date.now()}`,
    };

    // Send test webhook
    await webhookService.sendWebhook(testCase, 'verification.approved');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Test webhook sent successfully',
        webhookUrl: clientConfig.webhookUrl,
        meta: {
          requestId: event.requestContext.requestId,
          timestamp: new Date().toISOString(),
        },
      }),
    };
  } catch (error) {
    console.error('Error sending test webhook:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send test webhook',
        },
        meta: {
          requestId: event.requestContext.requestId,
          timestamp: new Date().toISOString(),
        },
      }),
    };
  }
}
