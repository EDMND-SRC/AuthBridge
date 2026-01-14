import { randomUUID } from 'crypto';
import type { Session, CreateSessionInput, SessionValidationResult } from '../types/session.js';

const SESSION_DURATION_MINUTES = 30;
const MAX_SESSIONS_PER_USER = 50;

// In-memory storage for MVP (replace with DynamoDB in production)
const sessions = new Map<string, Session>();

export class SessionService {
  // For testing: clear all sessions
  clearAllSessions(): void {
    sessions.clear();
  }

  async createSession(input: CreateSessionInput): Promise<Session> {
    const sessionId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_MINUTES * 60 * 1000);

    // Check concurrent session limit
    const userSessions = Array.from(sessions.values()).filter(
      s => s.userId === input.userId && s.status === 'active'
    );

    if (userSessions.length >= MAX_SESSIONS_PER_USER) {
      throw new Error('Maximum concurrent sessions exceeded');
    }

    const session: Session = {
      sessionId,
      userId: input.userId,
      clientId: input.clientId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastActivity: now.toISOString(),
      status: 'active',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      deviceType: input.deviceType,
      ttl: Math.floor(expiresAt.getTime() / 1000),
    };

    sessions.set(sessionId, session);
    return session;
  }

  async validateSession(sessionId: string): Promise<SessionValidationResult> {
    const session = sessions.get(sessionId);

    if (!session) {
      return {
        valid: false,
        error: 'Session not found',
      };
    }

    if (session.status !== 'active') {
      return {
        valid: false,
        error: `Session is ${session.status}`,
      };
    }

    const now = new Date();
    const expiresAt = new Date(session.expiresAt);

    if (now > expiresAt) {
      session.status = 'expired';
      sessions.set(sessionId, session);
      return {
        valid: false,
        error: 'Session expired',
      };
    }

    // Update last activity
    session.lastActivity = now.toISOString();
    sessions.set(sessionId, session);

    return {
      valid: true,
      session,
    };
  }

  async renewSession(sessionId: string): Promise<Session> {
    const validation = await this.validateSession(sessionId);

    if (!validation.valid || !validation.session) {
      throw new Error('Cannot renew invalid session');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_MINUTES * 60 * 1000);

    validation.session.expiresAt = expiresAt.toISOString();
    validation.session.lastActivity = now.toISOString();
    validation.session.ttl = Math.floor(expiresAt.getTime() / 1000);

    sessions.set(sessionId, validation.session);
    return validation.session;
  }

  async revokeSession(sessionId: string): Promise<void> {
    const session = sessions.get(sessionId);

    if (session) {
      session.status = 'revoked';
      sessions.set(sessionId, session);
    }
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    return Array.from(sessions.values()).filter(
      s => s.userId === userId && s.status === 'active'
    );
  }
}
