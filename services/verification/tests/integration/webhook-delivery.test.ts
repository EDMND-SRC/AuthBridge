import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { WebhookService } from '../../src/services/webhook.js';
import { DynamoDBService } from '../../src/services/dynamodb.js';
import type { VerificationEntity } from '../../src/types/verification.js';
import type { ClientConfiguration } from '../../src/types/webhook.js';
import http from 'http';
import crypto from 'crypto';

/**
 * Integration tests for webhook delivery.
 *
 * PREREQUISITES:
 * - DynamoDB Local must be running on port 8000
 * - Start with: dynamodb-local -port 8000 -sharedDb
 * - Run setup script: bash services/verification/scripts/setup-dynamodb-local.sh
 *
 * These tests verify end-to-end webhook delivery including:
 * - Signature generation and verification
 * - Retry logic on server errors
 * - No retry on 4xx client errors
 */

// Check if DynamoDB Local is available
async function isDynamoDBLocalAvailable(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ TableName: 'test' }),
      signal: AbortSignal.timeout(2000),
    });
    // DynamoDB Local returns 400 for invalid requests, which means it's running
    return response.status === 400 || response.status === 200;
  } catch {
    return false;
  }
}

describe('Webhook Delivery Integration Tests', () => {
  let webhookService: WebhookService;
  let dynamoDBService: DynamoDBService;
  let mockServer: http.Server;
  let receivedWebhooks: Array<{
    headers: http.IncomingHttpHeaders;
    body: any;
    timestamp: number;
  }> = [];
  const WEBHOOK_PORT = 3456;
  const WEBHOOK_URL = `http://localhost:${WEBHOOK_PORT}/webhook`;
  const WEBHOOK_SECRET = 'test_webhook_secret_for_integration_testing';
  let dynamoDBAvailable = false;

  beforeAll(async () => {
    // Check if DynamoDB Local is available
    dynamoDBAvailable = await isDynamoDBLocalAvailable();

    if (!dynamoDBAvailable) {
      console.warn('\n⚠️  DynamoDB Local not running on port 8000');
      console.warn('   To run these tests:');
      console.warn('   1. Start DynamoDB Local: dynamodb-local -port 8000 -sharedDb');
      console.warn('   2. Run setup: bash services/verification/scripts/setup-dynamodb-local.sh');
      console.warn('   Skipping integration tests...\n');
      return;
    }

    // Start mock webhook server
    mockServer = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/webhook') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          receivedWebhooks.push({
            headers: req.headers,
            body: JSON.parse(body),
            timestamp: Date.now(),
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ received: true }));
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise<void>((resolve) => {
      mockServer.listen(WEBHOOK_PORT, () => {
        console.log(`Mock webhook server listening on port ${WEBHOOK_PORT}`);
        resolve();
      });
    });

    // Initialize services with DynamoDB Local endpoint
    dynamoDBService = new DynamoDBService(
      'AuthBridgeTable',
      'af-south-1',
      'http://localhost:8000'
    );
    webhookService = new WebhookService(dynamoDBService);
  });

  afterAll(async () => {
    if (!dynamoDBAvailable) return;

    // Stop mock server
    if (mockServer) {
      await new Promise<void>((resolve) => {
        mockServer.close(() => {
          console.log('Mock webhook server stopped');
          resolve();
        });
      });
    }
  });

  beforeEach(() => {
    receivedWebhooks = [];
  });

  it('should deliver webhook with valid signature', async () => {
    if (!dynamoDBAvailable) {
      console.log('Skipping: DynamoDB Local not available');
      return;
    }

    // Create test client configuration
    const clientConfig: ClientConfiguration = {
      PK: 'CLIENT#test_client_webhook',
      SK: 'CONFIG',
      clientId: 'test_client_webhook',
      companyName: 'Test Company',
      tier: 'business',
      apiKey: 'hashed_key',
      webhookUrl: WEBHOOK_URL,
      webhookSecret: WEBHOOK_SECRET,
      webhookEnabled: true,
      webhookEvents: ['verification.approved'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dynamoDBService.putItem(clientConfig);

    // Create test verification case
    const testCase: VerificationEntity = {
      PK: 'CASE#ver_webhook_test',
      SK: 'META',
      verificationId: 'ver_webhook_test',
      clientId: 'test_client_webhook',
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
      GSI1PK: 'CLIENT#test_client_webhook',
      GSI1SK: 'approved#' + new Date().toISOString(),
      GSI2PK: 'DATE#' + new Date().toISOString().split('T')[0],
      GSI2SK: new Date().toISOString() + '#ver_webhook_test',
    };

    // Send webhook
    await webhookService.sendWebhook(testCase, 'verification.approved');

    // Wait for webhook delivery
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify webhook was received
    expect(receivedWebhooks.length).toBe(1);

    const webhook = receivedWebhooks[0];

    // Verify headers
    expect(webhook.headers['content-type']).toBe('application/json');
    expect(webhook.headers['x-webhook-event']).toBe('verification.approved');
    expect(webhook.headers['x-webhook-signature']).toMatch(/^sha256=/);
    expect(webhook.headers['user-agent']).toBe('AuthBridge-Webhooks/1.0');

    // Verify payload
    expect(webhook.body.event).toBe('verification.approved');
    expect(webhook.body.data.verificationId).toBe('ver_webhook_test');
    expect(webhook.body.data.status).toBe('approved');
    expect(webhook.body.data.customer.omangNumber).toBe('***6789'); // Masked

    // Verify signature
    const signature = webhook.headers['x-webhook-signature']?.toString().replace('sha256=', '');
    const timestamp = webhook.headers['x-webhook-timestamp'];
    const payloadString = JSON.stringify(webhook.body);
    const signedPayload = `${timestamp}.${payloadString}`;
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(signedPayload)
      .digest('hex');

    expect(signature).toBe(expectedSignature);
  });

  it('should retry on server error', async () => {
    if (!dynamoDBAvailable) {
      console.log('Skipping: DynamoDB Local not available');
      return;
    }

    let attemptCount = 0;

    // Create temporary server that fails twice then succeeds
    const retryServer = http.createServer((req, res) => {
      attemptCount++;
      if (attemptCount < 3) {
        res.writeHead(500);
        res.end('Internal Server Error');
      } else {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          receivedWebhooks.push({
            headers: req.headers,
            body: JSON.parse(body),
            timestamp: Date.now(),
          });
          res.writeHead(200);
          res.end(JSON.stringify({ received: true }));
        });
      }
    });

    const RETRY_PORT = 3457;
    await new Promise<void>((resolve) => {
      retryServer.listen(RETRY_PORT, resolve);
    });

    try {
      // Create client config with retry server
      const clientConfig: ClientConfiguration = {
        PK: 'CLIENT#test_client_retry',
        SK: 'CONFIG',
        clientId: 'test_client_retry',
        companyName: 'Test Company',
        tier: 'business',
        apiKey: 'hashed_key',
        webhookUrl: `http://localhost:${RETRY_PORT}/webhook`,
        webhookSecret: WEBHOOK_SECRET,
        webhookEnabled: true,
        webhookEvents: ['verification.approved'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await dynamoDBService.putItem(clientConfig);

      const testCase: VerificationEntity = {
        PK: 'CASE#ver_retry_test',
        SK: 'META',
        verificationId: 'ver_retry_test',
        clientId: 'test_client_retry',
        status: 'approved',
        documentType: 'omang',
        customer: { email: 'test@example.com' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        GSI1PK: 'CLIENT#test_client_retry',
        GSI1SK: 'approved#' + new Date().toISOString(),
        GSI2PK: 'DATE#' + new Date().toISOString().split('T')[0],
        GSI2SK: new Date().toISOString() + '#ver_retry_test',
      };

      // Send webhook (should retry and eventually succeed)
      await webhookService.sendWebhook(testCase, 'verification.approved');

      // Wait for retries
      await new Promise((resolve) => setTimeout(resolve, 7000)); // 1s + 5s + buffer

      // Verify webhook was eventually delivered
      expect(attemptCount).toBe(3);
      expect(receivedWebhooks.length).toBe(1);
    } finally {
      await new Promise<void>((resolve) => {
        retryServer.close(() => resolve());
      });
    }
  }, 15000); // Increase timeout for retry test

  it('should not retry on 4xx client error', async () => {
    if (!dynamoDBAvailable) {
      console.log('Skipping: DynamoDB Local not available');
      return;
    }

    let attemptCount = 0;

    // Create server that always returns 400
    const clientErrorServer = http.createServer((req, res) => {
      attemptCount++;
      res.writeHead(400);
      res.end('Bad Request');
    });

    const ERROR_PORT = 3458;
    await new Promise<void>((resolve) => {
      clientErrorServer.listen(ERROR_PORT, resolve);
    });

    try {
      const clientConfig: ClientConfiguration = {
        PK: 'CLIENT#test_client_4xx',
        SK: 'CONFIG',
        clientId: 'test_client_4xx',
        companyName: 'Test Company',
        tier: 'business',
        apiKey: 'hashed_key',
        webhookUrl: `http://localhost:${ERROR_PORT}/webhook`,
        webhookSecret: WEBHOOK_SECRET,
        webhookEnabled: true,
        webhookEvents: ['verification.approved'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await dynamoDBService.putItem(clientConfig);

      const testCase: VerificationEntity = {
        PK: 'CASE#ver_4xx_test',
        SK: 'META',
        verificationId: 'ver_4xx_test',
        clientId: 'test_client_4xx',
        status: 'approved',
        documentType: 'omang',
        customer: { email: 'test@example.com' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        GSI1PK: 'CLIENT#test_client_4xx',
        GSI1SK: 'approved#' + new Date().toISOString(),
        GSI2PK: 'DATE#' + new Date().toISOString().split('T')[0],
        GSI2SK: new Date().toISOString() + '#ver_4xx_test',
      };

      await webhookService.sendWebhook(testCase, 'verification.approved');

      // Wait briefly
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Should only attempt once (no retries on 4xx)
      expect(attemptCount).toBe(1);
    } finally {
      await new Promise<void>((resolve) => {
        clientErrorServer.close(() => resolve());
      });
    }
  });
});
