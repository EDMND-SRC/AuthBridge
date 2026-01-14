import { describe, it, expect } from 'vitest';
import {
  generateVerificationPK,
  generateVerificationSK,
  generateDocumentSK,
  generateGSI1Keys,
  generateGSI2Keys,
  parseVerificationId,
  parseDocumentId,
} from './entity-keys';

describe('entity-keys', () => {
  describe('generateVerificationPK', () => {
    it('should generate PK with CASE# prefix', () => {
      const verificationId = 'ver_abc123';
      const pk = generateVerificationPK(verificationId);
      expect(pk).toBe('CASE#ver_abc123');
    });

    it('should handle UUID format', () => {
      const verificationId = '550e8400-e29b-41d4-a716-446655440000';
      const pk = generateVerificationPK(verificationId);
      expect(pk).toBe('CASE#550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('generateVerificationSK', () => {
    it('should return META constant', () => {
      const sk = generateVerificationSK();
      expect(sk).toBe('META');
    });
  });

  describe('generateDocumentSK', () => {
    it('should generate SK with DOC# prefix', () => {
      const documentId = 'doc_xyz789';
      const sk = generateDocumentSK(documentId);
      expect(sk).toBe('DOC#doc_xyz789');
    });
  });

  describe('generateGSI1Keys', () => {
    it('should generate GSI1PK with CLIENT# prefix', () => {
      const clientId = 'client_123';
      const status = 'created';
      const createdAt = '2026-01-14T10:00:00Z';

      const keys = generateGSI1Keys(clientId, status, createdAt);

      expect(keys.GSI1PK).toBe('CLIENT#client_123');
      expect(keys.GSI1SK).toBe('created#2026-01-14T10:00:00Z');
    });

    it('should handle different statuses', () => {
      const keys = generateGSI1Keys('client_456', 'pending_review', '2026-01-14T11:00:00Z');

      expect(keys.GSI1PK).toBe('CLIENT#client_456');
      expect(keys.GSI1SK).toBe('pending_review#2026-01-14T11:00:00Z');
    });
  });

  describe('generateGSI2Keys', () => {
    it('should generate GSI2PK with DATE# prefix and YYYY-MM-DD format', () => {
      const createdAt = '2026-01-14T10:30:45Z';
      const verificationId = 'ver_abc123';

      const keys = generateGSI2Keys(createdAt, verificationId);

      expect(keys.GSI2PK).toBe('DATE#2026-01-14');
      expect(keys.GSI2SK).toBe('2026-01-14T10:30:45Z#ver_abc123');
    });

    it('should extract date correctly from ISO timestamp', () => {
      const keys = generateGSI2Keys('2026-12-31T23:59:59Z', 'ver_xyz');

      expect(keys.GSI2PK).toBe('DATE#2026-12-31');
      expect(keys.GSI2SK).toBe('2026-12-31T23:59:59Z#ver_xyz');
    });
  });

  describe('parseVerificationId', () => {
    it('should extract verification ID from PK', () => {
      const pk = 'CASE#ver_abc123';
      const id = parseVerificationId(pk);
      expect(id).toBe('ver_abc123');
    });

    it('should return null for invalid PK format', () => {
      const pk = 'INVALID#ver_abc123';
      const id = parseVerificationId(pk);
      expect(id).toBeNull();
    });
  });

  describe('parseDocumentId', () => {
    it('should extract document ID from SK', () => {
      const sk = 'DOC#doc_xyz789';
      const id = parseDocumentId(sk);
      expect(id).toBe('doc_xyz789');
    });

    it('should return null for invalid SK format', () => {
      const sk = 'META';
      const id = parseDocumentId(sk);
      expect(id).toBeNull();
    });
  });
});
