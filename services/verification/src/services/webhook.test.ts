import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebhookService } from './webhook.js';
import { DynamoDBService } from './dynamodb.js';
import type { VerificationEntity } from '../types/verification.js';
import type { ClientConfiguration } from '../types/webhook.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Mock CloudWatch client
vi.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: vi.fn(function() {
    return {
      send: vi.fn().mockResolvedValue({}),
    };
  }),
  PutMetricDataCommand: vi.fn(function(params) { return params; }),
}));

describe('WebhookService', () => {
  let webhookService: WebhookService;
  let mockDynamoDBService: DynamoDBService;

  const testVerificationCase: VerificationEntity = {
    PK: 'CASE#ver_abc123',
    SK: 'META',
    verificationId: 'ver_abc123',
    clientId: 'client_xyz',
    status: 'approved',
    documentType: 'omang',
    customer: {
      email: 'john@example.com',
      name: 'John Doe',
    },
    extractedData: {
      idNumber: '123456789',
      surname: 'Doe',
      forenames: 'John',
      dateOfBirth: '1990-01-15',
      sex: 'M',
      dateOfExpiry: '2030-01-15',
    },
    biometricSummary: {
      livenessScore: 95,
      similarityScore: 90,
      overallScore: 92.5,
      passed: true,
      requiresManualReview: false,
      processedAt: '2026-01-16T11:10:00Z',
    },
    createdAt: '2026-01-16T11:00:00Z',
    updatedAt: '2026-01-16T11:10:00Z',
    completedAt: '2026-01-16T11:10:00Z',
    expiresAt: '2026-02-15T11:00:00Z',
    ttl: 1739620800,
    GSI1PK: 'CLIENT#client_xyz',
    GSI1SK: 'approved#2026-01-16T11:00:00Z',
    GSI2PK: 'DATE#2026-01-16',
    GSI2SK: '2026-01-16T11:00:00Z#ver_abc123',
  };

  const testClientConfig: ClientConfiguration = {
    PK: 'CLIENT#client_xyz',
    SK: 'CONFIG',
    clientId: 'client_xyz',
    companyName: 'Test Company',
    tier: 'business',
    apiKey: 'hashed_key',
    webhookUrl: 'https://webhook.example.com/authbridge',
    webhookSecret: 'test_secret_key_32_characters_long',
    webhookEnabled: true,
    webhookEvents: [
      'verification.approved',
      'verification.rejected',
      'verification.resubmission_required',
      'verification.expired',
    ],
    createdAt: '2026-01-16T10:00:00Z',
    updatedAt: '2026-01-16T10:00:00Z',
  };

  beforeEach(() => {
    mockDynamoDBService = {
      getItem: vi.fn(),
      putItem: vi.fn(),
    } as unknown as DynamoDBService;

    webhookService = new WebhookService(mockDynamoDBService);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendWebhook', () => {
    it('should send webhook successfully on first attempt', async () => {
      // Mock client config
      vi.mocked(mockDynamoDBService.getItem).mockResolvedValue({
        Item: testClientConfig,
      });

      // Mock successful webhook delivery
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '{"received":true}',
      });

      await webhookService.sendWebhook(
        testVerificationCase,
        'verification.approved'
      );

      // Verify fetch was called with correct parameters
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://webhook.example.com/authbridge');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.headers['X-Webhook-Event']).toBe('verification.approved');
      expect(options.headers['X-Webhook-Signature']).toMatch(/^sha256=/);
      expect(options.headers['User-Agent']).toBe('AuthBridge-Webhooks/1.0');

      // Verify payload
      const payload = JSON.parse(options.body);
      expect(payload.event).toBe('verification.approved');
      expect(payload.data.verificationId).toBe('ver_abc123');
      expect(payload.data.status).toBe('approved');
      expect(payload.data.customer.omangNumber).toBe('***6789'); // Masked
    });

    it('should not send webhook if not configured', async () => {
      vi.mocked(mockDynamoDBService.getItem).mockResolvedValue({
        Item: { ...testClientConfig, webhookEnabled: false },
      });

      await webhookService.sendWebhook(
        testVerificationCase,
        'verification.approved'
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not send webhook if event not subscribed', async () => {
      vi.mocked(mockDynamoDBService.getItem).mockResolvedValue({
        Item: {
          ...testClientConfig,
          webhookEvents: ['verification.rejected'],
        },
      });

      await webhookService.sendWebhook(
        testVerificationCase,
        'verification.approved'
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should retry on 5xx errors with exponential backoff', async () => {
      vi.mocked(mockDynamoDBService.getItem).mockResolvedValue({
        Item: testClientConfig,
      });

      // Mock 500 error twice, then success
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => '{"received":true}',
        });

      // Mock sleep to avoid waiting
      vi.spyOn(webhookService as any, 'sleep').mockResolvedValue(undefined);

      await webhookService.sendWebhook(
        testVerificationCase,
        'verification.approved'
      );

      // Should have retried 3 times total
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should not retry on 4xx errors', async () => {
      vi.mocked(mockDynamoDBService.getItem).mockResolvedValue({
        Item: testClientConfig,
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      });

      await webhookService.sendWebhook(
        testVerificationCase,
        'verification.approved'
      );

      // Should only attempt once (no retries on 4xx)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should fail after 3 attempts', async () => {
      vi.mocked(mockDynamoDBService.getItem).mockResolvedValue({
        Item: testClientConfig,
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      // Mock sleep to avoid waiting
      vi.spyOn(webhookService as any, 'sleep').mockResolvedValue(undefined);

      await webhookService.sendWebhook(
        testVerificationCase,
        'verification.approved'
      );

      // Should attempt 3 times
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle network errors with retry', async () => {
      vi.mocked(mockDynamoDBService.getItem).mockResolvedValue({
        Item: testClientConfig,
      });

      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => '{"received":true}',
        });

      // Mock sleep to avoid waiting
      vi.spyOn(webhookService as any, 'sleep').mockResolvedValue(undefined);

      await webhookService.sendWebhook(
        testVerificationCase,
        'verification.approved'
      );

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('formatPayload', () => {
    it('should format approved verification payload correctly', () => {
      const payload = webhookService['formatPayload'](
        testVerificationCase,
        'verification.approved'
      );

      expect(payload.event).toBe('verification.approved');
      expect(payload.data.verificationId).toBe('ver_abc123');
      expect(payload.data.status).toBe('approved');
      expect(payload.data.customer?.name).toBe('John Doe');
      expect(payload.data.customer?.email).toBe('john@example.com');
      expect(payload.data.customer?.omangNumber).toBe('***6789');
      expect(payload.data.extractedData?.fullName).toBe('John Doe');
      expect(payload.data.extractedData?.dateOfBirth).toBe('1990-01-15');
      expect(payload.data.biometricScore).toBe(92.5);
    });

    it('should format rejected verification payload correctly', () => {
      const rejectedCase: VerificationEntity = {
        ...testVerificationCase,
        status: 'rejected',
        rejectionReason: 'Face mismatch detected',
        rejectionCode: 'FACE_MISMATCH',
      };

      const payload = webhookService['formatPayload'](
        rejectedCase,
        'verification.rejected'
      );

      expect(payload.event).toBe('verification.rejected');
      expect(payload.data.status).toBe('rejected');
      expect(payload.data.customer?.email).toBe('john@example.com');
      expect(payload.data.customer?.name).toBeUndefined();
      expect(payload.data.rejectionReason).toBe('Face mismatch detected');
      expect(payload.data.rejectionCode).toBe('FACE_MISMATCH');
    });

    it('should mask Omang numbers correctly', () => {
      expect(webhookService['maskOmangNumber']('123456789')).toBe('***6789');
      expect(webhookService['maskOmangNumber']('123')).toBe('***');
      expect(webhookService['maskOmangNumber']('')).toBe('');
      expect(webhookService['maskOmangNumber'](undefined)).toBe('');
    });
  });

  describe('generateSignature', () => {
    it('should generate valid HMAC-SHA256 signature', () => {
      const payload = {
        event: 'verification.approved' as const,
        timestamp: '2026-01-16T12:00:00Z',
        data: {
          verificationId: 'ver_abc123',
          status: 'approved',
          createdAt: '2026-01-16T11:00:00Z',
          updatedAt: '2026-01-16T11:10:00Z',
        },
      };
      const timestamp = 1705406400;
      const secret = 'test_secret_key';

      const signature = webhookService.generateSignature(
        payload,
        timestamp,
        secret
      );

      expect(signature).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
      expect(signature.length).toBe(64);
    });

    it('should generate different signatures for different payloads', () => {
      const payload1 = {
        event: 'verification.approved' as const,
        timestamp: '2026-01-16T12:00:00Z',
        data: {
          verificationId: 'ver_abc123',
          status: 'approved',
          createdAt: '2026-01-16T11:00:00Z',
          updatedAt: '2026-01-16T11:10:00Z',
        },
      };
      const payload2 = {
        ...payload1,
        data: { ...payload1.data, verificationId: 'ver_xyz789' },
      };
      const timestamp = 1705406400;
      const secret = 'test_secret_key';

      const sig1 = webhookService.generateSignature(payload1, timestamp, secret);
      const sig2 = webhookService.generateSignature(payload2, timestamp, secret);

      expect(sig1).not.toBe(sig2);
    });
  });
});
