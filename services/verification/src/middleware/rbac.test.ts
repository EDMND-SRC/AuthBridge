import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requirePermission, ForbiddenError } from './rbac.js';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// Mock dependencies
vi.mock('../services/rbac-enforcer.js', () => ({
  checkPermission: vi.fn(),
  getUserRoles: vi.fn(),
}));

vi.mock('../services/audit.js', () => ({
  AuditService: vi.fn().mockImplementation(() => ({
    logEvent: vi.fn(),
  })),
}));

vi.mock('./audit-context.js', () => ({
  getAuditContext: vi.fn().mockReturnValue({
    userId: 'user_123',
    ipAddress: '192.168.1.1',
  }),
}));

describe('RBAC Middleware', () => {
  let mockEvent: Partial<APIGatewayProxyEvent>;

  beforeEach(() => {
    mockEvent = {
      requestContext: {
        authorizer: {
          userId: 'user_123',
        },
      } as any,
      pathParameters: {},
    };
  });

  describe('requirePermission', () => {
    it('should allow request when permission is granted', async () => {
      const { checkPermission } = await import('../services/rbac-enforcer.js');
      (checkPermission as any).mockResolvedValue({
        allowed: true,
        userId: 'user_123',
        resource: '/api/v1/cases',
        action: 'read',
        roles: ['analyst'],
      });

      const middleware = requirePermission('/api/v1/cases', 'read');
      const request = { event: mockEvent as APIGatewayProxyEvent };

      await expect(middleware.before!(request as any)).resolves.toBeUndefined();
    });

    it('should throw ForbiddenError when permission is denied', async () => {
      const { checkPermission } = await import('../services/rbac-enforcer.js');
      (checkPermission as any).mockResolvedValue({
        allowed: false,
        userId: 'user_123',
        resource: '/api/v1/cases/case_123/approve',
        action: 'update',
        roles: ['reviewer'],
      });

      const middleware = requirePermission('/api/v1/cases/*/approve', 'update');
      const request = { event: mockEvent as APIGatewayProxyEvent };

      await expect(middleware.before!(request as any)).rejects.toThrow(ForbiddenError);
    });

    it('should replace path parameters in resource', async () => {
      const { checkPermission } = await import('../services/rbac-enforcer.js');
      (checkPermission as any).mockResolvedValue({
        allowed: true,
        userId: 'user_123',
        resource: '/api/v1/cases/case_123',
        action: 'read',
        roles: ['analyst'],
      });

      mockEvent.pathParameters = { caseId: 'case_123' };

      const middleware = requirePermission('/api/v1/cases/{caseId}', 'read');
      const request = { event: mockEvent as APIGatewayProxyEvent };

      await middleware.before!(request as any);

      expect(checkPermission).toHaveBeenCalledWith('user_123', '/api/v1/cases/case_123', 'read');
    });

    it('should throw ForbiddenError when user is not authenticated', async () => {
      mockEvent.requestContext!.authorizer = undefined;

      const middleware = requirePermission('/api/v1/cases', 'read');
      const request = { event: mockEvent as APIGatewayProxyEvent };

      await expect(middleware.before!(request as any)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('ForbiddenError', () => {
    it('should create error with correct properties', () => {
      const error = new ForbiddenError('Permission denied', { userId: 'user_123' });

      expect(error.message).toBe('Permission denied');
      expect(error.statusCode).toBe(403);
      expect(error.details).toEqual({ userId: 'user_123' });
    });
  });
});
