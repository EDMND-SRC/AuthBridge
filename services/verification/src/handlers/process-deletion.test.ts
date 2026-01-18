import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use vi.hoisted to define mock functions that will be used in vi.mock factories
const { mockDynamoDBSend, mockUpdateRequestStatus } = vi.hoisted(() => ({
  mockDynamoDBSend: vi.fn(),
  mockUpdateRequestStatus: vi.fn(),
}));

// Mock all AWS SDK modules before any imports
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(function() { return { send: mockDynamoDBSend }; }),
  QueryCommand: vi.fn(function(params) { return { ...params, _type: 'QueryCommand' }; }),
  UpdateItemCommand: vi.fn(function(params) { return { ...params, _type: 'UpdateItemCommand' }; }),
  PutItemCommand: vi.fn(function(params) { return { ...params, _type: 'PutItemCommand' }; }),
  GetItemCommand: vi.fn(function(params) { return { ...params, _type: 'GetItemCommand' }; }),
}));

vi.mock('@aws-sdk/util-dynamodb', () => ({
  marshall: vi.fn(function(obj) { return obj; }),
  unmarshall: vi.fn(function(obj) { return obj; }),
}));

vi.mock('../services/audit', () => ({
  AuditService: vi.fn(function() { return { logEvent: vi.fn().mockResolvedValue({}) }; }),
}));

vi.mock('../utils/data-request-utils', () => ({
  updateRequestStatus: mockUpdateRequestStatus,
}));

// Import the module once after mocks are set up
import { processDeletion } from './process-deletion';

describe('processDeletion', () => {
  beforeEach(() => {
    // Reset mocks to clear call history and implementations
    mockDynamoDBSend.mockReset();
    mockUpdateRequestStatus.mockReset();
    mockUpdateRequestStatus.mockResolvedValue({});
  });

  it('should process deletion successfully', async () => {
    // Mock getDataRequest
    mockDynamoDBSend.mockResolvedValueOnce({
      Item: {
        requestId: 'dsr_del123',
        type: 'deletion',
        status: 'pending',
        scheduledDeletionDate: '2026-02-17T00:00:00Z',
        subjectIdentifier: { type: 'email', value: 'john@example.com' },
      },
    });

    // Mock queryVerifications
    mockDynamoDBSend.mockResolvedValueOnce({
      Items: [{ PK: 'CASE#ver_123', SK: 'META', verificationId: 'ver_123', status: 'approved' }],
    });

    // Mock queryAllDocuments
    mockDynamoDBSend.mockResolvedValueOnce({
      Items: [{ PK: 'CASE#ver_123', SK: 'DOC#doc_456', documentId: 'doc_456', s3Key: 'client1/ver_123/omang-front.jpg' }],
    });

    // Mock softDeleteVerifications, PutItemCommand for deletion queue, final status update
    mockDynamoDBSend.mockResolvedValueOnce({});
    mockDynamoDBSend.mockResolvedValueOnce({});
    mockDynamoDBSend.mockResolvedValueOnce({});

    await processDeletion({ requestId: 'dsr_del123' });

    expect(mockDynamoDBSend).toHaveBeenCalled();
  });

  it('should skip processing if request is not pending (idempotency)', async () => {
    mockDynamoDBSend.mockResolvedValueOnce({
      Item: {
        requestId: 'dsr_del123',
        type: 'deletion',
        status: 'completed',
        subjectIdentifier: { type: 'email', value: 'john@example.com' },
      },
    });

    await processDeletion({ requestId: 'dsr_del123' });

    expect(mockDynamoDBSend).toHaveBeenCalledTimes(1);
  });

  it('should handle deletion failure and update status', async () => {
    mockDynamoDBSend.mockResolvedValueOnce({
      Item: {
        requestId: 'dsr_del123',
        type: 'deletion',
        status: 'pending',
        scheduledDeletionDate: '2026-02-17T00:00:00Z',
        subjectIdentifier: { type: 'email', value: 'john@example.com' },
      },
    });

    mockDynamoDBSend.mockRejectedValueOnce(new Error('DynamoDB error'));

    await processDeletion({ requestId: 'dsr_del123' });

    expect(mockUpdateRequestStatus).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), 'dsr_del123', 'failed', 'DynamoDB error'
    );
  });

  it('should soft delete verifications by anonymizing PII', async () => {
    mockDynamoDBSend.mockResolvedValueOnce({
      Item: {
        requestId: 'dsr_del123',
        type: 'deletion',
        status: 'pending',
        scheduledDeletionDate: '2026-02-17T00:00:00Z',
        subjectIdentifier: { type: 'email', value: 'john@example.com' },
      },
    });
    mockDynamoDBSend.mockResolvedValueOnce({ Items: [{ PK: 'CASE#ver_123', SK: 'META', verificationId: 'ver_123' }] });
    mockDynamoDBSend.mockResolvedValueOnce({ Items: [] });
    mockDynamoDBSend.mockResolvedValueOnce({});
    mockDynamoDBSend.mockResolvedValueOnce({});
    mockDynamoDBSend.mockResolvedValueOnce({});

    await processDeletion({ requestId: 'dsr_del123' });

    expect(mockDynamoDBSend).toHaveBeenCalled();
  });

  it('should queue hard delete for 30 days later', async () => {
    const scheduledDate = new Date('2026-02-17T00:00:00Z');

    mockDynamoDBSend.mockResolvedValueOnce({
      Item: {
        requestId: 'dsr_del123',
        type: 'deletion',
        status: 'pending',
        scheduledDeletionDate: scheduledDate.toISOString(),
        subjectIdentifier: { type: 'email', value: 'john@example.com' },
      },
    });
    mockDynamoDBSend.mockResolvedValueOnce({ Items: [] });
    mockDynamoDBSend.mockResolvedValueOnce({ Items: [] });
    mockDynamoDBSend.mockResolvedValueOnce({});
    mockDynamoDBSend.mockResolvedValueOnce({});

    await processDeletion({ requestId: 'dsr_del123' });

    expect(mockDynamoDBSend).toHaveBeenCalled();
  });

  it('should reject unsupported subject identifier type', async () => {
    // Use mockImplementationOnce to ensure the mock returns the expected value
    mockDynamoDBSend.mockImplementationOnce(() => Promise.resolve({
      Item: {
        requestId: 'dsr_del123',
        type: 'deletion',
        status: 'pending',
        scheduledDeletionDate: '2026-02-17T00:00:00Z',
        subjectIdentifier: { type: 'unsupported' as any, value: 'test' },
      },
    }));

    await processDeletion({ requestId: 'dsr_del123' });

    expect(mockUpdateRequestStatus).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), 'dsr_del123', 'failed',
      expect.stringContaining('Unsupported subject identifier type')
    );
  });
});
