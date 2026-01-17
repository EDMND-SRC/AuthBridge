/**
 * Security Headers Middleware
 * Adds HSTS and other security headers to all Lambda responses
 * DPA 2024 Compliance: TLS 1.2+ enforcement
 */
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export interface SecurityHeadersConfig {
    hstsMaxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
}
/**
 * Add security headers to Lambda response
 */
export declare function addSecurityHeaders(response: APIGatewayProxyResult, config?: SecurityHeadersConfig): APIGatewayProxyResult;
/**
 * Middleware wrapper for Lambda handlers
 */
export declare function withSecurityHeaders(handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>, config?: SecurityHeadersConfig): (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
/**
 * Check if request is using HTTPS
 */
export declare function isHttps(event: APIGatewayProxyEvent): boolean;
/**
 * Enforce HTTPS - reject HTTP requests
 */
export declare function enforceHttps(event: APIGatewayProxyEvent): APIGatewayProxyResult | null;
//# sourceMappingURL=security-headers.d.ts.map