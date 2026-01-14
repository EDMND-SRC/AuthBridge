import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CognitoService } from './cognito.js';
import type { CognitoConfig } from '../types/auth.js';

describe('CognitoService', () => {
  let cognitoService: CognitoService;
  const mockConfig: CognitoConfig = {
    userPoolId: 'af-south-1_test123',
    clientId: 'test-client-id',
    region: 'af-south-1',
  };

  beforeEach(() => {
    cognitoService = new CognitoService(mockConfig);
  });

  describe('generateToken', () => {
    it('should generate a JWT token with correct structure', async () => {
      const userId = 'user_123';
      const clientId = 'client_456';

      const token = await cognitoService.generateToken(userId, clientId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate token with 30-minute expiration', async () => {
      const userId = 'user_123';
      const clientId = 'client_456';

      const token = await cognitoService.generateToken(userId, clientId);
      const decoded = await cognitoService.validateToken(token);

      expect(decoded.valid).toBe(true);
      expect(decoded.payload).toBeDefined();

      const expirationTime = decoded.payload!.exp * 1000; // Convert to ms
      const now = Date.now();
      const thirtyMinutes = 30 * 60 * 1000;

      expect(expirationTime - now).toBeLessThanOrEqual(thirtyMinutes);
      expect(expirationTime - now).toBeGreaterThan(thirtyMinutes - 5000); // Allow 5s tolerance
    });

    it('should include userId and clientId in token payload', async () => {
      const userId = 'user_123';
      const clientId = 'client_456';

      const token = await cognitoService.generateToken(userId, clientId);
      const decoded = await cognitoService.validateToken(token);

      expect(decoded.valid).toBe(true);
      expect(decoded.payload?.endUserId).toBe(userId);
      expect(decoded.payload?.clientId).toBe(clientId);
    });
  });

  describe('validateToken', () => {
    it('should validate a valid token', async () => {
      const userId = 'user_123';
      const clientId = 'client_456';
      const token = await cognitoService.generateToken(userId, clientId);

      const result = await cognitoService.validateToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should reject an expired token', async () => {
      // Create a token that's already expired
      const expiredToken = await cognitoService.generateToken('user_123', 'client_456', -1);

      const result = await cognitoService.validateToken(expiredToken);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should reject a token with invalid signature', async () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.invalid';

      const result = await cognitoService.validateToken(invalidToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject a malformed token', async () => {
      const malformedToken = 'not.a.valid.jwt.token';

      const result = await cognitoService.validateToken(malformedToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('refreshToken', () => {
    it('should refresh a valid token', async () => {
      const userId = 'user_123';
      const clientId = 'client_456';
      const originalToken = await cognitoService.generateToken(userId, clientId);

      // Wait 1 second to ensure different iat timestamp
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newToken = await cognitoService.refreshToken(originalToken);

      expect(newToken).toBeDefined();
      expect(newToken).not.toBe(originalToken);

      const decoded = await cognitoService.validateToken(newToken);
      expect(decoded.valid).toBe(true);
      expect(decoded.payload?.endUserId).toBe(userId);
      expect(decoded.payload?.clientId).toBe(clientId);
    });

    it('should not refresh an expired token', async () => {
      const expiredToken = await cognitoService.generateToken('user_123', 'client_456', -1);

      await expect(cognitoService.refreshToken(expiredToken)).rejects.toThrow();
    });
  });
});
