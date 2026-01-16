import { OmangExtractedFields, DriversLicenceExtractedFields, FieldConfidence, TextractBlock } from '../types/ocr';
export interface ExtractionResult {
    fields: OmangExtractedFields;
    confidence: Partial<FieldConfidence>;
}
export interface DriversLicenceExtractionResult {
    fields: DriversLicenceExtractedFields;
    confidence: Partial<FieldConfidence>;
}
/**
 * Extract fields from Omang front side using pattern matching
 */
export declare function extractOmangFrontFields(blocks: TextractBlock[]): ExtractionResult;
/**
 * Extract fields from Omang back side
 */
export declare function extractOmangBackFields(blocks: TextractBlock[]): ExtractionResult;
/**
 * Calculate confidence score for a specific field by finding matching block
 */
export declare function calculateFieldConfidence(blocks: TextractBlock[], matchedText: string): number;
/**
 * Calculate overall confidence score with weighted fields
 * Critical fields (ID number, names) have higher weight
 */
export declare function calculateOverallConfidence(fieldConfidence: Partial<FieldConfidence>): number;
/**
 * Extract fields from Botswana Driver's Licence
 * Based on actual Botswana Driving Licence layout
 */
export declare function extractDriversLicenceFields(blocks: TextractBlock[]): DriversLicenceExtractionResult;
//# sourceMappingURL=field-extractors.d.ts.map