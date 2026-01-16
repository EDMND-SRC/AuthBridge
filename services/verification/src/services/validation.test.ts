import { describe, it, expect } from 'vitest';
import { validateCreateVerificationRequest } from './validation';

describe('validation', () => {
  describe('validateCreateVerificationRequest', () => {
    it('should accept valid request with email only', () => {
      const request = {
        customer: {
          email: 'test@example.com',
        },
        documentType: 'omang' as const,
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(true);
    });

    it('should accept valid request with name only', () => {
      const request = {
        customer: {
          name: 'John Doe',
        },
        documentType: 'omang' as const,
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(true);
    });

    it('should accept valid request with phone only', () => {
      const request = {
        customer: {
          phone: '+26771234567',
        },
        documentType: 'omang' as const,
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(true);
    });

    it('should accept valid request with all customer fields', () => {
      const request = {
        customer: {
          email: 'test@example.com',
          name: 'John Doe',
          phone: '+26771234567',
        },
        documentType: 'omang' as const,
        redirectUrl: 'https://example.com/complete',
        webhookUrl: 'https://example.com/webhook',
        metadata: {
          customField: 'value',
        },
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(true);
    });

    it('should accept request without documentType (optional)', () => {
      const request = {
        customer: {
          email: 'test@example.com',
        },
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(true);
    });

    it('should reject request with empty customer object', () => {
      const request = {
        customer: {},
        documentType: 'omang' as const,
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.errors[0].path).toContain('customer');
      }
    });

    it('should reject request without customer field', () => {
      const request = {
        documentType: 'omang' as const,
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(false);
    });

    it('should reject invalid document type', () => {
      const request = {
        customer: {
          email: 'test@example.com',
        },
        documentType: 'invalid' as any,
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const request = {
        customer: {
          email: 'not-an-email',
        },
        documentType: 'omang' as const,
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(false);
    });

    it('should accept valid E.164 phone format', () => {
      const request = {
        customer: {
          phone: '+26771234567',
        },
        documentType: 'omang' as const,
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(true);
    });

    it('should reject invalid phone format', () => {
      const request = {
        customer: {
          phone: '1234567',
        },
        documentType: 'omang' as const,
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(false);
    });

    it('should accept valid HTTPS redirect URL', () => {
      const request = {
        customer: {
          email: 'test@example.com',
        },
        redirectUrl: 'https://example.com/callback',
        documentType: 'omang' as const,
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(true);
    });

    it('should reject HTTP redirect URL', () => {
      const request = {
        customer: {
          email: 'test@example.com',
        },
        redirectUrl: 'http://example.com/callback',
        documentType: 'omang' as const,
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(false);
    });

    it('should accept valid HTTPS webhook URL', () => {
      const request = {
        customer: {
          email: 'test@example.com',
        },
        webhookUrl: 'https://example.com/webhook',
        documentType: 'omang' as const,
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(true);
    });

    it('should reject HTTP webhook URL', () => {
      const request = {
        customer: {
          email: 'test@example.com',
        },
        webhookUrl: 'http://example.com/webhook',
        documentType: 'omang' as const,
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(false);
    });

    it('should accept metadata object', () => {
      const request = {
        customer: {
          email: 'test@example.com',
        },
        metadata: {
          field1: 'value1',
          field2: 'value2',
        },
        documentType: 'omang' as const,
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(true);
    });

    it('should accept idempotency key up to 255 characters', () => {
      const request = {
        customer: {
          email: 'test@example.com',
        },
        idempotencyKey: 'a'.repeat(255),
        documentType: 'omang' as const,
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(true);
    });

    it('should reject idempotency key over 255 characters', () => {
      const request = {
        customer: {
          email: 'test@example.com',
        },
        idempotencyKey: 'a'.repeat(256),
        documentType: 'omang' as const,
      };

      const result = validateCreateVerificationRequest(request);
      expect(result.success).toBe(false);
    });
  });
});
