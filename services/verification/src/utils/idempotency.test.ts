import { describe, it, expect } from 'vitest';
import { generateIdempotencyKey, isValidIdempotencyKey } from './idempotency';

describe('idempotency', () => {
  describe('generateIdempotencyKey', () => {
    it('should generate unique keys', () => {
      const key1 = generateIdempotencyKey();
      const key2 = generateIdempotencyKey();

      expect(key1).not.toBe(key2);
      expect(key1).toMatch(/^idem_[a-f0-9]{32}$/);
    });
  });

  describe('isValidIdempotencyKey', () => {
    it('should accept valid idempotency key', () => {
      const key = 'idem_abc123def456';
      expect(isValidIdempotencyKey(key)).toBe(true);
    });

    it('should accept keys up to 255 characters', () => {
      const key = 'a'.repeat(255);
      expect(isValidIdempotencyKey(key)).toBe(true);
    });

    it('should reject keys over 255 characters', () => {
      const key = 'a'.repeat(256);
      expect(isValidIdempotencyKey(key)).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidIdempotencyKey('')).toBe(false);
    });
  });
});
