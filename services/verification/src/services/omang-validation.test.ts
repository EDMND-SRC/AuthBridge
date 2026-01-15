import { describe, it, expect, beforeEach } from 'vitest';
import { OmangValidationService } from './omang-validation';
import { format, addDays, addYears, subYears } from 'date-fns';

describe('OmangValidationService', () => {
  let service: OmangValidationService;

  beforeEach(() => {
    service = new OmangValidationService();
  });

  describe('validateOmangNumber', () => {
    it('should accept valid 9-digit Omang number', () => {
      const result = service.validateOmangNumber('123456789');
      expect(result.valid).toBe(true);
      expect(result.format).toBe('valid');
      expect(result.value).toBe('123456789');
    });

    it('should accept Omang number with leading zeros', () => {
      const result = service.validateOmangNumber('012345678');
      expect(result.valid).toBe(true);
      expect(result.format).toBe('valid');
    });

    it('should accept all numeric Omang number', () => {
      const result = service.validateOmangNumber('999999999');
      expect(result.valid).toBe(true);
    });

    it('should reject Omang number with 8 digits', () => {
      const result = service.validateOmangNumber('12345678');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('9 digits');
      expect(result.format).toBe('invalid');
    });

    it('should reject Omang number with 10 digits', () => {
      const result = service.validateOmangNumber('1234567890');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('9 digits');
    });

    it('should reject Omang number with letters', () => {
      const result = service.validateOmangNumber('12345678A');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('numeric');
    });

    it('should reject Omang number with special characters', () => {
      const result = service.validateOmangNumber('123-456-789');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('numeric');
    });

    it('should reject Omang number with spaces', () => {
      const result = service.validateOmangNumber('123 456 789');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('numeric');
    });

    it('should reject empty Omang number', () => {
      const result = service.validateOmangNumber('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('9 digits');
    });

    it('should reject null Omang number', () => {
      const result = service.validateOmangNumber(null as any);
      expect(result.valid).toBe(false);
    });

    it('should reject undefined Omang number', () => {
      const result = service.validateOmangNumber(undefined as any);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateExpiry', () => {
    it('should accept valid non-expired document', () => {
      // Use a future date that's definitely not expired
      const today = new Date();
      const expiryDate = format(addDays(today, 365), 'dd/MM/yyyy');
      const issueDate = format(subYears(addDays(today, 365), 10), 'dd/MM/yyyy');
      const result = service.validateExpiry(issueDate, expiryDate);
      expect(result.valid).toBe(true);
      expect(result.expired).toBe(false);
    });

    it('should reject expired document', () => {
      const issueDate = '15/03/2010';
      const expiryDate = '15/03/2020';
      const result = service.validateExpiry(issueDate, expiryDate);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
      expect(result.expired).toBe(true);
      expect(result.expiredDays).toBeGreaterThan(0);
    });

    it('should flag document expiring within 30 days', () => {
      const today = new Date();
      // Create expiry date 25 days from now
      const expiryDate = format(addDays(today, 25), 'dd/MM/yyyy');
      // Issue date is exactly 10 years before expiry
      const issueDate = format(subYears(addDays(today, 25), 10), 'dd/MM/yyyy');
      const result = service.validateExpiry(issueDate, expiryDate);
      expect(result.valid).toBe(true);
      expect(result.warning).toContain('expires soon');
      expect(result.daysUntilExpiry).toBeLessThanOrEqual(30);
    });

    it('should reject expiry not 10 years from issue', () => {
      const issueDate = '15/03/2015';
      const expiryDate = '15/03/2024'; // Only 9 years
      const result = service.validateExpiry(issueDate, expiryDate);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('10-year validity');
    });

    it('should reject expiry before issue date', () => {
      const issueDate = '15/03/2020';
      const expiryDate = '15/03/2019';
      const result = service.validateExpiry(issueDate, expiryDate);
      expect(result.valid).toBe(false);
    });

    it('should reject future issue date', () => {
      const today = new Date();
      const issueDate = format(addYears(today, 1), 'dd/MM/yyyy');
      const expiryDate = format(addYears(today, 11), 'dd/MM/yyyy');
      const result = service.validateExpiry(issueDate, expiryDate);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('future');
    });

    it('should handle invalid date format gracefully', () => {
      const result = service.validateExpiry('invalid', '15/03/2025');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('date');
    });

    it('should handle missing dates', () => {
      const result = service.validateExpiry('', '');
      expect(result.valid).toBe(false);
    });

    it('should accept document expiring exactly in 30 days', () => {
      const today = new Date();
      const expiryDate = format(addDays(today, 30), 'dd/MM/yyyy');
      const issueDate = format(subYears(addDays(today, 30), 10), 'dd/MM/yyyy');
      const result = service.validateExpiry(issueDate, expiryDate);
      expect(result.valid).toBe(true);
      expect(result.warning).toContain('expires soon');
    });

    it('should not flag document expiring in 31 days', () => {
      const today = new Date();
      // Add 32 days to ensure we're beyond the 30-day threshold
      const expiryDate = format(addDays(today, 32), 'dd/MM/yyyy');
      const issueDate = format(subYears(addDays(today, 32), 10), 'dd/MM/yyyy');
      const result = service.validateExpiry(issueDate, expiryDate);
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });
  });

  describe('validate (full validation)', () => {
    it('should validate complete Omang data successfully', () => {
      const today = new Date();
      const expiryDate = format(addDays(today, 365), 'dd/MM/yyyy');
      const issueDate = format(subYears(addDays(today, 365), 10), 'dd/MM/yyyy');
      const ocrData = {
        omangNumber: '123456789',
        dateOfIssue: issueDate,
        dateOfExpiry: expiryDate,
      };

      const result = service.validate(ocrData);
      expect(result.overall.valid).toBe(true);
      expect(result.overall.errors).toHaveLength(0);
      expect(result.omangNumber.valid).toBe(true);
      expect(result.expiry.valid).toBe(true);
    });

    it('should collect all validation errors', () => {
      const ocrData = {
        omangNumber: '12345678', // Invalid: 8 digits
        dateOfIssue: '15/03/2010',
        dateOfExpiry: '15/03/2020', // Expired
      };

      const result = service.validate(ocrData);
      expect(result.overall.valid).toBe(false);
      expect(result.overall.errors.length).toBeGreaterThan(0);
      expect(result.omangNumber.valid).toBe(false);
      expect(result.expiry.valid).toBe(false);
    });

    it('should collect warnings without failing validation', () => {
      const today = new Date();
      const expiryDate = format(addDays(today, 25), 'dd/MM/yyyy');
      const issueDate = format(subYears(addDays(today, 25), 10), 'dd/MM/yyyy');
      const ocrData = {
        omangNumber: '123456789',
        dateOfIssue: issueDate,
        dateOfExpiry: expiryDate,
      };

      const result = service.validate(ocrData);
      expect(result.overall.valid).toBe(true);
      expect(result.overall.warnings.length).toBeGreaterThan(0);
      expect(result.overall.warnings[0]).toContain('expires soon');
    });

    it('should include validation timestamp', () => {
      const ocrData = {
        omangNumber: '123456789',
        dateOfIssue: '15/03/2015',
        dateOfExpiry: '15/03/2025',
      };

      const result = service.validate(ocrData);
      expect(result.validatedAt).toBeDefined();
      expect(new Date(result.validatedAt).getTime()).toBeGreaterThan(0);
    });
  });
});
