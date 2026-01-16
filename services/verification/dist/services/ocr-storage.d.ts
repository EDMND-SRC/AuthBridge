import { OcrResult } from '../types/ocr';
import { ImageQualityResult } from './image-quality';
import { OmangValidationResult } from '../types/validation';
/**
 * Service for storing OCR results in DynamoDB
 * Handles persistence of extracted data from Textract processing
 */
export declare class OcrStorageService {
    private dynamoDBService;
    constructor();
    /**
     * Store OCR results in document entity
     * Updates the document record with extracted fields, confidence scores, and raw Textract response
     *
     * @param verificationId - The verification case ID
     * @param documentId - The document ID within the verification
     * @param documentType - Type of document (omang_front, omang_back, selfie, etc.)
     * @param ocrResult - The OCR extraction result from Textract processing
     * @param qualityResult - Optional image quality assessment result
     * @param validationResult - Optional Omang validation result
     * @throws Error if DynamoDB update fails
     */
    storeOcrResults(verificationId: string, documentId: string, documentType: string, ocrResult: OcrResult, qualityResult?: ImageQualityResult | null, validationResult?: OmangValidationResult | null): Promise<void>;
    /**
     * Update verification case with extracted customer data
     * Populates the customerData field on the verification META record
     *
     * @param verificationId - The verification case ID
     * @param ocrResult - The OCR extraction result containing extracted fields
     * @throws Error if DynamoDB update fails
     */
    updateVerificationWithExtractedData(verificationId: string, ocrResult: OcrResult): Promise<void>;
    /**
     * Convert DD/MM/YYYY to ISO 8601 (YYYY-MM-DD)
     */
    private convertToISO8601;
}
//# sourceMappingURL=ocr-storage.d.ts.map