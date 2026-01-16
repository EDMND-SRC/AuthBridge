/**
 * Country-based document extraction types
 * Supports regional expansion with country-specific document formats
 */
import { TextractBlock } from '../types/ocr';
/**
 * Supported countries (ISO 3166-1 alpha-2)
 */
export type SupportedCountry = 'BW';
/**
 * Document types supported across countries
 */
export type DocumentType = 'national_id' | 'drivers_licence' | 'passport';
/**
 * Base extracted fields common to all documents
 */
export interface BaseExtractedFields {
    surname?: string;
    forenames?: string;
    dateOfBirth?: string;
    sex?: 'M' | 'F';
    nationality?: string;
}
/**
 * National ID extracted fields (country-specific extensions)
 */
export interface NationalIdFields extends BaseExtractedFields {
    idNumber?: string;
    dateOfExpiry?: string;
    dateOfIssue?: string;
    placeOfBirth?: string;
    placeOfIssue?: string;
    [key: string]: string | undefined;
}
/**
 * Driver's Licence extracted fields
 */
export interface DriversLicenceFields extends BaseExtractedFields {
    licenceNumber?: string;
    nationalIdNumber?: string;
    licenceClass?: string;
    validityStart?: string;
    validityEnd?: string;
    dateOfIssue?: string;
    restrictions?: string[];
    endorsements?: string[];
    [key: string]: string | string[] | undefined;
}
/**
 * Passport extracted fields (ICAO 9303 standard)
 */
export interface PassportFields extends BaseExtractedFields {
    passportNumber?: string;
    nationalIdNumber?: string;
    type?: string;
    countryCode?: string;
    dateOfIssue?: string;
    dateOfExpiry?: string;
    placeOfBirth?: string;
    issuingAuthority?: string;
    mrz?: {
        line1?: string;
        line2?: string;
        valid?: boolean;
        checkDigitsValid?: boolean;
    };
}
/**
 * Union type for all document fields
 */
export type ExtractedDocumentFields = NationalIdFields | DriversLicenceFields | PassportFields;
/**
 * Field confidence scores
 */
export interface FieldConfidenceMap {
    [fieldName: string]: number;
}
/**
 * Extraction result from any document extractor
 */
export interface ExtractionResult<T extends ExtractedDocumentFields = ExtractedDocumentFields> {
    fields: T;
    confidence: FieldConfidenceMap;
    overallConfidence: number;
    documentType: DocumentType;
    country: SupportedCountry;
    requiresManualReview: boolean;
    missingRequiredFields: string[];
    warnings: string[];
}
/**
 * Document extractor interface - implemented by each country/document type
 */
export interface DocumentExtractor<T extends ExtractedDocumentFields = ExtractedDocumentFields> {
    /** Country this extractor handles */
    readonly country: SupportedCountry;
    /** Document type this extractor handles */
    readonly documentType: DocumentType;
    /** Required fields for this document type */
    readonly requiredFields: string[];
    /** Extract fields from Textract blocks */
    extract(blocks: TextractBlock[]): ExtractionResult<T>;
    /** Validate extracted fields */
    validate(fields: T): {
        valid: boolean;
        errors: string[];
    };
}
/**
 * Registry key for extractor lookup
 */
export declare function getExtractorKey(country: SupportedCountry, documentType: DocumentType): string;
//# sourceMappingURL=types.d.ts.map