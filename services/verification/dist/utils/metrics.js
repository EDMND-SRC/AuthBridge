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
//# sourceMappingURL=metrics.js.map