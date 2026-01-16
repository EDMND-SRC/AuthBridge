/**
 * Data Masking Utilities
 *
 * Provides functions to mask sensitive PII in API responses
 * per Data Protection Act 2024 compliance requirements.
 */
/**
 * Mask Omang number showing only last 4 digits
 *
 * @param omangNumber - Full Omang number
 * @returns Masked Omang number (e.g., "***6789")
 *
 * @example
 * maskOmangNumber("123456789") // "***6789"
 * maskOmangNumber("123") // "***"
 * maskOmangNumber(undefined) // ""
 */
export declare function maskOmangNumber(omangNumber: string | undefined): string;
/**
 * Mask address showing only district
 *
 * @param address - Full address (string or object)
 * @returns District only (e.g., "Gaborone")
 *
 * @example
 * maskAddress({ district: "Gaborone", locality: "Block 8" }) // "Gaborone"
 * maskAddress("Plot 12345, Block 8, Gaborone") // "Gaborone"
 * maskAddress(undefined) // ""
 */
export declare function maskAddress(address: unknown): string;
//# sourceMappingURL=masking.d.ts.map