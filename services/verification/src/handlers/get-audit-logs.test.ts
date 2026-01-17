import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

// Mock the middleware before importing handler
vi.mock('../middleware/audit-context', () => ({
  auditContextMiddleware: () => ({
    before: async () => {},
  }),
  getAuditContext: () => ({
    userId: 'test-user',
    clientId: 'test-client',
    ipAddress: '192.168.1.1',
    userAgent: 'test-agent',
  }),
}));

vi.mock('../middleware/security-headers', () => ({
  securityHeadersMiddleware: () => ({
    after: async () => {},
  }),
}));

vi.mock('../services/audit', () => ({
  AuditService: vi.fn().mockImplementation(() => ({
    logPermissionDenied: vi.fn().mockResolvedValue(undefined),
  })),
}));

const dynamodbMock = mockClient(DynamoDBClient);

// Import after mocks are set up
import { getAuditLogs } from './get-audit-logs';

describe('get-audit-logs handler', () => {
  beforeEach(() => {
    dynamodbMock.reset();
  });

  const createMockEvent = (queryParams: Record<string, string> = {}, role: string = 'admin') => ({
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/api/v1/audit',
    pathParameters: null,
    queryStringParameters: queryParams,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: '123456789',
      apiId: 'test-api',
      authorizer: { claims: { sub: 'test-user', 'custom:role': role } },
      protocol: 'HTTP/1.1',
      httpMethod: 'GET',
      identity: { sourceIp: '192.168.1.1' } as any,
      path: '/api/v1/audit',
      stage: 'test',
      requestId: 'test-request-id',
      requestTimeEpoch: Date.now(),
      resourceId: 'test-resource',
      resourcePath: '/api/v1/audit',
    },
    resource: '/api/v1/audit',
  } as any);

  describe('authorization', () => {
    it('returns 403 when user has no role', async () => {
      const event = createMockEvent({ startDate: '2026-01-17', endDate: '2026-01-17' }, '');

      const response = await getAuditLogs(event, {} as any, () => {});

      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body).error).toContain('Access denied');
    });

    it('returns 403 when user has analyst role', async () => {
      const event = createMockEvent({ startDate: '2026-01-17', endDate: '2026-01-17' }, 'analyst');

      const response = await getAuditLogs(event, {} as any, () => {});

      expect(response.statusCode).toBe(403);
    });

    it('allows admin role to access audit logs', async () => {
      dynamodbMock.on(QueryCommand).resolves({ Items: [] });
      const event = createMockEvent({ startDate: '2026-01-17', endDate: '2026-01-17' }, 'admin');

      const response = await getAuditLogs(event, {} as any, () => {});

      expect(response.statusCode).toBe(200);
    });

    it('allows compliance_officer role to access audit logs', async () => {
      dynamodbMock.on(QueryCommand).resolves({ Items: [] });
      const event = createMockEvent({ startDate: '2026-01-17', endDate: '2026-01-17' }, 'compliance_officer');

      const response = await getAuditLogs(event, {} as any, () => {});

      expect(response.statusCode).toBe(200);
    });

    it('allows auditor role to access audit logs', async () => {
      dynamodbMock.on(QueryCommand).resolves({ Items: [] });
      const event = createMockEvent({ startDate: '2026-01-17', endDate: '2026-01-17' }, 'auditor');

      const response = await getAuditLogs(event, {} as any, () => {});

      expect(response.statusCode).toBe(200);
    });
  });

  describe('validation', () => {
    it('returns 400 when startDate is missing', async () => {
      const event = createMockEvent({ endDate: '2026-01-17' });

      const response = await getAuditLogs(event, {} as any, () => {});

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('startDate and endDate are required');
    });

    it('returns 400 when endDate is missing', async () => {
      const event = createMockEvent({ startDate: '2026-01-17' });

      const response = await getAuditLogs(event, {} as any, () => {});

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('startDate and endDate are required');
    });

    it('returns 400 when resourceId provided without resourceType', async () => {
      const event = createMockEvent({
        startDate: '2026-01-17',
        endDate: '2026-01-17',
        resourceId: 'CASE#123',
      });

      const response = await getAuditLogs(event, {} as any, () => {});

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('resourceType is required');
    });
  });

  describe('query by date range', () => {
    it('queries audit logs by date range', async () => {
      const mockItems = [
        marshall({
          PK: 'AUDIT#2026-01-17',
          SK: '2026-01-17T10:00:00.000Z#uuid-1',
          action: 'CASE_APPROVED',
          userId: 'USER#analyst',
        }),
      ];

      dynamodbMock.on(QueryCommand).resolves({ Items: mockItems });

      const event = createMockEvent({
        startDate: '2026-01-17',
        endDate: '2026-01-17',
      });

      const response = await getAuditLogs(event, {} as any, () => {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toHaveLength(1);
      expect(body.items[0].action).toBe('CASE_APPROVED');
    });
  });

  describe('query by user', () => {
    it('queries audit logs by userId using GSI5', async () => {
      const mockItems = [
        marshall({
          GSI5PK: 'USER#analyst-123',
          GSI5SK: '2026-01-17T10:00:00.000Z#uuid-1',
          action: 'CASE_APPROVED',
          userId: 'analyst-123',
        }),
      ];

      dynamodbMock.on(QueryCommand).resolves({ Items: mockItems });

      const event = createMockEvent({
        startDate: '2026-01-17',
        endDate: '2026-01-17',
        userId: 'analyst-123',
      });

      const response = await getAuditLogs(event, {} as any, () => {});

      expect(response.statusCode).toBe(200);

      // Verify GSI5 was used
      const calls = dynamodbMock.calls();
      expect(calls[0].args[0].input.IndexName).toBe('GSI5-AuditByUser');
    });
  });

  describe('query by action', () => {
    it('queries audit logs by action type using GSI7', async () => {
      const mockItems = [
        marshall({
          GSI7PK: 'ACTION#CASE_REJECTED',
          GSI7SK: '2026-01-17T10:00:00.000Z#uuid-1',
          action: 'CASE_REJECTED',
        }),
      ];

      dynamodbMock.on(QueryCommand).resolves({ Items: mockItems });

      const event = createMockEvent({
        startDate: '2026-01-17',
        endDate: '2026-01-17',
        action: 'CASE_REJECTED',
      });

      const response = await getAuditLogs(event, {} as any, () => {});

      expect(response.statusCode).toBe(200);

      // Verify GSI7 was used
      const calls = dynamodbMock.calls();
      expect(calls[0].args[0].input.IndexName).toBe('GSI7-AuditByAction');
    });
  });

  describe('query by resource', () => {
    it('queries audit logs by resourceId using GSI6', async () => {
      const mockItems = [
        marshall({
          GSI6PK: 'case#CASE-123',
          GSI6SK: '2026-01-17T10:00:00.000Z#uuid-1',
          action: 'CASE_VIEWED',
          resourceId: 'CASE-123',
        }),
      ];

      dynamodbMock.on(QueryCommand).resolves({ Items: mockItems });

      const event = createMockEvent({
        startDate: '2026-01-17',
        endDate: '2026-01-17',
        resourceId: 'CASE-123',
        resourceType: 'case',
      });

      const response = await getAuditLogs(event, {} as any, () => {});

      expect(response.statusCode).toBe(200);

      // Verify GSI6 was used
      const calls = dynamodbMock.calls();
      expect(calls[0].args[0].input.IndexName).toBe('GSI6-AuditByResource');
    });
  });

  describe('pagination', () => {
    it('returns nextToken when more results available', async () => {
      const lastKey = { PK: { S: 'AUDIT#2026-01-17' }, SK: { S: '2026-01-17T10:00:00.000Z#uuid-1' } };

      dynamodbMock.on(QueryCommand).resolves({
        Items: [marshall({ action: 'CASE_APPROVED' })],
        LastEvaluatedKey: lastKey,
      });

      const event = createMockEvent({
        startDate: '2026-01-17',
        endDate: '2026-01-17',
        limit: '10',
      });

      const response = await getAuditLogs(event, {} as any, () => {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.nextToken).toBeDefined();
      expect(body.nextToken).not.toBeNull();
    });

    it('uses nextToken for pagination', async () => {
      const lastKey = { PK: { S: 'AUDIT#2026-01-17' }, SK: { S: '2026-01-17T10:00:00.000Z#uuid-1' } };
      const nextToken = Buffer.from(JSON.stringify(lastKey)).toString('base64');

      dynamodbMock.on(QueryCommand).resolves({
        Items: [marshall({ action: 'CASE_REJECTED' })],
      });

      const event = createMockEvent({
        startDate: '2026-01-17',
        endDate: '2026-01-17',
        nextToken,
      });

      const response = await getAuditLogs(event, {} as any, () => {});

      expect(response.statusCode).toBe(200);

      // Verify ExclusiveStartKey was set
      const calls = dynamodbMock.calls();
      expect(calls[0].args[0].input.ExclusiveStartKey).toEqual(lastKey);
    });

    it('returns null nextToken when no more results', async () => {
      dynamodbMock.on(QueryCommand).resolves({
        Items: [marshall({ action: 'CASE_APPROVED' })],
        // No LastEvaluatedKey
      });

      const event = createMockEvent({
        startDate: '2026-01-17',
        endDate: '2026-01-17',
      });

      const response = await getAuditLogs(event, {} as any, () => {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.nextToken).toBeNull();
    });
  });

  describe('error handling', () => {
    it('returns 500 on DynamoDB error', async () => {
      dynamodbMock.on(QueryCommand).rejects(new Error('DynamoDB error'));

      const event = createMockEvent({
        startDate: '2026-01-17',
        endDate: '2026-01-17',
      });

      const response = await getAuditLogs(event, {} as any, () => {});

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).error).toBe('Failed to query audit logs');
    });
  });

  describe('response format', () => {
    it('returns items array and count', async () => {
      const mockItems = [
        marshall({ action: 'CASE_APPROVED' }),
        marshall({ action: 'CASE_REJECTED' }),
      ];

      dynamodbMock.on(QueryCommand).resolves({ Items: mockItems });

      const event = createMockEvent({
        startDate: '2026-01-17',
        endDate: '2026-01-17',
      });

      const response = await getAuditLogs(event, {} as any, () => {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toHaveLength(2);
      expect(body.count).toBe(2);
    });

    it('returns empty array when no results', async () => {
      dynamodbMock.on(QueryCommand).resolves({ Items: [] });

      const event = createMockEvent({
        startDate: '2026-01-17',
        endDate: '2026-01-17',
      });

      const response = await getAuditLogs(event, {} as any, () => {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toHaveLength(0);
      expect(body.count).toBe(0);
    });
  });
});
