import { randomUUID } from 'crypto';
import { DynamoDBService } from './dynamodb.js';
const SESSION_DURATION_MINUTES = 30;
const MAX_SESSIONS_PER_USER = 50;
export class SessionService {
    dynamodb;
    constructor(dynamodb) {
        this.dynamodb = dynamodb || new DynamoDBService();
    }
    async createSession(input) {
        const sessionId = randomUUID();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + SESSION_DURATION_MINUTES * 60 * 1000);
        // Check concurrent session limit
        const activeCount = await this.dynamodb.countActiveUserSessions(input.userId);
        if (activeCount >= MAX_SESSIONS_PER_USER) {
            throw new Error('Maximum concurrent sessions exceeded');
        }
        const session = {
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
        await this.dynamodb.putSession(session);
        return session;
    }
    async validateSession(sessionId) {
        const session = await this.dynamodb.getSession(sessionId);
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
            await this.dynamodb.updateSession(session);
            return {
                valid: false,
                error: 'Session expired',
            };
        }
        // Update last activity
        session.lastActivity = now.toISOString();
        await this.dynamodb.updateSession(session);
        return {
            valid: true,
            session,
        };
    }
    async renewSession(sessionId) {
        const validation = await this.validateSession(sessionId);
        if (!validation.valid || !validation.session) {
            throw new Error('Cannot renew invalid session');
        }
        const now = new Date();
        const expiresAt = new Date(now.getTime() + SESSION_DURATION_MINUTES * 60 * 1000);
        validation.session.expiresAt = expiresAt.toISOString();
        validation.session.lastActivity = now.toISOString();
        validation.session.ttl = Math.floor(expiresAt.getTime() / 1000);
        await this.dynamodb.updateSession(validation.session);
        return validation.session;
    }
    async revokeSession(sessionId) {
        const session = await this.dynamodb.getSession(sessionId);
        if (session) {
            session.status = 'revoked';
            await this.dynamodb.updateSession(session);
        }
    }
    async getUserSessions(userId) {
        const sessions = await this.dynamodb.queryUserSessions(userId);
        return sessions.filter(s => s.status === 'active');
    }
}
