import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VerificationService } from './verification';
import type { CreateVerificationRequest } from '../types/verification';

// Mock DynamoDB service
const mockPutVerification = vi.fn();
const mockGetVerification = vi.fn();
const mockQueryByClientAndStatus = vi.fn();
const mockQueryByDate = vi.fn();
const mockUpdateVerificationStatus = vi.fn();

vi.mock('./dynamodb', () => ({
  DynamoDBService: vi.fn(() => ({
    putVerification: mockPutVerification,
    getVerification: mockGetVerification,
    queryByClientAndStatus: mockQueryByClientAndStatus,
    queryByDate: mockQueryByDate,
    updateVerificationStatus: mockUpdateVerificationStatus,
  })),
}));

describe('VerificationService', () => {
  let service: VerificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new VerificationService('AuthBridgeTable', 'af-south-1');
  });

  describe('generateVerificationId', () => {
    it('should generate UUID v4 with ver_ prefix', () => {
      const id = service.generateVerificationId();
      expect(id).toMatch(/^ver_[a-f0-9]{32}$/);
    });

    it('should generate unique IDs', () => {
      const id1 = service.generateVerificationId();
      const id2 = service.generateVerificationId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('calculateTTL', () => {
    it('should calculate TTL as 30 days from creation', () => {
      const createdAt = '2026-01-14T10:00:00Z';
      const ttl = service.calculateTTL(createdAt);

      const createdTimestamp = new Date(createdAt).getTime();
      const expectedTTL = Math.floor((createdTimestamp + 30 * 24 * 60 * 60 * 1000) / 1000);
      expect(ttl).toBe(expectedTTL);
    });

    it('should handle different timestamps', () => {
      const createdAt = '2026-06-15T23:59:59Z';
      const ttl = service.calculateTTL(createdAt);

      const createdTimestamp = new Date(createdAt).getTime();
      const expectedTTL = Math.floor((createdTimestamp + 30 * 24 * 60 * 60 * 1000) / 1000);
      expect(ttl).toBe(expectedTTL);
    });
  });

  describe('createVerification', () => {
    it('should create verification with all required fields', async () => {
      mockPutVerification.mockResolvedValue(undefined);

      const request: CreateVerificationRequest = {
        customer: { email: 'test@example.com' },
        documentType: 'omang',
      };

      const result = await service.createVerification(request, 'client_abc');

      expect(result.verificationId).toMatch(/^ver_[a-f0-9]{32}$/);
      expect(result.clientId).toBe('client_abc');
      expect(result.status).toBe('created');
      expect(result.documentType).toBe('omang');
      expect(result.customer).toEqual({ email: 'test@example.com' });
      expect(result.PK).toBe(`CASE#${result.verificationId}`);
      expect(result.SK).toBe('META');
      expect(result.GSI1PK).toBe('CLIENT#client_abc');
      expect(result.GSI1SK).toMatch(/^created#\d{4}-\d{2}-\d{2}T/);
      expect(result.GSI2PK).toMatch(/^DATE#\d{4}-\d{2}-\d{2}$/);
    });

    it('should set initial status to created', async () => {
      mockPutVerification.mockResolvedValue(undefined);

      const request: CreateVerificationRequest = {
        customer: { email: 'test@example.com' },
        documentType: 'passport',
      };

      const result = await service.createVerification(request, 'client_xyz');

      expect(result.status).toBe('created');
    });

    it('should set expiresAt to 30 days from creation', async () => {
      mockPutVerification.mockResolvedValue(undefined);

      const request: CreateVerificationRequest = {
        customer: { email: 'test@example.com' },
        documentType: 'omang',
      };

      const before = Date.now();
      const result = await service.createVerification(request, 'client_abc');
      const after = Date.now();

      const expiresAt = new Date(result.expiresAt).getTime();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(before + thirtyDays);
      expect(expiresAt).toBeLessThanOrEqual(after + thirtyDays);
    });

    it('should call DynamoDB putVerification', async () => {
      mockPutVerification.mockResolvedValue(undefined);

      const request: CreateVerificationRequest = {
        customer: { email: 'test@example.com' },
        documentType: 'omang',
      };

      await service.createVerification(request, 'client_abc');

      expect(mockPutVerification).toHaveBeenCalledTimes(1);
      expect(mockPutVerification).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'client_abc',
          documentType: 'omang',
          status: 'created',
        })
      );
    });
  });

  describe('getVerification', () => {
    it('should return verification from DynamoDB', async () => {
      const mockVerification = {
        verificationId: 'ver_123',
        clientId: 'client_abc',
        status: 'created',
      };
      mockGetVerification.mockResolvedValue(mockVerification);

      const result = await service.getVerification('ver_123');

      expect(result).toEqual(mockVerification);
      expect(mockGetVerification).toHaveBeenCalledWith('ver_123');
    });

    it('should return null if verification not found', async () => {
      mockGetVerification.mockResolvedValue(null);

      const result = await service.getVerification('ver_nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('listVerificationsByClient', () => {
    it('should query verifications by client ID', async () => {
      const mockVerifications = [
        { verificationId: 'ver_1', clientId: 'client_abc' },
        { verificationId: 'ver_2', clientId: 'client_abc' },
      ];
      mockQueryByClientAndStatus.mockResolvedValue(mockVerifications);

      const result = await service.listVerificationsByClient('client_abc');

      expect(result).toEqual(mockVerifications);
      expect(mockQueryByClientAndStatus).toHaveBeenCalledWith('client_abc', undefined);
    });

    it('should filter by status when provided', async () => {
      mockQueryByClientAndStatus.mockResolvedValue([]);

      await service.listVerificationsByClient('client_abc', 'pending_review');

      expect(mockQueryByClientAndStatus).toHaveBeenCalledWith('client_abc', 'pending_review');
    });
  });

  describe('listVerificationsByDate', () => {
    it('should query verifications by date', async () => {
      const mockVerifications = [{ verificationId: 'ver_1' }];
      mockQueryByDate.mockResolvedValue(mockVerifications);

      const result = await service.listVerificationsByDate('2026-01-14');

      expect(result).toEqual(mockVerifications);
      expect(mockQueryByDate).toHaveBeenCalledWith('2026-01-14');
    });
  });

  describe('updateStatus', () => {
    it('should update verification status', async () => {
      mockUpdateVerificationStatus.mockResolvedValue(undefined);

      await service.updateStatus('ver_123', 'submitted');

      expect(mockUpdateVerificationStatus).toHaveBeenCalledWith(
        'ver_123',
        'submitted',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
      );
    });
  });
});
