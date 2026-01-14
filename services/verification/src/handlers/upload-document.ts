import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoDBService } from '../services/dynamodb';
import { S3Service } from '../services/s3';
import { SqsService } from '../services/sqs';
import { DocumentService } from '../services/document';
import { VerificationService } from '../services/verification';
import {
  validateUploadDocumentRequest,
  parseBase64DataUri,
  validateFileSize,
  validateMimeType,
  getImageDimensions,
  validateImageDimensions,
  scanForViruses,
  checkImageQuality,
} from '../services/file-validation';
import { logger } from '../utils/logger';
import { createErrorResponse } from '../utils/errors';
import { MAX_FILE_SIZE } from '../types/document';
import { recordUploadMetrics, recordValidationFailure } from '../utils/metrics';

const TABLE_NAME = process.env.TABLE_NAME || 'AuthBridgeTable';
const BUCKET_NAME = process.env.BUCKET_NAME || 'authbridge-documents-staging';
const REGION = process.env.AWS_REGION || 'af-south-1';
const MAX_DOCUMENTS_PER_VERIFICATION = 20;

const db = new DynamoDBService(TABLE_NAME, REGION);
const s3 = new S3Service(BUCKET_NAME, REGION);
const sqs = new SqsService();
const documentService = new DocumentService(db, s3);
const verificationService = new VerificationService(TABLE_NAME, REGION);

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const requestId = context.awsRequestId || event.requestContext.requestId;
  const startTime = Date.now();
  let documentType = 'unknown';
  let fileSize = 0;

  try {
    // Extract clientId from authorizer context
    const clientId = event.requestContext.authorizer?.clientId as string;

    if (!clientId) {
      logger.warn('Missing clientId in authorizer context', { requestId });
      return {
        statusCode: 401,
        headers: corsHeaders(),
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
        headers: corsHeaders(),
        body: JSON.stringify(
          createErrorResponse('VALIDATION_ERROR', 'Verification ID is required', requestId)
        ),
      };
    }

    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify(
          createErrorResponse('VALIDATION_ERROR', 'Request body is required', requestId)
        ),
      };
    }

    const requestBody = JSON.parse(event.body);

    // Validate request schema
    const validation = validateUploadDocumentRequest(requestBody);
    if (!validation.success) {
      logger.warn('Validation failed', { requestId, details: validation.errors });
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify(
          createErrorResponse('VALIDATION_ERROR', 'Invalid request parameters', requestId, validation.errors)
        ),
      };
    }

    // Get verification and verify ownership
    const verification = await verificationService.getVerification(verificationId);

    if (!verification) {
      logger.warn('Verification not found', { requestId, verificationId });
      return {
        statusCode: 404,
        headers: corsHeaders(),
        body: JSON.stringify(
          createErrorResponse('NOT_FOUND', 'Verification not found', requestId)
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
      return {
        statusCode: 403,
        headers: corsHeaders(),
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
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify(
          createErrorResponse(
            'INVALID_STATE',
            `Cannot upload documents when verification is in '${verification.status}' status`,
            requestId
          )
        ),
      };
    }

    // Check document count limit
    const documentCount = await documentService.countDocuments(verificationId);
    if (documentCount >= MAX_DOCUMENTS_PER_VERIFICATION) {
      logger.warn('Document limit exceeded', { requestId, verificationId, documentCount });
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify(
          createErrorResponse(
            'DOCUMENT_LIMIT_EXCEEDED',
            `Maximum ${MAX_DOCUMENTS_PER_VERIFICATION} documents allowed per verification`,
            requestId
          )
        ),
      };
    }

    // Parse base64 data URI
    const parsed = parseBase64DataUri(validation.data.imageData);
    if (!parsed) {
      await recordValidationFailure('INVALID_FILE_TYPE');
      return {
        statusCode: 400,
        headers: corsHeaders(),
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

    documentType = validation.data.documentType;
    fileSize = parsed.size;

    // Validate mime type
    const mimeValidation = validateMimeType(parsed.mimeType);
    if (!mimeValidation.valid) {
      await recordValidationFailure('INVALID_FILE_TYPE');
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify(
          createErrorResponse('INVALID_FILE_TYPE', 'File type not supported', requestId, [
            { field: 'mimeType', message: mimeValidation.message },
          ])
        ),
      };
    }

    // Validate file size
    const sizeValidation = validateFileSize(parsed.size);
    if (!sizeValidation.valid) {
      await recordValidationFailure('FILE_TOO_LARGE');
      return {
        statusCode: 413,
        headers: corsHeaders(),
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
    const dimensions = getImageDimensions(parsed.data, parsed.mimeType);
    const dimensionValidation = validateImageDimensions(dimensions, parsed.mimeType);
    if (!dimensionValidation.valid) {
      await recordValidationFailure('IMAGE_TOO_SMALL');
      return {
        statusCode: 400,
        headers: corsHeaders(),
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
    const virusScan = scanForViruses(parsed.data);
    if (!virusScan.clean) {
      logger.warn('Virus/malware detected in upload', {
        requestId,
        verificationId,
        threat: virusScan.threat,
      });
      await recordValidationFailure('VALIDATION_ERROR');
      return {
        statusCode: 400,
        headers: corsHeaders(),
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
    const qualityCheck = checkImageQuality(parsed.data, dimensions, parsed.mimeType);
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
        headers: corsHeaders(),
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
      documentType: validation.data.documentType,
      fileSize: parsed.size,
      mimeType: parsed.mimeType,
    });

    // Upload document
    const response = await documentService.uploadDocument(
      verification,
      validation.data.documentType,
      parsed.data,
      parsed.mimeType,
      validation.data.metadata,
      requestId
    );

    // Update verification status to documents_uploading if first document
    if (verification.status === 'created') {
      await verificationService.updateStatus(verificationId, 'documents_uploading');
    }

    // Audit log
    logger.audit('document_uploaded', {
      requestId,
      clientId,
      verificationId,
      documentId: response.documentId,
      documentType: validation.data.documentType,
      fileSize: parsed.size,
    });

    // Send OCR processing message to SQS queue
    let ocrQueued = false;
    try {
      await sqs.sendOcrMessage({
        verificationId,
        documentId: response.documentId,
        s3Bucket: BUCKET_NAME,
        s3Key: response.s3Key,
        documentType: validation.data.documentType,
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
    await recordUploadMetrics(true, durationMs, fileSize, documentType);

    return {
      statusCode: 201,
      headers: corsHeaders(),
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
    await recordUploadMetrics(false, durationMs, fileSize, documentType);

    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify(
        createErrorResponse('INTERNAL_ERROR', 'Failed to upload document', requestId)
      ),
    };
  }
}

function corsHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };
}
