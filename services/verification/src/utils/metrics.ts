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
  errorType: 'FILE_TOO_LARGE' | 'INVALID_FILE_TYPE' | 'IMAGE_TOO_SMALL' | 'VALIDATION_ERROR'
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
