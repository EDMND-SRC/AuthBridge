import { TextractService } from './textract';
import { OcrResult, TextractBlock } from '../types/ocr';
import {
  extractOmangFrontFields,
  extractOmangBackFields,
  calculateOverallConfidence,
} from '../utils/field-extractors';

// Configurable via environment variables for production tuning
const CONFIDENCE_THRESHOLD_HIGH = parseInt(process.env.OCR_CONFIDENCE_HIGH || '95', 10);
const CONFIDENCE_THRESHOLD_LOW = parseInt(process.env.OCR_CONFIDENCE_LOW || '80', 10);
const CRITICAL_FIELD_THRESHOLD = parseInt(process.env.OCR_CRITICAL_FIELD_THRESHOLD || '70', 10);

// Required fields based on actual Omang card layout
const REQUIRED_FRONT_FIELDS = [
  'surname',
  'forenames',
  'idNumber',
  'dateOfBirth',
];

const REQUIRED_BACK_FIELDS = [
  'nationality',
  'sex',
  'dateOfExpiry',
];

/**
 * Omang-specific OCR service
 * Handles extraction of fields from Omang ID cards using AWS Textract
 */
export class OmangOcrService {
  private textractService: TextractService;

  constructor() {
    this.textractService = new TextractService();
  }

  /**
   * Extract fields from Omang front side
   */
  async extractOmangFront(bucket: string, key: string): Promise<OcrResult> {
    const startTime = Date.now();

    // Call Textract
    const textractResponse = await this.textractService.detectDocumentTextWithRetry(bucket, key);

    // Extract fields using pattern matching
    const blocks = (textractResponse.Blocks || []) as TextractBlock[];
    const { fields, confidence } = extractOmangFrontFields(blocks);

    // Calculate overall confidence
    const overallConfidence = calculateOverallConfidence(confidence);

    // Identify missing fields
    const missingFields = REQUIRED_FRONT_FIELDS.filter((field) => !fields[field as keyof typeof fields]);

    // Determine if manual review is required
    const requiresManualReview =
      overallConfidence < CONFIDENCE_THRESHOLD_LOW ||
      missingFields.length > 0 ||
      (confidence.idNumber !== undefined && confidence.idNumber < CRITICAL_FIELD_THRESHOLD);

    const processingTimeMs = Date.now() - startTime;

    return {
      extractedFields: fields,
      confidence: {
        ...confidence,
        overall: overallConfidence,
      },
      rawTextractResponse: textractResponse,
      extractionMethod: 'pattern',
      processingTimeMs,
      requiresManualReview,
      missingFields,
    };
  }

  /**
   * Extract fields from Omang back side (address)
   */
  async extractOmangBack(bucket: string, key: string): Promise<OcrResult> {
    const startTime = Date.now();

    // Call Textract
    const textractResponse = await this.textractService.detectDocumentTextWithRetry(bucket, key);

    // Extract fields using pattern matching
    const blocks = (textractResponse.Blocks || []) as TextractBlock[];
    const { fields, confidence } = extractOmangBackFields(blocks);

    // Calculate overall confidence
    const overallConfidence = calculateOverallConfidence(confidence);

    // Identify missing fields
    const missingFields = REQUIRED_BACK_FIELDS.filter((field) => !fields[field as keyof typeof fields]);

    // Determine if manual review is required
    const requiresManualReview = overallConfidence < CONFIDENCE_THRESHOLD_LOW || missingFields.length > 0;

    const processingTimeMs = Date.now() - startTime;

    return {
      extractedFields: fields,
      confidence: {
        ...confidence,
        overall: overallConfidence,
      },
      rawTextractResponse: textractResponse,
      extractionMethod: 'pattern',
      processingTimeMs,
      requiresManualReview,
      missingFields,
    };
  }
}
