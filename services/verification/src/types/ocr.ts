/**
 * OCR-related types for Omang document processing
 */

export interface OmangExtractedFields {
  surname?: string;
  firstNames?: string;
  omangNumber?: string;
  dateOfBirth?: string;
  sex?: 'M' | 'F';
  dateOfIssue?: string;
  dateOfExpiry?: string;
  // Back side fields
  plot?: string;
  locality?: string;
  district?: string;
}

export interface FieldConfidence {
  surname?: number;
  firstNames?: number;
  omangNumber?: number;
  dateOfBirth?: number;
  sex?: number;
  dateOfIssue?: number;
  dateOfExpiry?: number;
  plot?: number;
  locality?: number;
  district?: number;
  overall: number;
}

export interface OcrResult {
  extractedFields: OmangExtractedFields;
  confidence: FieldConfidence;
  rawTextractResponse: any;
  extractionMethod: 'pattern' | 'position' | 'manual';
  processingTimeMs: number;
  requiresManualReview: boolean;
  missingFields: string[];
}

export interface TextractBlock {
  BlockType: string;
  Id: string;
  Text?: string;
  Confidence?: number;
  Geometry?: {
    BoundingBox?: {
      Width: number;
      Height: number;
      Left: number;
      Top: number;
    };
  };
}
