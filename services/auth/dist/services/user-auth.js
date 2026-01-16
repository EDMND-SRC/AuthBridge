/**
 * User Authentication Service
 *
 * Handles Backoffice user authentication via AWS Cognito.
 * Supports passwordless authentication (email OTP, passkeys).
 *
 * @module services/user-auth
 */
import { CognitoIdentityProviderClient, InitiateAuthCommand, RespondToAuthChallengeCommand, GetUserCommand, AdminGetUserCommand, SignUpCommand, ConfirmSignUpCommand, GlobalSignOutCommand, AuthFlowType, ChallengeNameType, } from '@aws-sdk/client-cognito-identity-provider';
import { logger } from '../utils/logger.js';
/**
 * User Authentication Service for Backoffice users
 *
 * Implements AWS Cognito authentication with passwordless flow:
 * 1. User enters email
 * 2. Cognito sends OTP to email
 * 3. User enters OTP
 * 4. Cognito returns tokens
 */
export class UserAuthService {
    client;
    config;
    constructor(config) {
        this.config = {
            userPoolId: config?.userPoolId || process.env.COGNITO_USER_POOL_ID || '',
            clientId: config?.clientId || process.env.COGNITO_CLIENT_ID || '',
            region: config?.region || process.env.AWS_REGION || 'af-south-1',
        };
        this.client = new CognitoIdentityProviderClient({
            region: this.config.region,
        });
        if (!this.config.userPoolId || !this.config.clientId) {
            logger.warn('Cognito configuration incomplete - user auth will not work');
        }
    }
    /**
     * Initiate passwordless authentication
     * Sends OTP to user's email
     */
    async initiateAuth(email) {
        logger.info('Initiating auth', { email: this.maskEmail(email) });
        try {
            const command = new InitiateAuthCommand({
                AuthFlow: AuthFlowType.CUSTOM_AUTH,
                ClientId: this.config.clientId,
                AuthParameters: {
                    USERNAME: email.toLowerCase(),
                },
            });
            const response = await this.client.send(command);
            if (response.ChallengeName === ChallengeNameType.CUSTOM_CHALLENGE) {
                logger.info('OTP challenge initiated', { email: this.maskEmail(email) });
                return {
                    session: response.Session,
                    challengeName: response.ChallengeName,
                    challengeParameters: response.ChallengeParameters,
                };
            }
            // If no challenge, user might already be authenticated
            if (response.AuthenticationResult) {
                return {
                    tokens: {
                        accessToken: response.AuthenticationResult.AccessToken,
                        idToken: response.AuthenticationResult.IdToken,
                        refreshToken: response.AuthenticationResult.RefreshToken,
                        expiresIn: response.AuthenticationResult.ExpiresIn,
                    },
                };
            }
            throw new Error('Unexpected auth response');
        }
        catch (error) {
            logger.error('Auth initiation failed', { error, email: this.maskEmail(email) });
            throw this.handleCognitoError(error);
        }
    }
    /**
     * Verify OTP and complete authentication
     */
    async verifyOtp(email, otp, session) {
        logger.info('Verifying OTP', { email: this.maskEmail(email) });
        try {
            const command = new RespondToAuthChallengeCommand({
                ClientId: this.config.clientId,
                ChallengeName: ChallengeNameType.CUSTOM_CHALLENGE,
                Session: session,
                ChallengeResponses: {
                    USERNAME: email.toLowerCase(),
                    ANSWER: otp,
                },
            });
            const response = await this.client.send(command);
            if (!response.AuthenticationResult) {
                throw new Error('OTP verification failed - no tokens returned');
            }
            const tokens = {
                accessToken: response.AuthenticationResult.AccessToken,
                idToken: response.AuthenticationResult.IdToken,
                refreshToken: response.AuthenticationResult.RefreshToken,
                expiresIn: response.AuthenticationResult.ExpiresIn,
            };
            // Get user info
            const user = await this.getUserInfo(tokens.accessToken);
            logger.info('OTP verified successfully', { email: this.maskEmail(email) });
            return { tokens, user };
        }
        catch (error) {
            logger.error('OTP verification failed', { error, email: this.maskEmail(email) });
            throw this.handleCognitoError(error);
        }
    }
    /**
     * Get user information from access token
     */
    async getUserInfo(accessToken) {
        try {
            const command = new GetUserCommand({
                AccessToken: accessToken,
            });
            const response = await this.client.send(command);
            const attributes = response.UserAttributes || [];
            const getAttribute = (name) => attributes.find((a) => a.Name === name)?.Value;
            return {
                userId: response.Username,
                email: getAttribute('email') || '',
                emailVerified: getAttribute('email_verified') === 'true',
                name: getAttribute('name'),
                role: getAttribute('custom:role'),
                createdAt: getAttribute('custom:created_at'),
                lastLogin: getAttribute('custom:last_login'),
            };
        }
        catch (error) {
            logger.error('Failed to get user info', { error });
            throw this.handleCognitoError(error);
        }
    }
    /**
     * Refresh tokens using refresh token
     */
    async refreshTokens(refreshToken) {
        try {
            const command = new InitiateAuthCommand({
                AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
                ClientId: this.config.clientId,
                AuthParameters: {
                    REFRESH_TOKEN: refreshToken,
                },
            });
            const response = await this.client.send(command);
            if (!response.AuthenticationResult) {
                throw new Error('Token refresh failed');
            }
            return {
                accessToken: response.AuthenticationResult.AccessToken,
                idToken: response.AuthenticationResult.IdToken,
                refreshToken: refreshToken, // Refresh token doesn't change
                expiresIn: response.AuthenticationResult.ExpiresIn,
            };
        }
        catch (error) {
            logger.error('Token refresh failed', { error });
            throw this.handleCognitoError(error);
        }
    }
    /**
     * Sign out user globally (invalidate all tokens)
     */
    async signOut(accessToken) {
        try {
            const command = new GlobalSignOutCommand({
                AccessToken: accessToken,
            });
            await this.client.send(command);
            logger.info('User signed out globally');
        }
        catch (error) {
            logger.error('Sign out failed', { error });
            throw this.handleCognitoError(error);
        }
    }
    /**
     * Register new user (admin only)
     */
    async registerUser(email, name, role = 'analyst') {
        logger.info('Registering user', { email: this.maskEmail(email), role });
        try {
            const command = new SignUpCommand({
                ClientId: this.config.clientId,
                Username: email.toLowerCase(),
                Password: this.generateTempPassword(), // Temp password for passwordless
                UserAttributes: [
                    { Name: 'email', Value: email.toLowerCase() },
                    { Name: 'name', Value: name },
                    { Name: 'custom:role', Value: role },
                    { Name: 'custom:created_at', Value: new Date().toISOString() },
                ],
            });
            const response = await this.client.send(command);
            logger.info('User registered', {
                email: this.maskEmail(email),
                confirmed: response.UserConfirmed,
            });
            return {
                userId: response.UserSub,
                userConfirmed: response.UserConfirmed || false,
            };
        }
        catch (error) {
            logger.error('User registration failed', { error, email: this.maskEmail(email) });
            throw this.handleCognitoError(error);
        }
    }
    /**
     * Confirm user registration with verification code
     */
    async confirmRegistration(email, code) {
        try {
            const command = new ConfirmSignUpCommand({
                ClientId: this.config.clientId,
                Username: email.toLowerCase(),
                ConfirmationCode: code,
            });
            await this.client.send(command);
            logger.info('User registration confirmed', { email: this.maskEmail(email) });
        }
        catch (error) {
            logger.error('Registration confirmation failed', { error });
            throw this.handleCognitoError(error);
        }
    }
    /**
     * Admin: Get user by email
     */
    async adminGetUser(email) {
        try {
            const command = new AdminGetUserCommand({
                UserPoolId: this.config.userPoolId,
                Username: email.toLowerCase(),
            });
            const response = await this.client.send(command);
            const attributes = response.UserAttributes || [];
            const getAttribute = (name) => attributes.find((a) => a.Name === name)?.Value;
            return {
                userId: response.Username,
                email: getAttribute('email') || email,
                emailVerified: getAttribute('email_verified') === 'true',
                name: getAttribute('name'),
                role: getAttribute('custom:role'),
                createdAt: getAttribute('custom:created_at'),
                lastLogin: getAttribute('custom:last_login'),
            };
        }
        catch (error) {
            if (error.name === 'UserNotFoundException') {
                return null;
            }
            logger.error('Admin get user failed', { error });
            throw this.handleCognitoError(error);
        }
    }
    // Private helpers
    maskEmail(email) {
        const [local, domain] = email.split('@');
        if (!domain)
            return '***';
        const maskedLocal = local.length > 2
            ? `${local[0]}***${local[local.length - 1]}`
            : '***';
        return `${maskedLocal}@${domain}`;
    }
    generateTempPassword() {
        // Generate a random password that meets Cognito requirements
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 16; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }
    handleCognitoError(error) {
        const errorName = error.name || error.code || 'UnknownError';
        const errorMessage = error.message || 'An error occurred';
        // Map Cognito errors to user-friendly messages
        const errorMap = {
            UserNotFoundException: 'User not found',
            NotAuthorizedException: 'Invalid credentials',
            UserNotConfirmedException: 'User not confirmed',
            CodeMismatchException: 'Invalid verification code',
            ExpiredCodeException: 'Verification code expired',
            LimitExceededException: 'Too many attempts, please try again later',
            InvalidParameterException: 'Invalid input',
            UsernameExistsException: 'User already exists',
        };
        const friendlyMessage = errorMap[errorName] || errorMessage;
        const authError = new Error(friendlyMessage);
        authError.name = errorName;
        return authError;
    }
}
// Export singleton instance
export const userAuthService = new UserAuthService();
