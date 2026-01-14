/**
 * AuthBridge Web SDK - API Test Fixtures
 *
 * Pure API testing without browser overhead.
 * Use for backend validation, service testing, and contract verification.
 */

import { test as base } from '@playwright/test';

// ============================================================================
// Types
// ============================================================================

export interface ApiRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  data?: unknown;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ApiResponse<T = unknown> {
  status: number;
  body: T;
  headers: Record<string, string>;
  ok: boolean;
}

export interface RecurseOptions {
  timeout?: number;
  interval?: number;
  message?: string;
}

type ApiFixtures = {
  /** Enhanced API request with better error handling */
  apiRequest: <T = unknown>(options: ApiRequestOptions) => Promise<ApiResponse<T>>;
  /** Poll until condition is met (for async operations) */
  recurse: <T>(
    fn: () => Promise<ApiResponse<T>>,
    condition: (response: ApiResponse<T>) => boolean,
    options?: RecurseOptions
  ) => Promise<ApiResponse<T>>;
  /** Get auth token for authenticated requests */
  getAuthToken: (email: string, password: string) => Promise<string>;
};

// ============================================================================
// API Fixtures
// ============================================================================

export const apiTest = base.extend<ApiFixtures>({
  apiRequest: async ({ request }, use) => {
    const makeRequest = async <T = unknown>(options: ApiRequestOptions): Promise<ApiResponse<T>> => {
      const { method, path, data, params, headers = {}, timeout = 30000 } = options;

      // Build URL with query params
      let url = path;
      if (params) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          searchParams.append(key, String(value));
        });
        url = `${path}?${searchParams.toString()}`;
      }

      // Make request
      const response = await request.fetch(url, {
        method,
        data,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...headers,
        },
        timeout,
      });

      // Parse response
      let body: T;
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('application/json')) {
        body = (await response.json()) as T;
      } else {
        body = (await response.text()) as unknown as T;
      }

      // Extract headers
      const responseHeaders: Record<string, string> = {};
      Object.entries(response.headers()).forEach(([key, value]) => {
        responseHeaders[key] = value;
      });

      return {
        status: response.status(),
        body,
        headers: responseHeaders,
        ok: response.ok(),
      };
    };

    await use(makeRequest);
  },

  recurse: async ({ }, use) => {
    const poll = async <T>(
      fn: () => Promise<ApiResponse<T>>,
      condition: (response: ApiResponse<T>) => boolean,
      options: RecurseOptions = {}
    ): Promise<ApiResponse<T>> => {
      const { timeout = 30000, interval = 1000, message = 'Polling...' } = options;
      const startTime = Date.now();

      while (Date.now() - startTime < timeout) {
        const response = await fn();

        if (condition(response)) {
          return response;
        }

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, interval));
      }

      throw new Error(`Timeout after ${timeout}ms: ${message}`);
    };

    await use(poll);
  },

  getAuthToken: async ({ request }, use) => {
    const getToken = async (email: string, password: string): Promise<string> => {
      const response = await request.post('/api/auth/login', {
        data: { email, password },
      });

      if (!response.ok()) {
        throw new Error(`Auth failed: ${response.status()} ${await response.text()}`);
      }

      const data = (await response.json()) as { token: string };
      return data.token;
    };

    await use(getToken);
  },
});

// ============================================================================
// Exports
// ============================================================================

export { expect } from '@playwright/test';
