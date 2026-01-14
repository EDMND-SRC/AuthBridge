export function createErrorResponse(code, message, requestId, details) {
    return {
        error: {
            code,
            message,
            details,
        },
        meta: {
            requestId,
            timestamp: new Date().toISOString(),
        },
    };
}
export class AuthError extends Error {
    code;
    statusCode;
    constructor(code, message, statusCode = 401) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = 'AuthError';
    }
}
export class RateLimitError extends Error {
    retryAfter;
    constructor(message = 'Too many requests. Please try again later.', retryAfter = 60) {
        super(message);
        this.retryAfter = retryAfter;
        this.name = 'RateLimitError';
    }
}
export class ValidationError extends Error {
    details;
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = 'ValidationError';
    }
}
