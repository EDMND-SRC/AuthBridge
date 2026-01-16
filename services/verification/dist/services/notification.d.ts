export interface OcrFailureContext {
    verificationId: string;
    documentId: string;
    documentType: string;
    errorType: string;
    errorMessage: string;
    attemptCount: number;
    timestamp: string;
}
/**
 * Send notification for repeated OCR failures
 * Triggered when a document fails OCR processing multiple times
 *
 * @param context - Failure context information
 */
export declare function notifyOcrFailure(context: OcrFailureContext): Promise<void>;
/**
 * Send notification for poor quality images requiring manual review
 *
 * @param verificationId - Verification case ID
 * @param documentId - Document ID
 * @param qualityScore - Image quality score (0-100)
 * @param issues - List of detected quality issues
 */
export declare function notifyPoorQualityImage(verificationId: string, documentId: string, qualityScore: number, issues: string[]): Promise<void>;
//# sourceMappingURL=notification.d.ts.map