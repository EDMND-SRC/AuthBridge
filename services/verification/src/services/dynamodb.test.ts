import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DynamoDBService } from './dynamodb';
import type { VerificationEntity } from '../types/verification';
import { EncryptionService } from './encryption';

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

// Mock encryption service
const mockEncryptField = vi.fn();
const mockDecryptField = vi.fn();
const mockHashField = vi.fn();

vi.mock('./encryption', () => ({
  EncryptionService: vi.fn(() => ({
    encryptField: mockEncryptField,
    decryptField: mockDecryptField,
    hashField: mockHashField,
  })),
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

    // Setup encryption mock defaults
    mockEncryptField.mockImplementation((value: string) => Promise.resolve(`encrypted_${value}`));
    mockDecryptField.mockImplementation((value: string) => Promise.resolve(value.replace('encrypted_', '')));
    mockHashField.mockImplementation((value: string) => `hash_${value}`);

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
      expect(call.params.Item.verificationId).toBe('ver_123');
      expect(call.params.ConditionExpression).toBe('attribute_not_exists(PK)');
    });

    it('should encrypt sensitive fields before storage', async () => {
      mockSend.mockResolvedValue({});

      const verificationWithData = {
        PK: 'CASE#ver_123',
        SK: 'META',
        verificationId: 'ver_123',
        clientId: 'client_abc',
        status: 'created' as const,
        documentType: 'omang' as const,
        customerMetadata: { email: 'test@example.com' },
        createdAt: '2026-01-14T10:00:00Z',
        updatedAt: '2026-01-14T10:00:00Z',
        expiresAt: '2026-02-13T10:00:00Z',
        ttl: 1739448000,
        GSI1PK: 'CLIENT#client_abc',
        GSI1SK: 'created#2026-01-14T10:00:00Z',
        GSI2SK: '2026-01-14T10:00:00Z#ver_123',
        extractedData: {
          firstName: 'John',
          lastName: 'Doe',
          idNumber: '123456789',
          address: '123 Main St',
        },
      };

      await service.putVerification(verificationWithData);

      // Verify that DynamoDB received the data
      const call = mockSend.mock.calls[0][0];
      expect(call.params.Item.extractedData).toBeDefined();

      // Verify encrypted data format (encrypted_ prefix from mock)
      expect(call.params.Item.extractedData.address).toContain('encrypted_');
      expect(call.params.Item.extractedData.idNumber).toContain('encrypted_');
      expect(call.params.Item.GSI2PK).toContain('OMANG#hash_');
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

    it('should decrypt sensitive fields after retrieval', async () => {
      const encryptedVerification = {
        ...mockVerification,
        extractedData: {
          firstName: 'John',
          lastName: 'Doe',
          idNumber: 'encrypted_123456789',
          address: 'encrypted_123 Main St',
        },
      };

      mockSend.mockResolvedValue({ Item: encryptedVerification });

      const result = await service.getVerification('ver_123');

      expect(mockDecryptField).toHaveBeenCalledWith('encrypted_123 Main St', 3, 'ver_123', 'address');
      expect(mockDecryptField).toHaveBeenCalledWith('encrypted_123456789', 3, 'ver_123', 'idNumber');
      expect(result?.extractedData?.address).toBe('123 Main St');
      expect(result?.extractedData?.idNumber).toBe('123456789');
    });

    it('should return null if verification not found', async () => {
      mockSend.mockResolvedValue({ Item: undefined });

      const result = await service.getVerification('ver_nonexistent');

      expect(result).toBeNull();
    });

    it('should handle decryption errors gracefully', async () => {
      const encryptedVerification = {
        ...mockVerification,
        extractedData: {
          address: 'encrypted_invalid',
        },
      };

      mockSend.mockResolvedValue({ Item: encryptedVerification });
      mockDecryptField.mockRejectedValue(new Error('Decryption failed'));

      const result = await service.getVerification('ver_123');

      // Should return [DECRYPTION_ERROR] marker if decryption fails
      expect(result?.extractedData?.address).toBe('[DECRYPTION_ERROR]');
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

    it('should decrypt sensitive fields in query results', async () => {
      const encryptedVerification = {
        ...mockVerification,
        extractedData: {
          address: 'encrypted_123 Main St',
          idNumber: 'encrypted_123456789',
        },
      };

      mockSend.mockResolvedValue({ Items: [encryptedVerification] });

      const result = await service.queryByClientAndStatus('client_abc');

      expect(mockDecryptField).toHaveBeenCalledWith('encrypted_123 Main St', 3, 'ver_123', 'address');
      expect(mockDecryptField).toHaveBeenCalledWith('encrypted_123456789', 3, 'ver_123', 'idNumber');
      expect(result[0].extractedData?.address).toBe('123 Main St');
      expect(result[0].extractedData?.idNumber).toBe('123456789');
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
