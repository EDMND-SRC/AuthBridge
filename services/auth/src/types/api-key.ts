export interface ApiKey {
  keyId: string;
  clientId: string;
  keyHash: string;
  name: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsed: string | null;
  status: 'active' | 'revoked' | 'expired';
  scopes: string[];
  rateLimit: number; // requests per minute
}

export interface CreateApiKeyInput {
  clientId: string;
  name: string;
  scopes?: string[];
  rateLimit?: number;
  expiresInDays?: number;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  apiKey?: ApiKey;
  error?: string;
}
