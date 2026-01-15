import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DuplicateDetectionService } from './duplicate-detection';
import type { DynamoDBService } from './dynamodb';
import type { VerificationEntity } from '../types/verification';

describe('DuplicateDetectionService', () => {
  let service: DuplicateDetectionService;
  let mockDynamoDBService: DynamoDBService;

  beforeEach(() => {
    mockDynamoDBService = {
      queryByOmangHash: vi.fn(),
    } as unknown as DynamoDBService;

    service = new DuplicateDetectionService(mockDynamoDBService);
  });

  describe('checkDuplicates', () => {
    it('should return no duplicates for first-time Omang', async () => {
      vi.mocked(mockDynamoDBService.queryByOmangHash).mockResolvedValue([]);

      const result = await service.checkDuplicates(
        '123456789',
        'ver_new',
        'client_abc',
        92.5
      );

      expect(result.checked).toBe(true);
      expect(result.duplicatesFound).toBe(0);
      expect(result.sameClientDuplicates).toBe(0);
      expect(result.crossClientDuplicates).toBe(0);
      expect(result.riskLevel).toBe('low');
      expect(result.riskScore).toBe(0);
      expect(result.requiresManualReview).toBe(false);
    });

    it('should detect same-client duplicate (low risk)', async () => {
      const previousCase: Partial<VerificationEntity> = {
        verificationId: 'ver_previous',
        clientId: 'client_abc',
        status: 'approved',
        createdAt: '2025-12-01T10:00:00Z',
        biometricSummary: {
          overallScore: 91.0,
          livenessScore: 95.0,
          similarityScore: 90.0,
          passed: true,
          requiresManualReview: false,
          processedAt: '2025-12-01T10:00:00Z',
        },
      };

      vi.mocked(mockDynamoDBService.queryByOmangHash).mockResolvedValue([
        previousCase as VerificationEntity,
      ]);

      const result = await service.checkDuplicates(
        '123456789',
        'ver_new',
        'client_abc',
        92.5
      );

      expect(result.duplicatesFound).toBe(1);
      expect(result.sameClientDuplicates).toBe(1);
      expect(result.crossClientDuplicates).toBe(0);
      expect(result.riskLevel).toBe('low');
      expect(result.requiresManualReview).toBe(false);
    });

    it('should detect cross-client duplicate (high risk)', async () => {
      const previousCase: Partial<VerificationEntity> = {
        verificationId: 'ver_previous',
        clientId: 'client_xyz',
        status: 'approved',
        createdAt: '2025-12-01T10:00:00Z',
        biometricSummary: {
          overallScore: 91.0,
          livenessScore: 95.0,
          similarityScore: 90.0,
          passed: true,
          requiresManualReview: false,
          processedAt: '2025-12-01T10:00:00Z',
        },
      };

      vi.mocked(mockDynamoDBService.queryByOmangHash).mockResolvedValue([
        previousCase as VerificationEntity,
      ]);

      const result = await service.checkDuplicates(
        '123456789',
        'ver_new',
        'client_abc',
        92.5
      );

      expect(result.duplicatesFound).toBe(1);
      expect(result.sameClientDuplicates).toBe(0);
      expect(result.crossClientDuplicates).toBe(1);
      expect(result.riskLevel).toBe('medium'); // 40 points = medium
      expect(result.requiresManualReview).toBe(true);
      expect(result.flagReason).toContain('cross-client');
    });

    it('should detect biometric mismatch (medium risk)', async () => {
      const previousCase: Partial<VerificationEntity> = {
        verificationId: 'ver_previous',
        clientId: 'client_abc',
        status: 'approved',
        createdAt: '2025-12-01T10:00:00Z',
        biometricSummary: {
          overallScore: 50.0, // Very different from current 92.5
          livenessScore: 60.0,
          similarityScore: 45.0,
          passed: false,
          requiresManualReview: true,
          processedAt: '2025-12-01T10:00:00Z',
        },
      };

      vi.mocked(mockDynamoDBService.queryByOmangHash).mockResolvedValue([
        previousCase as VerificationEntity,
      ]);

      const result = await service.checkDuplicates(
        '123456789',
        'ver_new',
        'client_abc',
        92.5
      );

      expect(result.duplicatesFound).toBe(1);
      expect(result.riskLevel).toBe('medium'); // 30 points = medium
      expect(result.requiresManualReview).toBe(true);
    });

    it('should exclude current verification from duplicates', async () => {
      const currentCase: Partial<VerificationEntity> = {
        verificationId: 'ver_current',
        clientId: 'client_abc',
        status: 'processing',
        createdAt: '2026-01-15T10:00:00Z',
        biometricSummary: {
          overallScore: 92.5,
          livenessScore: 95.0,
          similarityScore: 90.0,
          passed: true,
          requiresManualReview: false,
          processedAt: '2026-01-15T10:00:00Z',
        },
      };

      vi.mocked(mockDynamoDBService.queryByOmangHash).mockResolvedValue([
        currentCase as VerificationEntity,
      ]);

      const result = await service.checkDuplicates(
        '123456789',
        'ver_current',
        'client_abc',
        92.5
      );

      expect(result.duplicatesFound).toBe(0);
      expect(result.riskLevel).toBe('low');
    });

    it('should handle multiple duplicates', async () => {
      const cases: Partial<VerificationEntity>[] = [
        {
          verificationId: 'ver_1',
          clientId: 'client_abc',
          status: 'approved',
          createdAt: '2025-11-01T10:00:00Z',
          biometricSummary: {
            overallScore: 90.0,
            livenessScore: 95.0,
            similarityScore: 88.0,
            passed: true,
            requiresManualReview: false,
            processedAt: '2025-11-01T10:00:00Z',
          },
        },
        {
          verificationId: 'ver_2',
          clientId: 'client_xyz',
          status: 'approved',
          createdAt: '2025-12-01T10:00:00Z',
          biometricSummary: {
            overallScore: 91.0,
            livenessScore: 95.0,
            similarityScore: 89.0,
            passed: true,
            requiresManualReview: false,
            processedAt: '2025-12-01T10:00:00Z',
          },
        },
        {
          verificationId: 'ver_3',
          clientId: 'client_def',
          status: 'approved',
          createdAt: '2026-01-01T10:00:00Z',
          biometricSummary: {
            overallScore: 92.0,
            livenessScore: 95.0,
            similarityScore: 90.0,
            passed: true,
            requiresManualReview: false,
            processedAt: '2026-01-01T10:00:00Z',
          },
        },
      ];

      vi.mocked(mockDynamoDBService.queryByOmangHash).mockResolvedValue(
        cases as VerificationEntity[]
      );

      const result = await service.checkDuplicates(
        '123456789',
        'ver_new',
        'client_abc',
        92.5
      );

      expect(result.duplicatesFound).toBe(3);
      expect(result.sameClientDuplicates).toBe(1);
      expect(result.crossClientDuplicates).toBe(2);
      expect(result.riskLevel).toBe('high'); // 40 (cross-client) + 10 (multiple) + 15 (recent) = 65
      expect(result.requiresManualReview).toBe(true);
    });

    it('should handle DynamoDB errors gracefully', async () => {
      vi.mocked(mockDynamoDBService.queryByOmangHash).mockRejectedValue(
        new Error('DynamoDB error')
      );

      const result = await service.checkDuplicates(
        '123456789',
        'ver_new',
        'client_abc',
        92.5
      );

      expect(result.checked).toBe(false);
      expect(result.duplicatesFound).toBe(0);
      expect(result.riskLevel).toBe('unknown');
      expect(result.riskScore).toBe(0);
      expect(result.error).toBe('DynamoDB error');
    });
  });
});
