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
export declare function recordValidationFailure(errorType: 'FILE_TOO_LARGE' | 'INVALID_FILE_TYPE' | 'IMAGE_TOO_SMALL' | 'VALIDATION_ERROR'): Promise<void>;
//# sourceMappingURL=metrics.d.ts.map