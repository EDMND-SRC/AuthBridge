import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoDBService } from '../services/dynamodb';
import { S3Service } from '../services/s3';
import { VerificationService } from '../services/verification';
import { logger } from '../utils/logger';
import { createErrorResponse } from '../utils/errors';

const TABLE_NAME = process.env.TABLE_NAME || 'AuthBridgeTable';
const BUCKET_NAME = process.env.BUCKET_NAME || 'authbridge-documents-staging';
const REGION = process.env.AWS_REGION || 'af-south-1';

const db = new DynamoDBService(TABLE_NAME, REGION);
const s3 = new S3Service(BUCKET_NAME, REGION);
const verificationService = new VerificationService(TABLE_NAME, REGION);

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const requestId = context.awsRequestId || event.requestContext.requestId;

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

    // Extract path parameters
    const verificationId = event.pathParameters?.verificationId;
    const documentId = event.pathParameters?.documentId;

    if (!verificationId || !documentId) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify(
          createErrorResponse('VALIDATION_ERROR', 'Verification ID and Document ID are required', requestId)
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
      });
      return {
        statusCode: 403,
        headers: corsHeaders(),
        body: JSON.stringify(
          createErrorResponse('FORBIDDEN', 'Access denied to this verification', requestId)
        ),
      };
    }

    // Get document
    const document = await db.getDocument(verificationId, documentId);

    if (!document) {
      logger.warn('Document not found', { requestId, verificationId, documentId });
      return {
        statusCode: 404,
        headers: corsHeaders(),
        body: JSON.stringify(
          createErrorResponse('NOT_FOUND', 'Document not found', requestId)
        ),
      };
    }

    // Generate new presigned URL
    const { url: presignedUrl, expiresAt: presignedUrlExpiresAt } =
      await s3.generatePresignedUrl(document.s3Key);

    logger.info('Refreshed presigned URL', {
      requestId,
      clientId,
      verificationId,
      documentId,
    });

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        documentId: document.documentId,
        verificationId: document.verificationId,
        presignedUrl,
        presignedUrlExpiresAt,
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      }),
    };
  } catch (error) {
    logger.error('Failed to refresh document URL', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify(
        createErrorResponse('INTERNAL_ERROR', 'Failed to refresh document URL', requestId)
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
