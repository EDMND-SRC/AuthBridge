import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { logger } from '../utils/logger';
const REGION = process.env.AWS_REGION || 'af-south-1';
const ALERT_TOPIC_ARN = process.env.OCR_ALERT_TOPIC_ARN || '';
const FAILURE_THRESHOLD = parseInt(process.env.OCR_FAILURE_NOTIFICATION_THRESHOLD || '3', 10);
let snsClient = null;
function getClient() {
    if (!snsClient) {
        snsClient = new SNSClient({ region: REGION });
    }
    return snsClient;
}
/**
 * Send notification for repeated OCR failures
 * Triggered when a document fails OCR processing multiple times
 *
 * @param context - Failure context information
 */
export async function notifyOcrFailure(context) {
    // Only notify if we have a topic configured and threshold exceeded
    if (!ALERT_TOPIC_ARN || context.attemptCount < FAILURE_THRESHOLD) {
        logger.debug('OCR failure notification skipped', {
            reason: !ALERT_TOPIC_ARN ? 'No topic configured' : 'Below threshold',
            attemptCount: context.attemptCount,
            threshold: FAILURE_THRESHOLD,
        });
        return;
    }
    const subject = `[AuthBridge] OCR Processing Failed - ${context.documentType}`;
    const message = formatFailureMessage(context);
    try {
        const command = new PublishCommand({
            TopicArn: ALERT_TOPIC_ARN,
            Subject: subject,
            Message: message,
            MessageAttributes: {
                severity: {
                    DataType: 'String',
                    StringValue: context.attemptCount >= FAILURE_THRESHOLD ? 'HIGH' : 'MEDIUM',
                },
                service: {
                    DataType: 'String',
                    StringValue: 'verification',
                },
                errorType: {
                    DataType: 'String',
                    StringValue: context.errorType,
                },
            },
        });
        await getClient().send(command);
        logger.info('OCR failure notification sent', {
            verificationId: context.verificationId,
            documentId: context.documentId,
            attemptCount: context.attemptCount,
        });
    }
    catch (error) {
        // Log but don't fail - notifications are best-effort
        logger.error('Failed to send OCR failure notification', {
            error: error instanceof Error ? error.message : String(error),
            context,
        });
    }
}
/**
 * Format failure message for notification
 */
function formatFailureMessage(context) {
    return `
OCR Processing Failure Alert
=============================

Verification ID: ${context.verificationId}
Document ID: ${context.documentId}
Document Type: ${context.documentType}

Error Details:
- Type: ${context.errorType}
- Message: ${context.errorMessage}
- Attempt Count: ${context.attemptCount}
- Timestamp: ${context.timestamp}

Action Required:
- Check CloudWatch logs for detailed error information
- Review the document in the backoffice
- Consider manual processing if automated OCR continues to fail

Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=${REGION}#dashboards:name=AuthBridge-OCR
`.trim();
}
/**
 * Send notification for poor quality images requiring manual review
 *
 * @param verificationId - Verification case ID
 * @param documentId - Document ID
 * @param qualityScore - Image quality score (0-100)
 * @param issues - List of detected quality issues
 */
export async function notifyPoorQualityImage(verificationId, documentId, qualityScore, issues) {
    if (!ALERT_TOPIC_ARN) {
        return;
    }
    const subject = `[AuthBridge] Poor Quality Image Detected`;
    const message = `
Poor Quality Image Alert
========================

Verification ID: ${verificationId}
Document ID: ${documentId}
Quality Score: ${qualityScore}/100

Detected Issues:
${issues.map((i) => `- ${i}`).join('\n')}

This document has been flagged for manual review.
`.trim();
    try {
        const command = new PublishCommand({
            TopicArn: ALERT_TOPIC_ARN,
            Subject: subject,
            Message: message,
            MessageAttributes: {
                severity: {
                    DataType: 'String',
                    StringValue: 'LOW',
                },
                service: {
                    DataType: 'String',
                    StringValue: 'verification',
                },
                alertType: {
                    DataType: 'String',
                    StringValue: 'POOR_QUALITY_IMAGE',
                },
            },
        });
        await getClient().send(command);
    }
    catch (error) {
        logger.error('Failed to send poor quality notification', {
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
//# sourceMappingURL=notification.js.map