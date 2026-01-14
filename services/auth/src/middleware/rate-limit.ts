/**
 * Rate Limiting Middleware
 * Implements per-API-key and per-IP rate limiting
 */

import { RateLimitError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { auditService } from '../services/audit.js';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// In-memory rate limit tracking (replace with Redis/DynamoDB in production)
const rateLimitByKey = new Map<string, RateLimitEntry>();
const rateLimitByIp = new Map<string, RateLimitEntry>();

// Default limits
const DEFAULT_KEY_LIMIT = 100; // requests per minute per API key
const DEFAULT_IP_LIMIT = 1000; // requests per minute per IP
const WINDOW_SIZE_MS = 60 * 1000; // 1 minute window

export interface RateLimitConfig {
  keyLimit?: number;
  ipLimit?: number;
  windowSizeMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

function checkRateLimit(
  key: string,
  store: Map<string, RateLimitEntry>,
  limit: number,
  windowSizeMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // No existing entry or window expired - start fresh
  if (!entry || now - entry.windowStart >= windowSizeMs) {
    store.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: now + windowSizeMs,
      limit,
    };
  }

  // Within window - increment count
  entry.count++;
  store.set(key, entry);

  const resetAt = entry.windowStart + windowSizeMs;
  const remaining = Math.max(0, limit - entry.count);

  return {
    allowed: entry.count <= limit,
    remaining,
    resetAt,
    limit,
  };
}

export function checkApiKeyRateLimit(
  apiKeyId: string,
  customLimit?: number,
  config?: RateLimitConfig
): RateLimitResult {
  const limit = customLimit || config?.keyLimit || DEFAULT_KEY_LIMIT;
  const windowSize = config?.windowSizeMs || WINDOW_SIZE_MS;

  return checkRateLimit(`key:${apiKeyId}`, rateLimitByKey, limit, windowSize);
}

export function checkIpRateLimit(
  ipAddress: string,
  config?: RateLimitConfig
): RateLimitResult {
  const limit = config?.ipLimit || DEFAULT_IP_LIMIT;
  const windowSize = config?.windowSizeMs || WINDOW_SIZE_MS;

  return checkRateLimit(`ip:${ipAddress}`, rateLimitByIp, limit, windowSize);
}

export interface RateLimitContext {
  apiKeyId?: string;
  apiKeyLimit?: number;
  ipAddress: string;
  clientId?: string;
  endpoint?: string;
}

/**
 * Combined rate limit check for both API key and IP
 * Throws RateLimitError if either limit is exceeded
 */
export async function enforceRateLimit(
  context: RateLimitContext,
  config?: RateLimitConfig
): Promise<{ keyResult?: RateLimitResult; ipResult: RateLimitResult }> {
  let keyResult: RateLimitResult | undefined;

  // Check API key rate limit if provided
  if (context.apiKeyId) {
    keyResult = checkApiKeyRateLimit(context.apiKeyId, context.apiKeyLimit, config);

    if (!keyResult.allowed) {
      const retryAfter = Math.ceil((keyResult.resetAt - Date.now()) / 1000);

      logger.warn('Rate limit exceeded for API key', {
        apiKeyId: context.apiKeyId,
        clientId: context.clientId,
        limit: keyResult.limit,
        resetAt: new Date(keyResult.resetAt).toISOString(),
      });

      await auditService.logRateLimitExceeded(
        context.clientId || 'unknown',
        context.ipAddress,
        context.endpoint || 'unknown'
      );

      throw new RateLimitError(
        `API key rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter
      );
    }
  }

  // Check IP rate limit
  const ipResult = checkIpRateLimit(context.ipAddress, config);

  if (!ipResult.allowed) {
    const retryAfter = Math.ceil((ipResult.resetAt - Date.now()) / 1000);

    logger.warn('Rate limit exceeded for IP', {
      ipAddress: context.ipAddress,
      limit: ipResult.limit,
      resetAt: new Date(ipResult.resetAt).toISOString(),
    });

    await auditService.logRateLimitExceeded(
      context.clientId || 'unknown',
      context.ipAddress,
      context.endpoint || 'unknown'
    );

    throw new RateLimitError(
      `IP rate limit exceeded. Try again in ${retryAfter} seconds.`,
      retryAfter
    );
  }

  return { keyResult, ipResult };
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
  };
}

// For testing: clear all rate limit entries
export function clearRateLimits(): void {
  rateLimitByKey.clear();
  rateLimitByIp.clear();
}
