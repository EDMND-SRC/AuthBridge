/**
 * Generate SHA-256 hash of Omang number
 * Used for duplicate detection without storing plaintext Omang in GSI
 *
 * @param omangNumber - The Omang number to hash
 * @returns SHA-256 hash as lowercase hex string (64 characters)
 */
export declare function hashOmangNumber(omangNumber: string): string;
/**
 * Create GSI2PK key for Omang hash lookups
 * Format: OMANG#<sha256_hash>
 *
 * @param omangNumber - The Omang number to hash
 * @returns GSI2PK key with OMANG# prefix
 */
export declare function createOmangHashKey(omangNumber: string): string;
//# sourceMappingURL=omang-hash.d.ts.map