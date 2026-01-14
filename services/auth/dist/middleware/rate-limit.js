/**
 * Rate Limiting Middleware
 * Implements per-API-key and per-IP rate limiting
 */
import { RateLimitError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { auditService } from '../services/audit.js';
// In-memory rate limit tracking (replace with Redis/DynamoDB in production)
const rateLimitByKey = new Map();
const rateLimitByIp = new Map();
// Default limits
const DEFAULT_KEY_LIMIT = 100; // requests per minute per API key
const DEFAULT_IP_LIMIT = 1000; // requests per minute per IP
const WINDOW_SIZE_MS = 60 * 1000; // 1 minute window
function checkRateLimit(key, store, limit, windowSizeMs) {
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
export function checkApiKeyRateLimit(apiKeyId, customLimit, config) {
    const limit = customLimit || config?.keyLimit || DEFAULT_KEY_LIMIT;
    const windowSize = config?.windowSizeMs || WINDOW_SIZE_MS;
    return checkRateLimit(`key:${apiKeyId}`, rateLimitByKey, limit, windowSize);
}
export function checkIpRateLimit(ipAddress, config) {
    const limit = config?.ipLimit || DEFAULT_IP_LIMIT;
    const windowSize = config?.windowSizeMs || WINDOW_SIZE_MS;
    return checkRateLimit(`ip:${ipAddress}`, rateLimitByIp, limit, windowSize);
}
/**
 * Combined rate limit check for both API key and IP
 * Throws RateLimitError if either limit is exceeded
 */
export async function enforceRateLimit(context, config) {
    let keyResult;
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
            await auditService.logRateLimitExceeded(context.clientId || 'unknown', context.ipAddress, context.endpoint || 'unknown');
            throw new RateLimitError(`API key rate limit exceeded. Try again in ${retryAfter} seconds.`, retryAfter);
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
        await auditService.logRateLimitExceeded(context.clientId || 'unknown', context.ipAddress, context.endpoint || 'unknown');
        throw new RateLimitError(`IP rate limit exceeded. Try again in ${retryAfter} seconds.`, retryAfter);
    }
    return { keyResult, ipResult };
}
/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result) {
    return {
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
    };
}
// For testing: clear all rate limit entries
export function clearRateLimits() {
    rateLimitByKey.clear();
    rateLimitByIp.clear();
}
