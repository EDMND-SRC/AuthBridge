import { VerificationService } from '../services/verification';
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
        // Extract verification ID from path parameters
        const verificationId = event.pathParameters?.verificationId;
        if (!verificationId) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify(createErrorResponse('VALIDATION_ERROR', 'Verification ID is required', requestId)),
            };
        }
        // Get verification
        logger.info('Getting verification', {
            requestId,
            clientId,
            verificationId,
        });
        const verification = await verificationService.getVerification(verificationId);
        if (!verification) {
            logger.warn('Verification not found', { requestId, verificationId });
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify(createErrorResponse('NOT_FOUND', 'Verification not found', requestId)),
            };
        }
        // Verify client owns this verification
        if (verification.clientId !== clientId) {
            logger.warn('Client does not own verification', {
                requestId,
                clientId,
                verificationId,
                ownerClientId: verification.clientId,
            });
            return {
                statusCode: 403,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify(createErrorResponse('FORBIDDEN', 'Access denied to this verification', requestId)),
            };
        }
        // Return verification
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                verificationId: verification.verificationId,
                status: verification.status,
                documentType: verification.documentType,
                customerMetadata: verification.customerMetadata,
                createdAt: verification.createdAt,
                updatedAt: verification.updatedAt,
                submittedAt: verification.submittedAt,
                completedAt: verification.completedAt,
                expiresAt: verification.expiresAt,
                meta: {
                    requestId,
                    timestamp: new Date().toISOString(),
                },
            }),
        };
    }
    catch (error) {
        logger.error('Failed to get verification', {
            requestId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(createErrorResponse('INTERNAL_ERROR', 'Failed to get verification', requestId)),
        };
    }
}
//# sourceMappingURL=get-verification.js.map