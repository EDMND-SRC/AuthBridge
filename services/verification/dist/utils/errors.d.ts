export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: Array<{
            field: string;
            message: string;
        }>;
    };
    meta: {
        requestId: string;
        timestamp: string;
    };
}
export declare function createErrorResponse(code: string, message: string, requestId: string, details?: Array<{
    field: string;
    message: string;
}>): ErrorResponse;
export declare class AuthError extends Error {
    code: string;
    statusCode: number;
    constructor(code: string, message: string, statusCode?: number);
}
export declare class RateLimitError extends Error {
    retryAfter: number;
    constructor(message?: string, retryAfter?: number);
}
export declare class ValidationError extends Error {
    details: Array<{
        field: string;
        message: string;
    }>;
    constructor(message: string, details: Array<{
        field: string;
        message: string;
    }>);
}
export declare class NotFoundError extends Error {
    details?: Record<string, unknown> | undefined;
    constructor(message: string, details?: Record<string, unknown> | undefined);
}
export declare class UnauthorizedError extends Error {
    details?: Record<string, unknown> | undefined;
    constructor(message: string, details?: Record<string, unknown> | undefined);
}
//# sourceMappingURL=errors.d.ts.map