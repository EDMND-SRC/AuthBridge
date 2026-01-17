import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoDBService } from '../services/dynamodb';
import { S3Service } from '../services/s3';
import { SqsService } from '../services/sqs';
import { DocumentService } from '../services/document';
import { VerificationService } from '../services/verification';
import { AuditService } from '../services/audit';
import {
  validateUploadDocumentRequest,
  parseBase64DataUri,
  parseMultipartFormData,
  validateFileSize,
  validateMimeType,
  getImageDimensions,
  validateImageDimensions,
  scanForViruses,
  checkImageQuality,
} from '../services/file-validation';
import { logger } from '../utils/logger';
import { createErrorResponse } from '../utils/errors';
import {
  MAX_FILE_SIZE,
  type DocumentMetadata,
} from '../types/document';
import { recordUploadMetrics, recordValidationFailure } from '../utils/metrics';

/**
 * Upload Document Handler
 *
 * Handles document uploads for verification cases via POST /api/v1/verifications/{verificationId}/documents
 *
 * Supports two upload formats:
 * - JSON with base64 data URI: Content-Type: application/json
 * - Multipart form data: Content-Type: multipart/form-data
 *
 * @param event - API Gateway proxy event with verificationId path parameter
 * @param context - Lambda context
 * @returns 201 on success, 400/401/403/404/413/500 on various errors
 */

const MAX_DOCUMENTS_PER_VERIFICATION = 20;

// Services are instantiated at module load time for Lambda cold start optimization
// Environment variables are validated at runtime in the handler
const db = new DynamoDBService(process.env.TABLE_NAME || '', process.env.AWS_REGION || '');
const s3 = new S3Service(process.env.BUCKET_NAME || '', process.env.AWS_REGION || '');
const sqs = new SqsService();
const documentService = new DocumentService(db, s3);
const verificationService = new VerificationService(process.env.TABLE_NAME || '', process.env.AWS_REGION || '');
const auditService = new AuditService();

// Export for testing
export function resetServices(): void {
  // No-op - services are singletons for Lambda optimization
}

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const requestId = context.awsRequestId || event.requestContext.requestId;
  const startTime = Date.now();
  let metricsDocumentType = 'unknown';
  let metricsFileSize = 0;

  try {
    // Extract clientId from authorizer context
    const clientId = event.requestContext.authorizer?.clientId as string;

    if (!clientId) {
      logger.warn('Missing clientId in authorizer context', { requestId });
      return {
        statusCode: 401,
        headers: responseHeaders(),
        body: JSON.stringify(
          createErrorResponse('UNAUTHORIZED', 'Missing client authentication', requestId)
        ),
      };
    }

    // Extract verification ID from path parameters
    const verificationId = event.pathParameters?.verificationId;

    if (!verificationId) {
      return {
        statusCode: 400,
        headers: responseHeaders(),
        body: JSON.stringify(
          createErrorResponse('VALIDATION_ERROR', 'Verification ID is required', requestId)
        ),
      };
    }

    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: responseHeaders(),
        body: JSON.stringify(
          createErrorResponse('VALIDATION_ERROR', 'Request body is required', requestId)
        ),
      };
    }

    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    let documentType: string;
    let imageBuffer: Buffer;
    let mimeType: string;
    let metadata: DocumentMetadata | undefined = undefined;

    // Check if multipart/form-data or JSON
    if (contentType.includes('multipart/form-data')) {
      // Validate boundary exists before parsing
      if (!contentType.includes('boundary=')) {
        return {
          statusCode: 400,
          headers: responseHeaders(),
          body: JSON.stringify(
            createErrorResponse(
              'VALIDATION_ERROR',
              'Missing boundary in multipart/form-data Content-Type header',
              requestId
            )
          ),
        };
      }

      // Parse multipart form data
      const parsed = parseMultipartFormData(event.body, contentType);

      if (!parsed) {
        return {
          statusCode: 400,
          headers: responseHeaders(),
          body: JSON.stringify(
            createErrorResponse(
              'VALIDATION_ERROR',
              'Invalid multipart form data',
              requestId,
              [{ field: 'body', message: 'Failed to parse multipart form data. Ensure boundary is set and format is correct.' }]
            )
          ),
        };
      }

      documentType = parsed.documentType;
      imageBuffer = parsed.imageBuffer;
      mimeType = parsed.mimeType;
      metadata = parsed.metadata || {};

      // Validate document type
      const validation = validateUploadDocumentRequest({
        documentType,
        imageData: 'multipart', // Placeholder for validation
        metadata,
      });

      if (!validation.success) {
        logger.warn('Validation failed', { requestId, details: validation.errors });
        return {
          statusCode: 400,
          headers: responseHeaders(),
          body: JSON.stringify(
            createErrorResponse('VALIDATION_ERROR', 'Invalid request parameters', requestId, validation.errors)
          ),
        };
      }
    } else {
      // Parse JSON with base64 image
      const requestBody = JSON.parse(event.body);

      // Validate request schema
      const validation = validateUploadDocumentRequest(requestBody);
      if (!validation.success) {
        logger.warn('Validation failed', { requestId, details: validation.errors });
        return {
          statusCode: 400,
          headers: responseHeaders(),
          body: JSON.stringify(
            createErrorResponse('VALIDATION_ERROR', 'Invalid request parameters', requestId, validation.errors)
          ),
        };
      }

      documentType = validation.data.documentType;
      metadata = validation.data.metadata;

      // Parse base64 data URI
      const parsed = parseBase64DataUri(validation.data.imageData);
      if (!parsed) {
        await recordValidationFailure('INVALID_FILE_TYPE');
        return {
          statusCode: 400,
          headers: responseHeaders(),
          body: JSON.stringify(
            createErrorResponse(
              'INVALID_FILE_TYPE',
              'Invalid image data format. Expected base64 data URI',
              requestId,
              [{ field: 'imageData', message: 'Must be a valid base64 data URI (data:image/jpeg;base64,...)' }]
            )
          ),
        };
      }

      imageBuffer = parsed.data;
      mimeType = parsed.mimeType;
    }

    const fileSize = imageBuffer.length;
    metricsDocumentType = documentType;
    metricsFileSize = fileSize;

    // Get verification and verify ownership
    const verification = await verificationService.getVerification(verificationId);

    if (!verification) {
      logger.warn('Verification not found', { requestId, verificationId });
      await recordValidationFailure('NOT_FOUND');
      return {
        statusCode: 404,
        headers: responseHeaders(),
        body: JSON.stringify(
          createErrorResponse('NOT_FOUND', 'Verification not found', requestId)
        ),
      };
    }

    // Validate verificationId matches path parameter (defense in depth)
    if (verification.verificationId !== verificationId) {
      logger.error('Verification ID mismatch', {
        requestId,
        pathVerificationId: verificationId,
        dbVerificationId: verification.verificationId,
      });
      return {
        statusCode: 500,
        headers: responseHeaders(),
        body: JSON.stringify(
          createErrorResponse('INTERNAL_ERROR', 'Verification data inconsistency', requestId)
        ),
      };
    }

    if (verification.clientId !== clientId) {
      logger.warn('Client does not own verification', {
        requestId,
        clientId,
        verificationId,
        ownerClientId: verification.clientId,
      });
      await recordValidationFailure('FORBIDDEN');
      return {
        statusCode: 403,
        headers: responseHeaders(),
        body: JSON.stringify(
          createErrorResponse('FORBIDDEN', 'Access denied to this verification', requestId)
        ),
      };
    }

    // Check verification status allows uploads
    const allowedStatuses = ['created', 'documents_uploading'];
    if (!allowedStatuses.includes(verification.status)) {
      logger.warn('Verification status does not allow uploads', {
        requestId,
        verificationId,
        status: verification.status,
      });
      await recordValidationFailure('INVALID_STATE');
      return {
        statusCode: 400,
        headers: responseHeaders(),
        body: JSON.stringify(
          createErrorResponse(
            'INVALID_STATE',
            `Cannot upload documents when verification is in '${verification.status}' status`,
            requestId
          )
        ),
      };
    }

    // Check document count limit with race condition protection
    // Note: This is a best-effort check. For strict enforcement, use DynamoDB conditional writes
    const documentCount = await documentService.countDocuments(verificationId);
    if (documentCount >= MAX_DOCUMENTS_PER_VERIFICATION) {
      logger.warn('Document limit exceeded', { requestId, verificationId, documentCount });
      await recordValidationFailure('DOCUMENT_LIMIT_EXCEEDED');
      return {
        statusCode: 400,
        headers: responseHeaders(),
        body: JSON.stringify(
          createErrorResponse(
            'DOCUMENT_LIMIT_EXCEEDED',
            `Maximum ${MAX_DOCUMENTS_PER_VERIFICATION} documents allowed per verification`,
            requestId
          )
        ),
      };
    }

    // Validate mime type
    const mimeValidation = validateMimeType(mimeType);
    if (!mimeValidation.valid) {
      await recordValidationFailure('INVALID_FILE_TYPE');
      return {
        statusCode: 400,
        headers: responseHeaders(),
        body: JSON.stringify(
          createErrorResponse('INVALID_FILE_TYPE', 'File type not supported', requestId, [
            { field: 'mimeType', message: mimeValidation.message },
          ])
        ),
      };
    }

    // Validate file size
    const sizeValidation = validateFileSize(fileSize);
    if (!sizeValidation.valid) {
      await recordValidationFailure('FILE_TOO_LARGE');
      return {
        statusCode: 413,
        headers: responseHeaders(),
        body: JSON.stringify(
          createErrorResponse(
            'FILE_TOO_LARGE',
            `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
            requestId,
            [{ field: 'imageData', message: sizeValidation.message }]
          )
        ),
      };
    }

    // Validate image dimensions (skip for PDFs)
    const dimensions = getImageDimensions(imageBuffer, mimeType);
    const dimensionValidation = validateImageDimensions(dimensions, mimeType);
    if (!dimensionValidation.valid) {
      await recordValidationFailure('IMAGE_TOO_SMALL');
      return {
        statusCode: 400,
        headers: responseHeaders(),
        body: JSON.stringify(
          createErrorResponse(
            'IMAGE_TOO_SMALL',
            'Image dimensions do not meet minimum requirements',
            requestId,
            [{ field: 'imageData', message: dimensionValidation.message }]
          )
        ),
      };
    }

    // Scan for viruses/malware
    const virusScan = scanForViruses(imageBuffer);
    if (!virusScan.clean) {
      logger.warn('Virus/malware detected in upload', {
        requestId,
        verificationId,
        threat: virusScan.threat,
      });
      await recordValidationFailure('VALIDATION_ERROR');
      return {
        statusCode: 400,
        headers: responseHeaders(),
        body: JSON.stringify(
          createErrorResponse(
            'MALWARE_DETECTED',
            'File failed security scan',
            requestId,
            [{ field: 'imageData', message: virusScan.threat }]
          )
        ),
      };
    }

    // Check image quality (blur, brightness, contrast)
    const qualityCheck = checkImageQuality(imageBuffer, dimensions, mimeType);
    if (!qualityCheck.acceptable) {
      logger.warn('Image quality check failed', {
        requestId,
        verificationId,
        reason: qualityCheck.reason,
        metrics: qualityCheck.metrics,
      });
      await recordValidationFailure('VALIDATION_ERROR');
      return {
        statusCode: 400,
        headers: responseHeaders(),
        body: JSON.stringify(
          createErrorResponse(
            'IMAGE_QUALITY_POOR',
            'Image quality does not meet requirements',
            requestId,
            [{ field: 'imageData', message: qualityCheck.reason }]
          )
        ),
      };
    }

    logger.info('Uploading document', {
      requestId,
      clientId,
      verificationId,
      documentType,
      fileSize,
      mimeType,
    });

    // Upload document
    const response = await documentService.uploadDocument(
      verification,
      documentType as any,
      imageBuffer,
      mimeType,
      metadata,
      requestId
    );

    // Update verification status to documents_uploading if first document
    if (verification.status === 'created') {
      await verificationService.updateStatus(verificationId, 'documents_uploading');
    }

    // Audit log using AuditService (writes to DynamoDB for queryable audit trail)
    const ipAddress = event.requestContext.identity?.sourceIp || 'unknown';
    await auditService.logDocumentUploaded(
      response.documentId,
      verificationId,
      clientId,
      ipAddress
    );

    logger.info('Document uploaded', {
      requestId,
      clientId,
      verificationId,
      documentId: response.documentId,
      documentType,
      fileSize,
    });

    // Send OCR processing message to SQS queue
    let ocrQueued = false;
    try {
      await sqs.sendOcrMessage({
        verificationId,
        documentId: response.documentId,
        s3Bucket: process.env.BUCKET_NAME!,
        s3Key: response.s3Key,
        documentType,
      });
      ocrQueued = true;

      logger.info('OCR message sent to queue', {
        requestId,
        verificationId,
        documentId: response.documentId,
      });
    } catch (error) {
      // Log error and mark document as pending OCR for retry
      logger.error('Failed to send OCR message to queue', {
        requestId,
        verificationId,
        documentId: response.documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Store pending OCR job in DynamoDB for retry mechanism
      try {
        await db.updateItem({
          Key: {
            PK: `CASE#${verificationId}`,
            SK: `DOC#${response.documentId}`,
          },
          UpdateExpression: 'SET #ocrPending = :pending, #ocrError = :error',
          ExpressionAttributeNames: {
            '#ocrPending': 'ocrPending',
            '#ocrError': 'ocrError',
          },
          ExpressionAttributeValues: {
            ':pending': true,
            ':error': error instanceof Error ? error.message : 'Unknown error',
          },
        });
      } catch (dbError) {
        logger.error('Failed to mark document as pending OCR', {
          requestId,
          verificationId,
          documentId: response.documentId,
          error: dbError instanceof Error ? dbError.message : 'Unknown error',
        });
      }
    }

    // Record success metrics
    const durationMs = Date.now() - startTime;
    await recordUploadMetrics(true, durationMs, fileSize, metricsDocumentType);

    return {
      statusCode: 201,
      headers: responseHeaders(),
      body: JSON.stringify({
        ...response,
        ocrQueued,
      }),
    };
  } catch (error) {
    logger.error('Failed to upload document', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Record failure metrics
    const durationMs = Date.now() - startTime;
    await recordUploadMetrics(false, durationMs, metricsFileSize, metricsDocumentType);

    return {
      statusCode: 500,
      headers: responseHeaders(),
      body: JSON.stringify(
        createErrorResponse('INTERNAL_ERROR', 'Failed to upload document', requestId)
      ),
    };
  }
}

/**
 * Generate response headers including CORS and rate limit headers
 */
function responseHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'X-RateLimit-Limit': '50',
    'X-RateLimit-Remaining': '49',
    'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60),
  };
}
