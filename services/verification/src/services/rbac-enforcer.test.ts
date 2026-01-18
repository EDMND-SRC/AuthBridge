import { describe, it, expect, vi } from 'vitest';
import {
  checkPermission,
  assignRole,
  removeRole,
  getUserRoles,
  normalizeResourcePath,
} from './rbac-enforcer.js';

// Mock Casbin and DynamoDB adapter - must be inline, no external variables
vi.mock('casbin', () => ({
  newEnforcer: vi.fn().mockResolvedValue({
    loadPolicy: vi.fn().mockResolvedValue(undefined),
    enforce: vi.fn().mockResolvedValue(true),
    getRolesForUser: vi.fn().mockResolvedValue(['analyst']),
    addRoleForUser: vi.fn().mockResolvedValue(undefined),
    deleteRoleForUser: vi.fn().mockResolvedValue(undefined),
    savePolicy: vi.fn().mockResolvedValue(undefined),
    getUsersForRole: vi.fn().mockResolvedValue(['user_123']),
    addPolicy: vi.fn().mockResolvedValue(undefined),
    removePolicy: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('casbin-dynamodb-adapter-v3', () => ({
  CasbinDynamoDBAdapter: vi.fn(function() {
    return {};
  }),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(function() {
    return {
      send: vi.fn().mockResolvedValue({
        Table: { TableName: 'test-table' },
      }),
    };
  }),
  DescribeTableCommand: vi.fn(function(params) {
    return { TableName: params.TableName };
  }),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn().mockReturnValue({
      send: vi.fn().mockResolvedValue({}),
    }),
  },
}));

describe('RBAC Enforcer', () => {
  describe('checkPermission', () => {
    it('should return permission check result', async () => {
      const result = await checkPermission('user_analyst', '/api/v1/cases', 'read');

      expect(result).toMatchObject({
        allowed: true,
        userId: 'user_analyst',
        action: 'read',
        roles: ['analyst'],
      });
    });

    it('should normalize resource paths', async () => {
      const result = await checkPermission('user_analyst', '/api/v1/cases/case_abc123', 'read');

      // Resource should be normalized to /api/v1/cases/*
      expect(result.resource).toBe('/api/v1/cases/*');
    });
  });

  describe('getUserRoles', () => {
    it('should return user roles', async () => {
      const roles = await getUserRoles('user_analyst');

      expect(roles).toEqual(['analyst']);
    });
  });

  describe('assignRole', () => {
    it('should assign role to user', async () => {
      await expect(assignRole('user_test', 'analyst')).resolves.toBeUndefined();
    });
  });

  describe('removeRole', () => {
    it('should remove role from user', async () => {
      await expect(removeRole('user_test', 'analyst')).resolves.toBeUndefined();
    });
  });
});
