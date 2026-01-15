import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DuplicateStorageService } from './duplicate-storage';
import type { DynamoDBService } from './dynamodb';
import type { DuplicateDetectionResult } from '../types/duplicate';

describe('DuplicateStorageService', () => {
  let service: DuplicateStorageService;
  let mockDynamoDBService: DynamoDBService;

  beforeEach(() => {
    mockDynamoDBService = {
      updateItem: vi.fn(),
    } as unknown as DynamoDBService;

    service = new DuplicateStorageService(mockDynamoDBService);
  });

  describe('storeDuplicateResults', () => {
    it('should store duplicate detection results in DynamoDB', async () => {
      const verificationId = 'ver_123';
      const duplicateResult: DuplicateDetectionResult = {
        checked: true,
        checkedAt: '2026-01-15T10:00:00Z',
        duplicatesFound: 2,
        sameClientDuplicates: 1,
        crossClientDuplicates: 1,
        riskLevel: 'high',
        riskScore: 75,
        duplicateCases: [
          {
            verificationId: 'ver_prev_1',
            clientId: 'client_abc',
            status: 'approved',
            biometricScore: 92.5,
            createdAt: '2025-12-01T10:00:00Z',
            daysSince: 45,
          },
          {
            verificationId: 'ver_prev_2',
            clientId: 'client_xyz',
            status: 'approved',
            biometricScore: 91.0,
            createdAt: '2025-12-15T10:00:00Z',
            daysSince: 31,
          },
        ],
        requiresManualReview: true,
        flagReason: '1 cross-client duplicate(s)',
      };

      await service.storeDuplicateResults(verificationId, duplicateResult);

      // Verify DynamoDB update was called
      expect(mockDynamoDBService.updateItem).toHaveBeenCalled();
    });

    it('should handle storage errors gracefully', async () => {
      const verificationId = 'ver_123';
      const duplicateResult: DuplicateDetectionResult = {
        checked: true,
        checkedAt: '2026-01-15T10:00:00Z',
        duplicatesFound: 0,
        sameClientDuplicates: 0,
        crossClientDuplicates: 0,
        riskLevel: 'low',
        riskScore: 0,
        duplicateCases: [],
        requiresManualReview: false,
      };

      vi.mocked(mockDynamoDBService.updateItem).mockRejectedValue(
        new Error('DynamoDB error')
      );

      await expect(
        service.storeDuplicateResults(verificationId, duplicateResult)
      ).rejects.toThrow('DynamoDB error');
    });
  });
});
