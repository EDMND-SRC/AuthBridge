import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { SignJWT } from 'jose';
import { VerificationService } from '../services/verification';
import { IdempotencyService, IdempotencyConflictError } from '../services/idempotency';
import { validateCreateVerificationRequest } from '../services/validation';
import { logger } from '../utils/logger';
import { createErrorResponse } from '../utils/errors';

const TABLE_NAME = process.env.TABLE_NAME || 'AuthBridgeTable';
const REGION = process.env.AWS_REGION || 'af-south-1';
const SDK_BASE_URL = process.env.SDK_BASE_URL || 'https://sdk.authbridge.io';
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_ISSUER = process.env.JWT_ISSUER || 'authbridge';
const SESSION_TOKEN_EXPIRY_HOURS = parseFloat(process.env.SESSION_TOKEN_EXPIRY_HOURS || '0.5'); // 30 minutes default

const verificationService = new VerificationService(TABLE_NAME, REGION);
const idempotencyService = new IdempotencyService(TABLE_NAME, REGION);

// Cache the secret key for JWT signing
let secretKey: Uint8Array | null = null;

function getSecretKey(): Uint8Array {
  if (!secretKey) {
    if (!JWT_SECRET) {
      const stage = process.env.STAGE || process.env.AWS_LAMBDA_FUNCTION_NAME?.includes('prod') ? 'production' : 'development';
      if (stage === 'production') {
        throw new Error('JWT_SECRET environment variable is required in production');
      }
      logger.warn('JWT_SECRET not configured, using fallback for development only');
      secretKey = new TextEncoder().encode('dev-secret-do-not-use-in-production');
    } else {
      secretKey = new TextEncoder().encode(JWT_SECRET);
    }
  }
  return secretKey;
}

/**
 * Generate a secure JWT session token for SDK access
 * Token includes verification ID, expiry, and issuer claims
 */
async function generateSessionToken(verificationId: string, clientId: string): Promise<string> {
  const expiresAt = new Date();
  // Convert hours to milliseconds for precise calculation (0.5 hours = 30 minutes)
  const expiryMs = SESSION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;
  expiresAt.setTime(expiresAt.getTime() + expiryMs);

  const token = await new SignJWT({
    sub: verificationId,
    clientId,
    type: 'sdk_session',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setExpirationTime(expiresAt)
    .sign(getSecretKey());

  return token;
}

/**
 * Build SDK URL with session token
 */
function buildSdkUrl(sessionToken: string): string {
  return `${SDK_BASE_URL}?token=${sessionToken}`;
}

/**
 * Build standard response headers including rate limit information
 * Rate limits are enforced at API Gateway level (50 RPS per client)
 */
function buildResponseHeaders(event: APIGatewayProxyEvent): Record<string, string> {
  // Rate limit values from API Gateway (configured in serverless.yml)
  const rateLimit = 50; // requests per second
  const windowResetTime = Math.floor(Date.now() / 1000) + 1; // Next second

  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'X-RateLimit-Limit': String(rateLimit),
    'X-RateLimit-Remaining': String(rateLimit - 1), // Approximate, actual tracking at API Gateway
    'X-RateLimit-Reset': String(windowResetTime),
  };
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
        headers: buildResponseHeaders(event),
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
        headers: buildResponseHeaders(event),
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
        headers: buildResponseHeaders(event),
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
          const sessionToken = await generateSessionToken(existingVerification.verificationId, clientId);
          const sdkUrl = buildSdkUrl(sessionToken);

          return {
            statusCode: 200, // Return 200 for idempotent request
            headers: buildResponseHeaders(event),
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
      hasRedirectUrl: !!validation.data.redirectUrl,
      hasWebhookUrl: !!validation.data.webhookUrl,
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
                const sessionToken = await generateSessionToken(existingVerification.verificationId, clientId);
                const sdkUrl = buildSdkUrl(sessionToken);
                return {
                  statusCode: 200,
                  headers: buildResponseHeaders(event),
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
      // Re-throw with context for upstream error handling
      logger.error('Verification creation failed', { requestId, error: (error as Error).message });
      throw error;
    }

    const sessionToken = await generateSessionToken(verification.verificationId, clientId);
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
      headers: buildResponseHeaders(event),
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
        'X-RateLimit-Limit': '50',
        'X-RateLimit-Remaining': '49',
        'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 1),
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
