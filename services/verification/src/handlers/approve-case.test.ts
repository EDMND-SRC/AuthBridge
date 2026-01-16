import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from './approve-case';
import { DynamoDBDocumentClient, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { mockClient } from 'aws-sdk-client-mock';

const ddbMock = mockClient(DynamoDBDocumentClient);
const sqsMock = mockClient(SQSClient);

describe('approve-case handler', () => {
  beforeEach(() => {
    ddbMock.reset();
    sqsMock.reset();
    vi.clearAllMocks();
  });

  const createEvent = (caseId: string): Partial<APIGatewayProxyEvent> => ({
    pathParameters: { id: caseId },
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

  it('should approve a case successfully', async () => {
    const caseId = 'case-123';

    ddbMock.on(UpdateCommand).resolves({
      Attributes: {
        PK: `CASE#${caseId}`,
        SK: `CASE#${caseId}`,
        status: 'approved'
      }
    });
    ddbMock.on(PutCommand).resolves({});
    sqsMock.on(SendMessageCommand).resolves({});

    const event = createEvent(caseId) as APIGatewayProxyEvent;
    const result = await handler(event, {} as Context, () => {});

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.caseId).toBe(caseId);
    expect(body.data.status).toBe('approved');
  });

  it('should return 400 if case ID is missing', async () => {
    const event = {
      pathParameters: null,
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

  it('should return 409 if case already decided', async () => {
    const caseId = 'case-123';

    ddbMock.on(UpdateCommand).rejects({
      name: 'ConditionalCheckFailedException',
      message: 'Condition not met'
    });

    const event = createEvent(caseId) as APIGatewayProxyEvent;
    const result = await handler(event, {} as Context, () => {});

    expect(result.statusCode).toBe(409);
    const body = JSON.parse(result.body);
    expect(body.error).toContain('already decided');
  });

  it('should create audit log entry', async () => {
    const caseId = 'case-123';

    ddbMock.on(UpdateCommand).resolves({ Attributes: { status: 'approved' } });
    ddbMock.on(PutCommand).resolves({});
    sqsMock.on(SendMessageCommand).resolves({});

    const event = createEvent(caseId) as APIGatewayProxyEvent;
    await handler(event, {} as Context, () => {});

    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls.length).toBe(1);

    const auditLog = putCalls[0].args[0].input.Item;
    expect(auditLog.action).toBe('CASE_APPROVED');
    expect(auditLog.userId).toBe('user-123');
  });

  it('should queue webhook notification', async () => {
    const caseId = 'case-123';

    ddbMock.on(UpdateCommand).resolves({ Attributes: { status: 'approved' } });
    ddbMock.on(PutCommand).resolves({});
    sqsMock.on(SendMessageCommand).resolves({});

    const event = createEvent(caseId) as APIGatewayProxyEvent;
    await handler(event, {} as Context, () => {});

    const sqsCalls = sqsMock.commandCalls(SendMessageCommand);
    expect(sqsCalls.length).toBe(1);

    const message = JSON.parse(sqsCalls[0].args[0].input.MessageBody);
    expect(message.event).toBe('verification.approved');
    expect(message.caseId).toBe(caseId);
  });

  it('should return 500 on unexpected error', async () => {
    const caseId = 'case-123';

    ddbMock.on(UpdateCommand).rejects(new Error('DynamoDB error'));

    const event = createEvent(caseId) as APIGatewayProxyEvent;
    const result = await handler(event, {} as Context, () => {});

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Internal server error');
  });
});
