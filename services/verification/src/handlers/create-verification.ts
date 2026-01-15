import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { VerificationService } from '../services/verification';
import { IdempotencyService, IdempotencyConflictError } from '../services/idempotency';
import { validateCreateVerificationRequest } from '../services/validation';
import { logger } from '../utils/logger';
import { createErrorResponse } from '../utils/errors';

const TABLE_NAME = process.env.TABLE_NAME || 'AuthBridgeTable';
const REGION = process.env.AWS_REGION || 'af-south-1';
const SDK_BASE_URL = process.env.SDK_BASE_URL || 'https://sdk.authbridge.io';

const verificationService = new VerificationService(TABLE_NAME, REGION);
const idempotencyService = new IdempotencyService(TABLE_NAME, REGION);

/**
 * Generate a session token for SDK access
 * TODO: TD-001 - Replace with real JWT token signed by auth service
 * Current implementation uses a placeholder format for MVP
 */
function generateSessionToken(verificationId: string): string {
  // Placeholder: In production, this should call auth service to generate JWT
  // with proper claims: { sub: verificationId, exp: expiresAt, iss: 'authbridge' }
  return `session_${verificationId}`;
}

/**
 * Build SDK URL with session token
 */
function buildSdkUrl(sessionToken: string): string {
  return `${SDK_BASE_URL}?token=${sessionToken}`;
}

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  // Prefer context.awsRequestId for consistency across Lambda invocations
  const requestId = context.awsRequestId || event.requestContext.requestId;

  try {
    // Extract clientId from authorizer context
    const clientId = event.requestContext.authorizer?.clientId as string;

    if (!clientId) {
      logger.warn('Missing clientId in authorizer context', { requestId });
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(
          createErrorResponse(
            'UNAUTHORIZED',
            'Missing client authentication',
            requestId
          )
        ),
      };
    }

    // Parse and validate request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(
          createErrorResponse(
            'VALIDATION_ERROR',
            'Request body is required',
            requestId
          )
        ),
      };
    }

    const requestBody = JSON.parse(event.body);
    const validation = validateCreateVerificationRequest(requestBody);

    if (!validation.success) {
      const details = validation.errors.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      logger.warn('Validation failed', { requestId, details });

      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(
          createErrorResponse(
            'VALIDATION_ERROR',
            'Invalid request parameters',
            requestId,
            details
          )
        ),
      };
    }

    // Check idempotency key if provided
    const idempotencyKey = validation.data.idempotencyKey;
    if (idempotencyKey) {
      const existingVerificationId = await idempotencyService.checkIdempotencyKey(
        clientId,
        idempotencyKey
      );

      if (existingVerificationId) {
        logger.info('Returning existing verification (idempotency hit)', {
          requestId,
          clientId,
          idempotencyKey,
          verificationId: existingVerificationId,
        });

        const existingVerification = await verificationService.getVerification(existingVerificationId);
        if (existingVerification) {
          const sessionToken = generateSessionToken(existingVerification.verificationId);
          const sdkUrl = buildSdkUrl(sessionToken);

          return {
            statusCode: 200, // Return 200 for idempotent request
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              verificationId: existingVerification.verificationId,
              status: existingVerification.status,
              sessionToken,
              sdkUrl,
              expiresAt: existingVerification.expiresAt,
              meta: {
                requestId,
                timestamp: existingVerification.createdAt,
                idempotent: true,
              },
            }),
          };
        }
      }
    }

    // Create verification
    logger.info('Creating verification', {
      requestId,
      clientId,
      documentType: validation.data.documentType,
      idempotencyKey: idempotencyKey || undefined,
    });

    let verification;
    try {
      verification = await verificationService.createVerification(
        validation.data,
        clientId
      );

      // Store idempotency key if provided
      if (idempotencyKey) {
        try {
          await idempotencyService.storeIdempotencyKey(
            clientId,
            idempotencyKey,
            verification.verificationId
          );
        } catch (idemError) {
          if (idemError instanceof IdempotencyConflictError) {
            // Race condition: another request stored the key first
            // Re-check and return existing verification
            const existingId = await idempotencyService.checkIdempotencyKey(clientId, idempotencyKey);
            if (existingId) {
              const existingVerification = await verificationService.getVerification(existingId);
              if (existingVerification) {
                const sessionToken = generateSessionToken(existingVerification.verificationId);
                const sdkUrl = buildSdkUrl(sessionToken);
                return {
                  statusCode: 200,
                  headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                  },
                  body: JSON.stringify({
                    verificationId: existingVerification.verificationId,
                    status: existingVerification.status,
                    sessionToken,
                    sdkUrl,
                    expiresAt: existingVerification.expiresAt,
                    meta: { requestId, timestamp: existingVerification.createdAt, idempotent: true },
                  }),
                };
              }
            }
          }
          // Log but don't fail - idempotency is best-effort
          logger.warn('Failed to store idempotency key', { requestId, idempotencyKey, error: (idemError as Error).message });
        }
      }
    } catch (error) {
      throw error;
    }

    const sessionToken = generateSessionToken(verification.verificationId);
    const sdkUrl = buildSdkUrl(sessionToken);

    // Audit log
    logger.audit('verification_created', {
      requestId,
      clientId,
      verificationId: verification.verificationId,
      documentType: verification.documentType,
    });

    // Return response
    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        verificationId: verification.verificationId,
        status: verification.status,
        sessionToken,
        sdkUrl,
        expiresAt: verification.expiresAt,
        meta: {
          requestId,
          timestamp: verification.createdAt,
        },
      }),
    };
  } catch (error) {
    logger.error('Failed to create verification', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(
        createErrorResponse(
          'INTERNAL_ERROR',
          'Failed to create verification',
          requestId
        )
      ),
    };
  }
}
