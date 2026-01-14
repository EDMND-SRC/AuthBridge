export interface Session {
  sessionId: string;
  userId: string;
  clientId: string;
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
  status: 'active' | 'expired' | 'revoked';
  ipAddress: string;
  userAgent: string;
  deviceType: string;
  ttl: number;
}

export interface CreateSessionInput {
  userId: string;
  clientId: string;
  ipAddress: string;
  userAgent: string;
  deviceType: string;
}

export interface SessionValidationResult {
  valid: boolean;
  session?: Session;
  error?: string;
}
