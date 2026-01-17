/**
 * Security Headers Middleware
 * Adds HSTS and other security headers to all Lambda responses
 * DPA 2024 Compliance: TLS 1.2+ enforcement
 */
const DEFAULT_CONFIG = {
    hstsMaxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
};
/**
 * Add security headers to Lambda response
 */
export function addSecurityHeaders(response, config = {}) {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    // Build HSTS header value
    let hstsValue = `max-age=${finalConfig.hstsMaxAge}`;
    if (finalConfig.includeSubDomains) {
        hstsValue += '; includeSubDomains';
    }
    if (finalConfig.preload) {
        hstsValue += '; preload';
    }
    // Add security headers
    const securityHeaders = {
        // HSTS: Force HTTPS for all future requests
        'Strict-Transport-Security': hstsValue,
        // Prevent MIME type sniffing
        'X-Content-Type-Options': 'nosniff',
        // Prevent clickjacking
        'X-Frame-Options': 'DENY',
        // XSS Protection (legacy browsers)
        'X-XSS-Protection': '1; mode=block',
        // Content Security Policy
        'Content-Security-Policy': "default-src 'self'",
        // Referrer Policy
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        // Permissions Policy (formerly Feature-Policy)
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    };
    return {
        ...response,
        headers: {
            ...response.headers,
            ...securityHeaders,
        },
    };
}
/**
 * Middleware wrapper for Lambda handlers
 */
export function withSecurityHeaders(handler, config) {
    return async (event) => {
        const response = await handler(event);
        return addSecurityHeaders(response, config);
    };
}
/**
 * Check if request is using HTTPS
 */
export function isHttps(event) {
    const protocol = event.headers['X-Forwarded-Proto'] || event.headers['x-forwarded-proto'];
    return protocol === 'https';
}
/**
 * Enforce HTTPS - reject HTTP requests
 */
export function enforceHttps(event) {
    if (!isHttps(event)) {
        return {
            statusCode: 403,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                error: 'HTTPS_REQUIRED',
                message: 'HTTPS is required for all API requests',
            }),
        };
    }
    return null;
}
//# sourceMappingURL=security-headers.js.map