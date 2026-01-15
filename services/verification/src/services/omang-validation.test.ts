import { describe, it, expect, beforeEach } from 'vitest';
import { OmangValidationService } from './omang-validation';
import { format, addDays } from 'date-fns';

describe('OmangValidationService', () => {
  let service: OmangValidationService;

  beforeEach(() => {
    service = new OmangValidationService();
  });

  describe('validateIdNumber', () => {
    it('should accept valid 9-digit ID number', () => {
      const result = service.validateIdNumber('059016012');
      expect(result.valid).toBe(true);
      expect(result.format).toBe('valid');
      expect(result.value).toBe('059016012');
    });

    it('should accept ID number with leading zeros', () => {
      const result = service.validateIdNumber('012345678');
      expect(result.valid).toBe(true);
      expect(result.format).toBe('valid');
    });

    it('should accept all numeric ID number', () => {
      const result = service.validateIdNumber('999999999');
      expect(result.valid).toBe(true);
    });

    it('should reject ID number with 8 digits', () => {
      const result = service.validateIdNumber('12345678');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('9 digits');
      expect(result.format).toBe('invalid');
    });

    it('should reject ID number with 10 digits', () => {
      const result = service.validateIdNumber('1234567890');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('9 digits');
    });

    it('should reject ID number with letters', () => {
      const result = service.validateIdNumber('12345678A');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('numeric');
    });

    it('should reject ID number with special characters', () => {
      const result = service.validateIdNumber('123-456-789');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('numeric');
    });

    it('should reject ID number with spaces', () => {
      const result = service.validateIdNumber('123 456 789');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('numeric');
    });

    it('should reject empty ID number', () => {
      const result = service.validateIdNumber('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('9 digits');
    });

    it('should reject null ID number', () => {
      const result = service.validateIdNumber(null as any);
      expect(result.valid).toBe(false);
    });

    it('should reject undefined ID number', () => {
      const result = service.validateIdNumber(undefined as any);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateExpiry', () => {
    it('should accept valid non-expired document', () => {
      const today = new Date();
      const expiryDate = format(addDays(today, 365), 'dd/MM/yyyy');
      const result = service.validateExpiry(expiryDate);
      expect(result.valid).toBe(true);
      expect(result.expired).toBe(false);
    });

    it('should reject expired document', () => {
      const expiryDate = '15/03/2020';
      const result = service.validateExpiry(expiryDate);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
      expect(result.expired).toBe(true);
      expect(result.expiredDays).toBeGreaterThan(0);
    });

    it('should flag document expiring within 30 days', () => {
      const today = new Date();
      const expiryDate = format(addDays(today, 25), 'dd/MM/yyyy');
      const result = service.validateExpiry(expiryDate);
      expect(result.valid).toBe(true);
      expect(result.warning).toContain('expires soon');
      expect(result.daysUntilExpiry).toBeLessThanOrEqual(30);
    });

    it('should handle invalid date format gracefully', () => {
      const result = service.validateExpiry('invalid');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('date');
    });

    it('should handle missing date', () => {
      const result = service.validateExpiry('');
      expect(result.valid).toBe(false);
    });

    it('should accept document expiring exactly in 30 days', () => {
      const today = new Date();
      const expiryDate = format(addDays(today, 30), 'dd/MM/yyyy');
      const result = service.validateExpiry(expiryDate);
      expect(result.valid).toBe(true);
      expect(result.warning).toContain('expires soon');
    });

    it('should not flag document expiring in 31 days', () => {
      const today = new Date();
      const expiryDate = format(addDays(today, 32), 'dd/MM/yyyy');
      const result = service.validateExpiry(expiryDate);
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });
  });

  describe('validate (full validation)', () => {
    it('should validate complete Omang data successfully', () => {
      const today = new Date();
      const expiryDate = format(addDays(today, 365), 'dd/MM/yyyy');
      const ocrData = {
        idNumber: '059016012',
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
        idNumber: '12345678', // Invalid: 8 digits
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
      const ocrData = {
        idNumber: '059016012',
        dateOfExpiry: expiryDate,
      };

      const result = service.validate(ocrData);
      expect(result.overall.valid).toBe(true);
      expect(result.overall.warnings.length).toBeGreaterThan(0);
      expect(result.overall.warnings[0]).toContain('expires soon');
    });

    it('should include validation timestamp', () => {
      const ocrData = {
        idNumber: '059016012',
        dateOfExpiry: '22/05/2032',
      };

      const result = service.validate(ocrData);
      expect(result.validatedAt).toBeDefined();
      expect(new Date(result.validatedAt).getTime()).toBeGreaterThan(0);
    });
  });

  describe('backward compatibility', () => {
    it('should support validateOmangNumber alias', () => {
      const result = service.validateOmangNumber('059016012');
      expect(result.valid).toBe(true);
      expect(result.format).toBe('valid');
    });
  });
});
