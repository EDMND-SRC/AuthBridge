/**
 * Botswana Passport Extractor
 *
 * Field patterns based on actual Botswana passport images - January 2026
 * Follows ICAO 9303 TD3 standard (Machine Readable Passport)
 *
 * Passport layout (bilingual English/French):
 * - Type/Type: P
 * - Code/Code: BWA
 * - Passport No./N° de passeport: BN0221546
 * - Surname/Nom: MOEPSWA
 * - Given names/Prénoms: MOTLOTLEGI EDMOND POLOKO
 * - Nationality/Nationalité: MOTSWANA
 * - Date of birth/Date de naissance: 25 AUG/AOUT 94
 * - Sex/Sexe: M
 * - Place of birth/Lieu de naissance: FRANCISTOWN
 * - Personal No./N° personnel: 059016012 (Omang number)
 * - Date of issue/Date de délivrance: 05 JAN/JAN 12
 * - Date of expiry/Date d'expiration: 04 JAN/JAN 22
 * - Authority/Autorité: MLHA - DIC
 *
 * MRZ (2 lines, 44 characters each):
 * Line 1: P<BWAMOEPSWA<<MOTLOTLEGI<EDMOND<POLOKO<<<<<<
 * Line 2: BN02215460BWA9408252M2201041059016012<<<<84
 */

import { TextractBlock } from '../../types/ocr';
import {
  DocumentExtractor,
  ExtractionResult,
  FieldConfidenceMap,
  SupportedCountry,
  DocumentType,
} from '../types';
import { BotswanaPassportFields } from './types';

/**
 * Visual zone field patterns (bilingual labels)
 */
const PATTERNS = {
  type: /Type\/?Type:?\s*([A-Z])/i,
  countryCode: /Code\/?Code:?\s*([A-Z]{3})/i,
  passportNumber: /Passport\s+No\.?\/?N°\s*de\s*passeport:?\s*([A-Z0-9]+)/i,
  surname: /Surname\/?Nom:?\s*([A-Z\s]+?)(?:\n|$)/i,
  forenames: /Given\s+names?\/?Pr[ée]noms?:?\s*([A-Z\s]+?)(?:\n|$)/i,
  nationality: /Nationality\/?Nationalit[ée]:?\s*([A-Z]+)/i,
  dateOfBirth: /Date\s+of\s+birth\/?Date\s+de\s+naissance:?\s*(\d{2}\s+[A-Z]+\/?[A-Z]+\s+\d{2})/i,
  sex: /Sex\/?Sexe:?\s*([MF])/i,
  placeOfBirth: /Place\s+of\s+birth\/?Lieu\s+de\s+naissance:?\s*([A-Z\s]+?)(?:\n|$)/i,
  personalNumber: /Personal\s+No\.?\/?N°\s*personnel:?\s*(\d{9})/i,
  dateOfIssue: /Date\s+of\s+issue\/?Date\s+de\s+d[ée]livrance:?\s*(\d{2}\s+[A-Z]+\/?[A-Z]+\s+\d{2})/i,
  dateOfExpiry: /Date\s+of\s+expiry\/?Date\s+d['']?expiration:?\s*(\d{2}\s+[A-Z]+\/?[A-Z]+\s+\d{2})/i,
  authority: /Authority\/?Autorit[ée]:?\s*([A-Z\s\-]+?)(?:\n|$)/i,
};

/**
 * MRZ patterns for TD3 passport (44 chars per line)
 */
const MRZ_PATTERNS = {
  line1: /^P<([A-Z]{3})([A-Z<]+)<<([A-Z<]+)$/,
  line2: /^([A-Z0-9]{9})(\d)([A-Z]{3})(\d{6})(\d)([MF<])(\d{6})(\d)([A-Z0-9<]{14})(\d)$/,
};

/**
 * Field weights for confidence calculation
 */
const FIELD_WEIGHTS: Record<string, number> = {
  passportNumber: 2.0,
  personalNumber: 2.0,
  surname: 1.5,
  forenames: 1.5,
  dateOfBirth: 1.0,
  dateOfExpiry: 1.0,
  nationality: 0.5,
  sex: 0.5,
  placeOfBirth: 0.5,
  dateOfIssue: 0.5,
  type: 0.3,
  countryCode: 0.3,
  authority: 0.3,
};

export class BotswanaPassportExtractor implements DocumentExtractor<BotswanaPassportFields> {
  readonly country: SupportedCountry = 'BW';
  readonly documentType: DocumentType = 'passport';
  readonly requiredFields = [
    'passportNumber',
    'surname',
    'forenames',
    'dateOfBirth',
    'dateOfExpiry',
    'nationality',
    'sex',
  ];

  extract(blocks: TextractBlock[]): ExtractionResult<BotswanaPassportFields> {
    const fields: Partial<BotswanaPassportFields> = {};
    const confidence: FieldConfidenceMap = {};
    const warnings: string[] = [];

    // Get all LINE blocks with text
    const lines = blocks
      .filter((block) => block.BlockType === 'LINE' && block.Text)
      .map((block) => ({
        text: block.Text!,
        confidence: block.Confidence || 0,
      }));

    const fullText = lines.map((line) => line.text).join('\n');

    // Extract visual zone fields
    this.extractVisualZoneFields(fullText, blocks, fields, confidence);

    // Extract and parse MRZ
    const mrzResult = this.extractMRZ(lines, blocks);
    if (mrzResult) {
      fields.mrz = mrzResult.mrz;

      // Use MRZ data to fill/verify fields
      this.reconcileMRZWithVisualZone(mrzResult, fields, confidence, warnings);
    }

    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(confidence);

    // Check for missing required fields
    const missingRequiredFields = this.requiredFields.filter(
      (field) => !fields[field as keyof BotswanaPassportFields]
    );

    if (missingRequiredFields.length > 0) {
      warnings.push(`Missing required fields: ${missingRequiredFields.join(', ')}`);
    }

    if (overallConfidence < 80) {
      warnings.push('Low overall confidence - manual review recommended');
    }

    return {
      fields: fields as BotswanaPassportFields,
      confidence,
      overallConfidence,
      documentType: this.documentType,
      country: this.country,
      requiresManualReview: missingRequiredFields.length > 0 || overallConfidence < 80,
      missingRequiredFields,
      warnings,
    };
  }

  validate(fields: BotswanaPassportFields): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate passport number format (BWA format: BN + 7 digits)
    if (fields.passportNumber && !/^[A-Z]{2}\d{7}$/.test(fields.passportNumber)) {
      errors.push('Passport number format invalid (expected: 2 letters + 7 digits)');
    }

    // Validate personal number (Omang - 9 digits)
    if (fields.personalNumber && !/^\d{9}$/.test(fields.personalNumber)) {
      errors.push('Personal number (Omang) must be exactly 9 digits');
    }

    // Validate country code
    if (fields.countryCode && fields.countryCode !== 'BWA') {
      errors.push('Country code must be BWA for Botswana passport');
    }

    // Validate type
    if (fields.type && fields.type !== 'P') {
      errors.push('Document type must be P for passport');
    }

    // Validate sex
    if (fields.sex && !['M', 'F'].includes(fields.sex)) {
      errors.push('Sex must be M or F');
    }

    // Validate MRZ check digits if present
    if (fields.mrz && !fields.mrz.checkDigitsValid) {
      errors.push('MRZ check digits are invalid - possible tampering or OCR error');
    }

    // Validate expiry
    if (fields.dateOfExpiry) {
      const expiryDate = this.parseBilingualDate(fields.dateOfExpiry);
      if (expiryDate && expiryDate < new Date()) {
        errors.push('Passport has expired');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private extractVisualZoneFields(
    fullText: string,
    blocks: TextractBlock[],
    fields: Partial<BotswanaPassportFields>,
    confidence: FieldConfidenceMap
  ): void {
    // Type
    const typeMatch = fullText.match(PATTERNS.type);
    if (typeMatch) {
      fields.type = typeMatch[1];
      confidence.type = this.findBlockConfidence(blocks, typeMatch[0]);
    }

    // Country Code
    const codeMatch = fullText.match(PATTERNS.countryCode);
    if (codeMatch) {
      fields.countryCode = codeMatch[1];
      confidence.countryCode = this.findBlockConfidence(blocks, codeMatch[0]);
    }

    // Passport Number
    const passportMatch = fullText.match(PATTERNS.passportNumber);
    if (passportMatch) {
      fields.passportNumber = passportMatch[1];
      confidence.passportNumber = this.findBlockConfidence(blocks, passportMatch[0]);
    }

    // Surname
    const surnameMatch = fullText.match(PATTERNS.surname);
    if (surnameMatch) {
      fields.surname = surnameMatch[1].trim();
      confidence.surname = this.findBlockConfidence(blocks, surnameMatch[0]);
    }

    // Forenames
    const forenamesMatch = fullText.match(PATTERNS.forenames);
    if (forenamesMatch) {
      fields.forenames = forenamesMatch[1].trim();
      confidence.forenames = this.findBlockConfidence(blocks, forenamesMatch[0]);
    }

    // Nationality
    const nationalityMatch = fullText.match(PATTERNS.nationality);
    if (nationalityMatch) {
      fields.nationality = nationalityMatch[1];
      confidence.nationality = this.findBlockConfidence(blocks, nationalityMatch[0]);
    }

    // Date of Birth
    const dobMatch = fullText.match(PATTERNS.dateOfBirth);
    if (dobMatch) {
      fields.dateOfBirth = dobMatch[1];
      confidence.dateOfBirth = this.findBlockConfidence(blocks, dobMatch[0]);
    }

    // Sex
    const sexMatch = fullText.match(PATTERNS.sex);
    if (sexMatch) {
      fields.sex = sexMatch[1] as 'M' | 'F';
      confidence.sex = this.findBlockConfidence(blocks, sexMatch[0]);
    }

    // Place of Birth
    const pobMatch = fullText.match(PATTERNS.placeOfBirth);
    if (pobMatch) {
      fields.placeOfBirth = pobMatch[1].trim();
      confidence.placeOfBirth = this.findBlockConfidence(blocks, pobMatch[0]);
    }

    // Personal Number (Omang)
    const personalMatch = fullText.match(PATTERNS.personalNumber);
    if (personalMatch) {
      fields.personalNumber = personalMatch[1];
      confidence.personalNumber = this.findBlockConfidence(blocks, personalMatch[0]);
    }

    // Date of Issue
    const issueMatch = fullText.match(PATTERNS.dateOfIssue);
    if (issueMatch) {
      fields.dateOfIssue = issueMatch[1];
      confidence.dateOfIssue = this.findBlockConfidence(blocks, issueMatch[0]);
    }

    // Date of Expiry
    const expiryMatch = fullText.match(PATTERNS.dateOfExpiry);
    if (expiryMatch) {
      fields.dateOfExpiry = expiryMatch[1];
      confidence.dateOfExpiry = this.findBlockConfidence(blocks, expiryMatch[0]);
    }

    // Authority
    const authorityMatch = fullText.match(PATTERNS.authority);
    if (authorityMatch) {
      fields.issuingAuthority = authorityMatch[1].trim();
      confidence.authority = this.findBlockConfidence(blocks, authorityMatch[0]);
    }
  }

  private extractMRZ(
    lines: Array<{ text: string; confidence: number }>,
    blocks: TextractBlock[]
  ): { mrz: BotswanaPassportFields['mrz']; parsedFields: Partial<BotswanaPassportFields> } | null {
    // Find MRZ lines (44 characters, starts with P< or contains only MRZ chars)
    const mrzLines = lines.filter((line) => {
      const text = line.text.replace(/\s/g, '');
      return text.length >= 40 && /^[A-Z0-9<]+$/.test(text);
    });

    if (mrzLines.length < 2) {
      return null;
    }

    const line1 = mrzLines[0].text.replace(/\s/g, '');
    const line2 = mrzLines[1].text.replace(/\s/g, '');

    const parsedFields: Partial<BotswanaPassportFields> = {};
    let checkDigitsValid = true;

    // Parse Line 1: P<BWAMOEPSWA<<MOTLOTLEGI<EDMOND<POLOKO<<<<<<
    const line1Match = line1.match(/^P<([A-Z]{3})([A-Z<]+)$/);
    if (line1Match) {
      parsedFields.countryCode = line1Match[1];

      const namePart = line1Match[2];
      const [surname, ...givenNames] = namePart.split('<<');
      parsedFields.surname = surname.replace(/<+/g, ' ').trim();
      parsedFields.forenames = givenNames.join(' ').replace(/<+/g, ' ').trim();
    }

    // Parse Line 2: BN02215460BWA9408252M2201041059016012<<<<84
    // Format: [Passport#9][Check1][Country3][DOB6][Check2][Sex1][Expiry6][Check3][Personal14][Check4]
    if (line2.length >= 44) {
      const passportNum = line2.substring(0, 9);
      const check1 = line2.substring(9, 10);
      const country = line2.substring(10, 13);
      const dob = line2.substring(13, 19);
      const check2 = line2.substring(19, 20);
      const sex = line2.substring(20, 21);
      const expiry = line2.substring(21, 27);
      const check3 = line2.substring(27, 28);
      const personal = line2.substring(28, 42).replace(/<+$/, '');
      const check4 = line2.substring(42, 43);
      const finalCheck = line2.substring(43, 44);

      parsedFields.passportNumber = passportNum.replace(/<+$/, '');
      parsedFields.countryCode = country;
      parsedFields.dateOfBirth = this.formatMRZDate(dob);
      parsedFields.sex = sex === 'M' || sex === 'F' ? sex : undefined;
      parsedFields.dateOfExpiry = this.formatMRZDate(expiry);
      parsedFields.personalNumber = personal;

      // Validate check digits
      checkDigitsValid =
        this.validateCheckDigit(passportNum, check1) &&
        this.validateCheckDigit(dob, check2) &&
        this.validateCheckDigit(expiry, check3);
    }

    return {
      mrz: {
        line1,
        line2,
        valid: true,
        checkDigitsValid,
      },
      parsedFields,
    };
  }

  private reconcileMRZWithVisualZone(
    mrzResult: { mrz: BotswanaPassportFields['mrz']; parsedFields: Partial<BotswanaPassportFields> },
    fields: Partial<BotswanaPassportFields>,
    confidence: FieldConfidenceMap,
    warnings: string[]
  ): void {
    const { parsedFields } = mrzResult;

    // Use MRZ data to fill missing fields or verify existing ones
    for (const [key, mrzValue] of Object.entries(parsedFields)) {
      if (!mrzValue) continue;

      const visualValue = fields[key as keyof BotswanaPassportFields];

      if (!visualValue) {
        // Fill from MRZ
        (fields as any)[key] = mrzValue;
        confidence[key] = 95; // MRZ is highly reliable
      } else if (typeof visualValue === 'string' && typeof mrzValue === 'string') {
        // Compare values
        const normalizedVisual = visualValue.replace(/\s+/g, '').toUpperCase();
        const normalizedMRZ = mrzValue.replace(/\s+/g, '').toUpperCase();

        if (normalizedVisual !== normalizedMRZ) {
          warnings.push(`Field '${key}' mismatch: Visual="${visualValue}" vs MRZ="${mrzValue}"`);
        }
      }
    }
  }

  private validateCheckDigit(data: string, checkDigit: string): boolean {
    const weights = [7, 3, 1];
    const charValues: Record<string, number> = {
      '<': 0, '0': 0, '1': 1, '2': 2, '3': 3, '4': 4,
      '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
      'A': 10, 'B': 11, 'C': 12, 'D': 13, 'E': 14, 'F': 15,
      'G': 16, 'H': 17, 'I': 18, 'J': 19, 'K': 20, 'L': 21,
      'M': 22, 'N': 23, 'O': 24, 'P': 25, 'Q': 26, 'R': 27,
      'S': 28, 'T': 29, 'U': 30, 'V': 31, 'W': 32, 'X': 33,
      'Y': 34, 'Z': 35,
    };

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data[i].toUpperCase();
      const value = charValues[char] ?? 0;
      sum += value * weights[i % 3];
    }

    return (sum % 10).toString() === checkDigit;
  }

  private formatMRZDate(mrzDate: string): string {
    // MRZ date format: YYMMDD -> DD MMM YY
    if (mrzDate.length !== 6) return mrzDate;

    const year = mrzDate.substring(0, 2);
    const month = mrzDate.substring(2, 4);
    const day = mrzDate.substring(4, 6);

    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthName = months[parseInt(month, 10) - 1] || month;

    return `${day} ${monthName} ${year}`;
  }

  private parseBilingualDate(dateStr: string): Date | null {
    // Format: "25 AUG/AOUT 94" or "04 JAN/JAN 22"
    const match = dateStr.match(/(\d{2})\s+([A-Z]+)(?:\/[A-Z]+)?\s+(\d{2})/i);
    if (!match) return null;

    const day = parseInt(match[1], 10);
    const monthStr = match[2].toUpperCase();
    let year = parseInt(match[3], 10);

    // Convert 2-digit year (assume 20xx for < 50, 19xx for >= 50)
    year = year < 50 ? 2000 + year : 1900 + year;

    const months: Record<string, number> = {
      JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
      JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
      AOUT: 7, // French August
    };

    const month = months[monthStr];
    if (month === undefined) return null;

    return new Date(year, month, day);
  }

  private findBlockConfidence(blocks: TextractBlock[], matchedText: string): number {
    const matchingBlock = blocks.find(
      (block) =>
        block.BlockType === 'LINE' &&
        block.Text &&
        (block.Text.includes(matchedText) || matchedText.includes(block.Text))
    );
    return matchingBlock?.Confidence || 0;
  }

  private calculateOverallConfidence(confidence: FieldConfidenceMap): number {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const [field, score] of Object.entries(confidence)) {
      if (score && score > 0) {
        const weight = FIELD_WEIGHTS[field] || 1.0;
        totalWeightedScore += score * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  }
}
