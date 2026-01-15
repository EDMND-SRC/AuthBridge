/**
 * Botswana Omang (National Identity Card) Extractor
 *
 * Field patterns based on actual Omang card images - January 2026
 *
 * IMPORTANT CORRECTIONS:
 * - Card uses "FORENAMES" not "FIRST NAMES"
 * - Card uses "ID NUMBER" not "OMANG NO"
 * - Card does NOT have a "DATE OF ISSUE" field
 * - SEX field is on the BACK of the card
 */

import { TextractBlock } from '../../types/ocr';
import {
  DocumentExtractor,
  ExtractionResult,
  FieldConfidenceMap,
  SupportedCountry,
  DocumentType,
} from '../types';
import { BotswanaOmangFields } from './types';

/**
 * Front side field patterns
 */
const FRONT_PATTERNS = {
  surname: /SURNAME:?\s*([A-Z\s]+?)(?:\n|$)/i,
  forenames: /FORENAMES?:?\s*([A-Z\s]+?)(?:\n|$)/i,
  idNumber: /ID\s+NUMBER:?\s*(\d{9})/i,
  dateOfBirth: /DATE\s+OF\s+BIRTH:?\s*(\d{2}\/\d{2}\/\d{4})/i,
  placeOfBirth: /PLACE\s+OF\s+BIRTH:?\s*([A-Z\s]+?)(?:\n|$)/i,
};

/**
 * Back side field patterns
 */
const BACK_PATTERNS = {
  nationality: /NATIONALITY:?\s*([A-Z\s]+?)(?:\n|$)/i,
  sex: /SEX:?\s*([MF])/i,
  colourOfEyes: /COLOUR\s+OF\s+EYES:?\s*([A-Z\s]+?)(?:\n|$)/i,
  dateOfExpiry: /DATE\s+OF\s+EXPIRY:?\s*(\d{2}\/\d{2}\/\d{4})/i,
  placeOfApplication: /PLACE\s+OF\s+APPLICATION:?\s*([A-Z\s]+?)(?:\n|$)/i,
  plot: /PLOT\s+(\d+[A-Z]?)/i,
  district: /(.*?)\s+DISTRICT/i,
};

/**
 * Field weights for confidence calculation
 */
const FIELD_WEIGHTS: Record<string, number> = {
  idNumber: 2.0,
  surname: 1.5,
  forenames: 1.5,
  dateOfBirth: 1.0,
  dateOfExpiry: 0.5,
  sex: 0.5,
  placeOfBirth: 0.5,
  nationality: 0.5,
  colourOfEyes: 0.3,
  placeOfApplication: 0.3,
  plot: 0.3,
  locality: 0.3,
  district: 0.3,
};

export class BotswanaOmangExtractor implements DocumentExtractor<BotswanaOmangFields> {
  readonly country: SupportedCountry = 'BW';
  readonly documentType: DocumentType = 'national_id';
  readonly requiredFields = ['idNumber', 'surname', 'forenames', 'dateOfBirth', 'dateOfExpiry', 'sex'];

  extract(blocks: TextractBlock[]): ExtractionResult<BotswanaOmangFields> {
    const fields: Partial<BotswanaOmangFields> = {};
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

    // Extract front side fields
    this.extractFrontFields(fullText, blocks, fields, confidence);

    // Extract back side fields
    this.extractBackFields(fullText, blocks, fields, confidence, lines);

    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(confidence);

    // Check for missing required fields
    const missingRequiredFields = this.requiredFields.filter(
      (field) => !fields[field as keyof BotswanaOmangFields]
    );

    // Add warnings
    if (missingRequiredFields.length > 0) {
      warnings.push(`Missing required fields: ${missingRequiredFields.join(', ')}`);
    }

    if (overallConfidence < 80) {
      warnings.push('Low overall confidence - manual review recommended');
    }

    return {
      fields: fields as BotswanaOmangFields,
      confidence,
      overallConfidence,
      documentType: this.documentType,
      country: this.country,
      requiresManualReview: missingRequiredFields.length > 0 || overallConfidence < 80,
      missingRequiredFields,
      warnings,
    };
  }

  validate(fields: BotswanaOmangFields): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate ID number format (9 digits)
    if (fields.idNumber && !/^\d{9}$/.test(fields.idNumber)) {
      errors.push('ID number must be exactly 9 digits');
    }

    // Validate date formats
    const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
    if (fields.dateOfBirth && !datePattern.test(fields.dateOfBirth)) {
      errors.push('Date of birth must be in DD/MM/YYYY format');
    }
    if (fields.dateOfExpiry && !datePattern.test(fields.dateOfExpiry)) {
      errors.push('Date of expiry must be in DD/MM/YYYY format');
    }

    // Validate expiry (not expired)
    if (fields.dateOfExpiry) {
      const [day, month, year] = fields.dateOfExpiry.split('/').map(Number);
      const expiryDate = new Date(year, month - 1, day);
      if (expiryDate < new Date()) {
        errors.push('Document has expired');
      }
    }

    // Validate sex
    if (fields.sex && !['M', 'F'].includes(fields.sex)) {
      errors.push('Sex must be M or F');
    }

    return { valid: errors.length === 0, errors };
  }

  private extractFrontFields(
    fullText: string,
    blocks: TextractBlock[],
    fields: Partial<BotswanaOmangFields>,
    confidence: FieldConfidenceMap
  ): void {
    // Surname
    const surnameMatch = fullText.match(FRONT_PATTERNS.surname);
    if (surnameMatch) {
      fields.surname = surnameMatch[1].trim();
      confidence.surname = this.findBlockConfidence(blocks, surnameMatch[0]);
    }

    // Forenames
    const forenamesMatch = fullText.match(FRONT_PATTERNS.forenames);
    if (forenamesMatch) {
      fields.forenames = forenamesMatch[1].trim();
      confidence.forenames = this.findBlockConfidence(blocks, forenamesMatch[0]);
    }

    // ID Number
    const idMatch = fullText.match(FRONT_PATTERNS.idNumber);
    if (idMatch) {
      fields.idNumber = idMatch[1];
      confidence.idNumber = this.findBlockConfidence(blocks, idMatch[0]);
    }

    // Date of Birth
    const dobMatch = fullText.match(FRONT_PATTERNS.dateOfBirth);
    if (dobMatch) {
      fields.dateOfBirth = dobMatch[1];
      confidence.dateOfBirth = this.findBlockConfidence(blocks, dobMatch[0]);
    }

    // Place of Birth
    const pobMatch = fullText.match(FRONT_PATTERNS.placeOfBirth);
    if (pobMatch) {
      fields.placeOfBirth = pobMatch[1].trim();
      confidence.placeOfBirth = this.findBlockConfidence(blocks, pobMatch[0]);
    }
  }

  private extractBackFields(
    fullText: string,
    blocks: TextractBlock[],
    fields: Partial<BotswanaOmangFields>,
    confidence: FieldConfidenceMap,
    lines: Array<{ text: string; confidence: number }>
  ): void {
    // Nationality
    const nationalityMatch = fullText.match(BACK_PATTERNS.nationality);
    if (nationalityMatch) {
      fields.nationality = nationalityMatch[1].trim();
      confidence.nationality = this.findBlockConfidence(blocks, nationalityMatch[0]);
    }

    // Sex
    const sexMatch = fullText.match(BACK_PATTERNS.sex);
    if (sexMatch) {
      fields.sex = sexMatch[1] as 'M' | 'F';
      confidence.sex = this.findBlockConfidence(blocks, sexMatch[0]);
    }

    // Colour of Eyes
    const eyesMatch = fullText.match(BACK_PATTERNS.colourOfEyes);
    if (eyesMatch) {
      fields.colourOfEyes = eyesMatch[1].trim();
      confidence.colourOfEyes = this.findBlockConfidence(blocks, eyesMatch[0]);
    }

    // Date of Expiry
    const expiryMatch = fullText.match(BACK_PATTERNS.dateOfExpiry);
    if (expiryMatch) {
      fields.dateOfExpiry = expiryMatch[1];
      confidence.dateOfExpiry = this.findBlockConfidence(blocks, expiryMatch[0]);
    }

    // Place of Application
    const appMatch = fullText.match(BACK_PATTERNS.placeOfApplication);
    if (appMatch) {
      fields.placeOfApplication = appMatch[1].trim();
      confidence.placeOfApplication = this.findBlockConfidence(blocks, appMatch[0]);
    }

    // Plot
    const plotMatch = fullText.match(BACK_PATTERNS.plot);
    if (plotMatch) {
      fields.plot = plotMatch[1];
      confidence.plot = this.findBlockConfidence(blocks, plotMatch[0]);
    }

    // District
    const districtMatch = fullText.match(BACK_PATTERNS.district);
    if (districtMatch) {
      fields.district = districtMatch[0].trim();
      confidence.district = this.findBlockConfidence(blocks, districtMatch[0]);
    }

    // Locality (heuristic)
    this.extractLocality(lines, fields, confidence);
  }

  private extractLocality(
    lines: Array<{ text: string; confidence: number }>,
    fields: Partial<BotswanaOmangFields>,
    confidence: FieldConfidenceMap
  ): void {
    const addressLines = lines.filter((line) => {
      const text = line.text.toUpperCase();
      return (
        !text.includes('ADDRESS') &&
        !text.match(/PLOT\s+\d+/) &&
        !text.includes('DISTRICT') &&
        !text.includes('NATIONALITY') &&
        !text.includes('SEX') &&
        !text.includes('COLOUR') &&
        !text.includes('DATE') &&
        !text.includes('PLACE OF APPLICATION')
      );
    });

    const localityLine = addressLines.find((line) => {
      const text = line.text.toUpperCase();
      return text.length > 2 && /^[A-Z\s]+$/.test(text);
    });

    if (localityLine) {
      fields.locality = localityLine.text.trim();
      confidence.locality = localityLine.confidence;
    }
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
