import { v4 as uuidv4 } from 'uuid';

/**
 * Generate idempotency key for request deduplication
 */
export function generateIdempotencyKey(): string {
  return `idem_${uuidv4().replace(/-/g, '')}`;
}

/**
 * Validate idempotency key format
 */
export function isValidIdempotencyKey(key: string): boolean {
  return key.length > 0 && key.length <= 255;
}
