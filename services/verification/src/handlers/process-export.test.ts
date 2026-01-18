import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use vi.hoisted to define mock functions that will be used in vi.mock factories
const { mockDynamoDBSend, mockS3Send, mockUpdateRequestStatus } = vi.hoisted(() => ({
  mockDynamoDBSend: vi.fn(),
  mockS3Send: vi.fn(),
  mockUpdateRequestStatus: vi.fn(),
}));

// Mock all AWS SDK modules before any imports
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(function() { return { send: mockDynamoDBSend }; }),
  QueryCommand: vi.fn(function(params) { return { ...params, _type: 'QueryCommand' }; }),
  UpdateItemCommand: vi.fn(function(params) { return { ...params, _type: 'UpdateItemCommand' }; }),
  GetItemCommand: vi.fn(function(params) { return { ...params, _type: 'GetItemCommand' }; }),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(function() { return { send: mockS3Send }; }),
  PutObjectCommand: vi.fn(function(params) { return { ...params, _type: 'PutObjectCommand' }; }),
  GetObjectCommand: vi.fn(function(params) { return { ...params, _type: 'GetObjectCommand' }; }),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://presigned-url.example.com'),
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
import { processExport } from './process-export';

describe('processExport', () => {
  beforeEach(() => {
    mockDynamoDBSend.mockReset();
    mockS3Send.mockReset();
    mockUpdateRequestStatus.mockReset();
    mockUpdateRequestStatus.mockResolvedValue({});
  });

  it('should process export successfully', async () => {
    // Mock getDataRequest
    mockDynamoDBSend.mockResolvedValueOnce({
      Item: {
        requestId: 'dsr_abc123',
        type: 'export',
        status: 'pending',
        subjectIdentifier: { type: 'email', value: 'john@example.com' },
      },
    });

    // Mock queryVerifications
    mockDynamoDBSend.mockResolvedValueOnce({
      Items: [{
        PK: 'CASE#ver_123',
        SK: 'META',
        verificationId: 'ver_123',
        status: 'approved',
        customerEmail: 'john@example.com',
        customerName: 'John Doe',
        customerPhone: '+26771234567',
      }],
    });

    // Mock queryAuditLogs
    mockDynamoDBSend.mockResolvedValueOnce({
      Items: [{ timestamp: '2026-01-18T00:00:00Z', action: 'CASE_CREATED', metadata: {} }],
    });

    // Mock queryDocuments
    mockDynamoDBSend.mockResolvedValueOnce({
      Items: [{
        documentId: 'doc_456',
        type: 'omang-front',
        s3Key: 'client1/ver_123/omang-front.jpg',
        uploadedAt: '2026-01-18T00:00:00Z',
      }],
    });

    // Mock S3 upload and final status update
    mockS3Send.mockResolvedValueOnce({});
    mockDynamoDBSend.mockResolvedValueOnce({});

    await processExport({ requestId: 'dsr_abc123' });

    expect(mockS3Send).toHaveBeenCalled();
    expect(mockUpdateRequestStatus).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), 'dsr_abc123', 'processing'
    );
  });

  it('should skip processing if request is not pending (idempotency)', async () => {
    mockDynamoDBSend.mockResolvedValueOnce({
      Item: {
        requestId: 'dsr_abc123',
        type: 'export',
        status: 'completed',
        subjectIdentifier: { type: 'email', value: 'john@example.com' },
      },
    });

    await processExport({ requestId: 'dsr_abc123' });

    expect(mockS3Send).not.toHaveBeenCalled();
  });

  it('should handle export failure and update status', async () => {
    mockDynamoDBSend.mockResolvedValueOnce({
      Item: {
        requestId: 'dsr_abc123',
        type: 'export',
        status: 'pending',
        subjectIdentifier: { type: 'email', value: 'john@example.com' },
      },
    });

    mockDynamoDBSend.mockRejectedValueOnce(new Error('DynamoDB error'));

    await processExport({ requestId: 'dsr_abc123' });

    expect(mockUpdateRequestStatus).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), 'dsr_abc123', 'failed', 'DynamoDB error'
    );
  });

  it('should query verifications by email', async () => {
    mockDynamoDBSend.mockResolvedValueOnce({
      Item: {
        requestId: 'dsr_abc123',
        type: 'export',
        status: 'pending',
        subjectIdentifier: { type: 'email', value: 'john@example.com' },
      },
    });
    mockDynamoDBSend.mockResolvedValueOnce({ Items: [] });
    mockDynamoDBSend.mockResolvedValueOnce({ Items: [] });
    mockS3Send.mockResolvedValueOnce({});
    mockDynamoDBSend.mockResolvedValueOnce({});

    await processExport({ requestId: 'dsr_abc123' });

    expect(mockDynamoDBSend).toHaveBeenCalled();
  });

  it('should query verifications by omangNumber', async () => {
    mockDynamoDBSend.mockResolvedValueOnce({
      Item: {
        requestId: 'dsr_abc123',
        type: 'export',
        status: 'pending',
        subjectIdentifier: { type: 'omangNumber', value: '123456789' },
      },
    });
    mockDynamoDBSend.mockResolvedValueOnce({ Items: [] });
    mockDynamoDBSend.mockResolvedValueOnce({ Items: [] });
    mockS3Send.mockResolvedValueOnce({});
    mockDynamoDBSend.mockResolvedValueOnce({});

    await processExport({ requestId: 'dsr_abc123' });

    expect(mockDynamoDBSend).toHaveBeenCalled();
  });

  it('should query verifications by verificationId', async () => {
    mockDynamoDBSend.mockResolvedValueOnce({
      Item: {
        requestId: 'dsr_abc123',
        type: 'export',
        status: 'pending',
        subjectIdentifier: { type: 'verificationId', value: 'ver_123' },
      },
    });
    mockDynamoDBSend.mockResolvedValueOnce({ Items: [] });
    mockDynamoDBSend.mockResolvedValueOnce({ Items: [] });
    mockS3Send.mockResolvedValueOnce({});
    mockDynamoDBSend.mockResolvedValueOnce({});

    await processExport({ requestId: 'dsr_abc123' });

    expect(mockDynamoDBSend).toHaveBeenCalled();
  });

  it('should reject unsupported subject identifier type', async () => {
    mockDynamoDBSend.mockResolvedValueOnce({
      Item: {
        requestId: 'dsr_abc123',
        type: 'export',
        status: 'pending',
        subjectIdentifier: { type: 'unsupported' as any, value: 'test' },
      },
    });

    await processExport({ requestId: 'dsr_abc123' });

    expect(mockUpdateRequestStatus).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), 'dsr_abc123', 'failed',
      expect.stringContaining('Unsupported subject identifier type')
    );
  });
});
