import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { handler } from './get-notes';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('get-notes handler', () => {
  beforeEach(() => {
    ddbMock.reset();
    vi.clearAllMocks();
    process.env.TABLE_NAME = 'test-table';
  });

  it('should return notes sorted by timestamp descending', async () => {
    const mockNotes = [
      {
        PK: 'CASE#case-123',
        SK: 'NOTE#2026-01-15T10:30:00Z#note-2',
        noteId: 'note-2',
        caseId: 'case-123',
        content: 'Second note',
        author: { userId: 'user-123', userName: 'John Doe', role: 'analyst' },
        timestamp: '2026-01-15T10:30:00Z'
      },
      {
        PK: 'CASE#case-123',
        SK: 'NOTE#2026-01-15T10:00:00Z#note-1',
        noteId: 'note-1',
        caseId: 'case-123',
        content: 'First note',
        author: { userId: 'user-123', userName: 'John Doe', role: 'analyst' },
        timestamp: '2026-01-15T10:00:00Z'
      }
    ];

    ddbMock.on(QueryCommand).resolves({ Items: mockNotes });

    const event = {
      pathParameters: { id: 'case-123' },
      requestContext: { requestId: 'req-123' }
    };

    const response = await handler(event as any, {} as any, {} as any);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].noteId).toBe('note-2'); // Newest first
    expect(body.meta.count).toBe(2);
  });

  it('should return empty array if no notes exist', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const event = {
      pathParameters: { id: 'case-123' },
      requestContext: { requestId: 'req-123' }
    };

    const response = await handler(event as any, {} as any, {} as any);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toEqual([]);
    expect(body.meta.count).toBe(0);
  });

  it('should return 400 if case ID is missing', async () => {
    const event = {
      pathParameters: {},
      requestContext: { requestId: 'req-123' }
    };

    const response = await handler(event as any, {} as any, {} as any);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe('Case ID required');
  });

  it('should handle DynamoDB errors gracefully', async () => {
    ddbMock.on(QueryCommand).rejects(new Error('DynamoDB error'));

    const event = {
      pathParameters: { id: 'case-123' },
      requestContext: { requestId: 'req-123' }
    };

    const response = await handler(event as any, {} as any, {} as any);

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).error).toBe('Internal server error');
  });
});
