import { describe, it, expect } from 'vitest';
import { BotswanaPassportExtractor } from './passport-extractor';
import { TextractBlock } from '../../types/ocr';

describe('BotswanaPassportExtractor', () => {
  const extractor = new BotswanaPassportExtractor();

  describe('extract', () => {
    it('should extract all passport fields from clear text', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'Type/Type: P', Confidence: 99 },
        { BlockType: 'LINE', Id: '2', Text: 'Code/Code: BWA', Confidence: 99 },
        { BlockType: 'LINE', Id: '3', Text: 'Passport No./N° de passeport: BN0221546', Confidence: 98 },
        { BlockType: 'LINE', Id: '4', Text: 'Surname/Nom: MOEPSWA', Confidence: 99 },
        { BlockType: 'LINE', Id: '5', Text: 'Given names/Prénoms: MOTLOTLEGI EDMOND POLOKO', Confidence: 98 },
        { BlockType: 'LINE', Id: '6', Text: 'Nationality/Nationalité: MOTSWANA', Confidence: 99 },
        { BlockType: 'LINE', Id: '7', Text: 'Date of birth/Date de naissance: 25 AUG/AOUT 94', Confidence: 97 },
        { BlockType: 'LINE', Id: '8', Text: 'Sex/Sexe: M', Confidence: 99 },
        { BlockType: 'LINE', Id: '9', Text: 'Place of birth/Lieu de naissance: FRANCISTOWN', Confidence: 98 },
        { BlockType: 'LINE', Id: '10', Text: 'Personal No./N° personnel: 059016012', Confidence: 98 },
        { BlockType: 'LINE', Id: '11', Text: 'Date of issue/Date de délivrance: 05 JAN/JAN 12', Confidence: 97 },
        { BlockType: 'LINE', Id: '12', Text: 'Date of expiry/Date d\'expiration: 04 JAN/JAN 32', Confidence: 97 },
        { BlockType: 'LINE', Id: '13', Text: 'Authority/Autorité: MLHA - DIC', Confidence: 96 },
      ];

      const result = extractor.extract(blocks);

      expect(result.fields.type).toBe('P');
      expect(result.fields.countryCode).toBe('BWA');
      expect(result.fields.passportNumber).toBe('BN0221546');
      expect(result.fields.surname).toBe('MOEPSWA');
      expect(result.fields.forenames).toBe('MOTLOTLEGI EDMOND POLOKO');
      expect(result.fields.nationality).toBe('MOTSWANA');
      expect(result.fields.dateOfBirth).toBe('25 AUG/AOUT 94');
      expect(result.fields.sex).toBe('M');
      expect(result.fields.placeOfBirth).toBe('FRANCISTOWN');
      expect(result.fields.personalNumber).toBe('059016012');
      expect(result.fields.issuingAuthority).toBe('MLHA - DIC');
      expect(result.documentType).toBe('passport');
      expect(result.country).toBe('BW');
    });

    it('should extract fields from MRZ when visual zone is incomplete', () => {
      // MRZ TD3 format: Line 1 = 44 chars, Line 2 = 44 chars
      // Line 2: [Passport#9][Check1][Country3][DOB6][Check2][Sex1][Expiry6][Check3][Personal14][Check4][FinalCheck1]
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'P<BWAMOEPSWA<<MOTLOTLEGI<EDMOND<POLOKO<<<<<<', Confidence: 95 },
        { BlockType: 'LINE', Id: '2', Text: 'BN02215460BWA9408252M320104105901601200<<<84', Confidence: 95 },
      ];

      const result = extractor.extract(blocks);

      expect(result.fields.mrz).toBeDefined();
      expect(result.fields.mrz?.line1).toBe('P<BWAMOEPSWA<<MOTLOTLEGI<EDMOND<POLOKO<<<<<<');
      expect(result.fields.mrz?.line2).toBe('BN02215460BWA9408252M320104105901601200<<<84');
      expect(result.fields.surname).toBe('MOEPSWA');
      expect(result.fields.forenames).toBe('MOTLOTLEGI EDMOND POLOKO');
      expect(result.fields.countryCode).toBe('BWA');
      expect(result.fields.passportNumber).toBe('BN0221546');
      expect(result.fields.personalNumber).toBe('05901601200');
    });

    it('should handle female passport holder', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'Sex/Sexe: F', Confidence: 99 },
        { BlockType: 'LINE', Id: '2', Text: 'Surname/Nom: KGOSI', Confidence: 99 },
      ];

      const result = extractor.extract(blocks);

      expect(result.fields.sex).toBe('F');
      expect(result.fields.surname).toBe('KGOSI');
    });

    it('should report missing required fields', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'Surname/Nom: MOEPSWA', Confidence: 99 },
      ];

      const result = extractor.extract(blocks);

      expect(result.missingRequiredFields).toContain('passportNumber');
      expect(result.missingRequiredFields).toContain('forenames');
      expect(result.missingRequiredFields).toContain('dateOfBirth');
      expect(result.requiresManualReview).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate correct passport fields', () => {
      const fields = {
        type: 'P',
        countryCode: 'BWA',
        passportNumber: 'BN0221546',
        surname: 'MOEPSWA',
        forenames: 'MOTLOTLEGI EDMOND POLOKO',
        nationality: 'MOTSWANA',
        dateOfBirth: '25 AUG/AOUT 94',
        sex: 'M' as const,
        placeOfBirth: 'FRANCISTOWN',
        personalNumber: '059016012',
        dateOfIssue: '05 JAN/JAN 12',
        dateOfExpiry: '04 JAN/JAN 32',
        issuingAuthority: 'MLHA - DIC',
        mrz: { line1: '', line2: '', valid: true, checkDigitsValid: true },
      };

      const result = extractor.validate(fields);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid passport number format', () => {
      const fields = {
        type: 'P',
        countryCode: 'BWA',
        passportNumber: 'INVALID',
        surname: 'MOEPSWA',
        forenames: 'MOTLOTLEGI',
        nationality: 'MOTSWANA',
        dateOfBirth: '25 AUG/AOUT 94',
        sex: 'M' as const,
        placeOfBirth: 'FRANCISTOWN',
        personalNumber: '059016012',
        dateOfExpiry: '04 JAN/JAN 32',
        mrz: { line1: '', line2: '', valid: true, checkDigitsValid: true },
      };

      const result = extractor.validate(fields);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Passport number format invalid (expected: 2 letters + 7 digits)');
    });

    it('should reject invalid personal number (Omang)', () => {
      const fields = {
        type: 'P',
        countryCode: 'BWA',
        passportNumber: 'BN0221546',
        surname: 'MOEPSWA',
        forenames: 'MOTLOTLEGI',
        nationality: 'MOTSWANA',
        dateOfBirth: '25 AUG/AOUT 94',
        sex: 'M' as const,
        placeOfBirth: 'FRANCISTOWN',
        personalNumber: '12345', // Invalid - should be 9 digits
        dateOfExpiry: '04 JAN/JAN 32',
        mrz: { line1: '', line2: '', valid: true, checkDigitsValid: true },
      };

      const result = extractor.validate(fields);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Personal number (Omang) must be exactly 9 digits');
    });

    it('should reject non-BWA country code', () => {
      const fields = {
        type: 'P',
        countryCode: 'ZAF',
        passportNumber: 'BN0221546',
        surname: 'MOEPSWA',
        forenames: 'MOTLOTLEGI',
        nationality: 'MOTSWANA',
        dateOfBirth: '25 AUG/AOUT 94',
        sex: 'M' as const,
        placeOfBirth: 'FRANCISTOWN',
        personalNumber: '059016012',
        dateOfExpiry: '04 JAN/JAN 32',
        mrz: { line1: '', line2: '', valid: true, checkDigitsValid: true },
      };

      const result = extractor.validate(fields);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Country code must be BWA for Botswana passport');
    });

    it('should warn about invalid MRZ check digits', () => {
      const fields = {
        type: 'P',
        countryCode: 'BWA',
        passportNumber: 'BN0221546',
        surname: 'MOEPSWA',
        forenames: 'MOTLOTLEGI',
        nationality: 'MOTSWANA',
        dateOfBirth: '25 AUG/AOUT 94',
        sex: 'M' as const,
        placeOfBirth: 'FRANCISTOWN',
        personalNumber: '059016012',
        dateOfExpiry: '04 JAN/JAN 32',
        mrz: { line1: '', line2: '', valid: true, checkDigitsValid: false },
      };

      const result = extractor.validate(fields);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('MRZ check digits are invalid - possible tampering or OCR error');
    });
  });

  describe('metadata', () => {
    it('should have correct country and document type', () => {
      expect(extractor.country).toBe('BW');
      expect(extractor.documentType).toBe('passport');
    });

    it('should have required fields defined', () => {
      expect(extractor.requiredFields).toContain('passportNumber');
      expect(extractor.requiredFields).toContain('surname');
      expect(extractor.requiredFields).toContain('forenames');
      expect(extractor.requiredFields).toContain('dateOfBirth');
      expect(extractor.requiredFields).toContain('dateOfExpiry');
    });
  });
});
