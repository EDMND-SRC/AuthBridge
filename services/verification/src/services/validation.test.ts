import { describe, it, expect } from 'vitest';
import { validateCreateVerificationRequest } from './validation';

describe('validation', () => {
  describe('validateCreateVerificationRequest', () => {
    it('should accept valid omang request', () => {
      const request = {
        documentType: 'omang' as const,
        customerMetadata: {
          email: 'test@example.com',
          phone: '+26771234567',
        },
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(true);
    });

    it('should accept valid passport request', () => {
      const request = {
        documentType: 'passport' as const,
        customerMetadata: {},
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(true);
    });

    it('should reject invalid document type', () => {
      const request = {
        documentType: 'invalid' as any,
        customerMetadata: {},
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const request = {
        documentType: 'omang' as const,
        customerMetadata: {
          email: 'not-an-email',
        },
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(false);
    });

    it('should accept valid E.164 phone format', () => {
      const request = {
        documentType: 'omang' as const,
        customerMetadata: {
          phone: '+26771234567',
        },
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(true);
    });

    it('should reject invalid phone format', () => {
      const request = {
        documentType: 'omang' as const,
        customerMetadata: {
          phone: '1234567',
        },
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(false);
    });

    it('should accept valid HTTPS redirect URL', () => {
      const request = {
        documentType: 'omang' as const,
        customerMetadata: {
          redirectUrl: 'https://example.com/callback',
        },
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(true);
    });

    it('should reject HTTP redirect URL', () => {
      const request = {
        documentType: 'omang' as const,
        customerMetadata: {
          redirectUrl: 'http://example.com/callback',
        },
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(false);
    });

    it('should accept external ID up to 255 characters', () => {
      const request = {
        documentType: 'omang' as const,
        customerMetadata: {
          externalId: 'a'.repeat(255),
        },
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(true);
    });

    it('should reject external ID over 255 characters', () => {
      const request = {
        documentType: 'omang' as const,
        customerMetadata: {
          externalId: 'a'.repeat(256),
        },
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(false);
    });
  });
});
