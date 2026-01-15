import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './get-case';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('GET /api/v1/cases/{id}', () => {
  beforeEach(() => {
    ddbMock.reset();
    vi.clearAllMocks();
  });

  const createMockEvent = (caseId: string): Partial<APIGatewayProxyEvent> => ({
    pathParameters: { id: caseId },
    requestContext: {
      requestId: 'test-request-id',
      authorizer: {
        claims: {
          sub: 'user-123',
        },
      },
      identity: {
        sourceIp: '192.168.1.1',
      },
    } as any,
  });

  const mockContext = {} as Context;

  it('should return 400 if case ID is missing', async () => {
    const event = { pathParameters: null } as any;

    const result = await handler(event, mockContext, () => {});

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ error: 'Case ID required' });
  });

  it('should return 404 if case not found', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const event = createMockEvent('case_nonexistent') as APIGatewayProxyEvent;
    const result = await handler(event, mockContext, () => {});

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({ error: 'Case not found' });
  });

  it('should return case data with presigned URLs', async () => {
    const mockCase = {
      PK: 'CASE#case_123',
      SK: 'CASE#case_123',
      caseId: 'case_123',
      status: 'pending',
      customer: {
        name: 'John Doe',
        omangNumber: '123456789',
        dateOfBirth: '1990-01-01',
        gender: 'M',
        address: '123 Main St',
      },
      documents: {
        front: { s3Key: 'docs/front.jpg', uploadedAt: '2026-01-15T10:00:00Z' },
        selfie: { s3Key: 'docs/selfie.jpg', uploadedAt: '2026-01-15T10:01:00Z' },
      },
      extractedData: {
        fullName: 'John Doe',
        idNumber: '123456789',
        dateOfBirth: '1990-01-01',
        confidence: { fullName: 95, idNumber: 98 },
      },
      verificationChecks: {
        faceMatch: { score: 85, status: 'pass' },
        liveness: { status: 'pass', confidence: 92 },
        documentAuthenticity: { score: 88, status: 'pass' },
        omangFormat: { valid: true },
        duplicateCheck: { found: false },
        expiryCheck: { valid: true },
      },
      metadata: {
        clientId: 'client_1',
        clientName: 'Test Client',
        submittedAt: '2026-01-15T09:00:00Z',
      },
    };

    ddbMock.on(GetCommand).resolves({ Item: mockCase });
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const event = createMockEvent('case_123') as APIGatewayProxyEvent;
    const result = await handler(event, mockContext, () => {});

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.caseId).toBe('case_123');
    expect(body.data.customer.name).toBe('John Doe');
    expect(body.data.documents.front.url).toMatch(/^https:\/\//);
    expect(body.meta.requestId).toBe('test-request-id');
  });

  it('should query case history', async () => {
    const mockCase = {
      PK: 'CASE#case_123',
      SK: 'CASE#case_123',
      caseId: 'case_123',
      status: 'pending',
      customer: { name: 'John Doe', omangNumber: '123456789', dateOfBirth: '1990-01-01', gender: 'M', address: '123 Main St' },
      documents: {},
      extractedData: { fullName: 'John Doe', idNumber: '123456789', dateOfBirth: '1990-01-01', confidence: {} },
      verificationChecks: {
        faceMatch: { score: 85, status: 'pass' },
        liveness: { status: 'pass', confidence: 92 },
        documentAuthenticity: { score: 88, status: 'pass' },
        omangFormat: { valid: true },
        duplicateCheck: { found: false },
        expiryCheck: { valid: true },
      },
      metadata: { clientId: 'client_1', clientName: 'Test Client', submittedAt: '2026-01-15T09:00:00Z' },
    };

    const mockHistory = [
      {
        PK: 'CASE#case_123',
        SK: 'HISTORY#2026-01-15T10:00:00Z',
        timestamp: '2026-01-15T10:00:00Z',
        type: 'system',
        action: 'Case created',
      },
    ];

    ddbMock.on(GetCommand).resolves({ Item: mockCase });
    ddbMock.on(QueryCommand).resolves({ Items: mockHistory });

    const event = createMockEvent('case_123') as APIGatewayProxyEvent;
    const result = await handler(event, mockContext, () => {});

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.history).toHaveLength(1);
    expect(body.data.history[0].action).toBe('Case created');
  });

  it('should handle DynamoDB errors gracefully', async () => {
    ddbMock.on(GetCommand).rejects(new Error('DynamoDB error'));

    const event = createMockEvent('case_123') as APIGatewayProxyEvent;
    const result = await handler(event, mockContext, () => {});

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ error: 'Internal server error' });
  });
});
