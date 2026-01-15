/**
 * OCR-related types for Omang and Driver's Licence document processing
 */

export interface OmangExtractedFields {
  // Front side fields
  surname?: string;
  forenames?: string;
  idNumber?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  // Back side fields
  nationality?: string;
  sex?: 'M' | 'F';
  colourOfEyes?: string;
  dateOfExpiry?: string;
  placeOfApplication?: string;
  // Address fields (optional, from back)
  plot?: string;
  locality?: string;
  district?: string;
}

export interface DriversLicenceExtractedFields {
  // Personal info
  surname?: string;
  forenames?: string;
  omangNumber?: string;  // ID: Omang field
  gender?: 'M' | 'F';
  dateOfBirth?: string;
  // Licence info
  licenceNumber?: string;
  licenceClass?: string;  // A, A1, B, C1, C, EB, EC1, EC
  validityPeriodStart?: string;
  validityPeriodEnd?: string;
  firstIssue?: string;
  // Restrictions
  driverRestriction?: string;  // 0=None, 1=Glasses, 2=Artificial limb
  vehicleRestriction?: string; // 0=None, 1=Auto, 2=Electric, 3=Disabled, 4=Bus>16000kg
  endorsement?: string;  // Yes/No
}

export interface FieldConfidence {
  // Omang front side
  surname?: number;
  forenames?: number;
  idNumber?: number;
  dateOfBirth?: number;
  placeOfBirth?: number;
  // Omang back side
  nationality?: number;
  sex?: number;
  colourOfEyes?: number;
  dateOfExpiry?: number;
  placeOfApplication?: number;
  // Address
  plot?: number;
  locality?: number;
  district?: number;
  // Driver's Licence fields
  omangNumber?: number;
  gender?: number;
  licenceNumber?: number;
  licenceClass?: number;
  validityPeriodStart?: number;
  validityPeriodEnd?: number;
  firstIssue?: number;
  driverRestriction?: number;
  vehicleRestriction?: number;
  endorsement?: number;
  overall: number;
}

// Union type for all document extracted fields
export type ExtractedFields = OmangExtractedFields | DriversLicenceExtractedFields;

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
