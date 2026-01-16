import { OmangNumberValidationResult, ExpiryValidationResult, OmangValidationResult } from '../types/validation';
/**
 * Service for validating Omang document data
 *
 * Validates:
 * - ID number format (9 digits, numeric only)
 * - Expiry date (not expired)
 *
 * Note: Omang cards do NOT have a Date of Issue field.
 * The 10-year validity period cannot be verified from the card itself.
 */
export declare class OmangValidationService {
    /**
     * Validate ID number format
     *
     * Rules:
     * - Exactly 9 digits
     * - Numeric only (0-9)
     * - No spaces, dashes, or special characters
     * - Leading zeros allowed
     */
    validateIdNumber(idNumber: string): OmangNumberValidationResult;
    /**
     * Validate expiry date
     *
     * Rules:
     * - Document must not be expired
     * - Expiry must not be in the past
     * - Flag documents expiring within 30 days
     *
     * Note: Omang cards do NOT have a Date of Issue field,
     * so we cannot verify the 10-year validity period.
     */
    validateExpiry(expiryDate: string): ExpiryValidationResult;
    /**
     * Validate complete Omang data
     *
     * Combines all validation checks and returns comprehensive result
     */
    validate(ocrData: {
        idNumber: string;
        dateOfExpiry: string;
    }): OmangValidationResult;
    validateOmangNumber(omangNumber: string): OmangNumberValidationResult;
}
//# sourceMappingURL=omang-validation.d.ts.map