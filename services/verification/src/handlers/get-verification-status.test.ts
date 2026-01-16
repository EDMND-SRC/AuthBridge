import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

// Mock services before importing handler
const mockGetVerification = vi.fn();
const mockQueryDocuments = vi.fn();

vi.mock('../services/dynamodb', () => ({
  DynamoDBService: vi.fn().mockImplementation(() => ({
    getVerification: mockGetVerification,
    queryDocuments: mockQueryDocuments,
  })),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    audit: vi.fn(),
  },
}));

import { handler } from './get-verification-status';

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

describe('get-verification-status handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVerification.mockReset();
    mockQueryDocuments.mockReset();
  });

  describe('Authentication', () => {
    it('should return 401 when clientId is missing', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: { id: 'ver_abc123' },
        requestContext: {
          authorizer: {},
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Validation', () => {
    it('should return 400 when verification ID is missing', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: {},
        requestContext: {
          authorizer: { clientId: 'client_xyz' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Authorization', () => {
    it('should return 404 when verification not found', async () => {
      mockGetVerification.mockResolvedValue(null);

      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: { id: 'ver_invalid' },
        requestContext: {
          authorizer: { clientId: 'client_xyz' },
          requestId: 'req_123',
          identity: { sourceIp: '1.2.3.4' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VERIFICATION_NOT_FOUND');
    });

    it('should return 403 when client does not own verification', async () => {
      mockGetVerification.mockResolvedValue({
        verificationId: 'ver_abc123',
        clientId: 'client_other',
        status: 'created',
      });
      mockQueryDocuments.mockResolvedValue([]);

      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: { id: 'ver_abc123' },
        requestContext: {
          authorizer: { clientId: 'client_xyz' },
          requestId: 'req_123',
          identity: { sourceIp: '1.2.3.4' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Success Responses', () => {
    it('should return verification in created status', async () => {
      mockGetVerification.mockResolvedValue({
        verificationId: 'ver_abc123',
        clientId: 'client_xyz',
        status: 'created',
        documentType: 'omang',
        customerEmail: 'john@example.com',
        createdAt: '2026-01-16T11:00:00Z',
        updatedAt: '2026-01-16T11:00:00Z',
      });
      mockQueryDocuments.mockResolvedValue([]);

      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: { id: 'ver_abc123' },
        requestContext: {
          authorizer: { clientId: 'client_xyz' },
          requestId: 'req_123',
          identity: { sourceIp: '1.2.3.4' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.verificationId).toBe('ver_abc123');
      expect(body.status).toBe('created');
      expect(body.documentType).toBe('omang');
      expect(body.documents).toEqual([]);
      expect(body.meta.requestId).toBe('test-request-id');
    });

    it('should return verification in approved status with masked PII', async () => {
      mockGetVerification.mockResolvedValue({
        verificationId: 'ver_def456',
        clientId: 'client_xyz',
        status: 'approved',
        documentType: 'omang',
        customer: {
          email: 'jane@example.com',
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
        createdAt: '2026-01-16T11:00:00Z',
        updatedAt: '2026-01-16T11:10:00Z',
        submittedAt: '2026-01-16T11:05:00Z',
        completedAt: '2026-01-16T11:10:00Z',
      });
      mockQueryDocuments.mockResolvedValue([
        {
          documentId: 'doc_abc123',
          documentType: 'omang_front',
          status: 'processed',
          uploadedAt: '2026-01-16T11:01:00Z',
          ocrConfidence: 95.2,
          processedAt: '2026-01-16T11:02:00Z',
        },
      ]);

      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: { id: 'ver_def456' },
        requestContext: {
          authorizer: { clientId: 'client_xyz' },
          requestId: 'req_123',
          identity: { sourceIp: '1.2.3.4' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.status).toBe('approved');
      expect(body.customer.omangNumber).toBe('***4321'); // Masked
      expect(body.extractedData.omangNumber).toBe('***4321'); // Masked
      expect(body.biometricScore).toBe(92.5);
      expect(body.documents).toHaveLength(1);
      expect(body.documents[0].ocrStatus).toBe('completed');
      expect(body.documents[0].ocrConfidence).toBe(95.2);
      expect(body.documents[0].processedAt).toBe('2026-01-16T11:02:00Z');
    });

    it('should return verification in rejected status with rejection reason', async () => {
      mockGetVerification.mockResolvedValue({
        verificationId: 'ver_ghi789',
        clientId: 'client_xyz',
        status: 'rejected',
        documentType: 'omang',
        customer: {
          email: 'bob@example.com',
        },
        rejectionReason: 'Face does not match ID photo',
        rejectionCode: 'FACE_MISMATCH',
        createdAt: '2026-01-16T11:00:00Z',
        updatedAt: '2026-01-16T11:10:00Z',
        submittedAt: '2026-01-16T11:05:00Z',
        completedAt: '2026-01-16T11:10:00Z',
      });
      mockQueryDocuments.mockResolvedValue([]);

      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: { id: 'ver_ghi789' },
        requestContext: {
          authorizer: { clientId: 'client_xyz' },
          requestId: 'req_123',
          identity: { sourceIp: '1.2.3.4' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.status).toBe('rejected');
      expect(body.rejectionReason).toBe('Face does not match ID photo');
      expect(body.rejectionCode).toBe('FACE_MISMATCH');
      expect(body.customer.email).toBe('bob@example.com');
    });
  });

  describe('Response Headers', () => {
    it('should include rate limit headers', async () => {
      mockGetVerification.mockResolvedValue({
        verificationId: 'ver_abc123',
        clientId: 'client_xyz',
        status: 'created',
        documentType: 'omang',
        customerEmail: 'john@example.com',
        createdAt: '2026-01-16T11:00:00Z',
        updatedAt: '2026-01-16T11:00:00Z',
      });
      mockQueryDocuments.mockResolvedValue([]);

      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: { id: 'ver_abc123' },
        requestContext: {
          authorizer: { clientId: 'client_xyz' },
          requestId: 'req_123',
          identity: { sourceIp: '1.2.3.4' },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.headers).toHaveProperty('X-RateLimit-Limit');
      expect(result.headers).toHaveProperty('X-RateLimit-Remaining');
      expect(result.headers).toHaveProperty('X-RateLimit-Reset');
    });
  });
});
