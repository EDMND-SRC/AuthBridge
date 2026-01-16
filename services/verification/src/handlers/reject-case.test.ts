import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from './reject-case';
import { DynamoDBDocumentClient, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { mockClient } from 'aws-sdk-client-mock';

const ddbMock = mockClient(DynamoDBDocumentClient);
const sqsMock = mockClient(SQSClient);

describe('reject-case handler', () => {
  beforeEach(() => {
    ddbMock.reset();
    sqsMock.reset();
    vi.clearAllMocks();
  });

  const createEvent = (caseId: string, body: any): Partial<APIGatewayProxyEvent> => ({
    pathParameters: { id: caseId },
    body: JSON.stringify(body),
    requestContext: {
      requestId: 'test-request-id',
      authorizer: {
        claims: {
          sub: 'user-123',
          name: 'Test User'
        }
      },
      identity: {
        sourceIp: '192.168.1.1'
      }
    } as any
  });

  it('should reject a case successfully', async () => {
    const caseId = 'case-123';
    const reason = 'blurry_image';
    const notes = 'Image quality too low';

    ddbMock.on(UpdateCommand).resolves({
      Attributes: {
        PK: `CASE#${caseId}`,
        SK: `CASE#${caseId}`,
        status: 'rejected',
        rejectionReason: reason,
        rejectionNotes: notes
      }
    });
    ddbMock.on(PutCommand).resolves({});
    sqsMock.on(SendMessageCommand).resolves({});

    const event = createEvent(caseId, { reason, notes }) as APIGatewayProxyEvent;
    const result = await handler(event, {} as Context, () => {});

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.caseId).toBe(caseId);
    expect(body.data.status).toBe('rejected');
    expect(body.data.reason).toBe(reason);
  });

  it('should return 400 if case ID is missing', async () => {
    const event = {
      pathParameters: null,
      body: JSON.stringify({ reason: 'blurry_image' }),
      requestContext: {
        requestId: 'test-request-id',
        authorizer: { claims: { sub: 'user-123', name: 'Test User' } },
        identity: { sourceIp: '192.168.1.1' }
      }
    } as any;
    const result = await handler(event, {} as Context, () => {});

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Case ID required');
  });

  it('should return 400 if reason is missing', async () => {
    const caseId = 'case-123';
    const event = createEvent(caseId, {}) as APIGatewayProxyEvent;
    const result = await handler(event, {} as Context, () => {});

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Invalid reason code');
  });

  it('should return 400 if reason is invalid', async () => {
    const caseId = 'case-123';
    const event = createEvent(caseId, { reason: 'invalid_reason' }) as APIGatewayProxyEvent;
    const result = await handler(event, {} as Context, () => {});

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Invalid reason code');
    expect(body.validReasons).toBeDefined();
  });

  it('should return 400 if notes exceed 500 characters', async () => {
    const caseId = 'case-123';
    const longNotes = 'a'.repeat(501);
    const event = createEvent(caseId, { reason: 'blurry_image', notes: longNotes }) as APIGatewayProxyEvent;
    const result = await handler(event, {} as Context, () => {});

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toContain('500 characters');
  });

  it('should accept rejection without notes', async () => {
    const caseId = 'case-123';
    const reason = 'face_mismatch';

    ddbMock.on(UpdateCommand).resolves({ Attributes: { status: 'rejected' } });
    ddbMock.on(PutCommand).resolves({});
    sqsMock.on(SendMessageCommand).resolves({});

    const event = createEvent(caseId, { reason }) as APIGatewayProxyEvent;
    const result = await handler(event, {} as Context, () => {});

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.notes).toBe('');
  });

  it('should return 409 if case already decided', async () => {
    const caseId = 'case-123';

    ddbMock.on(UpdateCommand).rejects({
      name: 'ConditionalCheckFailedException',
      message: 'Condition not met'
    });

    const event = createEvent(caseId, { reason: 'blurry_image' }) as APIGatewayProxyEvent;
    const result = await handler(event, {} as Context, () => {});

    expect(result.statusCode).toBe(409);
    const body = JSON.parse(result.body);
    expect(body.error).toContain('already decided');
  });

  it('should create audit log entry with reason and notes', async () => {
    const caseId = 'case-123';
    const reason = 'fraudulent';
    const notes = 'Document appears altered';

    ddbMock.on(UpdateCommand).resolves({ Attributes: { status: 'rejected' } });
    ddbMock.on(PutCommand).resolves({});
    sqsMock.on(SendMessageCommand).resolves({});

    const event = createEvent(caseId, { reason, notes }) as APIGatewayProxyEvent;
    await handler(event, {} as Context, () => {});

    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls.length).toBe(1);

    const auditLog = putCalls[0].args[0].input.Item;
    expect(auditLog.action).toBe('CASE_REJECTED');
    expect(auditLog.details.reason).toBe(reason);
    expect(auditLog.details.notes).toBe(notes);
  });

  it('should queue webhook notification with reason', async () => {
    const caseId = 'case-123';
    const reason = 'duplicate_detected';

    ddbMock.on(UpdateCommand).resolves({ Attributes: { status: 'rejected' } });
    ddbMock.on(PutCommand).resolves({});
    sqsMock.on(SendMessageCommand).resolves({});

    const event = createEvent(caseId, { reason }) as APIGatewayProxyEvent;
    await handler(event, {} as Context, () => {});

    const sqsCalls = sqsMock.commandCalls(SendMessageCommand);
    expect(sqsCalls.length).toBe(1);

    const message = JSON.parse(sqsCalls[0].args[0].input.MessageBody);
    expect(message.event).toBe('verification.rejected');
    expect(message.reason).toBe(reason);
  });
});
