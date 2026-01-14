import { VerificationService } from '../services/verification';
import { validateCreateVerificationRequest } from '../services/validation';
import { logger } from '../utils/logger';
import { createErrorResponse } from '../utils/errors';
const TABLE_NAME = process.env.TABLE_NAME || 'AuthBridgeTable';
const REGION = process.env.AWS_REGION || 'af-south-1';
const verificationService = new VerificationService(TABLE_NAME, REGION);
export async function handler(event, context) {
    const requestId = event.requestContext.requestId;
    try {
        // Extract clientId from authorizer context
        const clientId = event.requestContext.authorizer?.clientId;
        if (!clientId) {
            logger.warn('Missing clientId in authorizer context', { requestId });
            return {
                statusCode: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify(createErrorResponse('UNAUTHORIZED', 'Missing client authentication', requestId)),
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
                body: JSON.stringify(createErrorResponse('VALIDATION_ERROR', 'Request body is required', requestId)),
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
                body: JSON.stringify(createErrorResponse('VALIDATION_ERROR', 'Invalid request parameters', requestId, details)),
            };
        }
        // Create verification
        logger.info('Creating verification', {
            requestId,
            clientId,
            documentType: validation.data.documentType,
        });
        const verification = await verificationService.createVerification(validation.data, clientId);
        // Generate session token (placeholder - will be implemented in future story)
        const sessionToken = `session_${verification.verificationId}`;
        const sdkUrl = `https://sdk.authbridge.io?token=${sessionToken}`;
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
    }
    catch (error) {
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
            body: JSON.stringify(createErrorResponse('INTERNAL_ERROR', 'Failed to create verification', requestId)),
        };
    }
}
//# sourceMappingURL=create-verification.js.map