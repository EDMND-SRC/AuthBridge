/**
 * Integration Test Client for Auth Service
 *
 * Provides utilities for making HTTP requests to the Auth API during integration tests.
 */

export interface TestClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

export interface TestResponse<T = unknown> {
  status: number;
  headers: Record<string, string>;
  body: T;
}

const DEFAULT_CONFIG: TestClientConfig = {
  baseUrl: process.env.TEST_API_URL || 'http://localhost:3001',
  timeout: 30000,
};

export class TestClient {
  private config: TestClientConfig;

  constructor(config: Partial<TestClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async request<T = unknown>(
    method: string,
    path: string,
    options: {
      body?: unknown;
      headers?: Record<string, string>;
      apiKey?: string;
      bearerToken?: string;
    } = {}
  ): Promise<TestResponse<T>> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const apiKey = options.apiKey || this.config.apiKey;
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    if (options.bearerToken) {
      headers['Authorization'] = `Bearer ${options.bearerToken}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(this.config.timeout || 30000),
    });

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let body: T;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      body = await response.json();
    } else {
      body = (await response.text()) as unknown as T;
    }

    return {
      status: response.status,
      headers: responseHeaders,
      body,
    };
  }

  async get<T = unknown>(path: string, options?: { headers?: Record<string, string>; apiKey?: string; bearerToken?: string }) {
    return this.request<T>('GET', path, options);
  }

  async post<T = unknown>(path: string, body?: unknown, options?: { headers?: Record<string, string>; apiKey?: string; bearerToken?: string }) {
    return this.request<T>('POST', path, { ...options, body });
  }

  async put<T = unknown>(path: string, body?: unknown, options?: { headers?: Record<string, string>; apiKey?: string; bearerToken?: string }) {
    return this.request<T>('PUT', path, { ...options, body });
  }

  async delete<T = unknown>(path: string, options?: { headers?: Record<string, string>; apiKey?: string; bearerToken?: string }) {
    return this.request<T>('DELETE', path, options);
  }
}

export const testClient = new TestClient();
