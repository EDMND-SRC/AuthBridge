import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

// Use vi.hoisted to define mock functions that will be used in vi.mock factories
const { mockDynamoDBSend } = vi.hoisted(() => ({
  mockDynamoDBSend: vi.fn(),
}));

// Mock all AWS SDK modules before any imports
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(function() { return { send: mockDynamoDBSend }; }),
  GetItemCommand: vi.fn(function(params) { return { ...params, _type: 'GetItemCommand' }; }),
}));

vi.mock('@aws-sdk/util-dynamodb', () => ({
  unmarshall: vi.fn(function(obj) { return obj; }),
}));

vi.mock('../middleware/audit-context', () => ({
  auditContextMiddleware: vi.fn(function() { return { before: vi.fn() }; }),
}));

vi.mock('../middleware/security-headers', () => ({
  securityHeadersMiddleware: vi.fn(function() { return { after: vi.fn() }; }),
}));

vi.mock('../middleware/rbac.js', () => ({
  requirePermission: vi.fn(function() { return { before: vi.fn() }; }),
}));

// Import the module once after mocks are set up
import { handler } from './get-data-request-status';

describe('getDataRequestStatus', () => {
  beforeEach(() => {
    mockDynamoDBSend.mockReset();
  });

  const createEvent = (requestId?: string): APIGatewayProxyEvent => ({
    pathParameters: requestId ? { requestId } : {},
    requestContext: { identity: { sourceIp: '127.0.0.1' } } as any,
    headers: {},
  } as APIGatewayProxyEvent);

  it('should return export request status with download URL', async () => {
    mockDynamoDBSend.mockResolvedValue({
      Item: {
        requestId: 'dsr_abc123',
        type: 'export',
        status: 'completed',
        exportUrl: 'https://s3.example.com/export.json',
        exportExpiresAt: '2026-01-18T13:00:00Z',
        completedAt: '2026-01-18T12:02:00Z',
        createdAt: '2026-01-18T12:00:00Z',
      },
    });

    const response = await handler(createEvent('dsr_abc123'), {} as Context);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.requestId).toBe('dsr_abc123');
    expect(body.type).toBe('export');
    expect(body.status).toBe('completed');
    expect(body.downloadUrl).toBe('https://s3.example.com/export.json');
    expect(body.downloadExpiresAt).toBe('2026-01-18T13:00:00Z');
  });

  it('should return deletion request status with scheduled date', async () => {
    mockDynamoDBSend.mockResolvedValue({
      Item: {
        requestId: 'dsr_def456',
        type: 'deletion',
        status: 'completed',
        scheduledDeletionDate: '2026-02-17T00:00:00Z',
        completedAt: '2026-01-18T12:05:00Z',
        createdAt: '2026-01-18T12:00:00Z',
      },
    });

    const response = await handler(createEvent('dsr_def456'), {} as Context);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.type).toBe('deletion');
    expect(body.scheduledDeletionDate).toBe('2026-02-17T00:00:00Z');
  });

  it('should return failed request with error message', async () => {
    mockDynamoDBSend.mockResolvedValue({
      Item: {
        requestId: 'dsr_failed',
        type: 'export',
        status: 'failed',
        errorMessage: 'Export processing failed',
        createdAt: '2026-01-18T12:00:00Z',
      },
    });

    const response = await handler(createEvent('dsr_failed'), {} as Context);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('failed');
    expect(body.errorMessage).toBe('Export processing failed');
  });

  it('should return 404 when request not found', async () => {
    mockDynamoDBSend.mockResolvedValue({ Item: null });

    const response = await handler(createEvent('dsr_notfound'), {} as Context);

    expect(response.statusCode).toBe(404);
    expect(response.body).toContain('Data request not found');
  });

  it('should return 400 when requestId is missing', async () => {
    const response = await handler(createEvent(), {} as Context);

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('requestId is required');
  });

  it('should return 400 when requestId has invalid format', async () => {
    const response = await handler(createEvent('invalid-format'), {} as Context);

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('Invalid requestId format');
  });

  it('should handle errors gracefully', async () => {
    mockDynamoDBSend.mockRejectedValue(new Error('DynamoDB error'));

    const response = await handler(createEvent('dsr_abc123'), {} as Context);

    expect(response.statusCode).toBe(500);
    expect(response.body).toContain('Failed to get data request status');
  });
});
