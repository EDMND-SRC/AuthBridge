import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { DynamoDBService } from '../../src/services/dynamodb';

/**
 * Integration tests for GET /api/v1/verifications/{id}
 *
 * These tests use DynamoDB Local to test the full handler flow
 * Run DynamoDB Local via Java: dynamodb-local -port 8000 -sharedDb
 */

const TABLE_NAME = 'AuthBridgeTable-Test';
const REGION = 'af-south-1';
const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';

// Create a test-specific DynamoDB service
const db = new DynamoDBService(TABLE_NAME, REGION, DYNAMODB_ENDPOINT);

const mockContext: Context = {
  awsRequestId: 'test-request-id',
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'test-function',
  functionVersion: '1',
  invokedFunctionArn: 'arn:aws:lambda:af-south-1:123456789012:function:test',
  memoryLimitInMB: '512',
  logGroupName: '/aws/lambda/test',
  logStreamName: '2026/01/16/[$LATEST]test',
  getRemainingTimeInMillis: () => 30000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
};

// Helper to create test verification data with all required fields
function createTestVerification(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const ttl = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  const verificationId = overrides.verificationId as string || `ver_test_${Date.now()}`;
  const clientId = overrides.clientId as string || 'client_test';
  const status = overrides.status as string || 'created';
  const createdAt = overrides.createdAt as string || now;

  return {
    PK: `CASE#${verificationId}`,
    SK: 'META',
    GSI1PK: `CLIENT#${clientId}`,
    GSI1SK: `${status}#${createdAt}`,
    GSI2PK: `DATE#${createdAt.split('T')[0]}`,
    GSI2SK: `${createdAt}#${verificationId}`,
    verificationId,
    clientId,
    status,
    documentType: 'omang',
    createdAt,
    updatedAt: now,
    expiresAt,
    ttl,
    ...overrides,
  };
}

// Helper to create test document data
function createTestDocument(verificationId: string, overrides: Record<string, unknown> = {}) {
  const documentId = overrides.documentId as string || `doc_test_${Date.now()}`;
  const now = new Date().toISOString();

  return {
    PK: `CASE#${verificationId}`,
    SK: `DOC#${documentId}`,
    documentId,
    verificationId,
    clientId: 'client_test',
    documentType: 'omang_front',
    s3Key: `verifications/${verificationId}/${documentId}.jpg`,
    s3Bucket: 'test-bucket',
    fileSize: 1024000,
    mimeType: 'image/jpeg',
    status: 'processed',
    uploadedAt: now,
    ...overrides,
  };
}

describe('GET /api/v1/verifications/{id} - Integration', () => {
  // Import handler dynamically to allow env vars to be set first
  let handler: (event: APIGatewayProxyEvent, context: Context) => Promise<any>;

  beforeAll(async () => {
    // Set environment variables for handler
    process.env.TABLE_NAME = TABLE_NAME;
    process.env.AWS_REGION = REGION;
    process.env.DYNAMODB_ENDPOINT = DYNAMODB_ENDPOINT;

    // Dynamic import after env vars are set
    const module = await import('../../src/handlers/get-verification-status');
    handler = module.handler;
  });

  afterAll(async () => {
    // Cleanup test data
    delete process.env.TABLE_NAME;
    delete process.env.AWS_REGION;
    delete process.env.DYNAMODB_ENDPOINT;
  });

  describe('Created Status', () => {
    it('should return verification in created status with no documents', async () => {
      const verificationId = `ver_created_${Date.now()}`;
      const verification = createTestVerification({
        verificationId,
        status: 'created',
        customer: { email: 'test@example.com' },
      });

      await db.putVerification(verification as any);

      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: { id: verificationId },
        requestContext: {
          authorizer: { clientId: 'client_test' },
          requestId: 'req_123',
          identity: { sourceIp: '1.2.3.4' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.verificationId).toBe(verificationId);
      expect(body.status).toBe('created');
      expect(body.documentType).toBe('omang');
      expect(body.documents).toEqual([]);
      expect(body.meta).toHaveProperty('requestId');
      expect(body.meta).toHaveProperty('timestamp');
    });
  });

  describe('Approved Status', () => {
    it.skipIf(!process.env.DATA_ENCRYPTION_KEY_ID)('should return verification in approved status with masked PII', async () => {
      const verificationId = `ver_approved_${Date.now()}`;
      const verification = createTestVerification({
        verificationId,
        status: 'approved',
        customer: {
          email: 'approved@example.com',
          name: 'Jane Doe',
        },
        extractedData: {
          idNumber: '987654321',
          dateOfBirth: '1990-01-15',
          sex: 'F',
          dateOfExpiry: '2030-01-15',
          district: 'Gaborone',
          locality: 'Block 8',
        },
        biometricSummary: {
          overallScore: 92.5,
          livenessScore: 95.0,
          similarityScore: 90.0,
          passed: true,
          requiresManualReview: false,
          processedAt: '2026-01-16T11:10:00Z',
        },
        submittedAt: '2026-01-16T11:05:00Z',
        completedAt: '2026-01-16T11:10:00Z',
      });

      const document = createTestDocument(verificationId, {
        documentId: `doc_front_${Date.now()}`,
        status: 'processed',
        ocrConfidence: 95.2,
        processedAt: '2026-01-16T11:02:00Z',
      });

      await db.putVerification(verification as any);
      await db.putDocument(document as any);

      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: { id: verificationId },
        requestContext: {
          authorizer: { clientId: 'client_test' },
          requestId: 'req_456',
          identity: { sourceIp: '1.2.3.4' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.status).toBe('approved');
      expect(body.customer.name).toBe('Jane Doe');
      expect(body.customer.omangNumber).toBe('***4321'); // Masked
      expect(body.customer.address).toBe('Gaborone'); // Masked to district only
      expect(body.extractedData.omangNumber).toBe('***4321'); // Masked
      expect(body.extractedData.address.district).toBe('Gaborone');
      expect(body.extractedData.address.locality).toBe('Block 8');
      expect(body.biometricScore).toBe(92.5);
      expect(body.documents).toHaveLength(1);
      expect(body.documents[0].ocrStatus).toBe('completed');
      expect(body.documents[0].ocrConfidence).toBe(95.2);
    });
  });

  describe('Rejected Status', () => {
    it('should return verification in rejected status with rejection reason', async () => {
      const verificationId = `ver_rejected_${Date.now()}`;
      const verification = createTestVerification({
        verificationId,
        status: 'rejected',
        customer: { email: 'rejected@example.com' },
        rejectionReason: 'Face does not match ID photo',
        rejectionCode: 'FACE_MISMATCH',
        submittedAt: '2026-01-16T11:05:00Z',
        completedAt: '2026-01-16T11:10:00Z',
      });

      await db.putVerification(verification as any);

      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: { id: verificationId },
        requestContext: {
          authorizer: { clientId: 'client_test' },
          requestId: 'req_789',
          identity: { sourceIp: '1.2.3.4' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.status).toBe('rejected');
      expect(body.rejectionReason).toBe('Face does not match ID photo');
      expect(body.rejectionCode).toBe('FACE_MISMATCH');
      expect(body.customer.email).toBe('rejected@example.com');
      expect(body.customer).not.toHaveProperty('name');
      expect(body).not.toHaveProperty('extractedData');
    });
  });

  describe('Expired Status', () => {
    it('should return verification in expired status with expiresAt', async () => {
      const verificationId = `ver_expired_${Date.now()}`;
      const expiresAt = '2026-01-10T11:00:00Z'; // Past date
      const verification = createTestVerification({
        verificationId,
        status: 'expired',
        customer: { email: 'expired@example.com' },
        expiresAt,
      });

      await db.putVerification(verification as any);

      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: { id: verificationId },
        requestContext: {
          authorizer: { clientId: 'client_test' },
          requestId: 'req_expired',
          identity: { sourceIp: '1.2.3.4' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.status).toBe('expired');
      expect(body.expiresAt).toBe(expiresAt);
      expect(body.customer.email).toBe('expired@example.com');
    });
  });

  describe('Error Cases', () => {
    it('should return 404 when verification not found', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: { id: 'ver_nonexistent_12345' },
        requestContext: {
          authorizer: { clientId: 'client_test' },
          requestId: 'req_404',
          identity: { sourceIp: '1.2.3.4' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VERIFICATION_NOT_FOUND');
    });

    it('should return 403 when client does not own verification', async () => {
      const verificationId = `ver_other_${Date.now()}`;
      const verification = createTestVerification({
        verificationId,
        clientId: 'client_other', // Different client
        customer: { email: 'other@example.com' },
      });

      await db.putVerification(verification as any);

      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: { id: verificationId },
        requestContext: {
          authorizer: { clientId: 'client_test' }, // Different from owner
          requestId: 'req_403',
          identity: { sourceIp: '1.2.3.4' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when clientId is missing', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: { id: 'ver_any' },
        requestContext: {
          authorizer: {}, // No clientId
          requestId: 'req_401',
          identity: { sourceIp: '1.2.3.4' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 when verification ID is missing', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: {}, // No id
        requestContext: {
          authorizer: { clientId: 'client_test' },
          requestId: 'req_400',
          identity: { sourceIp: '1.2.3.4' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Response Headers', () => {
    it('should include rate limit headers in response', async () => {
      const verificationId = `ver_headers_${Date.now()}`;
      const verification = createTestVerification({
        verificationId,
        customer: { email: 'headers@example.com' },
      });

      await db.putVerification(verification as any);

      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: { id: verificationId },
        requestContext: {
          authorizer: { clientId: 'client_test' },
          requestId: 'req_headers',
          identity: { sourceIp: '1.2.3.4' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.headers).toHaveProperty('X-RateLimit-Limit');
      expect(result.headers).toHaveProperty('X-RateLimit-Remaining');
      expect(result.headers).toHaveProperty('X-RateLimit-Reset');
      expect(result.headers).toHaveProperty('Content-Type', 'application/json');
      expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
    });
  });
});
