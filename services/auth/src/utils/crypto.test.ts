import { describe, it, expect } from 'vitest';
import {
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  generateSessionId,
  generateRequestId,
  maskSensitive,
} from './crypto.js';

describe('Crypto Utilities', () => {
  describe('generateApiKey', () => {
    it('should generate API key with correct format (default live)', () => {
      const key = generateApiKey();
      expect(key).toMatch(/^ab_live_[a-f0-9]{32}$/);
    });

    it('should generate API key with live environment', () => {
      const key = generateApiKey('live');
      expect(key).toMatch(/^ab_live_[a-f0-9]{32}$/);
    });

    it('should generate API key with test environment', () => {
      const key = generateApiKey('test');
      expect(key).toMatch(/^ab_test_[a-f0-9]{32}$/);
    });

    it('should generate unique keys', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('hashApiKey', () => {
    it('should produce consistent hash for same input', () => {
      const key = 'ab_test1234567890abcdef12345678';
      const hash1 = hashApiKey(key);
      const hash2 = hashApiKey(key);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashApiKey('ab_key1');
      const hash2 = hashApiKey('ab_key2');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce 64-character hex hash (SHA-256)', () => {
      const hash = hashApiKey('ab_test');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('verifyApiKey', () => {
    it('should verify correct API key', () => {
      const key = generateApiKey();
      const hash = hashApiKey(key);
      expect(verifyApiKey(key, hash)).toBe(true);
    });

    it('should reject incorrect API key', () => {
      const key = generateApiKey();
      const hash = hashApiKey(key);
      expect(verifyApiKey('ab_wrong_key_12345678901234', hash)).toBe(false);
    });
  });

  describe('generateSessionId', () => {
    it('should generate 32-character hex string', () => {
      const sessionId = generateSessionId();
      expect(sessionId).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should generate unique session IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateRequestId', () => {
    it('should generate request ID with prefix', () => {
      const requestId = generateRequestId();
      expect(requestId).toMatch(/^req_[a-f0-9]{24}$/);
    });
  });

  describe('maskSensitive', () => {
    it('should mask with last 4 characters visible', () => {
      const masked = maskSensitive('1234567890');
      expect(masked).toBe('***7890');
    });

    it('should mask short strings completely', () => {
      const masked = maskSensitive('abc');
      expect(masked).toBe('***');
    });

    it('should allow custom visible character count', () => {
      const masked = maskSensitive('1234567890', 6);
      expect(masked).toBe('***567890');
    });
  });
});
