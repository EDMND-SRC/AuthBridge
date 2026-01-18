import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IdempotencyService, IdempotencyConflictError } from './idempotency';

// Mock AWS SDK
const mockSend = vi.fn();

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(function() {
      return {
        send: mockSend,
      };
    }),
  },
  PutCommand: vi.fn(function(params) {
    this.type = 'Put';
    this.params = params;
  }),
  GetCommand: vi.fn(function(params) {
    this.type = 'Get';
    this.params = params;
  }),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(function() {
    return {};
  }),
}));

describe('IdempotencyService', () => {
  let service: IdempotencyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new IdempotencyService('AuthBridgeTable', 'af-south-1');
  });

  describe('checkIdempotencyKey', () => {
    it('should return verification ID if key exists', async () => {
      mockSend.mockResolvedValue({
        Item: {
          PK: 'IDEM#client_abc#idem_123',
          SK: 'IDEM',
          verificationId: 'ver_existing',
        },
      });

      const result = await service.checkIdempotencyKey('client_abc', 'idem_123');

      expect(result).toBe('ver_existing');
      expect(mockSend).toHaveBeenCalledTimes(1);
      const call = mockSend.mock.calls[0][0];
      expect(call.type).toBe('Get');
      expect(call.params.Key.PK).toBe('IDEM#client_abc#idem_123');
      expect(call.params.Key.SK).toBe('IDEM');
    });

    it('should return null if key does not exist', async () => {
      mockSend.mockResolvedValue({ Item: undefined });

      const result = await service.checkIdempotencyKey('client_abc', 'idem_new');

      expect(result).toBeNull();
    });
  });

  describe('storeIdempotencyKey', () => {
    it('should store idempotency record with TTL', async () => {
      mockSend.mockResolvedValue({});

      await service.storeIdempotencyKey('client_abc', 'idem_123', 'ver_new');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const call = mockSend.mock.calls[0][0];
      expect(call.type).toBe('Put');
      expect(call.params.Item.PK).toBe('IDEM#client_abc#idem_123');
      expect(call.params.Item.SK).toBe('IDEM');
      expect(call.params.Item.verificationId).toBe('ver_new');
      expect(call.params.Item.clientId).toBe('client_abc');
      expect(call.params.Item.idempotencyKey).toBe('idem_123');
      expect(call.params.Item.ttl).toBeDefined();
      expect(call.params.ConditionExpression).toBe('attribute_not_exists(PK)');
    });

    it('should throw IdempotencyConflictError if key already exists', async () => {
      const error = new Error('Conditional check failed');
      (error as any).name = 'ConditionalCheckFailedException';
      mockSend.mockRejectedValue(error);

      await expect(
        service.storeIdempotencyKey('client_abc', 'idem_123', 'ver_new')
      ).rejects.toThrow(IdempotencyConflictError);
    });

    it('should propagate other errors', async () => {
      const error = new Error('Service unavailable');
      mockSend.mockRejectedValue(error);

      await expect(
        service.storeIdempotencyKey('client_abc', 'idem_123', 'ver_new')
      ).rejects.toThrow('Service unavailable');
    });
  });

  describe('IdempotencyConflictError', () => {
    it('should include idempotency key in error', () => {
      const error = new IdempotencyConflictError('idem_test');

      expect(error.name).toBe('IdempotencyConflictError');
      expect(error.idempotencyKey).toBe('idem_test');
      expect(error.message).toContain('idem_test');
    });
  });
});
