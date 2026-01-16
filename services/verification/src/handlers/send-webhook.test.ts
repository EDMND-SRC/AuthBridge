import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SQSEvent, Context } from 'aws-lambda';
import { handler } from './send-webhook';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { mockClient } from 'aws-sdk-client-mock';

const ddbMock = mockClient(DynamoDBDocumentClient);
const sqsMock = mockClient(SQSClient);

// Mock fetch globally
global.fetch = vi.fn();

describe('send-webhook handler', () => {
  beforeEach(() => {
    ddbMock.reset();
    sqsMock.reset();
    vi.clearAllMocks();
    (global.fetch as any).mockReset();
    process.env.WEBHOOK_QUEUE_URL = 'https://sqs.af-south-1.amazonaws.com/123456789012/webhook-queue';
  });

  const createSQSEvent = (message: any): SQSEvent => ({
    Records: [
      {
        messageId: 'test-message-id',
        receiptHandle: 'test-receipt-handle',
        body: JSON.stringify(message),
        attributes: {} as any,
        messageAttributes: {},
        md5OfBody: '',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:af-south-1:123456789012:test-queue',
        awsRegion: 'af-south-1'
      }
    ]
  });

  it('should send webhook successfully for approved case', async () => {
    const message = {
      event: 'verification.approved',
      caseId: 'case-123',
      timestamp: '2026-01-15T10:00:00Z',
      userId: 'user-123'
    };

    ddbMock.on(GetCommand).resolves({
      Item: {
        PK: 'CASE#case-123',
        SK: 'CASE#case-123',
        metadata: { clientId: 'client-456' }
      }
    });

    ddbMock.on(GetCommand, {
      TableName: process.env.TABLE_NAME,
      Key: { PK: 'CLIENT#client-456', SK: 'CLIENT#client-456' }
    }).resolves({
      Item: {
        PK: 'CLIENT#client-456',
        SK: 'CLIENT#client-456',
        webhookUrl: 'https://example.com/webhook',
        webhookSecret: 'test-secret'
      }
    });

    (global.fetch as any).mockResolvedValueOnce({ ok: true, status: 200 });

    ddbMock.on(PutCommand).resolves({});

    const event = createSQSEvent(message);
    await handler(event, {} as Context, () => {});

    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/webhook',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Webhook-Signature': expect.stringMatching(/^sha256=/),
          'X-Webhook-Event': 'verification.approved',
          'X-Webhook-Timestamp': expect.any(String),
          'User-Agent': 'AuthBridge-Webhooks/1.0'
        })
      })
    );

    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls.length).toBe(1);
    expect(putCalls[0].args[0].input.Item.status).toBe('delivered');
  });

  it('should send webhook for rejected case with reason', async () => {
    const message = {
      event: 'verification.rejected',
      caseId: 'case-123',
      timestamp: '2026-01-15T10:00:00Z',
      userId: 'user-123',
      reason: 'blurry_image',
      notes: 'Image quality too low'
    };

    ddbMock.on(GetCommand).resolves({
      Item: {
        PK: 'CASE#case-123',
        SK: 'CASE#case-123',
        metadata: { clientId: 'client-456' }
      }
    });

    ddbMock.on(GetCommand, {
      TableName: process.env.TABLE_NAME,
      Key: { PK: 'CLIENT#client-456', SK: 'CLIENT#client-456' }
    }).resolves({
      Item: {
        webhookUrl: 'https://example.com/webhook',
        webhookSecret: 'test-secret'
      }
    });

    (global.fetch as any).mockResolvedValueOnce({ ok: true, status: 200 });
    ddbMock.on(PutCommand).resolves({});

    const event = createSQSEvent(message);
    await handler(event, {} as Context, () => {});

    const fetchCall = (global.fetch as any).mock.calls[0];
    const payload = JSON.parse(fetchCall[1].body);

    expect(payload.data.reason).toBe('blurry_image');
    expect(payload.data.notes).toBe('Image quality too low');
  });

  it('should skip webhook if no webhook URL configured', async () => {
    const message = {
      event: 'verification.approved',
      caseId: 'case-123',
      timestamp: '2026-01-15T10:00:00Z',
      userId: 'user-123'
    };

    ddbMock.on(GetCommand).resolves({
      Item: {
        metadata: { clientId: 'client-456' }
      }
    });

    ddbMock.on(GetCommand, {
      TableName: process.env.TABLE_NAME,
      Key: { PK: 'CLIENT#client-456', SK: 'CLIENT#client-456' }
    }).resolves({
      Item: {
        // No webhookUrl
      }
    });

    const event = createSQSEvent(message);
    await handler(event, {} as Context, () => {});

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should schedule retry via SQS on first failure', async () => {
    const message = {
      event: 'verification.approved',
      caseId: 'case-123',
      timestamp: '2026-01-15T10:00:00Z',
      userId: 'user-123',
      attemptCount: 1
    };

    ddbMock.on(GetCommand).resolves({
      Item: {
        metadata: { clientId: 'client-456' }
      }
    });

    ddbMock.on(GetCommand, {
      TableName: process.env.TABLE_NAME,
      Key: { PK: 'CLIENT#client-456', SK: 'CLIENT#client-456' }
    }).resolves({
      Item: {
        webhookUrl: 'https://example.com/webhook',
        webhookSecret: 'test-secret'
      }
    });

    (global.fetch as any).mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' });
    sqsMock.on(SendMessageCommand).resolves({});

    const event = createSQSEvent(message);
    await handler(event, {} as Context, () => {});

    // Should schedule retry via SQS
    const sqsCalls = sqsMock.commandCalls(SendMessageCommand);
    expect(sqsCalls.length).toBe(1);

    const retryMessage = JSON.parse(sqsCalls[0].args[0].input.MessageBody);
    expect(retryMessage.attemptCount).toBe(2);
    expect(sqsCalls[0].args[0].input.DelaySeconds).toBe(1); // First retry: 1s delay (aligned with webhook.ts)
  });

  it('should schedule retry with 5min delay on second failure', async () => {
    const message = {
      event: 'verification.approved',
      caseId: 'case-123',
      timestamp: '2026-01-15T10:00:00Z',
      userId: 'user-123',
      attemptCount: 2
    };

    ddbMock.on(GetCommand).resolves({
      Item: {
        metadata: { clientId: 'client-456' }
      }
    });

    ddbMock.on(GetCommand, {
      TableName: process.env.TABLE_NAME,
      Key: { PK: 'CLIENT#client-456', SK: 'CLIENT#client-456' }
    }).resolves({
      Item: {
        webhookUrl: 'https://example.com/webhook',
        webhookSecret: 'test-secret'
      }
    });

    (global.fetch as any).mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Service Unavailable' });
    sqsMock.on(SendMessageCommand).resolves({});

    const event = createSQSEvent(message);
    await handler(event, {} as Context, () => {});

    const sqsCalls = sqsMock.commandCalls(SendMessageCommand);
    expect(sqsCalls.length).toBe(1);

    const retryMessage = JSON.parse(sqsCalls[0].args[0].input.MessageBody);
    expect(retryMessage.attemptCount).toBe(3);
    expect(sqsCalls[0].args[0].input.DelaySeconds).toBe(5); // Second retry: 5s delay (aligned with webhook.ts)
  });

  it('should log failed delivery after max retries', async () => {
    const message = {
      event: 'verification.approved',
      caseId: 'case-123',
      timestamp: '2026-01-15T10:00:00Z',
      userId: 'user-123',
      attemptCount: 3 // Already at max attempts
    };

    ddbMock.on(GetCommand).resolves({
      Item: {
        metadata: { clientId: 'client-456' }
      }
    });

    ddbMock.on(GetCommand, {
      TableName: process.env.TABLE_NAME,
      Key: { PK: 'CLIENT#client-456', SK: 'CLIENT#client-456' }
    }).resolves({
      Item: {
        webhookUrl: 'https://example.com/webhook',
        webhookSecret: 'test-secret'
      }
    });

    (global.fetch as any).mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' });
    ddbMock.on(PutCommand).resolves({});

    const event = createSQSEvent(message);
    await handler(event, {} as Context, () => {});

    // Should NOT schedule another retry
    const sqsCalls = sqsMock.commandCalls(SendMessageCommand);
    expect(sqsCalls.length).toBe(0);

    // Should log failed delivery
    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls.length).toBe(1);
    expect(putCalls[0].args[0].input.Item.status).toBe('failed');
    expect(putCalls[0].args[0].input.Item.attempts).toBe(3);
  });

  it('should handle case not found gracefully', async () => {
    const message = {
      event: 'verification.approved',
      caseId: 'case-nonexistent',
      timestamp: '2026-01-15T10:00:00Z',
      userId: 'user-123'
    };

    ddbMock.on(GetCommand).resolves({});

    const event = createSQSEvent(message);
    await handler(event, {} as Context, () => {});

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should default attemptCount to 1 if not provided', async () => {
    const message = {
      event: 'verification.approved',
      caseId: 'case-123',
      timestamp: '2026-01-15T10:00:00Z',
      userId: 'user-123'
      // No attemptCount - should default to 1
    };

    ddbMock.on(GetCommand).resolves({
      Item: {
        metadata: { clientId: 'client-456' }
      }
    });

    ddbMock.on(GetCommand, {
      TableName: process.env.TABLE_NAME,
      Key: { PK: 'CLIENT#client-456', SK: 'CLIENT#client-456' }
    }).resolves({
      Item: {
        webhookUrl: 'https://example.com/webhook',
        webhookSecret: 'test-secret'
      }
    });

    (global.fetch as any).mockResolvedValueOnce({ ok: true, status: 200 });
    ddbMock.on(PutCommand).resolves({});

    const event = createSQSEvent(message);
    await handler(event, {} as Context, () => {});

    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls[0].args[0].input.Item.attempts).toBe(1);
  });
});
