import { describe, it, expect } from 'vitest';
import { hashOmangNumber, createOmangHashKey } from './omang-hash';

describe('omang-hash', () => {
  describe('hashOmangNumber', () => {
    it('should generate SHA-256 hash for Omang number', () => {
      const omangNumber = '123456789';
      const hash = hashOmangNumber(omangNumber);

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64); // SHA-256 produces 64 hex characters
      expect(hash).toMatch(/^[a-f0-9]{64}$/); // Only lowercase hex
    });

    it('should generate same hash for same Omang number (deterministic)', () => {
      const omangNumber = '123456789';
      const hash1 = hashOmangNumber(omangNumber);
      const hash2 = hashOmangNumber(omangNumber);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different Omang numbers', () => {
      const hash1 = hashOmangNumber('123456789');
      const hash2 = hashOmangNumber('987654321');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = hashOmangNumber('');
      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
    });
  });

  describe('createOmangHashKey', () => {
    it('should create GSI2PK key with OMANG# prefix', () => {
      const omangNumber = '123456789';
      const key = createOmangHashKey(omangNumber);

      expect(key).toMatch(/^OMANG#[a-f0-9]{64}$/);
      expect(key).toContain('OMANG#');
    });

    it('should generate same key for same Omang number', () => {
      const omangNumber = '123456789';
      const key1 = createOmangHashKey(omangNumber);
      const key2 = createOmangHashKey(omangNumber);

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different Omang numbers', () => {
      const key1 = createOmangHashKey('123456789');
      const key2 = createOmangHashKey('987654321');

      expect(key1).not.toBe(key2);
    });
  });
});
