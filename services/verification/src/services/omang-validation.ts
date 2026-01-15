import { parse, isValid, isBefore, isAfter, differenceInDays, addYears } from 'date-fns';
import {
  OmangNumberValidationResult,
  ExpiryValidationResult,
  OmangValidationResult,
} from '../types/validation';

/**
 * Service for validating Omang document data
 *
 * Validates:
 * - Omang number format (9 digits, numeric only)
 * - Expiry date (10-year validity, not expired)
 */
export class OmangValidationService {
  /**
   * Validate Omang number format
   *
   * Rules:
   * - Exactly 9 digits
   * - Numeric only (0-9)
   * - No spaces, dashes, or special characters
   * - Leading zeros allowed
   */
  validateOmangNumber(omangNumber: string): OmangNumberValidationResult {
    // Handle null/undefined
    if (!omangNumber) {
      return {
        valid: false,
        error: 'Omang number must be exactly 9 digits',
        format: 'invalid',
      };
    }

    // Check numeric only first (catches special chars, spaces, letters)
    if (!/^\d+$/.test(omangNumber)) {
      return {
        valid: false,
        error: 'Omang number must be numeric only',
        format: 'invalid',
      };
    }

    // Then check length
    if (omangNumber.length !== 9) {
      return {
        valid: false,
        error: 'Omang number must be exactly 9 digits',
        format: 'invalid',
      };
    }

    return {
      valid: true,
      format: 'valid',
      value: omangNumber,
    };
  }

  /**
   * Validate expiry date
   *
   * Rules:
   * - Expiry must be exactly 10 years from issue date
   * - Document must not be expired
   * - Issue date must not be in the future
   * - Expiry must not be before issue
   * - Flag documents expiring within 30 days
   */
  validateExpiry(issueDate: string, expiryDate: string): ExpiryValidationResult {
    // Handle missing dates
    if (!issueDate || !expiryDate) {
      return {
        valid: false,
        error: 'Issue date and expiry date are required',
      };
    }

    // Parse dates (DD/MM/YYYY format)
    const parsedIssue = parse(issueDate, 'dd/MM/yyyy', new Date());
    const parsedExpiry = parse(expiryDate, 'dd/MM/yyyy', new Date());

    // Check if dates are valid
    if (!isValid(parsedIssue) || !isValid(parsedExpiry)) {
      return {
        valid: false,
        error: 'Invalid date format - dates must be in DD/MM/YYYY format',
      };
    }

    const today = new Date();

    // Check if issue date is in the future
    if (isAfter(parsedIssue, today)) {
      return {
        valid: false,
        error: 'Issue date cannot be in the future',
      };
    }

    // Check if expiry is before issue
    if (isBefore(parsedExpiry, parsedIssue)) {
      return {
        valid: false,
        error: 'Expiry date cannot be before issue date',
      };
    }

    // Check if expiry is approximately 10 years from issue (allow 1 day tolerance for leap years)
    const expectedExpiry = addYears(parsedIssue, 10);
    const daysDifference = Math.abs(differenceInDays(parsedExpiry, expectedExpiry));
    if (daysDifference > 1) {
      return {
        valid: false,
        error: 'Expiry date does not match 10-year validity period',
      };
    }

    // Check if document is expired
    if (isBefore(parsedExpiry, today)) {
      const expiredDays = differenceInDays(today, parsedExpiry);
      return {
        valid: false,
        error: 'Document has expired',
        expired: true,
        expiredDays,
        expiryDate: expiryDate,
        issueDate: issueDate,
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
        issueDate: issueDate,
      };
    }

    return {
      valid: true,
      expired: false,
      daysUntilExpiry,
      expiryDate: expiryDate,
      issueDate: issueDate,
    };
  }

  /**
   * Validate complete Omang data
   *
   * Combines all validation checks and returns comprehensive result
   */
  validate(ocrData: {
    omangNumber: string;
    dateOfIssue: string;
    dateOfExpiry: string;
  }): OmangValidationResult {
    const omangNumberResult = this.validateOmangNumber(ocrData.omangNumber);
    const expiryResult = this.validateExpiry(ocrData.dateOfIssue, ocrData.dateOfExpiry);

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!omangNumberResult.valid && omangNumberResult.error) {
      errors.push(omangNumberResult.error);
    }

    if (!expiryResult.valid && expiryResult.error) {
      errors.push(expiryResult.error);
    }

    if (expiryResult.warning) {
      warnings.push(expiryResult.warning);
    }

    return {
      omangNumber: omangNumberResult,
      expiry: expiryResult,
      overall: {
        valid: omangNumberResult.valid && expiryResult.valid,
        errors,
        warnings,
      },
      validatedAt: new Date().toISOString(),
    };
  }
}
