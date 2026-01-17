export interface MetricDimension {
    Name: string;
    Value: string;
}
/**
 * Record a metric to CloudWatch
 */
export declare function recordMetric(metricName: string, value: number, unit: 'Count' | 'Milliseconds' | 'Bytes' | 'Percent', dimensions?: MetricDimension[]): Promise<void>;
/**
 * Record document upload metrics
 */
export declare function recordUploadMetrics(success: boolean, durationMs: number, fileSizeBytes: number, documentType: string): Promise<void>;
/**
 * Record presigned URL generation metrics
 */
export declare function recordPresignedUrlMetrics(durationMs: number): Promise<void>;
/**
 * Record validation failure metrics
 */
export declare function recordValidationFailure(errorType: 'FILE_TOO_LARGE' | 'INVALID_FILE_TYPE' | 'IMAGE_TOO_SMALL' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'FORBIDDEN' | 'INVALID_STATE' | 'DOCUMENT_LIMIT_EXCEEDED'): Promise<void>;
/**
 * Record OCR processing metrics
 */
export declare function recordOcrMetrics(success: boolean, durationMs: number, confidenceScore: number, documentType: string, requiresManualReview: boolean): Promise<void>;
/**
 * Record Textract API error metrics
 */
export declare function recordTextractError(errorType: 'THROTTLING' | 'INVALID_S3_OBJECT' | 'UNSUPPORTED_DOCUMENT' | 'POOR_QUALITY' | 'UNKNOWN'): Promise<void>;
/**
 * Record poor quality image metrics
 */
export declare function recordPoorQualityImage(documentType: string, qualityScore: number): Promise<void>;
/**
 * Record Omang validation metrics
 */
export declare function recordOmangValidationMetrics(valid: boolean, documentType: string, errors: string[], warnings: string[]): Promise<void>;
/**
 * Record biometric processing metrics
 */
export declare function recordBiometricMetrics(success: boolean, durationMs: number, livenessScore: number, similarityScore: number, overallScore: number, passed: boolean, requiresManualReview: boolean): Promise<void>;
/**
 * Record Rekognition API error metrics
 */
export declare function recordRekognitionError(errorType: 'THROTTLING' | 'NO_FACE_DETECTED' | 'MULTIPLE_FACES' | 'POOR_QUALITY' | 'UNKNOWN', operation: 'COMPARE_FACES' | 'DETECT_LIVENESS'): Promise<void>;
/**
 * Record face detection issues
 */
export declare function recordFaceDetectionIssue(issueType: 'NO_FACE' | 'MULTIPLE_FACES' | 'FACE_TOO_SMALL' | 'POOR_QUALITY', imageType: 'SELFIE' | 'ID_PHOTO'): Promise<void>;
/**
 * Record duplicate detection metrics
 */
export declare function recordDuplicateDetectionMetrics(checked: boolean, duplicatesFound: number, sameClientCount: number, crossClientCount: number, riskLevel: string, riskScore: number, requiresManualReview: boolean, checkTimeMs: number): Promise<void>;
/**
 * Record duplicate check error metrics
 */
export declare function recordDuplicateCheckError(errorType: 'DYNAMODB_ERROR' | 'ENCRYPTION_ERROR' | 'UNKNOWN'): Promise<void>;
//# sourceMappingURL=metrics.d.ts.map