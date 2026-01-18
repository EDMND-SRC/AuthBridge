import { newEnforcer, Enforcer } from 'casbin';
import { CasbinDynamoDBAdapter } from 'casbin-dynamodb-adapter-v3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import path from 'path';
import type { RoleName, CasbinAction, PermissionCheckResult } from '../types/rbac.js';

let enforcer: Enforcer | null = null;
let policyLoadedAt: number = 0;
const POLICY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes - reduces DynamoDB reads
const MAX_INIT_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const CASBIN_TABLE_NAME = process.env.CASBIN_TABLE_NAME || 'AuthBridgeCasbinPolicies-staging';
const CASBIN_MODEL_PATH = process.env.CASBIN_MODEL_PATH || '/var/task/casbin-model.conf';

/**
 * Get or create Casbin enforcer instance (singleton with TTL-based cache)
 * Includes retry logic for cold start resilience
 */
export async function getEnforcer(): Promise<Enforcer> {
  // Return cached enforcer if still valid
  if (enforcer && Date.now() - policyLoadedAt < POLICY_CACHE_TTL) {
    return enforcer;
  }

  // If enforcer exists but cache expired, reload policies
  if (enforcer) {
    await enforcer.loadPolicy();
    policyLoadedAt = Date.now();
    console.log('Casbin policies reloaded (cache expired)');
    return enforcer;
  }

  // Initialize new enforcer with retry logic
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_INIT_RETRIES; attempt++) {
    try {
      // Create DynamoDB client
      const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'af-south-1' });
      const docClient = DynamoDBDocumentClient.from(client);

      // Validate table exists before creating adapter
      try {
        const { DescribeTableCommand } = await import('@aws-sdk/client-dynamodb');
        await client.send(new DescribeTableCommand({ TableName: CASBIN_TABLE_NAME }));
      } catch (tableError: any) {
        if (tableError.name === 'ResourceNotFoundException') {
          throw new Error(
            `Casbin policies table '${CASBIN_TABLE_NAME}' does not exist. Run 'pnpm run init-casbin' to create policies.`
          );
        }
        throw tableError;
      }

      // Create DynamoDB adapter
      const adapter = new CasbinDynamoDBAdapter(docClient, {
        tableName: CASBIN_TABLE_NAME,
        hashKey: 'PK',
      });

      // Create enforcer with model and adapter
      enforcer = await newEnforcer(CASBIN_MODEL_PATH, adapter);

      // Load policies from DynamoDB
      await enforcer.loadPolicy();
      policyLoadedAt = Date.now();

      console.log(`Casbin enforcer initialized successfully (attempt ${attempt})`);
      return enforcer;
    } catch (error) {
      lastError = error as Error;
      console.error(
        `Failed to initialize Casbin enforcer (attempt ${attempt}/${MAX_INIT_RETRIES}):`,
        error
      );

      if (attempt < MAX_INIT_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      }
    }
  }

  throw new Error(
    `RBAC initialization failed after ${MAX_INIT_RETRIES} attempts: ${lastError?.message}`
  );
}

/**
 * Check if user has permission to perform action on resource
 *
 * @param userId - User ID to check permissions for
 * @param resource - Resource path (e.g., '/api/v1/cases/*')
 * @param action - Action to perform ('create', 'read', 'update', 'delete')
 * @returns Permission check result with allowed status, user roles, and normalized resource
 */
export async function checkPermission(
  userId: string,
  resource: string,
  action: CasbinAction
): Promise<PermissionCheckResult> {
  const e = await getEnforcer();

  // Normalize resource path (replace IDs with wildcards for matching)
  const normalizedResource = normalizeResourcePath(resource);

  // Check permission
  const allowed = await e.enforce(userId, normalizedResource, action);

  // Get user roles for audit logging
  const roles = await getUserRoles(userId);

  return {
    allowed,
    userId,
    resource: normalizedResource,
    action,
    roles: roles as RoleName[],
  };
}

/**
 * Get all roles assigned to a user
 *
 * @param userId - User ID to get roles for
 * @returns Array of role names assigned to the user
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  const e = await getEnforcer();
  return e.getRolesForUser(userId);
}

/**
 * Assign a role to a user
 *
 * @param userId - User ID to assign role to
 * @param role - Role name to assign
 */
export async function assignRole(userId: string, role: RoleName): Promise<void> {
  const e = await getEnforcer();
  await e.addRoleForUser(userId, role);
  await e.savePolicy();
}

/**
 * Remove a role from a user
 *
 * @param userId - User ID to remove role from
 * @param role - Role name to remove
 */
export async function removeRole(userId: string, role: RoleName): Promise<void> {
  const e = await getEnforcer();
  await e.deleteRoleForUser(userId, role);
  await e.savePolicy();
}

/**
 * Get all users with a specific role
 *
 * @param role - Role name to get users for
 * @returns Array of user IDs with the specified role
 */
export async function getUsersForRole(role: RoleName): Promise<string[]> {
  const e = await getEnforcer();
  return e.getUsersForRole(role);
}

/**
 * Add a policy rule
 *
 * @param subject - Subject (user or role) to add policy for
 * @param object - Resource pattern (e.g., '/api/v1/cases/*')
 * @param action - Action to allow ('create', 'read', 'update', 'delete')
 */
export async function addPolicy(
  subject: string,
  object: string,
  action: CasbinAction
): Promise<void> {
  const e = await getEnforcer();
  await e.addPolicy(subject, object, action);
  await e.savePolicy();
}

/**
 * Remove a policy rule
 *
 * @param subject - Subject (user or role) to remove policy from
 * @param object - Resource pattern (e.g., '/api/v1/cases/*')
 * @param action - Action to remove ('create', 'read', 'update', 'delete')
 */
export async function removePolicy(
  subject: string,
  object: string,
  action: CasbinAction
): Promise<void> {
  const e = await getEnforcer();
  await e.removePolicy(subject, object, action);
  await e.savePolicy();
}

/**
 * Normalize resource path for pattern matching
 * Replaces UUIDs and IDs with wildcards
 *
 * Examples:
 * - /api/v1/cases/case_abc123 to /api/v1/cases/*
 * - /api/v1/verifications/ver_xyz/documents to /api/v1/verifications/star/documents
 *
 * @param resource - Resource path to normalize
 * @returns Normalized resource path with wildcards
 */
export function normalizeResourcePath(resource: string): string {
  return (
    resource
      // Replace UUID-like patterns
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '*')
      // Replace ID patterns (prefix_alphanumeric)
      .replace(/\/(case|ver|doc|dsr|user|client|api)_[a-zA-Z0-9]+/g, '/*')
      // Replace numeric IDs
      .replace(/\/\d+/g, '/*')
  );
}

/**
 * Reload policies from DynamoDB (useful after policy changes)
 */
export async function reloadPolicies(): Promise<void> {
  const e = await getEnforcer();
  await e.loadPolicy();
  policyLoadedAt = Date.now();
  console.log('Casbin policies reloaded');
}
