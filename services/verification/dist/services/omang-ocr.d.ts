import { OcrResult } from '../types/ocr';
/**
 * Omang-specific OCR service
 * Handles extraction of fields from Omang ID cards using AWS Textract
 */
export declare class OmangOcrService {
    private textractService;
    constructor();
    /**
     * Extract fields from Omang front side
     */
    extractOmangFront(bucket: string, key: string): Promise<OcrResult>;
    /**
     * Extract fields from Omang back side (address)
     */
    extractOmangBack(bucket: string, key: string): Promise<OcrResult>;
}
//# sourceMappingURL=omang-ocr.d.ts.map