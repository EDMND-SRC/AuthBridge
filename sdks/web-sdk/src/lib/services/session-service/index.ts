/**
 * Session Service
 * Handles session token validation for the SDK
 */

import {
  sendVerificationErrorEvent,
  EVerificationErrorCodes
} from '../../utils/event-service';

export interface SessionValidationResult {
  isValid: boolean;
  errorCode?: EVerificationErrorCodes;
  errorMessage?: string;
}

/**
 * Validates a session token
 * @param token - The session token to validate (typically from endUserInfo.id or auth header)
 * @returns SessionValidationResult indicating if the token is valid
 */
export const validateSessionToken = (token: string | undefined): SessionValidationResult => {
  // Check if token exists
  if (!token || token.trim() === '') {
    return {
      isValid: false,
      errorCode: EVerificationErrorCodes.SESSION_INVALID,
      errorMessage: 'Session token is required',
    };
  }

  // Basic JWT structure validation (if token looks like a JWT)
  if (token.includes('.')) {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return {
        isValid: false,
        errorCode: EVerificationErrorCodes.SESSION_INVALID,
        errorMessage: 'Invalid session token format',
      };
    }

    // Try to decode and check expiration
    try {
      const payload = JSON.parse(atob(parts[1]));

      // Check if token has expired
      if (payload.exp) {
        const expirationTime = payload.exp * 1000; // Convert to milliseconds
        if (Date.now() > expirationTime) {
          return {
            isValid: false,
            errorCode: EVerificationErrorCodes.SESSION_EXPIRED,
            errorMessage: 'Session has expired',
          };
        }
      }
    } catch {
      // If we can't decode, assume it's a different token format and continue
      // This allows for non-JWT tokens to be used
    }
  }

  return { isValid: true };
};

/**
 * Validates session and emits error event if invalid
 * @param token - The session token to validate
 * @param sessionId - The session ID for error reporting
 * @returns true if valid, false if invalid (error event emitted)
 */
export const validateAndReportSession = (
  token: string | undefined,
  sessionId: string | null = null,
): boolean => {
  const result = validateSessionToken(token);

  if (!result.isValid && result.errorCode && result.errorMessage) {
    sendVerificationErrorEvent(result.errorCode, result.errorMessage, sessionId);
    return false;
  }

  return true;
};

export { EVerificationErrorCodes };
