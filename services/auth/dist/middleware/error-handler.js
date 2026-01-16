import { createErrorResponse, AuthError, RateLimitError, ValidationError, UnauthorizedError, NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Client-ID,X-Session-ID',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};
export function handleError(error, requestId) {
    logger.error('Request error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error,
    });
    if (error instanceof AuthError) {
        return {
            statusCode: error.statusCode,
            headers: {
                'Content-Type': 'application/json',
                ...CORS_HEADERS,
            },
            body: JSON.stringify(createErrorResponse(error.code, error.message, requestId)),
        };
    }
    if (error instanceof RateLimitError) {
        return {
            statusCode: 429,
            headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + error.retryAfter),
                'Retry-After': String(error.retryAfter),
                ...CORS_HEADERS,
            },
            body: JSON.stringify(createErrorResponse('RATE_LIMIT_EXCEEDED', error.message, requestId)),
        };
    }
    if (error instanceof ValidationError) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                ...CORS_HEADERS,
            },
            body: JSON.stringify(createErrorResponse('VALIDATION_ERROR', error.message, requestId, error.details)),
        };
    }
    if (error instanceof UnauthorizedError) {
        return {
            statusCode: 401,
            headers: {
                'Content-Type': 'application/json',
                ...CORS_HEADERS,
            },
            body: JSON.stringify(createErrorResponse('UNAUTHORIZED', error.message, requestId)),
        };
    }
    if (error instanceof NotFoundError) {
        return {
            statusCode: 404,
            headers: {
                'Content-Type': 'application/json',
                ...CORS_HEADERS,
            },
            body: JSON.stringify(createErrorResponse('NOT_FOUND', error.message, requestId)),
        };
    }
    // Unknown error
    return {
        statusCode: 500,
        headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS,
        },
        body: JSON.stringify(createErrorResponse('INTERNAL_ERROR', 'An unexpected error occurred', requestId)),
    };
}
export { CORS_HEADERS };
