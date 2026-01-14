import { describe, it, expect } from 'vitest';
import { maskPII } from './logger.js';

describe('Logger', () => {
  describe('maskPII', () => {
    it('should mask Omang numbers (9 digits)', () => {
      const result = maskPII('User Omang: 123456789');
      expect(result).toBe('User Omang: ***masked-omang***');
    });

    it('should mask email addresses', () => {
      const result = maskPII('Contact: test@example.com');
      expect(result).toBe('Contact: ***masked-email***');
    });

    it('should mask Botswana phone numbers', () => {
      const result = maskPII('Phone: 71234567');
      expect(result).toBe('Phone: ***masked-phone***');
    });

    it('should mask selfie URLs', () => {
      const result = maskPII('Image: https://s3.amazonaws.com/bucket/selfie-123.jpg');
      expect(result).toBe('Image: ***masked-selfie-url***');
    });

    it('should mask sensitive fields in objects', () => {
      const result = maskPII({
        userId: 'user_123',
        name: 'John Doe',
        email: 'john@example.com',
        omang: '123456789',
      });

      expect(result).toEqual({
        userId: 'user_123',
        name: '***masked-name***',
        email: '***masked-email***',
        omang: '***masked-omang***',
      });
    });

    it('should handle nested objects', () => {
      const result = maskPII({
        user: {
          id: 'user_123',
          name: 'John',
        },
      });

      expect(result).toEqual({
        user: {
          id: 'user_123',
          name: '***masked-name***',
        },
      });
    });

    it('should handle arrays', () => {
      const result = maskPII(['test@example.com', 'other@example.com']);
      expect(result).toEqual(['***masked-email***', '***masked-email***']);
    });

    it('should not modify non-PII data', () => {
      const result = maskPII({
        requestId: 'req_123',
        timestamp: '2026-01-14T10:00:00Z',
        status: 'success',
      });

      expect(result).toEqual({
        requestId: 'req_123',
        timestamp: '2026-01-14T10:00:00Z',
        status: 'success',
      });
    });
  });
});
