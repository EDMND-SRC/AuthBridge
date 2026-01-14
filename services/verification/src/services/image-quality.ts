import { TextractBlock } from '../types/ocr';

/**
 * Image quality assessment thresholds
 * Configurable via environment variables
 */
const MIN_TEXT_BLOCKS = parseInt(process.env.OCR_MIN_TEXT_BLOCKS || '3', 10);
const MIN_AVG_CONFIDENCE = parseInt(process.env.OCR_MIN_AVG_CONFIDENCE || '50', 10);
const POOR_QUALITY_THRESHOLD = parseInt(process.env.OCR_POOR_QUALITY_THRESHOLD || '30', 10);

export interface ImageQualityResult {
  isReadable: boolean;
  qualityScore: number;
  issues: ImageQualityIssue[];
  recommendation: string;
}

export type ImageQualityIssue =
  | 'NO_TEXT_DETECTED'
  | 'VERY_LOW_CONFIDENCE'
  | 'INSUFFICIENT_TEXT'
  | 'BLURRY_IMAGE'
  | 'POOR_LIGHTING'
  | 'PARTIAL_DOCUMENT';

/**
 * Assess image quality based on Textract response
 * Detects poor quality images that may need re-capture
 *
 * @param blocks - Textract blocks from OCR response
 * @returns Quality assessment result
 */
export function assessImageQuality(blocks: TextractBlock[]): ImageQualityResult {
  const issues: ImageQualityIssue[] = [];
  let qualityScore = 100;

  // Filter to LINE blocks (most reliable for quality assessment)
  const lineBlocks = blocks.filter((b) => b.BlockType === 'LINE' && b.Text);

  // Check 1: No text detected at all
  if (lineBlocks.length === 0) {
    return {
      isReadable: false,
      qualityScore: 0,
      issues: ['NO_TEXT_DETECTED'],
      recommendation: 'No text could be detected. Please ensure the document is clearly visible and well-lit.',
    };
  }

  // Check 2: Insufficient text blocks (partial document or very blurry)
  if (lineBlocks.length < MIN_TEXT_BLOCKS) {
    issues.push('INSUFFICIENT_TEXT');
    qualityScore -= 30;
  }

  // Check 3: Calculate average confidence
  const avgConfidence =
    lineBlocks.reduce((sum, b) => sum + (b.Confidence || 0), 0) / lineBlocks.length;

  if (avgConfidence < POOR_QUALITY_THRESHOLD) {
    issues.push('VERY_LOW_CONFIDENCE');
    qualityScore -= 50;
  } else if (avgConfidence < MIN_AVG_CONFIDENCE) {
    issues.push('BLURRY_IMAGE');
    qualityScore -= 25;
  }

  // Check 4: Look for very low confidence blocks (indicates partial issues)
  const veryLowConfidenceBlocks = lineBlocks.filter((b) => (b.Confidence || 0) < 30);
  if (veryLowConfidenceBlocks.length > lineBlocks.length * 0.5) {
    issues.push('POOR_LIGHTING');
    qualityScore -= 20;
  }

  // Check 5: Check for expected Omang fields (partial document detection)
  const fullText = lineBlocks.map((b) => b.Text).join(' ').toUpperCase();
  const hasOmangIndicators =
    fullText.includes('OMANG') ||
    fullText.includes('SURNAME') ||
    fullText.includes('BOTSWANA') ||
    fullText.includes('REPUBLIC');

  if (!hasOmangIndicators && lineBlocks.length < 5) {
    issues.push('PARTIAL_DOCUMENT');
    qualityScore -= 15;
  }

  // Normalize score
  qualityScore = Math.max(0, Math.min(100, qualityScore));

  // Determine if readable
  const isReadable = qualityScore >= MIN_AVG_CONFIDENCE && !issues.includes('NO_TEXT_DETECTED');

  // Generate recommendation
  const recommendation = generateRecommendation(issues);

  return {
    isReadable,
    qualityScore,
    issues,
    recommendation,
  };
}

/**
 * Generate user-friendly recommendation based on detected issues
 */
function generateRecommendation(issues: ImageQualityIssue[]): string {
  if (issues.length === 0) {
    return 'Image quality is acceptable.';
  }

  const recommendations: string[] = [];

  if (issues.includes('NO_TEXT_DETECTED')) {
    recommendations.push('No text detected - ensure the document is facing the camera');
  }
  if (issues.includes('VERY_LOW_CONFIDENCE')) {
    recommendations.push('Image is too blurry - hold the camera steady and ensure good focus');
  }
  if (issues.includes('BLURRY_IMAGE')) {
    recommendations.push('Image appears blurry - try capturing again with better focus');
  }
  if (issues.includes('POOR_LIGHTING')) {
    recommendations.push('Lighting is poor - move to a well-lit area or use flash');
  }
  if (issues.includes('INSUFFICIENT_TEXT')) {
    recommendations.push('Not enough text visible - ensure the entire document is in frame');
  }
  if (issues.includes('PARTIAL_DOCUMENT')) {
    recommendations.push('Document may be partially visible - capture the full document');
  }

  return recommendations.join('. ') + '.';
}

/**
 * Check if OCR result indicates poor quality that should trigger re-capture
 */
export function shouldRequestRecapture(
  qualityResult: ImageQualityResult,
  extractedFieldCount: number,
  requiredFieldCount: number
): boolean {
  // Always request recapture if not readable
  if (!qualityResult.isReadable) {
    return true;
  }

  // Request recapture if quality is very poor
  if (qualityResult.qualityScore < POOR_QUALITY_THRESHOLD) {
    return true;
  }

  // Request recapture if less than 50% of required fields extracted
  if (extractedFieldCount < requiredFieldCount * 0.5) {
    return true;
  }

  return false;
}
