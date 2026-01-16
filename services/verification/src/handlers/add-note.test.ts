import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { handler } from './add-note';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('add-note handler', () => {
  beforeEach(() => {
    ddbMock.reset();
    vi.clearAllMocks();
    process.env.TABLE_NAME = 'test-table';
  });

  it('should add note successfully', async () => {
    ddbMock.on(PutCommand).resolves({});

    const event = {
      pathParameters: { id: 'case-123' },
      body: JSON.stringify({ content: 'Test note content' }),
      requestContext: {
        authorizer: {
          claims: {
            sub: 'user-123',
            name: 'John Doe',
            'custom:role': 'analyst'
          }
        },
        identity: { sourceIp: '192.168.1.1' },
        requestId: 'req-123'
      }
    };

    const response = await handler(event as any, {} as any, {} as any);

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.data.content).toBe('Test note content');
    expect(body.data.author.userName).toBe('John Doe');
    expect(ddbMock.calls()).toHaveLength(2); // Note + Audit log
  });

  it('should return 400 if content is empty', async () => {
    const event = {
      pathParameters: { id: 'case-123' },
      body: JSON.stringify({ content: '' }),
      requestContext: {
        authorizer: { claims: { sub: 'user-123', name: 'John Doe' } },
        identity: { sourceIp: '192.168.1.1' },
        requestId: 'req-123'
      }
    };

    const response = await handler(event as any, {} as any, {} as any);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe('Note content is required');
  });

  it('should return 400 if content exceeds 2000 characters', async () => {
    const longContent = 'a'.repeat(2001);
    const event = {
      pathParameters: { id: 'case-123' },
      body: JSON.stringify({ content: longContent }),
      requestContext: {
        authorizer: { claims: { sub: 'user-123', name: 'John Doe' } },
        identity: { sourceIp: '192.168.1.1' },
        requestId: 'req-123'
      }
    };

    const response = await handler(event as any, {} as any, {} as any);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe('Note content must be 2000 characters or less');
  });

  it('should create audit log entry', async () => {
    ddbMock.on(PutCommand).resolves({});

    const event = {
      pathParameters: { id: 'case-123' },
      body: JSON.stringify({ content: 'Test note' }),
      requestContext: {
        authorizer: { claims: { sub: 'user-123', name: 'John Doe' } },
        identity: { sourceIp: '192.168.1.1' },
        requestId: 'req-123'
      }
    };

    await handler(event as any, {} as any, {} as any);

    const calls = ddbMock.calls();
    const auditCall = calls.find(call =>
      call.args[0].input.Item?.SK?.startsWith('AUDIT#')
    );

    expect(auditCall).toBeDefined();
    expect(auditCall.args[0].input.Item.action).toBe('CASE_NOTE_ADDED');
  });

  it('should trim whitespace from content', async () => {
    ddbMock.on(PutCommand).resolves({});

    const event = {
      pathParameters: { id: 'case-123' },
      body: JSON.stringify({ content: '  Test note  ' }),
      requestContext: {
        authorizer: { claims: { sub: 'user-123', name: 'John Doe' } },
        identity: { sourceIp: '192.168.1.1' },
        requestId: 'req-123'
      }
    };

    const response = await handler(event as any, {} as any, {} as any);

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.data.content).toBe('Test note');
  });
});
