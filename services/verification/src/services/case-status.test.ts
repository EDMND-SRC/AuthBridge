import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CaseStatusService } from './case-status.js';
import { WebhookService } from './webhook.js';
import { DynamoDBService } from './dynamodb.js';
import type { VerificationEntity } from '../types/verification.js';

describe('CaseStatusService', () => {
  let caseStatusService: CaseStatusService;
  let mockWebhookService: WebhookService;
  let mockDynamoDBService: DynamoDBService;

  const testVerificationCase: VerificationEntity = {
    PK: 'CASE#ver_abc123',
    SK: 'META',
    verificationId: 'ver_abc123',
    clientId: 'client_xyz',
    status: 'processing',
    documentType: 'omang',
    customer: {
      email: 'john@example.com',
      name: 'John Doe',
    },
    createdAt: '2026-01-16T11:00:00Z',
    updatedAt: '2026-01-16T11:05:00Z',
    expiresAt: '2026-02-15T11:00:00Z',
    ttl: 1739620800,
    GSI1PK: 'CLIENT#client_xyz',
    GSI1SK: 'processing#2026-01-16T11:00:00Z',
    GSI2PK: 'DATE#2026-01-16',
    GSI2SK: '2026-01-16T11:00:00Z#ver_abc123',
  };

  beforeEach(() => {
    mockWebhookService = {
      sendWebhook: vi.fn().mockResolvedValue(undefined),
    } as unknown as WebhookService;

    mockDynamoDBService = {
      getVerification: vi.fn(),
      putItem: vi.fn(),
    } as unknown as DynamoDBService;

    caseStatusService = new CaseStatusService(
      mockWebhookService,
      mockDynamoDBService
    );

    vi.clearAllMocks();
  });

  it('should update status to approved and trigger webhook', async () => {
    vi.mocked(mockDynamoDBService.getVerification).mockResolvedValue(
      testVerificationCase
    );

    await caseStatusService.updateStatus('ver_abc123', 'approved', {
      extractedData: {
        idNumber: '123456789',
        surname: 'Doe',
        forenames: 'John',
      },
      biometricSummary: {
        livenessScore: 95,
        similarityScore: 90,
        overallScore: 92.5,
        passed: true,
        requiresManualReview: false,
        processedAt: '2026-01-16T11:10:00Z',
      },
    });

    // Verify status was updated in DynamoDB
    expect(mockDynamoDBService.putItem).toHaveBeenCalledWith(
      expect.objectContaining({
        verificationId: 'ver_abc123',
        status: 'approved',
        completedAt: expect.any(String),
      })
    );

    // Verify webhook was triggered
    expect(mockWebhookService.sendWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        verificationId: 'ver_abc123',
        status: 'approved',
      }),
      'verification.approved'
    );
  });

  it('should update status to rejected and trigger webhook', async () => {
    vi.mocked(mockDynamoDBService.getVerification).mockResolvedValue(
      testVerificationCase
    );

    await caseStatusService.updateStatus('ver_abc123', 'rejected', {
      rejectionReason: 'Face mismatch detected',
      rejectionCode: 'FACE_MISMATCH',
    });

    expect(mockDynamoDBService.putItem).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'rejected',
        rejectionReason: 'Face mismatch detected',
        rejectionCode: 'FACE_MISMATCH',
        completedAt: expect.any(String),
      })
    );

    expect(mockWebhookService.sendWebhook).toHaveBeenCalledWith(
      expect.any(Object),
      'verification.rejected'
    );
  });

  it('should update status to resubmission_required and trigger webhook', async () => {
    vi.mocked(mockDynamoDBService.getVerification).mockResolvedValue(
      testVerificationCase
    );

    await caseStatusService.updateStatus(
      'ver_abc123',
      'resubmission_required'
    );

    expect(mockWebhookService.sendWebhook).toHaveBeenCalledWith(
      expect.any(Object),
      'verification.resubmission_required'
    );
  });

  it('should update status to expired and trigger webhook', async () => {
    vi.mocked(mockDynamoDBService.getVerification).mockResolvedValue(
      testVerificationCase
    );

    await caseStatusService.updateStatus('ver_abc123', 'expired');

    expect(mockDynamoDBService.putItem).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'expired',
        completedAt: expect.any(String),
      })
    );

    expect(mockWebhookService.sendWebhook).toHaveBeenCalledWith(
      expect.any(Object),
      'verification.expired'
    );
  });

  it('should not trigger webhook for non-webhook statuses', async () => {
    vi.mocked(mockDynamoDBService.getVerification).mockResolvedValue(
      testVerificationCase
    );

    await caseStatusService.updateStatus('ver_abc123', 'in_review');

    expect(mockDynamoDBService.putItem).toHaveBeenCalled();
    expect(mockWebhookService.sendWebhook).not.toHaveBeenCalled();
  });

  it('should not block status update if webhook fails', async () => {
    vi.mocked(mockDynamoDBService.getVerification).mockResolvedValue(
      testVerificationCase
    );
    vi.mocked(mockWebhookService.sendWebhook).mockRejectedValue(
      new Error('Webhook delivery failed')
    );

    // Should not throw even if webhook fails
    await expect(
      caseStatusService.updateStatus('ver_abc123', 'approved')
    ).resolves.not.toThrow();

    // Status update should still happen
    expect(mockDynamoDBService.putItem).toHaveBeenCalled();
  });

  it('should throw error if verification not found', async () => {
    vi.mocked(mockDynamoDBService.getVerification).mockResolvedValue(null);

    await expect(
      caseStatusService.updateStatus('ver_nonexistent', 'approved')
    ).rejects.toThrow('Verification case not found');
  });

  it('should set completedAt for terminal statuses', async () => {
    vi.mocked(mockDynamoDBService.getVerification).mockResolvedValue(
      testVerificationCase
    );

    await caseStatusService.updateStatus('ver_abc123', 'approved');

    expect(mockDynamoDBService.putItem).toHaveBeenCalledWith(
      expect.objectContaining({
        completedAt: expect.any(String),
      })
    );
  });

  it('should not set completedAt for non-terminal statuses', async () => {
    vi.mocked(mockDynamoDBService.getVerification).mockResolvedValue(
      testVerificationCase
    );

    await caseStatusService.updateStatus('ver_abc123', 'in_review');

    expect(mockDynamoDBService.putItem).toHaveBeenCalledWith(
      expect.objectContaining({
        completedAt: undefined,
      })
    );
  });
});
