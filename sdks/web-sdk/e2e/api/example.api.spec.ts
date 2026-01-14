/**
 * AuthBridge Web SDK - Example API Tests
 *
 * Demonstrates API testing patterns without browser overhead.
 * These tests run faster and are more stable than E2E tests.
 */

import { apiTest as test, expect } from '../support/fixtures/api-fixtures';

test.describe('SDK API Health Check', () => {
  test('should respond to health endpoint', async ({ apiRequest }) => {
    // Skip if no API server is running
    test.skip(!process.env.API_URL, 'API_URL not configured');

    const { status, body } = await apiRequest<{ status: string; version: string }>({
      method: 'GET',
      path: '/health',
    });

    expect(status).toBe(200);
    expect(body.status).toBe('ok');
  });

  test('should handle 404 gracefully', async ({ apiRequest }) => {
    test.skip(!process.env.API_URL, 'API_URL not configured');

    const { status } = await apiRequest<{ error: { code: string } }>({
      method: 'GET',
      path: '/api/non-existent-endpoint',
    });

    expect(status).toBe(404);
  });
});

test.describe('SDK Configuration API', () => {
  test('should fetch SDK configuration', async ({ apiRequest }) => {
    test.skip(!process.env.API_URL, 'API_URL not configured');

    const { status, body } = await apiRequest<{
      flows: string[];
      theme: Record<string, unknown>;
    }>({
      method: 'GET',
      path: '/api/sdk/config',
    });

    expect(status).toBe(200);
    expect(body.flows).toBeDefined();
    expect(Array.isArray(body.flows)).toBe(true);
  });

  test('should validate API key', async ({ apiRequest }) => {
    test.skip(!process.env.API_URL, 'API_URL not configured');

    const { status } = await apiRequest({
      method: 'GET',
      path: '/api/sdk/config',
      headers: {
        'X-API-Key': 'invalid-key',
      },
    });

    // Should reject invalid API key
    expect([401, 403]).toContain(status);
  });
});

test.describe('Verification API', () => {
  test('should create verification session', async ({ apiRequest }) => {
    test.skip(!process.env.API_URL, 'API_URL not configured');

    const { status, body } = await apiRequest<{
      sessionId: string;
      expiresAt: string;
    }>({
      method: 'POST',
      path: '/api/verifications',
      data: {
        type: 'kyc',
        documentType: 'passport',
        callbackUrl: 'https://example.com/callback',
      },
    });

    expect(status).toBe(201);
    expect(body.sessionId).toBeDefined();
    expect(body.expiresAt).toBeDefined();
  });

  test('should validate required fields', async ({ apiRequest }) => {
    test.skip(!process.env.API_URL, 'API_URL not configured');

    const { status, body } = await apiRequest<{
      error: { code: string; details: Array<{ field: string }> };
    }>({
      method: 'POST',
      path: '/api/verifications',
      data: {
        // Missing required fields
      },
    });

    expect(status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  test('should poll verification status', async ({ apiRequest, recurse }) => {
    test.skip(!process.env.API_URL, 'API_URL not configured');

    // Create session first
    const { body: session } = await apiRequest<{ sessionId: string }>({
      method: 'POST',
      path: '/api/verifications',
      data: {
        type: 'kyc',
        documentType: 'passport',
      },
    });

    // Poll for status (demonstrates recurse pattern)
    const { body: status } = await recurse(
      () =>
        apiRequest<{ status: string }>({
          method: 'GET',
          path: `/api/verifications/${session.sessionId}`,
        }),
      (response) => response.body.status !== 'pending',
      {
        timeout: 5000,
        interval: 500,
        message: `Waiting for verification ${session.sessionId}`,
      }
    );

    expect(['completed', 'failed', 'expired', 'pending']).toContain(status.status);
  });
});
