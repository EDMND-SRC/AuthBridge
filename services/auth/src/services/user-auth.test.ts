/**
 * User Authentication Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserAuthService } from './user-auth.js';

// Mock AWS SDK
vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  InitiateAuthCommand: vi.fn(),
  RespondToAuthChallengeCommand: vi.fn(),
  GetUserCommand: vi.fn(),
  AdminGetUserCommand: vi.fn(),
  SignUpCommand: vi.fn(),
  ConfirmSignUpCommand: vi.fn(),
  GlobalSignOutCommand: vi.fn(),
  AuthFlowType: { CUSTOM_AUTH: 'CUSTOM_AUTH', REFRESH_TOKEN_AUTH: 'REFRESH_TOKEN_AUTH' },
  ChallengeNameType: { CUSTOM_CHALLENGE: 'CUSTOM_CHALLENGE' },
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('UserAuthService', () => {
  let service: UserAuthService;
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserAuthService({
      userPoolId: 'test-pool-id',
      clientId: 'test-client-id',
      region: 'af-south-1',
    });
    mockSend = (service as any).client.send;
  });

  describe('initiateAuth', () => {
    it('should initiate auth and return session for OTP challenge', async () => {
      mockSend.mockResolvedValueOnce({
        ChallengeName: 'CUSTOM_CHALLENGE',
        Session: 'test-session-123',
        ChallengeParameters: { email: 'test@example.com' },
      });

      const result = await service.initiateAuth('test@example.com');

      expect(result.session).toBe('test-session-123');
      expect(result.challengeName).toBe('CUSTOM_CHALLENGE');
    });

    it('should return tokens if user already authenticated', async () => {
      mockSend.mockResolvedValueOnce({
        AuthenticationResult: {
          AccessToken: 'access-token',
          IdToken: 'id-token',
          RefreshToken: 'refresh-token',
          ExpiresIn: 3600,
        },
      });

      const result = await service.initiateAuth('test@example.com');

      expect(result.tokens).toBeDefined();
      expect(result.tokens?.accessToken).toBe('access-token');
    });

    it('should throw error on Cognito failure', async () => {
      mockSend.mockRejectedValueOnce(new Error('User not found'));

      await expect(service.initiateAuth('test@example.com')).rejects.toThrow();
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP and return tokens with user info', async () => {
      mockSend
        .mockResolvedValueOnce({
          AuthenticationResult: {
            AccessToken: 'access-token',
            IdToken: 'id-token',
            RefreshToken: 'refresh-token',
            ExpiresIn: 3600,
          },
        })
        .mockResolvedValueOnce({
          Username: 'user-123',
          UserAttributes: [
            { Name: 'email', Value: 'test@example.com' },
            { Name: 'email_verified', Value: 'true' },
            { Name: 'name', Value: 'Test User' },
            { Name: 'custom:role', Value: 'analyst' },
          ],
        });

      const result = await service.verifyOtp('test@example.com', '123456', 'session-123');

      expect(result.tokens.accessToken).toBe('access-token');
      expect(result.user.userId).toBe('user-123');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.role).toBe('analyst');
    });

    it('should throw error on invalid OTP', async () => {
      const error = new Error('Invalid code');
      error.name = 'CodeMismatchException';
      mockSend.mockRejectedValueOnce(error);

      await expect(
        service.verifyOtp('test@example.com', '000000', 'session-123')
      ).rejects.toThrow('Invalid verification code');
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      mockSend.mockResolvedValueOnce({
        AuthenticationResult: {
          AccessToken: 'new-access-token',
          IdToken: 'new-id-token',
          ExpiresIn: 3600,
        },
      });

      const result = await service.refreshTokens('refresh-token-123');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('refresh-token-123');
    });
  });

  describe('signOut', () => {
    it('should sign out user globally', async () => {
      mockSend.mockResolvedValueOnce({});

      await expect(service.signOut('access-token')).resolves.not.toThrow();
    });
  });

  describe('getUserInfo', () => {
    it('should return user info from access token', async () => {
      mockSend.mockResolvedValueOnce({
        Username: 'user-123',
        UserAttributes: [
          { Name: 'email', Value: 'test@example.com' },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'name', Value: 'Test User' },
        ],
      });

      const user = await service.getUserInfo('access-token');

      expect(user.userId).toBe('user-123');
      expect(user.email).toBe('test@example.com');
      expect(user.emailVerified).toBe(true);
    });
  });

  describe('adminGetUser', () => {
    it('should return user info for admin', async () => {
      mockSend.mockResolvedValueOnce({
        Username: 'user-123',
        UserAttributes: [
          { Name: 'email', Value: 'admin@example.com' },
          { Name: 'custom:role', Value: 'admin' },
        ],
      });

      const user = await service.adminGetUser('admin@example.com');

      expect(user?.userId).toBe('user-123');
      expect(user?.role).toBe('admin');
    });

    it('should return null for non-existent user', async () => {
      const error = new Error('User not found');
      error.name = 'UserNotFoundException';
      mockSend.mockRejectedValueOnce(error);

      const user = await service.adminGetUser('nonexistent@example.com');

      expect(user).toBeNull();
    });
  });
});
