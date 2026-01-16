import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
const NAMESPACE = 'AuthBridge/Verification';
const REGION = process.env.AWS_REGION || 'af-south-1';
let cloudWatchClient = null;
function getClient() {
    if (!cloudWatchClient) {
        cloudWatchClient = new CloudWatchClient({ region: REGION });
    }
    return cloudWatchClient;
}
/**
 * Record a metric to CloudWatch
 */
export async function recordMetric(metricName, value, unit, dimensions) {
    try {
        const command = new PutMetricDataCommand({
            Namespace: NAMESPACE,
            MetricData: [
                {
                    MetricName: metricName,
                    Value: value,
                    Unit: unit,
                    Timestamp: new Date(),
                    Dimensions: dimensions,
                },
            ],
        });
        await getClient().send(command);
    }
    catch (error) {
        // Log but don't fail - metrics are best-effort
        console.warn('Failed to record metric:', metricName, error);
    }
}
/**
 * Record document upload metrics
 */
export async function recordUploadMetrics(success, durationMs, fileSizeBytes, documentType) {
    const dimensions = [
        { Name: 'DocumentType', Value: documentType },
    ];
    await Promise.all([
        recordMetric('UploadCount', 1, 'Count', dimensions),
        recordMetric(success ? 'UploadSuccess' : 'UploadFailure', 1, 'Count', dimensions),
        recordMetric('UploadDuration', durationMs, 'Milliseconds', dimensions),
        recordMetric('UploadFileSize', fileSizeBytes, 'Bytes', dimensions),
    ]);
}
/**
 * Record presigned URL generation metrics
 */
export async function recordPresignedUrlMetrics(durationMs) {
    await recordMetric('PresignedUrlDuration', durationMs, 'Milliseconds');
}
/**
 * Record validation failure metrics
 */
export async function recordValidationFailure(errorType) {
    await recordMetric('ValidationFailure', 1, 'Count', [
        { Name: 'ErrorType', Value: errorType },
    ]);
}
/**
 * Record OCR processing metrics
 */
export async function recordOcrMetrics(success, durationMs, confidenceScore, documentType, requiresManualReview) {
    const dimensions = [
        { Name: 'DocumentType', Value: documentType },
    ];
    await Promise.all([
        recordMetric('OcrProcessingCount', 1, 'Count', dimensions),
        recordMetric(success ? 'OcrSuccess' : 'OcrFailure', 1, 'Count', dimensions),
        recordMetric('OcrProcessingTime', durationMs, 'Milliseconds', dimensions),
        recordMetric('OcrConfidenceScore', confidenceScore, 'Percent', dimensions),
        requiresManualReview
            ? recordMetric('OcrManualReviewRequired', 1, 'Count', dimensions)
            : Promise.resolve(),
    ]);
}
/**
 * Record Textract API error metrics
 */
export async function recordTextractError(errorType) {
    await recordMetric('TextractError', 1, 'Count', [
        { Name: 'ErrorType', Value: errorType },
    ]);
}
/**
 * Record poor quality image metrics
 */
export async function recordPoorQualityImage(documentType, qualityScore) {
    const dimensions = [
        { Name: 'DocumentType', Value: documentType },
    ];
    await Promise.all([
        recordMetric('PoorQualityImage', 1, 'Count', dimensions),
        recordMetric('ImageQualityScore', qualityScore, 'Percent', dimensions),
    ]);
}
/**
 * Record Omang validation metrics
 */
export async function recordOmangValidationMetrics(valid, documentType, errors, warnings) {
    const dimensions = [
        { Name: 'DocumentType', Value: documentType },
    ];
    const promises = [
        recordMetric('ValidationCount', 1, 'Count', dimensions),
        recordMetric(valid ? 'ValidationValid' : 'ValidationInvalid', 1, 'Count', dimensions),
    ];
    // Record specific error types
    if (errors.length > 0) {
        for (const error of errors) {
            if (error.includes('9 digits')) {
                promises.push(recordMetric('ValidationError/InvalidLength', 1, 'Count', dimensions));
            }
            else if (error.includes('numeric')) {
                promises.push(recordMetric('ValidationError/InvalidCharacters', 1, 'Count', dimensions));
            }
            else if (error.includes('expired')) {
                promises.push(recordMetric('ValidationError/Expired', 1, 'Count', dimensions));
            }
            else if (error.includes('10-year validity')) {
                promises.push(recordMetric('ValidationError/ExpiryMismatch', 1, 'Count', dimensions));
            }
            else if (error.includes('date')) {
                promises.push(recordMetric('ValidationError/InvalidDates', 1, 'Count', dimensions));
            }
        }
    }
    // Record warnings
    if (warnings.length > 0) {
        for (const warning of warnings) {
            if (warning.includes('expires soon')) {
                promises.push(recordMetric('ValidationWarning/ExpiringSoon', 1, 'Count', dimensions));
            }
        }
    }
    await Promise.all(promises);
}
/**
 * Record biometric processing metrics
 */
export async function recordBiometricMetrics(success, durationMs, livenessScore, similarityScore, overallScore, passed, requiresManualReview) {
    const promises = [
        recordMetric('BiometricProcessingCount', 1, 'Count'),
        recordMetric(success ? 'BiometricSuccess' : 'BiometricFailure', 1, 'Count'),
        recordMetric('BiometricProcessingTime', durationMs, 'Milliseconds'),
        recordMetric('BiometricLivenessScore', livenessScore, 'Percent'),
        recordMetric('BiometricSimilarityScore', similarityScore, 'Percent'),
        recordMetric('BiometricOverallScore', overallScore, 'Percent'),
        recordMetric(passed ? 'BiometricPassed' : 'BiometricFailed', 1, 'Count'),
    ];
    if (requiresManualReview) {
        promises.push(recordMetric('BiometricManualReviewRequired', 1, 'Count'));
    }
    await Promise.all(promises);
}
/**
 * Record Rekognition API error metrics
 */
export async function recordRekognitionError(errorType, operation) {
    await recordMetric('RekognitionError', 1, 'Count', [
        { Name: 'ErrorType', Value: errorType },
        { Name: 'Operation', Value: operation },
    ]);
}
/**
 * Record face detection issues
 */
export async function recordFaceDetectionIssue(issueType, imageType) {
    await recordMetric('FaceDetectionIssue', 1, 'Count', [
        { Name: 'IssueType', Value: issueType },
        { Name: 'ImageType', Value: imageType },
    ]);
}
/**
 * Record duplicate detection metrics
 */
export async function recordDuplicateDetectionMetrics(checked, duplicatesFound, sameClientCount, crossClientCount, riskLevel, riskScore, requiresManualReview, checkTimeMs) {
    const promises = [
        recordMetric('Duplicate/ChecksPerformed', 1, 'Count'),
        recordMetric('Duplicate/CheckTime', checkTimeMs, 'Milliseconds'),
    ];
    if (checked) {
        promises.push(recordMetric('Duplicate/CheckSuccess', 1, 'Count'));
        if (duplicatesFound > 0) {
            promises.push(recordMetric('Duplicate/DuplicatesFound', duplicatesFound, 'Count'), recordMetric('Duplicate/SameClientDuplicates', sameClientCount, 'Count'), recordMetric('Duplicate/CrossClientDuplicates', crossClientCount, 'Count'), recordMetric('Duplicate/RiskScore', riskScore, 'Count'));
            // Record risk level
            promises.push(recordMetric(`Duplicate/RiskLevel/${riskLevel}`, 1, 'Count'));
            // Record high-risk cases
            if (riskLevel === 'high' || riskLevel === 'critical') {
                promises.push(recordMetric('Duplicate/HighRiskCases', 1, 'Count'));
            }
            // Record manual review triggers
            if (requiresManualReview) {
                promises.push(recordMetric('Duplicate/ManualReviewTriggered', 1, 'Count'));
            }
        }
    }
    else {
        promises.push(recordMetric('Duplicate/CheckFailure', 1, 'Count'));
    }
    await Promise.all(promises);
}
/**
 * Record duplicate check error metrics
 */
export async function recordDuplicateCheckError(errorType) {
    await recordMetric('Duplicate/CheckError', 1, 'Count', [
        { Name: 'ErrorType', Value: errorType },
    ]);
}
//# sourceMappingURL=metrics.js.map