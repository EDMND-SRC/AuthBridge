/**
 * Cryptographic utilities for API key hashing and secure operations
 */
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
const API_KEY_PREFIX = 'ab_'; // AuthBridge prefix
const API_KEY_LENGTH = 32;
/**
 * Generate a new API key with prefix and environment
 * Format: ab_{env}_{32 random hex characters}
 * @param environment - 'live' for production, 'test' for sandbox (default: 'live')
 */
export function generateApiKey(environment = 'live') {
    const randomPart = randomBytes(API_KEY_LENGTH / 2).toString('hex');
    return `${API_KEY_PREFIX}${environment}_${randomPart}`;
}
/**
 * Hash an API key using SHA-256
 * API keys are NEVER stored in plaintext
 */
export function hashApiKey(apiKey) {
    return createHash('sha256').update(apiKey).digest('hex');
}
/**
 * Verify an API key against its hash using timing-safe comparison
 */
export function verifyApiKey(apiKey, storedHash) {
    const inputHash = hashApiKey(apiKey);
    // Use timing-safe comparison to prevent timing attacks
    try {
        return timingSafeEqual(Buffer.from(inputHash), Buffer.from(storedHash));
    }
    catch {
        return false;
    }
}
/**
 * Generate a secure random session ID
 */
export function generateSessionId() {
    return randomBytes(16).toString('hex');
}
/**
 * Generate a secure random request ID
 */
export function generateRequestId() {
    return `req_${randomBytes(12).toString('hex')}`;
}
/**
 * Mask sensitive data for logging (last 4 characters visible)
 */
export function maskSensitive(value, visibleChars = 4) {
    if (value.length <= visibleChars) {
        return '***';
    }
    return `***${value.slice(-visibleChars)}`;
}
