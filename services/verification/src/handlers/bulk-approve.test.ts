import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { handler } from './bulk-approve';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

const ddbMock = mockClient(DynamoDBDocumentClient);
const sqsMock = mockClient(SQSClient);

const createMockEvent = (body: any): Partial<APIGatewayProxyEvent> => ({
  body: JSON.stringify(body),
  requestContext: {
    authorizer: {
      claims: {
        sub: 'user-123',
        name: 'John Doe'
      }
    },
    identity: { sourceIp: '192.168.1.1' },
    requestId: 'req-123'
  } as any
});

describe('bulk-approve handler', () => {
  beforeEach(() => {
    ddbMock.reset();
    sqsMock.reset();
    vi.clearAllMocks();
    process.env.TABLE_NAME = 'test-table';
    process.env.WEBHOOK_QUEUE_URL = 'https://sqs.af-south-1.amazonaws.com/123456789/webhook-queue';
  });

  it('should approve multiple cases successfully', async () => {
    ddbMock.on(UpdateCommand).resolves({});
    ddbMock.on(PutCommand).resolves({});
    sqsMock.on(SendMessageCommand).resolves({});

    const event = createMockEvent({ caseIds: ['case-1', 'case-2', 'case-3'] });
    const response = await handler(event as any, {} as Context, {} as any);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.summary.total).toBe(3);
    expect(body.data.summary.succeeded).toBe(3);
    expect(body.data.summary.failed).toBe(0);
    expect(body.data.results).toHaveLength(3);
    expect(body.data.results.every((r: any) => r.success)).toBe(true);
  });

  it('should handle partial success when some cases fail', async () => {
    // First case succeeds
    ddbMock.on(UpdateCommand, {
      Key: { PK: 'CASE#case-1', SK: 'META' }
    }).resolves({});

    // Second case fails (already processed)
    ddbMock.on(UpdateCommand, {
      Key: { PK: 'CASE#case-2', SK: 'META' }
    }).rejects({ name: 'ConditionalCheckFailedException' });

    // Third case succeeds
    ddbMock.on(UpdateCommand, {
      Key: { PK: 'CASE#case-3', SK: 'META' }
    }).resolves({});

    ddbMock.on(PutCommand).resolves({});
    sqsMock.on(SendMessageCommand).resolves({});

    const event = createMockEvent({ caseIds: ['case-1', 'case-2', 'case-3'] });
    const response = await handler(event as any, {} as Context, {} as any);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.summary.succeeded).toBe(2);
    expect(body.data.summary.failed).toBe(1);
    expect(body.data.results[1].success).toBe(false);
    expect(body.data.results[1].error).toContain('not in a valid status');
  });

  it('should return 400 if caseIds is empty', async () => {
    const event = createMockEvent({ caseIds: [] });
    const response = await handler(event as any, {} as Context, {} as any);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe('caseIds array is required');
  });

  it('should return 400 if caseIds is missing', async () => {
    const event = createMockEvent({});
    const response = await handler(event as any, {} as Context, {} as any);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe('caseIds array is required');
  });

  it('should return 400 if more than 50 cases', async () => {
    const caseIds = Array.from({ length: 51 }, (_, i) => `case-${i}`);
    const event = createMockEvent({ caseIds });
    const response = await handler(event as any, {} as Context, {} as any);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe('Maximum 50 cases per bulk operation');
  });

  it('should create individual audit log entries for each case', async () => {
    ddbMock.on(UpdateCommand).resolves({});
    ddbMock.on(PutCommand).resolves({});
    sqsMock.on(SendMessageCommand).resolves({});

    const event = createMockEvent({ caseIds: ['case-1', 'case-2'] });
    await handler(event as any, {} as Context, {} as any);

    const putCalls = ddbMock.calls().filter(call => call.args[0] instanceof PutCommand);
    expect(putCalls.length).toBe(2); // One audit entry per case

    const auditEntries = putCalls.map(call => (call.args[0] as any).input.Item);
    expect(auditEntries[0].action).toBe('CASE_BULK_APPROVED');
    expect(auditEntries[1].action).toBe('CASE_BULK_APPROVED');
    expect(auditEntries[0].details.bulkOperationId).toBe(auditEntries[1].details.bulkOperationId);
    expect(auditEntries[0].details.totalCasesInBulk).toBe(2);
    // Verify unique SK with auditId suffix to prevent collisions
    expect(auditEntries[0].SK).toMatch(/^AUDIT#.*#[a-f0-9-]+$/);
  });

  it('should use conditional expression to prevent race conditions', async () => {
    ddbMock.on(UpdateCommand).resolves({});
    ddbMock.on(PutCommand).resolves({});
    sqsMock.on(SendMessageCommand).resolves({});

    const event = createMockEvent({ caseIds: ['case-1'] });
    await handler(event as any, {} as Context, {} as any);

    const updateCalls = ddbMock.calls().filter(call => call.args[0] instanceof UpdateCommand);
    expect(updateCalls.length).toBe(1);

    const updateCommand = updateCalls[0].args[0] as any;
    expect(updateCommand.input.ConditionExpression).toBe('#status IN (:pending, :inReview)');
    expect(updateCommand.input.ExpressionAttributeValues[':pending']).toBe('pending_review');
    expect(updateCommand.input.ExpressionAttributeValues[':inReview']).toBe('in_review');
  });

  it('should include bulkOperationId in response meta', async () => {
    ddbMock.on(UpdateCommand).resolves({});
    ddbMock.on(PutCommand).resolves({});
    sqsMock.on(SendMessageCommand).resolves({});

    const event = createMockEvent({ caseIds: ['case-1'] });
    const response = await handler(event as any, {} as Context, {} as any);

    const body = JSON.parse(response.body);
    expect(body.meta.bulkOperationId).toBeDefined();
    expect(typeof body.meta.bulkOperationId).toBe('string');
    expect(body.meta.bulkOperationId.length).toBeGreaterThan(0);
  });

  it('should handle generic errors gracefully', async () => {
    ddbMock.on(UpdateCommand).rejects(new Error('Network error'));
    ddbMock.on(PutCommand).resolves({});
    sqsMock.on(SendMessageCommand).resolves({});

    const event = createMockEvent({ caseIds: ['case-1'] });
    const response = await handler(event as any, {} as Context, {} as any);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.summary.failed).toBe(1);
    expect(body.data.results[0].error).toBe('Failed to approve case');
  });

  it('should send webhook notification for each approved case', async () => {
    ddbMock.on(UpdateCommand).resolves({});
    ddbMock.on(PutCommand).resolves({});
    sqsMock.on(SendMessageCommand).resolves({});

    const event = createMockEvent({ caseIds: ['case-1', 'case-2'] });
    await handler(event as any, {} as Context, {} as any);

    const sqsCalls = sqsMock.calls().filter(call => call.args[0] instanceof SendMessageCommand);
    expect(sqsCalls.length).toBe(2); // One webhook per case

    const messages = sqsCalls.map(call => JSON.parse((call.args[0] as any).input.MessageBody));
    expect(messages[0].type).toBe('CASE_BULK_APPROVED');
    expect(messages[0].caseId).toBe('case-1');
    expect(messages[1].caseId).toBe('case-2');
    expect(messages[0].bulkOperationId).toBe(messages[1].bulkOperationId);
  });
});
