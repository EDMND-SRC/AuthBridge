/**
 * Structured logger with PII masking for audit compliance
 * DPA 2024: Never log Omang numbers, names, addresses, phone numbers, selfie URLs
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface LogContext {
    requestId?: string;
    userId?: string;
    clientId?: string;
    sessionId?: string;
    action?: string;
    [key: string]: unknown;
}
declare function maskPII(value: unknown): unknown;
declare class Logger {
    private level;
    constructor(level?: LogLevel);
    private shouldLog;
    private log;
    debug(message: string, context?: LogContext): void;
    info(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    error(message: string, context?: LogContext): void;
    audit(action: string, context: LogContext): void;
}
export declare const logger: Logger;
export { maskPII };
//# sourceMappingURL=logger.d.ts.map