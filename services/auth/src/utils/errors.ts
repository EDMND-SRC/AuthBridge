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

export function createErrorResponse(
  code: string,
  message: string,
  requestId: string,
  details?: Array<{ field: string; message: string }>
): ErrorResponse {
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
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string = 'Too many requests. Please try again later.',
    public retryAfter: number = 60
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public details: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}
