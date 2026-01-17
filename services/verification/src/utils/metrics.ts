import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const NAMESPACE = 'AuthBridge/Verification';
const REGION = process.env.AWS_REGION || 'af-south-1';

let cloudWatchClient: CloudWatchClient | null = null;

function getClient(): CloudWatchClient {
  if (!cloudWatchClient) {
    cloudWatchClient = new CloudWatchClient({ region: REGION });
  }
  return cloudWatchClient;
}

export interface MetricDimension {
  Name: string;
  Value: string;
}

/**
 * Record a metric to CloudWatch
 */
export async function recordMetric(
  metricName: string,
  value: number,
  unit: 'Count' | 'Milliseconds' | 'Bytes' | 'Percent',
  dimensions?: MetricDimension[]
): Promise<void> {
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
  } catch (error) {
    // Log but don't fail - metrics are best-effort
    console.warn('Failed to record metric:', metricName, error);
  }
}

/**
 * Record document upload metrics
 */
export async function recordUploadMetrics(
  success: boolean,
  durationMs: number,
  fileSizeBytes: number,
  documentType: string
): Promise<void> {
  const dimensions: MetricDimension[] = [
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
export async function recordPresignedUrlMetrics(durationMs: number): Promise<void> {
  await recordMetric('PresignedUrlDuration', durationMs, 'Milliseconds');
}

/**
 * Record validation failure metrics
 */
export async function recordValidationFailure(
  errorType: 'FILE_TOO_LARGE' | 'INVALID_FILE_TYPE' | 'IMAGE_TOO_SMALL' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'FORBIDDEN' | 'INVALID_STATE' | 'DOCUMENT_LIMIT_EXCEEDED'
): Promise<void> {
  await recordMetric('ValidationFailure', 1, 'Count', [
    { Name: 'ErrorType', Value: errorType },
  ]);
}

/**
 * Record OCR processing metrics
 */
export async function recordOcrMetrics(
  success: boolean,
  durationMs: number,
  confidenceScore: number,
  documentType: string,
  requiresManualReview: boolean
): Promise<void> {
  const dimensions: MetricDimension[] = [
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
export async function recordTextractError(
  errorType: 'THROTTLING' | 'INVALID_S3_OBJECT' | 'UNSUPPORTED_DOCUMENT' | 'POOR_QUALITY' | 'UNKNOWN'
): Promise<void> {
  await recordMetric('TextractError', 1, 'Count', [
    { Name: 'ErrorType', Value: errorType },
  ]);
}

/**
 * Record poor quality image metrics
 */
export async function recordPoorQualityImage(
  documentType: string,
  qualityScore: number
): Promise<void> {
  const dimensions: MetricDimension[] = [
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
export async function recordOmangValidationMetrics(
  valid: boolean,
  documentType: string,
  errors: string[],
  warnings: string[]
): Promise<void> {
  const dimensions: MetricDimension[] = [
    { Name: 'DocumentType', Value: documentType },
  ];

  const promises: Promise<void>[] = [
    recordMetric('ValidationCount', 1, 'Count', dimensions),
    recordMetric(valid ? 'ValidationValid' : 'ValidationInvalid', 1, 'Count', dimensions),
  ];

  // Record specific error types
  if (errors.length > 0) {
    for (const error of errors) {
      if (error.includes('9 digits')) {
        promises.push(recordMetric('ValidationError/InvalidLength', 1, 'Count', dimensions));
      } else if (error.includes('numeric')) {
        promises.push(recordMetric('ValidationError/InvalidCharacters', 1, 'Count', dimensions));
      } else if (error.includes('expired')) {
        promises.push(recordMetric('ValidationError/Expired', 1, 'Count', dimensions));
      } else if (error.includes('10-year validity')) {
        promises.push(recordMetric('ValidationError/ExpiryMismatch', 1, 'Count', dimensions));
      } else if (error.includes('date')) {
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
export async function recordBiometricMetrics(
  success: boolean,
  durationMs: number,
  livenessScore: number,
  similarityScore: number,
  overallScore: number,
  passed: boolean,
  requiresManualReview: boolean
): Promise<void> {
  const promises: Promise<void>[] = [
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
export async function recordRekognitionError(
  errorType: 'THROTTLING' | 'NO_FACE_DETECTED' | 'MULTIPLE_FACES' | 'POOR_QUALITY' | 'UNKNOWN',
  operation: 'COMPARE_FACES' | 'DETECT_LIVENESS'
): Promise<void> {
  await recordMetric('RekognitionError', 1, 'Count', [
    { Name: 'ErrorType', Value: errorType },
    { Name: 'Operation', Value: operation },
  ]);
}

/**
 * Record face detection issues
 */
export async function recordFaceDetectionIssue(
  issueType: 'NO_FACE' | 'MULTIPLE_FACES' | 'FACE_TOO_SMALL' | 'POOR_QUALITY',
  imageType: 'SELFIE' | 'ID_PHOTO'
): Promise<void> {
  await recordMetric('FaceDetectionIssue', 1, 'Count', [
    { Name: 'IssueType', Value: issueType },
    { Name: 'ImageType', Value: imageType },
  ]);
}

/**
 * Record duplicate detection metrics
 */
export async function recordDuplicateDetectionMetrics(
  checked: boolean,
  duplicatesFound: number,
  sameClientCount: number,
  crossClientCount: number,
  riskLevel: string,
  riskScore: number,
  requiresManualReview: boolean,
  checkTimeMs: number
): Promise<void> {
  const promises: Promise<void>[] = [
    recordMetric('Duplicate/ChecksPerformed', 1, 'Count'),
    recordMetric('Duplicate/CheckTime', checkTimeMs, 'Milliseconds'),
  ];

  if (checked) {
    promises.push(recordMetric('Duplicate/CheckSuccess', 1, 'Count'));

    if (duplicatesFound > 0) {
      promises.push(
        recordMetric('Duplicate/DuplicatesFound', duplicatesFound, 'Count'),
        recordMetric('Duplicate/SameClientDuplicates', sameClientCount, 'Count'),
        recordMetric('Duplicate/CrossClientDuplicates', crossClientCount, 'Count'),
        recordMetric('Duplicate/RiskScore', riskScore, 'Count')
      );

      // Record risk level
      promises.push(
        recordMetric(`Duplicate/RiskLevel/${riskLevel}`, 1, 'Count')
      );

      // Record high-risk cases
      if (riskLevel === 'high' || riskLevel === 'critical') {
        promises.push(recordMetric('Duplicate/HighRiskCases', 1, 'Count'));
      }

      // Record manual review triggers
      if (requiresManualReview) {
        promises.push(recordMetric('Duplicate/ManualReviewTriggered', 1, 'Count'));
      }
    }
  } else {
    promises.push(recordMetric('Duplicate/CheckFailure', 1, 'Count'));
  }

  await Promise.all(promises);
}

/**
 * Record duplicate check error metrics
 */
export async function recordDuplicateCheckError(
  errorType: 'DYNAMODB_ERROR' | 'ENCRYPTION_ERROR' | 'UNKNOWN'
): Promise<void> {
  await recordMetric('Duplicate/CheckError', 1, 'Count', [
    { Name: 'ErrorType', Value: errorType },
  ]);
}
