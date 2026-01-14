import { OmangExtractedFields, FieldConfidence, TextractBlock } from '../types/ocr';

/**
 * Omang front side field patterns
 */
const FRONT_PATTERNS = {
  surname: /SURNAME:?\s*([A-Z\s]+?)(?:\n|$)/i,
  firstNames: /FIRST\s+NAMES?:?\s*([A-Z\s]+?)(?:\n|$)/i,
  omangNumber: /OMANG\s+(?:NO|NUMBER)\.?:?\s*(\d{9})/i,
  dateOfBirth: /DATE\s+OF\s+BIRTH:?\s*(\d{2}\/\d{2}\/\d{4})/i,
  sex: /SEX:?\s*([MF])/i,
  dateOfIssue: /DATE\s+OF\s+ISSUE:?\s*(\d{2}\/\d{2}\/\d{4})/i,
  dateOfExpiry: /DATE\s+OF\s+EXPIRY:?\s*(\d{2}\/\d{2}\/\d{4})/i,
};

/**
 * Omang back side field patterns
 */
const BACK_PATTERNS = {
  plot: /PLOT\s+(\d+[A-Z]?)/i,
  district: /(.*?)\s+DISTRICT/i,
};

export interface ExtractionResult {
  fields: OmangExtractedFields;
  confidence: Partial<FieldConfidence>;
}

/**
 * Extract fields from Omang front side using pattern matching
 */
export function extractOmangFrontFields(blocks: TextractBlock[]): ExtractionResult {
  const fields: OmangExtractedFields = {};
  const confidence: Partial<FieldConfidence> = {};

  // Get all LINE blocks with text
  const lines = blocks
    .filter((block) => block.BlockType === 'LINE' && block.Text)
    .map((block) => ({
      text: block.Text!,
      confidence: block.Confidence || 0,
    }));

  // Combine all text for pattern matching
  const fullText = lines.map((line) => line.text).join('\n');

  // Extract surname
  const surnameMatch = fullText.match(FRONT_PATTERNS.surname);
  if (surnameMatch) {
    fields.surname = surnameMatch[1].trim();
    confidence.surname = calculateFieldConfidence(blocks, surnameMatch[0]);
  }

  // Extract first names
  const firstNamesMatch = fullText.match(FRONT_PATTERNS.firstNames);
  if (firstNamesMatch) {
    fields.firstNames = firstNamesMatch[1].trim();
    confidence.firstNames = calculateFieldConfidence(blocks, firstNamesMatch[0]);
  }

  // Extract Omang number
  const omangNumberMatch = fullText.match(FRONT_PATTERNS.omangNumber);
  if (omangNumberMatch) {
    fields.omangNumber = omangNumberMatch[1];
    confidence.omangNumber = calculateFieldConfidence(blocks, omangNumberMatch[0]);
  }

  // Extract date of birth
  const dobMatch = fullText.match(FRONT_PATTERNS.dateOfBirth);
  if (dobMatch) {
    fields.dateOfBirth = dobMatch[1];
    confidence.dateOfBirth = calculateFieldConfidence(blocks, dobMatch[0]);
  }

  // Extract sex
  const sexMatch = fullText.match(FRONT_PATTERNS.sex);
  if (sexMatch) {
    fields.sex = sexMatch[1] as 'M' | 'F';
    confidence.sex = calculateFieldConfidence(blocks, sexMatch[0]);
  }

  // Extract date of issue
  const issueMatch = fullText.match(FRONT_PATTERNS.dateOfIssue);
  if (issueMatch) {
    fields.dateOfIssue = issueMatch[1];
    confidence.dateOfIssue = calculateFieldConfidence(blocks, issueMatch[0]);
  }

  // Extract date of expiry
  const expiryMatch = fullText.match(FRONT_PATTERNS.dateOfExpiry);
  if (expiryMatch) {
    fields.dateOfExpiry = expiryMatch[1];
    confidence.dateOfExpiry = calculateFieldConfidence(blocks, expiryMatch[0]);
  }

  return { fields, confidence };
}

/**
 * Extract fields from Omang back side (address)
 */
export function extractOmangBackFields(blocks: TextractBlock[]): ExtractionResult {
  const fields: OmangExtractedFields = {};
  const confidence: Partial<FieldConfidence> = {};

  // Get all LINE blocks with text
  const lines = blocks
    .filter((block) => block.BlockType === 'LINE' && block.Text)
    .map((block) => ({
      text: block.Text!,
      confidence: block.Confidence || 0,
    }));

  // Combine all text for pattern matching
  const fullText = lines.map((line) => line.text).join('\n');

  // Extract plot number
  const plotMatch = fullText.match(BACK_PATTERNS.plot);
  if (plotMatch) {
    fields.plot = plotMatch[1];
    confidence.plot = calculateFieldConfidence(blocks, plotMatch[0]);
  }

  // Extract district (last line typically)
  const districtMatch = fullText.match(BACK_PATTERNS.district);
  if (districtMatch) {
    fields.district = districtMatch[0].trim();
    confidence.district = calculateFieldConfidence(blocks, districtMatch[0]);
  }

  // Extract locality (middle line - heuristic approach)
  // Find lines that are not ADDRESS, PLOT, or DISTRICT
  const addressLines = lines.filter((line) => {
    const text = line.text.toUpperCase();
    return (
      !text.includes('ADDRESS') &&
      !text.match(/PLOT\s+\d+/) &&
      !text.includes('DISTRICT')
    );
  });

  if (addressLines.length > 0) {
    // Typically the first non-plot, non-district line is the locality
    const localityLine = addressLines.find((line) => {
      const text = line.text.toUpperCase();
      return text.length > 2 && /^[A-Z\s]+$/.test(text);
    });

    if (localityLine) {
      fields.locality = localityLine.text.trim();
      confidence.locality = localityLine.confidence;
    }
  }

  return { fields, confidence };
}

/**
 * Calculate confidence score for a specific field by finding matching block
 */
export function calculateFieldConfidence(blocks: TextractBlock[], matchedText: string): number {
  // Find block that contains any part of the matched text
  const matchingBlock = blocks.find(
    (block) =>
      block.BlockType === 'LINE' &&
      block.Text &&
      (block.Text.includes(matchedText) || matchedText.includes(block.Text))
  );

  return matchingBlock?.Confidence || 0;
}

/**
 * Calculate overall confidence score with weighted fields
 * Critical fields (Omang number, names) have higher weight
 */
export function calculateOverallConfidence(fieldConfidence: Partial<FieldConfidence>): number {
  const weights = {
    surname: 1.5,
    firstNames: 1.5,
    omangNumber: 2.0, // Most critical
    dateOfBirth: 1.0,
    sex: 0.5,
    dateOfIssue: 0.5,
    dateOfExpiry: 0.5,
    plot: 0.5,
    locality: 0.5,
    district: 0.5,
  };

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const [field, confidence] of Object.entries(fieldConfidence)) {
    if (field === 'overall') continue;
    if (confidence && confidence > 0) {
      const weight = weights[field as keyof typeof weights] || 1.0;
      totalWeightedScore += confidence * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
}
