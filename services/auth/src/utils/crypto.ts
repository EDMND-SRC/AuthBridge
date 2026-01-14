/**
 * Cryptographic utilities for API key hashing and secure operations
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto';

const API_KEY_PREFIX = 'ab_'; // AuthBridge prefix
const API_KEY_LENGTH = 32;

/**
 * Generate a new API key with prefix
 * Format: ab_<32 random hex characters>
 */
export function generateApiKey(): string {
  const randomPart = randomBytes(API_KEY_LENGTH / 2).toString('hex');
  return `${API_KEY_PREFIX}${randomPart}`;
}

/**
 * Hash an API key using SHA-256
 * API keys are NEVER stored in plaintext
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Verify an API key against its hash using timing-safe comparison
 */
export function verifyApiKey(apiKey: string, storedHash: string): boolean {
  const inputHash = hashApiKey(apiKey);

  // Use timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(Buffer.from(inputHash), Buffer.from(storedHash));
  } catch {
    return false;
  }
}

/**
 * Generate a secure random session ID
 */
export function generateSessionId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Generate a secure random request ID
 */
export function generateRequestId(): string {
  return `req_${randomBytes(12).toString('hex')}`;
}

/**
 * Mask sensitive data for logging (last 4 characters visible)
 */
export function maskSensitive(value: string, visibleChars: number = 4): string {
  if (value.length <= visibleChars) {
    return '***';
  }
  return `***${value.slice(-visibleChars)}`;
}
