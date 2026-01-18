import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use vi.hoisted to define mock functions that will be used in vi.mock factories
const { mockDynamoDBSend, mockS3Send, mockCreateHash } = vi.hoisted(() => ({
  mockDynamoDBSend: vi.fn(),
  mockS3Send: vi.fn(),
  mockCreateHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => 'mocked-hash'),
  })),
}));

// Mock all modules before any imports
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(function() { return { send: mockDynamoDBSend }; }),
  QueryCommand: vi.fn(function(params) { return { ...params, _type: 'QueryCommand' }; }),
  DeleteItemCommand: vi.fn(function(params) { return { ...params, _type: 'DeleteItemCommand' }; }),
  UpdateItemCommand: vi.fn(function(params) { return { ...params, _type: 'UpdateItemCommand' }; }),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(function() { return { send: mockS3Send }; }),
  DeleteObjectCommand: vi.fn(function(params) { return { ...params, _type: 'DeleteObjectCommand' }; }),
}));

vi.mock('@aws-sdk/util-dynamodb', () => ({
  unmarshall: vi.fn(function(obj) { return obj; }),
  marshall: vi.fn(function(obj) { return obj; }),
}));

vi.mock('crypto', () => ({
  createHash: mockCreateHash,
}));

vi.mock('../services/audit', () => ({
  AuditService: vi.fn(function() { return { logEvent: vi.fn().mockResolvedValue({}) }; }),
}));

// Import the module once after mocks are set up
import { scheduledHardDelete } from './scheduled-hard-delete';

describe('scheduledHardDelete', () => {
  beforeEach(() => {
    mockDynamoDBSend.mockReset();
    mockS3Send.mockReset();
    // Default: return empty Items for all DynamoDB queries
    mockDynamoDBSend.mockResolvedValue({ Items: [] });
    mockS3Send.mockResolvedValue({});
  });

  it('should process hard deletion successfully', async () => {
    // First call returns deletion item, rest return empty
    mockDynamoDBSend.mockResolvedValueOnce({
      Items: [{
        PK: 'DELETION_QUEUE#2026-01-18',
        SK: '2026-01-18T02:00:00Z#dsr_del123',
        requestId: 'dsr_del123',
        subjectIdentifier: { type: 'email', value: 'john@example.com' },
        itemsToDelete: [
          { type: 's3', bucket: 'authbridge-documents-staging', key: 'client1/ver_123/omang-front.jpg' },
          { type: 'dynamodb', pk: 'CASE#ver_123', sk: 'META' },
        ],
        status: 'pending',
      }],
    });

    await scheduledHardDelete();

    expect(mockS3Send).toHaveBeenCalled();
    expect(mockDynamoDBSend).toHaveBeenCalled();
  });

  it('should handle empty deletion queue', async () => {
    await scheduledHardDelete();

    expect(mockS3Send).not.toHaveBeenCalled();
  });

  it('should continue processing other items if one fails', async () => {
    // First call returns 2 deletion items
    mockDynamoDBSend.mockResolvedValueOnce({
      Items: [
        {
          PK: 'DELETION_QUEUE#2026-01-18',
          SK: '2026-01-18T02:00:00Z#dsr_del123',
          requestId: 'dsr_del123',
          subjectIdentifier: { type: 'email', value: 'john@example.com' },
          itemsToDelete: [{ type: 's3', bucket: 'authbridge-documents-staging', key: 'client1/ver_123/omang-front.jpg' }],
          status: 'pending',
        },
        {
          PK: 'DELETION_QUEUE#2026-01-18',
          SK: '2026-01-18T02:00:00Z#dsr_del456',
          requestId: 'dsr_del456',
          subjectIdentifier: { type: 'email', value: 'jane@example.com' },
          itemsToDelete: [{ type: 's3', bucket: 'authbridge-documents-staging', key: 'client1/ver_456/omang-front.jpg' }],
          status: 'pending',
        },
      ],
    });

    // First S3 delete fails, second succeeds
    mockS3Send.mockRejectedValueOnce(new Error('S3 error'));
    mockS3Send.mockResolvedValueOnce({});

    await scheduledHardDelete();

    // Should attempt both S3 deletions
    expect(mockS3Send).toHaveBeenCalledTimes(2);
  });

  it('should anonymize audit logs with SHA-256 hash', async () => {
    // First call returns deletion item
    mockDynamoDBSend.mockResolvedValueOnce({
      Items: [{
        PK: 'DELETION_QUEUE#2026-01-18',
        SK: '2026-01-18T02:00:00Z#dsr_del123',
        requestId: 'dsr_del123',
        subjectIdentifier: { type: 'email', value: 'john@example.com' },
        itemsToDelete: [],
        status: 'pending',
      }],
    });

    // Return audit logs for anonymization
    mockDynamoDBSend.mockImplementation((cmd) => {
      // Check if this is the audit logs query (GSI5)
      if (cmd?.IndexName === 'GSI5') {
        return Promise.resolve({
          Items: [{ PK: 'AUDIT#123', SK: '2026-01-18T00:00:00Z', userId: 'USER#john@example.com' }],
        });
      }
      return Promise.resolve({ Items: [] });
    });

    await scheduledHardDelete();

    expect(mockCreateHash).toHaveBeenCalledWith('sha256');
  });

  it('should handle S3 deletion failures gracefully', async () => {
    // First call returns deletion item with 2 S3 objects
    mockDynamoDBSend.mockResolvedValueOnce({
      Items: [{
        PK: 'DELETION_QUEUE#2026-01-18',
        SK: '2026-01-18T02:00:00Z#dsr_del123',
        requestId: 'dsr_del123',
        subjectIdentifier: { type: 'email', value: 'john@example.com' },
        itemsToDelete: [
          { type: 's3', bucket: 'authbridge-documents-staging', key: 'client1/ver_123/omang-front.jpg' },
          { type: 's3', bucket: 'authbridge-documents-staging', key: 'client1/ver_123/omang-back.jpg' },
        ],
        status: 'pending',
      }],
    });

    // First S3 delete fails, second succeeds
    mockS3Send.mockRejectedValueOnce(new Error('S3 error'));
    mockS3Send.mockResolvedValueOnce({});

    await scheduledHardDelete();

    // Should attempt both S3 deletions
    expect(mockS3Send).toHaveBeenCalledTimes(2);
  });

  it('should query multiple date partitions', async () => {
    await scheduledHardDelete();

    // Should query 60 dates (DELETION_QUEUE_LOOKBACK_DAYS)
    expect(mockDynamoDBSend).toHaveBeenCalledTimes(60);
  });
});
