import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DynamoDBService } from './dynamodb';
import type { VerificationEntity } from '../types/verification';

// Mock AWS SDK
const mockSend = vi.fn();

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({
      send: mockSend,
    })),
  },
  PutCommand: vi.fn((params) => ({ type: 'Put', params })),
  GetCommand: vi.fn((params) => ({ type: 'Get', params })),
  QueryCommand: vi.fn((params) => ({ type: 'Query', params })),
  UpdateCommand: vi.fn((params) => ({ type: 'Update', params })),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({})),
}));

describe('DynamoDBService', () => {
  let service: DynamoDBService;

  const mockVerification: VerificationEntity = {
    PK: 'CASE#ver_123',
    SK: 'META',
    verificationId: 'ver_123',
    clientId: 'client_abc',
    status: 'created',
    documentType: 'omang',
    customerMetadata: { email: 'test@example.com' },
    createdAt: '2026-01-14T10:00:00Z',
    updatedAt: '2026-01-14T10:00:00Z',
    expiresAt: '2026-02-13T10:00:00Z',
    ttl: 1739448000,
    GSI1PK: 'CLIENT#client_abc',
    GSI1SK: 'created#2026-01-14T10:00:00Z',
    GSI2PK: 'DATE#2026-01-14',
    GSI2SK: '2026-01-14T10:00:00Z#ver_123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DynamoDBService('AuthBridgeTable', 'af-south-1');
  });

  describe('putVerification', () => {
    it('should put verification entity with conditional write', async () => {
      mockSend.mockResolvedValue({});

      await service.putVerification(mockVerification);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const call = mockSend.mock.calls[0][0];
      expect(call.type).toBe('Put');
      expect(call.params.TableName).toBe('AuthBridgeTable');
      expect(call.params.Item).toEqual(mockVerification);
      expect(call.params.ConditionExpression).toBe('attribute_not_exists(PK)');
    });

    it('should throw error if verification already exists', async () => {
      const error = new Error('Conditional check failed');
      (error as any).name = 'ConditionalCheckFailedException';
      mockSend.mockRejectedValue(error);

      await expect(service.putVerification(mockVerification)).rejects.toThrow(
        'Verification already exists'
      );
    });

    it('should propagate other DynamoDB errors', async () => {
      const error = new Error('Service unavailable');
      mockSend.mockRejectedValue(error);

      await expect(service.putVerification(mockVerification)).rejects.toThrow(
        'Service unavailable'
      );
    });
  });

  describe('getVerification', () => {
    it('should get verification by ID', async () => {
      mockSend.mockResolvedValue({ Item: mockVerification });

      const result = await service.getVerification('ver_123');

      expect(result).toEqual(mockVerification);
      expect(mockSend).toHaveBeenCalledTimes(1);
      const call = mockSend.mock.calls[0][0];
      expect(call.type).toBe('Get');
      expect(call.params.Key).toEqual({ PK: 'CASE#ver_123', SK: 'META' });
    });

    it('should return null if verification not found', async () => {
      mockSend.mockResolvedValue({ Item: undefined });

      const result = await service.getVerification('ver_nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('queryByClientAndStatus', () => {
    it('should query verifications by client ID only', async () => {
      mockSend.mockResolvedValue({ Items: [mockVerification] });

      const result = await service.queryByClientAndStatus('client_abc');

      expect(result).toEqual([mockVerification]);
      const call = mockSend.mock.calls[0][0];
      expect(call.type).toBe('Query');
      expect(call.params.IndexName).toBe('GSI1');
      expect(call.params.KeyConditionExpression).toBe('GSI1PK = :pk');
      expect(call.params.ExpressionAttributeValues[':pk']).toBe('CLIENT#client_abc');
    });

    it('should query verifications by client ID and status', async () => {
      mockSend.mockResolvedValue({ Items: [mockVerification] });

      const result = await service.queryByClientAndStatus('client_abc', 'created');

      expect(result).toEqual([mockVerification]);
      const call = mockSend.mock.calls[0][0];
      expect(call.params.KeyConditionExpression).toBe(
        'GSI1PK = :pk AND begins_with(GSI1SK, :status)'
      );
      expect(call.params.ExpressionAttributeValues[':status']).toBe('created');
    });

    it('should return empty array if no results', async () => {
      mockSend.mockResolvedValue({ Items: undefined });

      const result = await service.queryByClientAndStatus('client_xyz');

      expect(result).toEqual([]);
    });
  });

  describe('queryByDate', () => {
    it('should query verifications by creation date', async () => {
      mockSend.mockResolvedValue({ Items: [mockVerification] });

      const result = await service.queryByDate('2026-01-14');

      expect(result).toEqual([mockVerification]);
      const call = mockSend.mock.calls[0][0];
      expect(call.type).toBe('Query');
      expect(call.params.IndexName).toBe('GSI2');
      expect(call.params.KeyConditionExpression).toBe('GSI2PK = :pk');
      expect(call.params.ExpressionAttributeValues[':pk']).toBe('DATE#2026-01-14');
    });
  });

  describe('updateVerificationStatus', () => {
    it('should update verification status', async () => {
      mockSend.mockResolvedValue({});

      await service.updateVerificationStatus('ver_123', 'submitted', '2026-01-14T12:00:00Z');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const call = mockSend.mock.calls[0][0];
      expect(call.type).toBe('Update');
      expect(call.params.Key).toEqual({ PK: 'CASE#ver_123', SK: 'META' });
      expect(call.params.ExpressionAttributeValues[':status']).toBe('submitted');
      expect(call.params.ExpressionAttributeValues[':updatedAt']).toBe('2026-01-14T12:00:00Z');
    });
  });
});
