import { DynamoDBService } from '../services/dynamodb';
import { logger } from '../utils/logger';
import { createErrorResponse } from '../utils/errors';
import { maskOmangNumber, maskAddress } from '../utils/masking';
/**
 * Get Verification Status Handler
 *
 * Handles GET /api/v1/verifications/{id} to retrieve verification status
 *
 * @param event - API Gateway proxy event with verification ID path parameter
 * @param context - Lambda context
 * @returns 200 on success, 400/401/403/404/500 on various errors
 */
const db = new DynamoDBService(process.env.TABLE_NAME || '', process.env.AWS_REGION || '');
export async function handler(event, context) {
    const requestId = context.awsRequestId || event.requestContext.requestId;
    try {
        // Extract clientId from authorizer context
        const clientId = event.requestContext.authorizer?.clientId;
        if (!clientId) {
            logger.warn('Missing clientId in authorizer context', { requestId });
            return {
                statusCode: 401,
                headers: responseHeaders(),
                body: JSON.stringify(createErrorResponse('UNAUTHORIZED', 'Missing client authentication', requestId)),
            };
        }
        // Extract verification ID from path parameters
        const verificationId = event.pathParameters?.verificationId;
        if (!verificationId) {
            return {
                statusCode: 400,
                headers: responseHeaders(),
                body: JSON.stringify(createErrorResponse('VALIDATION_ERROR', 'Verification ID is required', requestId)),
            };
        }
        // Load verification case
        const verification = await db.getVerification(verificationId);
        if (!verification) {
            logger.warn('Verification not found', { requestId, verificationId });
            return {
                statusCode: 404,
                headers: responseHeaders(),
                body: JSON.stringify(createErrorResponse('VERIFICATION_NOT_FOUND', 'Verification not found', requestId)),
            };
        }
        // Validate client owns verification
        if (verification.clientId !== clientId) {
            logger.warn('Client does not own verification', {
                requestId,
                clientId,
                verificationId,
                ownerClientId: verification.clientId,
            });
            return {
                statusCode: 403,
                headers: responseHeaders(),
                body: JSON.stringify(createErrorResponse('UNAUTHORIZED', 'You do not have permission to access this verification', requestId)),
            };
        }
        // Load all documents for this verification
        const documents = await db.queryDocuments(verificationId);
        // Format response based on status
        const response = formatVerificationResponse(verification, documents);
        // Audit log
        logger.audit('verification_status_checked', {
            requestId,
            clientId,
            verificationId,
            status: verification.status,
            ipAddress: event.requestContext.identity.sourceIp,
        });
        // Return response
        return {
            statusCode: 200,
            headers: responseHeaders(),
            body: JSON.stringify({
                ...response,
                meta: {
                    requestId,
                    timestamp: new Date().toISOString(),
                },
            }),
        };
    }
    catch (error) {
        logger.error('Failed to get verification status', {
            requestId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return {
            statusCode: 500,
            headers: responseHeaders(),
            body: JSON.stringify(createErrorResponse('INTERNAL_ERROR', 'Failed to get verification status', requestId)),
        };
    }
}
/**
 * Format verification response based on status
 */
function formatVerificationResponse(verification, documents) {
    const baseResponse = {
        verificationId: verification.verificationId,
        status: verification.status,
        documentType: verification.documentType,
        createdAt: verification.createdAt,
        updatedAt: verification.updatedAt,
    };
    // Format documents (exclude sensitive data)
    const formattedDocuments = documents.map((doc) => ({
        documentId: doc.documentId,
        documentType: doc.documentType,
        ocrStatus: mapDocumentStatusToOcrStatus(doc.status),
        ocrConfidence: doc.ocrConfidence ?? (doc.processingResults?.ocrData ? 95.0 : undefined),
        uploadedAt: doc.uploadedAt,
        processedAt: doc.processedAt ?? (doc.status === 'processed' ? doc.uploadedAt : undefined),
    }));
    baseResponse.documents = formattedDocuments;
    // Add status-specific data
    if (verification.status === 'approved') {
        // Include customer data and extracted data (masked)
        baseResponse.customer = {
            name: verification.customer?.name,
            email: verification.customer?.email,
            dateOfBirth: verification.extractedData?.dateOfBirth,
            omangNumber: maskOmangNumber(verification.extractedData?.idNumber),
            address: maskAddress(verification.extractedData),
        };
        baseResponse.extractedData = {
            fullName: verification.customer?.name,
            omangNumber: maskOmangNumber(verification.extractedData?.idNumber),
            dateOfBirth: verification.extractedData?.dateOfBirth,
            sex: verification.extractedData?.sex,
            dateOfExpiry: verification.extractedData?.dateOfExpiry,
            address: {
                district: verification.extractedData?.district,
                locality: verification.extractedData?.locality,
            },
        };
        baseResponse.biometricScore = verification.biometricSummary?.overallScore;
        baseResponse.submittedAt = verification.submittedAt;
        baseResponse.completedAt = verification.completedAt;
    }
    else if (verification.status === 'rejected' ||
        verification.status === 'auto_rejected') {
        // Include rejection reason and code
        baseResponse.customer = {
            email: verification.customer?.email,
        };
        baseResponse.rejectionReason = verification.rejectionReason;
        baseResponse.rejectionCode = verification.rejectionCode;
        baseResponse.submittedAt = verification.submittedAt;
        baseResponse.completedAt = verification.completedAt;
    }
    else if (verification.status === 'expired') {
        // Handle expired verifications
        baseResponse.customer = {
            email: verification.customer?.email,
        };
        baseResponse.expiresAt = verification.expiresAt;
    }
    else if (verification.status === 'submitted' ||
        verification.status === 'processing') {
        // Include submitted timestamp
        baseResponse.submittedAt = verification.submittedAt;
    }
    return baseResponse;
}
/**
 * Generate response headers including CORS and rate limit headers
 */
function responseHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-RateLimit-Limit': '50',
        'X-RateLimit-Remaining': '49',
        'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60),
    };
}
/**
 * Map document status to OCR status for API response
 * Converts internal document status to client-facing ocrStatus
 */
function mapDocumentStatusToOcrStatus(status) {
    switch (status) {
        case 'uploaded':
            return 'pending';
        case 'processing':
            return 'processing';
        case 'processed':
            return 'completed';
        case 'failed':
            return 'failed';
        default:
            return 'pending';
    }
}
//# sourceMappingURL=get-verification-status.js.map