/**
 * Omang hashing utilities for duplicate detection
 * Uses SHA-256 for privacy-preserving lookups
 */
import { createHash } from 'crypto';
/**
 * Generate SHA-256 hash of Omang number
 * Used for duplicate detection without storing plaintext Omang in GSI
 *
 * @param omangNumber - The Omang number to hash
 * @returns SHA-256 hash as lowercase hex string (64 characters)
 */
export function hashOmangNumber(omangNumber) {
    return createHash('sha256').update(omangNumber).digest('hex');
}
/**
 * Create GSI2PK key for Omang hash lookups
 * Format: OMANG#<sha256_hash>
 *
 * @param omangNumber - The Omang number to hash
 * @returns GSI2PK key with OMANG# prefix
 */
export function createOmangHashKey(omangNumber) {
    const hash = hashOmangNumber(omangNumber);
    return `OMANG#${hash}`;
}
//# sourceMappingURL=omang-hash.js.map