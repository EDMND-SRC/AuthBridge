import { parse, isValid, isBefore, differenceInDays } from 'date-fns';
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
export class OmangValidationService {
    /**
     * Validate ID number format
     *
     * Rules:
     * - Exactly 9 digits
     * - Numeric only (0-9)
     * - No spaces, dashes, or special characters
     * - Leading zeros allowed
     */
    validateIdNumber(idNumber) {
        // Handle null/undefined
        if (!idNumber) {
            return {
                valid: false,
                error: 'ID number must be exactly 9 digits',
                format: 'invalid',
            };
        }
        // Check numeric only first (catches special chars, spaces, letters)
        if (!/^\d+$/.test(idNumber)) {
            return {
                valid: false,
                error: 'ID number must be numeric only',
                format: 'invalid',
            };
        }
        // Then check length
        if (idNumber.length !== 9) {
            return {
                valid: false,
                error: 'ID number must be exactly 9 digits',
                format: 'invalid',
            };
        }
        return {
            valid: true,
            format: 'valid',
            value: idNumber,
        };
    }
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
    validateExpiry(expiryDate) {
        // Handle missing date
        if (!expiryDate) {
            return {
                valid: false,
                error: 'Expiry date is required',
            };
        }
        // Parse date (DD/MM/YYYY format)
        const parsedExpiry = parse(expiryDate, 'dd/MM/yyyy', new Date());
        // Check if date is valid
        if (!isValid(parsedExpiry)) {
            return {
                valid: false,
                error: 'Invalid date format - date must be in DD/MM/YYYY format',
            };
        }
        const today = new Date();
        // Check if document is expired
        if (isBefore(parsedExpiry, today)) {
            const expiredDays = differenceInDays(today, parsedExpiry);
            return {
                valid: false,
                error: 'Document has expired',
                expired: true,
                expiredDays,
                expiryDate: expiryDate,
            };
        }
        // Check if document expires soon (within 30 days)
        const daysUntilExpiry = differenceInDays(parsedExpiry, today);
        if (daysUntilExpiry <= 30) {
            return {
                valid: true,
                warning: `Document expires soon (in ${daysUntilExpiry} days)`,
                expired: false,
                daysUntilExpiry,
                expiryDate: expiryDate,
            };
        }
        return {
            valid: true,
            expired: false,
            daysUntilExpiry,
            expiryDate: expiryDate,
        };
    }
    /**
     * Validate complete Omang data
     *
     * Combines all validation checks and returns comprehensive result
     */
    validate(ocrData) {
        const idNumberResult = this.validateIdNumber(ocrData.idNumber);
        const expiryResult = this.validateExpiry(ocrData.dateOfExpiry);
        const errors = [];
        const warnings = [];
        if (!idNumberResult.valid && idNumberResult.error) {
            errors.push(idNumberResult.error);
        }
        if (!expiryResult.valid && expiryResult.error) {
            errors.push(expiryResult.error);
        }
        if (expiryResult.warning) {
            warnings.push(expiryResult.warning);
        }
        return {
            omangNumber: idNumberResult,
            expiry: expiryResult,
            overall: {
                valid: idNumberResult.valid && expiryResult.valid,
                errors,
                warnings,
            },
            validatedAt: new Date().toISOString(),
        };
    }
    // Backward compatibility alias
    validateOmangNumber(omangNumber) {
        return this.validateIdNumber(omangNumber);
    }
}
//# sourceMappingURL=omang-validation.js.map