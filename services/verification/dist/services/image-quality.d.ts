import { TextractBlock } from '../types/ocr';
export interface ImageQualityResult {
    isReadable: boolean;
    qualityScore: number;
    issues: ImageQualityIssue[];
    recommendation: string;
}
export type ImageQualityIssue = 'NO_TEXT_DETECTED' | 'VERY_LOW_CONFIDENCE' | 'INSUFFICIENT_TEXT' | 'BLURRY_IMAGE' | 'POOR_LIGHTING' | 'PARTIAL_DOCUMENT';
/**
 * Assess image quality based on Textract response
 * Detects poor quality images that may need re-capture
 *
 * @param blocks - Textract blocks from OCR response
 * @returns Quality assessment result
 */
export declare function assessImageQuality(blocks: TextractBlock[]): ImageQualityResult;
/**
 * Check if OCR result indicates poor quality that should trigger re-capture
 */
export declare function shouldRequestRecapture(qualityResult: ImageQualityResult, extractedFieldCount: number, requiredFieldCount: number): boolean;
//# sourceMappingURL=image-quality.d.ts.map