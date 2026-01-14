import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';
const TOKEN_EXPIRY_MINUTES = 30;
function getSecretKey() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        // In production, this should NEVER happen - fail fast
        if (process.env.NODE_ENV === 'production') {
            throw new Error('CRITICAL: JWT_SECRET environment variable is not set');
        }
        // Only allow fallback in development/test
        logger.warn('JWT_SECRET not set, using development fallback. DO NOT USE IN PRODUCTION.');
        return 'dev-secret-key-DO-NOT-USE-IN-PRODUCTION';
    }
    return secret;
}
export class CognitoService {
    config;
    constructor(config) {
        this.config = config;
    }
    async generateToken(userId, clientId, expiryMinutes = TOKEN_EXPIRY_MINUTES) {
        const now = Math.floor(Date.now() / 1000);
        const exp = now + (expiryMinutes * 60);
        const payload = {
            endUserId: userId,
            clientId,
            iat: now,
            exp,
            iss: clientId,
        };
        return jwt.sign(payload, getSecretKey(), { algorithm: 'HS256' });
    }
    async validateToken(token) {
        try {
            const decoded = jwt.verify(token, getSecretKey(), {
                algorithms: ['HS256'],
            });
            return {
                valid: true,
                payload: decoded,
            };
        }
        catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                return {
                    valid: false,
                    error: 'Token expired',
                };
            }
            if (error instanceof jwt.JsonWebTokenError) {
                return {
                    valid: false,
                    error: `Invalid token: ${error.message}`,
                };
            }
            return {
                valid: false,
                error: 'Token validation failed',
            };
        }
    }
    async refreshToken(token) {
        const validation = await this.validateToken(token);
        if (!validation.valid || !validation.payload) {
            throw new Error('Cannot refresh invalid or expired token');
        }
        return this.generateToken(validation.payload.endUserId, validation.payload.clientId);
    }
}
