import { describe, it, expect } from 'vitest';
import { addSecurityHeaders, withSecurityHeaders, isHttps, enforceHttps } from './security-headers';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

describe('Security Headers Middleware', () => {
  describe('addSecurityHeaders', () => {
    it('adds all security headers to response', () => {
      const response: APIGatewayProxyResult = {
        statusCode: 200,
        body: JSON.stringify({ message: 'success' }),
      };

      const result = addSecurityHeaders(response);

      expect(result.headers).toBeDefined();
      expect(result.headers!['Strict-Transport-Security']).toBe(
        'max-age=31536000; includeSubDomains; preload'
      );
      expect(result.headers!['X-Content-Type-Options']).toBe('nosniff');
      expect(result.headers!['X-Frame-Options']).toBe('DENY');
      expect(result.headers!['X-XSS-Protection']).toBe('1; mode=block');
      expect(result.headers!['Content-Security-Policy']).toBe("default-src 'self'");
      expect(result.headers!['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
      expect(result.headers!['Permissions-Policy']).toBe('geolocation=(), microphone=(), camera=()');
    });

    it('preserves existing headers', () => {
      const response: APIGatewayProxyResult = {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value',
        },
        body: JSON.stringify({ message: 'success' }),
      };

      const result = addSecurityHeaders(response);

      expect(result.headers!['Content-Type']).toBe('application/json');
      expect(result.headers!['X-Custom-Header']).toBe('custom-value');
      expect(result.headers!['Strict-Transport-Security']).toBeDefined();
    });

    it('allows custom HSTS configuration', () => {
      const response: APIGatewayProxyResult = {
        statusCode: 200,
        body: JSON.stringify({ message: 'success' }),
      };

      const result = addSecurityHeaders(response, {
        hstsMaxAge: 86400, // 1 day
        includeSubDomains: false,
        preload: false,
      });

      expect(result.headers!['Strict-Transport-Security']).toBe('max-age=86400');
    });
  });

  describe('withSecurityHeaders', () => {
    it('wraps handler and adds security headers', async () => {
      const mockHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'success' }),
        };
      };

      const wrappedHandler = withSecurityHeaders(mockHandler);
      const mockEvent = {} as APIGatewayProxyEvent;

      const result = await wrappedHandler(mockEvent);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toBeDefined();
      expect(result.headers!['Strict-Transport-Security']).toBeDefined();
    });
  });

  describe('isHttps', () => {
    it('returns true for HTTPS requests', () => {
      const event = {
        headers: {
          'X-Forwarded-Proto': 'https',
        },
      } as APIGatewayProxyEvent;

      expect(isHttps(event)).toBe(true);
    });

    it('returns false for HTTP requests', () => {
      const event = {
        headers: {
          'X-Forwarded-Proto': 'http',
        },
      } as APIGatewayProxyEvent;

      expect(isHttps(event)).toBe(false);
    });

    it('handles lowercase header names', () => {
      const event = {
        headers: {
          'x-forwarded-proto': 'https',
        },
      } as APIGatewayProxyEvent;

      expect(isHttps(event)).toBe(true);
    });
  });

  describe('enforceHttps', () => {
    it('returns null for HTTPS requests', () => {
      const event = {
        headers: {
          'X-Forwarded-Proto': 'https',
        },
      } as APIGatewayProxyEvent;

      const result = enforceHttps(event);

      expect(result).toBeNull();
    });

    it('returns 403 error for HTTP requests', () => {
      const event = {
        headers: {
          'X-Forwarded-Proto': 'http',
        },
      } as APIGatewayProxyEvent;

      const result = enforceHttps(event);

      expect(result).not.toBeNull();
      expect(result!.statusCode).toBe(403);
      expect(JSON.parse(result!.body)).toEqual({
        error: 'HTTPS_REQUIRED',
        message: 'HTTPS is required for all API requests',
      });
    });
  });
});
