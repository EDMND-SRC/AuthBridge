import { describe, it, expect, vi } from 'vitest';

// Import only the types to avoid side effects from event-service
import { EVerificationErrorCodes } from '../../utils/event-service/types';

// Mock the event service to avoid side effects
vi.mock('../../utils/event-service', () => ({
  sendVerificationErrorEvent: vi.fn(),
  EVerificationErrorCodes: {
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    SESSION_INVALID: 'SESSION_INVALID',
    INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
  },
}));

// Import after mocking
import { validateSessionToken } from './index';

describe('Session Service', () => {
  describe('validateSessionToken', () => {
    it('should return invalid for empty token', () => {
      const result = validateSessionToken('');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(EVerificationErrorCodes.SESSION_INVALID);
    });

    it('should return invalid for undefined token', () => {
      const result = validateSessionToken(undefined);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(EVerificationErrorCodes.SESSION_INVALID);
    });

    it('should return invalid for whitespace-only token', () => {
      const result = validateSessionToken('   ');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(EVerificationErrorCodes.SESSION_INVALID);
    });

    it('should return valid for non-JWT token', () => {
      const result = validateSessionToken('simple-token-123');
      expect(result.isValid).toBe(true);
    });

    it('should return invalid for malformed JWT (wrong number of parts)', () => {
      const result = validateSessionToken('part1.part2');
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(EVerificationErrorCodes.SESSION_INVALID);
    });

    it('should return valid for JWT without expiration', () => {
      // Create a JWT without exp claim
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ sub: '123', name: 'Test' }));
      const signature = 'test-signature';
      const token = `${header}.${payload}.${signature}`;

      const result = validateSessionToken(token);
      expect(result.isValid).toBe(true);
    });

    it('should return expired for JWT with past expiration', () => {
      // Create a JWT with expired exp claim
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const payload = btoa(JSON.stringify({ sub: '123', exp: pastTime }));
      const signature = 'test-signature';
      const token = `${header}.${payload}.${signature}`;

      const result = validateSessionToken(token);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(EVerificationErrorCodes.SESSION_EXPIRED);
    });

    it('should return valid for JWT with future expiration', () => {
      // Create a JWT with future exp claim
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload = btoa(JSON.stringify({ sub: '123', exp: futureTime }));
      const signature = 'test-signature';
      const token = `${header}.${payload}.${signature}`;

      const result = validateSessionToken(token);
      expect(result.isValid).toBe(true);
    });
  });
});
