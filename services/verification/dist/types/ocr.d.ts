/**
 * OCR-related types for Omang and Driver's Licence document processing
 */
export interface OmangExtractedFields {
    surname?: string;
    forenames?: string;
    idNumber?: string;
    dateOfBirth?: string;
    placeOfBirth?: string;
    nationality?: string;
    sex?: 'M' | 'F';
    colourOfEyes?: string;
    dateOfExpiry?: string;
    placeOfApplication?: string;
    plot?: string;
    locality?: string;
    district?: string;
}
export interface DriversLicenceExtractedFields {
    surname?: string;
    forenames?: string;
    omangNumber?: string;
    gender?: 'M' | 'F';
    dateOfBirth?: string;
    licenceNumber?: string;
    licenceClass?: string;
    validityPeriodStart?: string;
    validityPeriodEnd?: string;
    firstIssue?: string;
    driverRestriction?: string;
    vehicleRestriction?: string;
    endorsement?: string;
}
export interface FieldConfidence {
    surname?: number;
    forenames?: number;
    idNumber?: number;
    dateOfBirth?: number;
    placeOfBirth?: number;
    nationality?: number;
    sex?: number;
    colourOfEyes?: number;
    dateOfExpiry?: number;
    placeOfApplication?: number;
    plot?: number;
    locality?: number;
    district?: number;
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
//# sourceMappingURL=ocr.d.ts.map