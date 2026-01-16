import { VerificationService } from '../services/verification';
import { logger } from '../utils/logger';
import { createErrorResponse } from '../utils/errors';
const TABLE_NAME = process.env.TABLE_NAME || 'AuthBridgeTable';
const REGION = process.env.AWS_REGION || 'af-south-1';
const verificationService = new VerificationService(TABLE_NAME, REGION);
/**
 * Mask Omang number for list view (show only last 4 digits)
 * CRITICAL: Never expose full Omang numbers in list views
 */
function maskOmangNumber(omangNumber) {
    if (!omangNumber)
        return null;
    return `***${omangNumber.slice(-4)}`;
}
/**
 * List cases (verifications) with filtering and pagination
 *
 * Query Parameters:
 * - status: Filter by status (pending, in-review, approved, rejected)
 * - dateFrom: Filter by start date (ISO 8601)
 * - dateTo: Filter by end date (ISO 8601)
 * - documentType: Filter by document type (omang, passport, drivers_licence)
 * - assignee: Filter by assignee ID
 * - search: Search by name, Omang (last 4), or email
 * - limit: Number of results per page (default: 20, max: 100)
 * - cursor: Pagination cursor for next page
 */
export async function handler(event, context) {
    const requestId = context.awsRequestId || event.requestContext.requestId;
    try {
        const startTime = Date.now();
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
        // Parse query parameters
        const queryParams = event.queryStringParameters || {};
        const status = queryParams.status;
        const dateFrom = queryParams.dateFrom;
        const dateTo = queryParams.dateTo;
        const documentType = queryParams.documentType;
        const assignee = queryParams.assignee;
        const search = queryParams.search;
        const limit = Math.min(parseInt(queryParams.limit || '20', 10), 100);
        const cursor = queryParams.cursor;
        logger.info('Listing cases', {
            requestId,
            clientId,
            filters: { status, dateFrom, dateTo, documentType, assignee, search },
            pagination: { limit, cursor: cursor ? 'provided' : 'none' },
        });
        const queryStartTime = Date.now();
        // Get verifications from database
        let verifications = await verificationService.listVerificationsByClient(clientId, status);
        const queryTimeMs = Date.now() - queryStartTime;
        const filterStartTime = Date.now();
        // Apply additional filters
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            verifications = verifications.filter(v => new Date(v.createdAt) >= fromDate);
        }
        if (dateTo) {
            const toDate = new Date(dateTo);
            verifications = verifications.filter(v => new Date(v.createdAt) <= toDate);
        }
        if (documentType) {
            verifications = verifications.filter(v => v.documentType === documentType);
        }
        if (assignee) {
            verifications = verifications.filter(v => v.assignee === assignee);
        }
        // Apply search filter (name, Omang last 4, email)
        if (search) {
            const searchLower = search.toLowerCase();
            verifications = verifications.filter(v => {
                const customerName = v.customerMetadata?.name?.toLowerCase() || '';
                const customerEmail = v.customerMetadata?.email?.toLowerCase() || '';
                const omangLast4 = v.extractedData?.idNumber?.slice(-4) || '';
                return (customerName.includes(searchLower) ||
                    customerEmail.includes(searchLower) ||
                    omangLast4.includes(searchLower));
            });
        }
        // Sort by createdAt descending (newest first)
        verifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const filterTimeMs = Date.now() - filterStartTime;
        // Apply pagination
        let startIndex = 0;
        if (cursor) {
            try {
                const decodedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString());
                startIndex = decodedCursor.index || 0;
            }
            catch {
                logger.warn('Invalid cursor provided', { requestId, cursor });
            }
        }
        const paginatedVerifications = verifications.slice(startIndex, startIndex + limit);
        const hasMore = startIndex + limit < verifications.length;
        const nextCursor = hasMore
            ? Buffer.from(JSON.stringify({ index: startIndex + limit })).toString('base64')
            : null;
        // Map to response format with masked Omang numbers
        const cases = paginatedVerifications.map(v => ({
            caseId: v.verificationId,
            customerName: v.customerMetadata?.name || 'Unknown',
            omangNumber: maskOmangNumber(v.extractedData?.idNumber),
            status: mapStatus(v.status),
            documentType: v.documentType,
            assignee: v.assignee || null,
            createdAt: v.createdAt,
            updatedAt: v.updatedAt,
        }));
        // Log audit event (without PII)
        logger.info('Cases listed', {
            requestId,
            clientId,
            resultCount: cases.length,
            totalCount: verifications.length,
            hasMore,
        });
        // Log performance metrics for monitoring
        const totalTimeMs = Date.now() - startTime;
        logPerformanceMetrics(requestId, clientId, {
            queryTimeMs,
            filterTimeMs,
            totalTimeMs,
            resultCount: cases.length,
            totalCount: verifications.length,
        });
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                data: cases,
                meta: {
                    requestId,
                    timestamp: new Date().toISOString(),
                    pagination: {
                        limit,
                        cursor: nextCursor,
                        hasMore,
                        total: verifications.length,
                    },
                },
            }),
        };
    }
    catch (error) {
        logger.error('Failed to list cases', {
            requestId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(createErrorResponse('INTERNAL_ERROR', 'Failed to list cases', requestId)),
        };
    }
}
/**
 * Performance metrics for monitoring
 * Logs query performance to CloudWatch for <1s response time monitoring
 */
function logPerformanceMetrics(requestId, clientId, metrics) {
    logger.info('Performance metrics', {
        requestId,
        clientId,
        metricType: 'list-cases-performance',
        ...metrics,
        // Flag if exceeding target
        exceedsTarget: metrics.totalTimeMs > 500,
    });
}
/**
 * Map internal verification status to case status
 */
function mapStatus(status) {
    const statusMap = {
        created: 'pending',
        documents_uploading: 'pending',
        documents_complete: 'pending',
        submitted: 'pending',
        processing: 'in-review',
        pending_review: 'in-review',
        in_review: 'in-review',
        approved: 'approved',
        rejected: 'rejected',
        auto_rejected: 'rejected',
        resubmission_required: 'pending',
        expired: 'rejected',
    };
    return statusMap[status] || 'pending';
}
//# sourceMappingURL=list-cases.js.map