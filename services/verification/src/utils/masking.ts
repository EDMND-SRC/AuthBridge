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
export function maskOmangNumber(omangNumber: string | undefined): string {
  if (!omangNumber) return '';

  // Show last 4 digits only: 123456789 → ***6789
  if (omangNumber.length < 4) return '***';

  return '***' + omangNumber.slice(-4);
}

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
export function maskAddress(address: unknown): string {
  if (!address) return '';

  // Structured address object
  if (typeof address === 'object' && address !== null) {
    const addr = address as Record<string, unknown>;
    return (addr.district as string) || '';
  }

  // Simple string address - extract district (last part after comma)
  if (typeof address === 'string') {
    if (!address.trim()) return '';

    const parts = address.split(',');
    return parts[parts.length - 1].trim();
  }

  return '';
}
