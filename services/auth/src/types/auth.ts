export interface TokenPayload {
  endUserId: string;
  clientId: string;
  iat: number;
  exp: number;
  iss: string;
}

export interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  region: string;
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
}
