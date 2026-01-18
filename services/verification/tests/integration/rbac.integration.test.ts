import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DynamoDBClient, CreateTableCommand, DeleteTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  assignRole,
  removeRole,
  getUserRoles,
  checkPermission,
  reloadPolicies,
} from '../../src/services/rbac-enforcer.js';
import { handler as assignRoleHandler } from '../../src/handlers/assign-role.js';
import { handler as removeRoleHandler } from '../../src/handlers/remove-role.js';
import { handler as getUserRolesHandler } from '../../src/handlers/get-user-roles.js';
import { handler as listRolesHandler } from '../../src/handlers/list-roles.js';
import type { APIGatewayProxyEvent } from 'aws-lambda';

const TEST_TABLE_NAME = 'AuthBridgeCasbinPolicies-test';
const TEST_MAIN_TABLE = 'AuthBridgeTable-test';

describe('RBAC Integration Tests', () => {
  let dynamodb: DynamoDBClient;
  let docClient: DynamoDBDocumentClient;

  beforeAll(async () => {
    // Set test environment
    process.env.CASBIN_TABLE_NAME = TEST_TABLE_NAME;
    process.env.TABLE_NAME = TEST_MAIN_TABLE;
    process.env.AWS_REGION = 'af-south-1';

    dynamodb = new DynamoDBClient({
      region: 'af-south-1',
      endpoint: 'http://localhost:8000',
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    });

    docClient = DynamoDBDocumentClient.from(dynamodb);

    // Create Casbin policies table
    try {
      await dynamodb.send(
        new CreateTableCommand({
          TableName: TEST_TABLE_NAME,
          KeySchema: [
            { AttributeName: 'PK', KeyType: 'HASH' },
            { AttributeName: 'SK', KeyType: 'RANGE' },
          ],
          AttributeDefinitions: [
            { AttributeName: 'PK', AttributeType: 'S' },
            { AttributeName: 'SK', AttributeType: 'S' },
          ],
          BillingMode: 'PAY_PER_REQUEST',
        })
      );
    } catch (error: any) {
      if (error.name !== 'ResourceInUseException') {
        throw error;
      }
    }

    // Create main table for role assignments
    try {
      await dynamodb.send(
        new CreateTableCommand({
          TableName: TEST_MAIN_TABLE,
          KeySchema: [
            { AttributeName: 'PK', KeyType: 'HASH' },
            { AttributeName: 'SK', KeyType: 'RANGE' },
          ],
          AttributeDefinitions: [
            { AttributeName: 'PK', AttributeType: 'S' },
            { AttributeName: 'SK', AttributeType: 'S' },
          ],
          BillingMode: 'PAY_PER_REQUEST',
        })
      );
    } catch (error: any) {
      if (error.name !== 'ResourceInUseException') {
        throw error;
      }
    }

    // Wait for tables to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Initialize test policies
    await initializeTestPolicies();
  }, 30000);

  afterAll(async () => {
    // Clean up tables
    try {
      await dynamodb.send(new DeleteTableCommand({ TableName: TEST_TABLE_NAME }));
      await dynamodb.send(new DeleteTableCommand({ TableName: TEST_MAIN_TABLE }));
    } catch (error) {
      console.error('Error cleaning up tables:', error);
    }
  });

  beforeEach(async () => {
    // Reload policies before each test
    await reloadPolicies();
  });

  describe('Role Assignment', () => {
    it('should assign analyst role to user', async () => {
      await assignRole('user_test_1', 'analyst');
      const roles = await getUserRoles('user_test_1');
      expect(roles).toContain('analyst');
    });

    it('should remove role from user', async () => {
      await assignRole('user_test_2', 'reviewer');
      await removeRole('user_test_2', 'reviewer');
      const roles = await getUserRoles('user_test_2');
      expect(roles).not.toContain('reviewer');
    });

    it('should handle multiple roles', async () => {
      await assignRole('user_test_3', 'analyst');
      await assignRole('user_test_3', 'developer');
      const roles = await getUserRoles('user_test_3');
      expect(roles).toContain('analyst');
      expect(roles).toContain('developer');
    });
  });

  describe('Permission Checks', () => {
    it('should allow analyst to approve cases', async () => {
      await assignRole('user_analyst', 'analyst');
      const result = await checkPermission('user_analyst', '/api/v1/cases/case_123/approve', 'update');
      expect(result.allowed).toBe(true);
      expect(result.roles).toContain('analyst');
    });

    it('should deny reviewer from approving cases', async () => {
      await assignRole('user_reviewer', 'reviewer');
      const result = await checkPermission('user_reviewer', '/api/v1/cases/case_123/approve', 'update');
      expect(result.allowed).toBe(false);
    });

    it('should allow reviewer to read cases', async () => {
      await assignRole('user_reviewer_2', 'reviewer');
      const result = await checkPermission('user_reviewer_2', '/api/v1/cases/case_123', 'read');
      expect(result.allowed).toBe(true);
    });

    it('should allow admin full access', async () => {
      await assignRole('user_admin', 'admin');

      const readResult = await checkPermission('user_admin', '/api/v1/cases', 'read');
      expect(readResult.allowed).toBe(true);

      const updateResult = await checkPermission('user_admin', '/api/v1/cases/case_123/approve', 'update');
      expect(updateResult.allowed).toBe(true);

      const deleteResult = await checkPermission('user_admin', '/api/v1/users/user_123/roles/analyst', 'delete');
      expect(deleteResult.allowed).toBe(true);
    });

    it('should normalize resource paths with IDs', async () => {
      await assignRole('user_analyst_2', 'analyst');
      const result = await checkPermission('user_analyst_2', '/api/v1/cases/case_abc123', 'read');
      expect(result.allowed).toBe(true);
      expect(result.resource).toBe('/api/v1/cases/*');
    });
  });

  describe('Role Inheritance', () => {
    it('should inherit permissions from parent roles', async () => {
      await assignRole('user_admin_2', 'admin');

      // Admin inherits analyst permissions
      const analystPermission = await checkPermission('user_admin_2', '/api/v1/cases/case_123/approve', 'update');
      expect(analystPermission.allowed).toBe(true);

      // Admin inherits compliance_officer permissions
      const compliancePermission = await checkPermission('user_admin_2', '/api/v1/audit', 'read');
      expect(compliancePermission.allowed).toBe(true);
    });

    it('should inherit multiple levels', async () => {
      await assignRole('user_analyst_3', 'analyst');

      // Analyst inherits reviewer permissions
      const reviewerPermission = await checkPermission('user_analyst_3', '/api/v1/cases/case_123/notes', 'read');
      expect(reviewerPermission.allowed).toBe(true);
    });
  });

  describe('API User Restrictions', () => {
    it('should allow api_user to create verifications', async () => {
      await assignRole('user_api', 'api_user');
      const result = await checkPermission('user_api', '/api/v1/verifications', 'create');
      expect(result.allowed).toBe(true);
    });

    it('should deny api_user from accessing admin endpoints', async () => {
      await assignRole('user_api_2', 'api_user');
      const result = await checkPermission('user_api_2', '/api/v1/users/user_123/roles', 'create');
      expect(result.allowed).toBe(false);
    });

    it('should deny api_user from approving cases', async () => {
      await assignRole('user_api_3', 'api_user');
      const result = await checkPermission('user_api_3', '/api/v1/cases/case_123/approve', 'update');
      expect(result.allowed).toBe(false);
    });
  });

  describe('Role Management API', () => {
    it('should assign role via API handler', async () => {
      const event = createMockEvent({
        pathParameters: { userId: 'user_api_test' },
        body: JSON.stringify({ role: 'analyst' }),
        authorizer: { userId: 'admin_user' },
      });

      const response = await assignRoleHandler(event, {} as any, {} as any);
      expect(response.statusCode).toBe(200);

      const roles = await getUserRoles('user_api_test');
      expect(roles).toContain('analyst');
    });

    it('should remove role via API handler', async () => {
      await assignRole('user_remove_test', 'reviewer');

      const event = createMockEvent({
        pathParameters: { userId: 'user_remove_test', role: 'reviewer' },
        authorizer: { userId: 'admin_user' },
      });

      const response = await removeRoleHandler(event, {} as any, {} as any);
      expect(response.statusCode).toBe(200);

      const roles = await getUserRoles('user_remove_test');
      expect(roles).not.toContain('reviewer');
    });

    it('should get user roles via API handler', async () => {
      await assignRole('user_get_test', 'analyst');

      const event = createMockEvent({
        pathParameters: { userId: 'user_get_test' },
        authorizer: { userId: 'admin_user' },
      });

      const response = await getUserRolesHandler(event, {} as any, {} as any);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.roles).toContain('analyst');
    });

    it('should list all roles via API handler', async () => {
      const event = createMockEvent({
        authorizer: { userId: 'admin_user' },
      });

      const response = await listRolesHandler(event, {} as any, {} as any);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.roles).toHaveLength(7);
      expect(body.roles.map((r: any) => r.name)).toContain('admin');
      expect(body.roles.map((r: any) => r.name)).toContain('analyst');
    });
  });
});

// Helper functions
async function initializeTestPolicies() {
  const { CasbinDynamoDBAdapter } = await import('casbin-dynamodb-adapter-v3');
  const { newEnforcer } = await import('casbin');
  const path = await import('path');
  const { fileURLToPath } = await import('url');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const modelPath = path.join(__dirname, '../../casbin-model.conf');

  // Create DynamoDB client for adapter
  const testDynamodb = new DynamoDBClient({
    region: 'af-south-1',
    endpoint: 'http://localhost:8000',
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  });
  const testDocClient = DynamoDBDocumentClient.from(testDynamodb);

  const adapter = new CasbinDynamoDBAdapter(testDocClient, {
    tableName: TEST_TABLE_NAME,
    hashKey: 'PK',
  });

  const enforcer = await newEnforcer(modelPath, adapter);

  // Add role inheritance
  await enforcer.addGroupingPolicy('admin', 'compliance_officer');
  await enforcer.addGroupingPolicy('admin', 'analyst');
  await enforcer.addGroupingPolicy('admin', 'developer');
  await enforcer.addGroupingPolicy('compliance_officer', 'audit_viewer');
  await enforcer.addGroupingPolicy('analyst', 'reviewer');

  // Add analyst policies
  await enforcer.addPolicy('analyst', '/api/v1/cases', 'read');
  await enforcer.addPolicy('analyst', '/api/v1/cases/*', 'read');
  await enforcer.addPolicy('analyst', '/api/v1/cases/*/approve', 'update');
  await enforcer.addPolicy('analyst', '/api/v1/cases/*/reject', 'update');
  await enforcer.addPolicy('analyst', '/api/v1/cases/*/notes', 'read');
  await enforcer.addPolicy('analyst', '/api/v1/cases/*/notes', 'create');

  // Add reviewer policies
  await enforcer.addPolicy('reviewer', '/api/v1/cases', 'read');
  await enforcer.addPolicy('reviewer', '/api/v1/cases/*', 'read');
  await enforcer.addPolicy('reviewer', '/api/v1/cases/*/notes', 'read');
  await enforcer.addPolicy('reviewer', '/api/v1/cases/*/notes', 'create');

  // Add admin policies
  await enforcer.addPolicy('admin', '/api/v1/*', 'create');
  await enforcer.addPolicy('admin', '/api/v1/*', 'read');
  await enforcer.addPolicy('admin', '/api/v1/*', 'update');
  await enforcer.addPolicy('admin', '/api/v1/*', 'delete');

  // Add compliance_officer policies
  await enforcer.addPolicy('compliance_officer', '/api/v1/audit', 'read');
  await enforcer.addPolicy('compliance_officer', '/api/v1/audit/*', 'read');

  // Add api_user policies
  await enforcer.addPolicy('api_user', '/api/v1/verifications', 'create');
  await enforcer.addPolicy('api_user', '/api/v1/verifications/*', 'read');

  await enforcer.savePolicy();
}

function createMockEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/api/v1/test',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: 'test',
      apiId: 'test',
      authorizer: {},
      protocol: 'HTTP/1.1',
      httpMethod: 'POST',
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '127.0.0.1',
        user: null,
        userAgent: 'test',
        userArn: null,
      },
      path: '/api/v1/test',
      stage: 'test',
      requestId: 'test',
      requestTimeEpoch: Date.now(),
      resourceId: 'test',
      resourcePath: '/api/v1/test',
    },
    resource: '/api/v1/test',
    ...overrides,
  } as APIGatewayProxyEvent;
}
