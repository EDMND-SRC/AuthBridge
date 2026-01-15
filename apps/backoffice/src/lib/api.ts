const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface ApiResponse<T> {
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
    pagination?: {
      limit: number;
      cursor: string | null;
      hasMore: boolean;
    };
  };
}

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    requestId: string;
    timestamp: string;
  };
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 * @param attempt - Current attempt number (0-indexed)
 * @param baseDelay - Base delay in ms (default: 1000)
 * @param maxDelay - Maximum delay in ms (default: 30000)
 */
function getBackoffDelay(attempt: number, baseDelay = 1000, maxDelay = 30000): number {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter (±25%)
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private maxRetries = 3;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      params?: Record<string, string | number | boolean | undefined>;
    }
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${path}`);

    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url.toString(), {
          method,
          headers,
          body: options?.body ? JSON.stringify(options.body) : undefined,
        });

        // Handle rate limiting with exponential backoff
        if (response.status === 429) {
          if (attempt < this.maxRetries) {
            const retryAfter = response.headers.get('Retry-After');
            const delay = retryAfter
              ? parseInt(retryAfter, 10) * 1000
              : getBackoffDelay(attempt);
            console.warn(`Rate limited (429). Retrying in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
            await sleep(delay);
            continue;
          }
        }

        // Handle server errors with retry
        if (response.status >= 500 && attempt < this.maxRetries) {
          const delay = getBackoffDelay(attempt);
          console.warn(`Server error (${response.status}). Retrying in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
          await sleep(delay);
          continue;
        }

        if (!response.ok) {
          const errorData: ApiError = await response.json();
          throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        return response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Retry on network errors
        if (attempt < this.maxRetries && error instanceof TypeError) {
          const delay = getBackoffDelay(attempt);
          console.warn(`Network error. Retrying in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
          await sleep(delay);
          continue;
        }

        throw lastError;
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
    return this.request<T>('GET', path, { params });
  }

  async post<T>(path: string, body?: unknown) {
    return this.request<T>('POST', path, { body });
  }

  async put<T>(path: string, body?: unknown) {
    return this.request<T>('PUT', path, { body });
  }

  async patch<T>(path: string, body?: unknown) {
    return this.request<T>('PATCH', path, { body });
  }

  async delete<T>(path: string) {
    return this.request<T>('DELETE', path);
  }
}

export const api = new ApiClient(API_BASE_URL);
export type { ApiResponse, ApiError };
