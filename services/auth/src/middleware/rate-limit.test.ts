import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkApiKeyRateLimit,
  checkIpRateLimit,
  clearRateLimits,
  getRateLimitHeaders,
} from './rate-limit.js';

describe('Rate Limiting', () => {
  beforeEach(() => {
    clearRateLimits();
  });

  describe('checkApiKeyRateLimit', () => {
    it('should allow requests within limit', () => {
      const result = checkApiKeyRateLimit('key_123', 10);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(result.limit).toBe(10);
    });

    it('should track request count', () => {
      for (let i = 0; i < 5; i++) {
        checkApiKeyRateLimit('key_123', 10);
      }

      const result = checkApiKeyRateLimit('key_123', 10);
      expect(result.remaining).toBe(4);
    });

    it('should block requests over limit', () => {
      for (let i = 0; i < 10; i++) {
        checkApiKeyRateLimit('key_123', 10);
      }

      const result = checkApiKeyRateLimit('key_123', 10);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should track different keys separately', () => {
      for (let i = 0; i < 10; i++) {
        checkApiKeyRateLimit('key_123', 10);
      }

      const result = checkApiKeyRateLimit('key_456', 10);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });
  });

  describe('checkIpRateLimit', () => {
    it('should allow requests within limit', () => {
      const result = checkIpRateLimit('192.168.1.1', { ipLimit: 100 });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
    });

    it('should block requests over limit', () => {
      for (let i = 0; i < 10; i++) {
        checkIpRateLimit('192.168.1.1', { ipLimit: 10 });
      }

      const result = checkIpRateLimit('192.168.1.1', { ipLimit: 10 });
      expect(result.allowed).toBe(false);
    });
  });

  describe('getRateLimitHeaders', () => {
    it('should return correct headers', () => {
      const result = checkApiKeyRateLimit('key_123', 100);
      const headers = getRateLimitHeaders(result);

      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('99');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
    });
  });
});
