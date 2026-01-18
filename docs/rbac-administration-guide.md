# RBAC Administration Guide

**Document Version:** 1.0
**Created:** 2026-01-18
**Owner:** Charlie (Senior Dev)
**Audience:** System Administrators, DevOps Engineers

---

## Overview

AuthBridge uses **Casbin** for Role-Based Access Control (RBAC) with policies stored in DynamoDB. This guide covers how to manage roles, permissions, and policies in production.

---

## Table of Contents

1. [RBAC Model Overview](#rbac-model-overview)
2. [Role Definitions](#role-definitions)
3. [Permission Matrix](#permission-matrix)
4. [Managing Roles](#managing-roles)
5. [Managing Policies](#managing-policies)
6. [User Role Assignment](#user-role-assignment)
7. [Troubleshooting](#troubleshooting)
8. [Security Best Practices](#security-best-practices)

---

## RBAC Model Overview

**Casbin Model:** `services/verification/casbin-model.conf`

```ini
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
```

**Key Concepts:**
- **Subject (sub):** User role (e.g., `admin`, `analyst`)
- **Object (obj):** Resource type (e.g., `case`, `document`, `audit`)
- **Action (act):** Operation (e.g., `view`, `approve`, `reject`)
- **Role Hierarchy (g):** Role inheritance (e.g., `admin` inherits `analyst` permissions)

---

## Role Definitions

### 1. Admin
**Description:** Full system access, can manage users and configure system settings.

**Permissions:**
- All case operations (view, approve, reject, assign, note, export, delete)
- All document operations (view, download, delete)
- All user operations (create, update, delete, assign roles)
- All audit operations (view, export)
- All webhook operations (configure, test, delete)
- All API key operations (create, rotate, revoke)

**Use Cases:**
- System administrators
- Compliance managers
- Technical leads

---

### 2. Analyst
**Description:** Can review and approve/reject verification cases.

**Permissions:**
- View cases
- Approve cases
- Reject cases
- Add notes to cases
- View documents
- View audit logs (own actions only)

**Use Cases:**
- Verification analysts
- Compliance officers
- Case reviewers

---

### 3. Reviewer
**Description:** Read-only access to cases and documents for quality assurance.

**Permissions:**
- View cases
- View documents
- View audit logs (own actions only)

**Use Cases:**
- Quality assurance team
- Auditors
- Supervisors

---

### 4. API User
**Description:** Programmatic access via API keys for client integrations.

**Permissions:**
- Create verifications
- Upload documents
- Get verification status
- Configure webhooks (own client only)

**Use Cases:**
- Client applications
- Third-party integrations
- Automated systems

---

### 5. Support
**Description:** Customer support access to view cases and assist users.

**Permissions:**
- View cases
- View documents
- Add notes to cases
- View audit logs (own actions only)

**Use Cases:**
- Customer support agents
- Help desk staff

---

### 6. Compliance Officer
**Description:** Specialized role for compliance and audit functions.

**Permissions:**
- View all cases
- View all documents
- View all audit logs
- Export audit logs
- Export case data
- Cannot approve/reject cases (separation of duties)

**Use Cases:**
- Compliance team
- Internal auditors
- Regulatory reporting

---

### 7. Developer
**Description:** Technical access for debugging and system maintenance.

**Permissions:**
- View cases
- View documents
- View audit logs
- View system metrics
- Cannot modify case data

**Use Cases:**
- Software developers
- DevOps engineers
- Technical support

---

## Permission Matrix

| Resource | Action | Admin | Analyst | Reviewer | API User | Support | Compliance | Developer |
|----------|--------|-------|---------|----------|----------|---------|------------|-----------|
| **Case** | view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Case** | approve | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Case** | reject | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Case** | assign | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Case** | note | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Case** | export | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Case** | delete | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Document** | view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Document** | download | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| **Document** | delete | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **User** | view | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **User** | create | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **User** | update | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **User** | delete | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **User** | assign_role | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Audit** | view | ✅ | ✅* | ✅* | ❌ | ✅* | ✅ | ✅ |
| **Audit** | export | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Webhook** | configure | ✅ | ❌ | ❌ | ✅* | ❌ | ❌ | ❌ |
| **Webhook** | test | ✅ | ❌ | ❌ | ✅* | ❌ | ❌ | ❌ |
| **Webhook** | delete | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **API Key** | create | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **API Key** | rotate | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **API Key** | revoke | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Notes:**
- ✅ = Allowed
- ❌ = Denied
- ✅* = Allowed with restrictions (own actions only, own client only)

---

## Managing Roles

### View All Roles

```bash
# Using AWS CLI to query DynamoDB
aws dynamodb query \
  --table-name AuthBridgeTable \
  --index-name GSI1 \
  --key-condition-expression "GSI1PK = :pk" \
  --expression-attribute-values '{":pk":{"S":"ROLE#"}}' \
  --region af-south-1
```

### Add a New Role

**Step 1: Define role in Casbin policies**

```typescript
// services/verification/scripts/add-role.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBAdapter } from '../src/services/casbin-adapter';
import * as casbin from 'casbin';

async function addRole(roleName: string, permissions: Array<[string, string]>) {
  const adapter = new DynamoDBAdapter(
    new DynamoDBClient({ region: 'af-south-1' }),
    'AuthBridgeTable'
  );

  const enforcer = await casbin.newEnforcer('casbin-model.conf', adapter);

  // Add permissions for the role
  for (const [resource, action] of permissions) {
    await enforcer.addPolicy(roleName, resource, action);
  }

  console.log(`Role ${roleName} created with ${permissions.length} permissions`);
}

// Example: Add "auditor" role
addRole('auditor', [
  ['case', 'view'],
  ['document', 'view'],
  ['audit', 'view'],
  ['audit', 'export'],
]).catch(console.error);
```

**Step 2: Run the script**

```bash
cd services/verification
npx ts-node scripts/add-role.ts
```

---

## Managing Policies

### View All Policies

```typescript
// services/verification/scripts/list-policies.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBAdapter } from '../src/services/casbin-adapter';
import * as casbin from 'casbin';

async function listPolicies() {
  const adapter = new DynamoDBAdapter(
    new DynamoDBClient({ region: 'af-south-1' }),
    'AuthBridgeTable'
  );

  const enforcer = await casbin.newEnforcer('casbin-model.conf', adapter);
  const policies = await enforcer.getPolicy();

  console.log('Current Policies:');
  console.table(policies.map(p => ({ role: p[0], resource: p[1], action: p[2] })));
}

listPolicies().catch(console.error);
```

### Add a Policy

```typescript
// Add permission for analyst to export cases
await enforcer.addPolicy('analyst', 'case', 'export');
```

### Remove a Policy

```typescript
// Remove permission for analyst to export cases
await enforcer.removePolicy('analyst', 'case', 'export');
```

### Add Role Inheritance

```typescript
// Make admin inherit all analyst permissions
await enforcer.addRoleForUser('admin', 'analyst');
```

---

## User Role Assignment

### Assign Role to User

```typescript
// services/verification/scripts/assign-role.ts
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';

async function assignRole(userId: string, role: string) {
  const dynamodb = new DynamoDBClient({ region: 'af-south-1' });

  await dynamodb.send(new UpdateItemCommand({
    TableName: 'AuthBridgeTable',
    Key: {
      PK: { S: `USER#${userId}` },
      SK: { S: 'META' }
    },
    UpdateExpression: 'SET #role = :role, updatedAt = :now',
    ExpressionAttributeNames: {
      '#role': 'role'
    },
    ExpressionAttributeValues: {
      ':role': { S: role },
      ':now': { S: new Date().toISOString() }
    }
  }));

  console.log(`User ${userId} assigned role: ${role}`);
}

// Example: Assign analyst role to user
assignRole('user_123', 'analyst').catch(console.error);
```

### View User's Role

```bash
aws dynamodb get-item \
  --table-name AuthBridgeTable \
  --key '{"PK":{"S":"USER#user_123"},"SK":{"S":"META"}}' \
  --region af-south-1 \
  --query 'Item.role.S'
```

### Revoke Role from User

```typescript
// Set role to null or assign a different role
await assignRole('user_123', 'reviewer');
```

---

## Troubleshooting

### Issue: User Cannot Access Resource

**Symptoms:** 403 Forbidden error when user tries to access a resource.

**Diagnosis:**
1. Check user's role assignment
2. Verify role has required permission
3. Check Casbin policy cache (5-minute TTL)

**Solution:**
```bash
# 1. Check user's role
aws dynamodb get-item \
  --table-name AuthBridgeTable \
  --key '{"PK":{"S":"USER#user_123"},"SK":{"S":"META"}}' \
  --region af-south-1

# 2. List policies for role
npx ts-node scripts/list-policies.ts | grep analyst

# 3. Wait for cache to expire (5 minutes) or restart Lambda
```

---

### Issue: Policy Changes Not Taking Effect

**Symptoms:** Policy changes made but permissions still denied.

**Cause:** Casbin enforcer caches policies for 5 minutes.

**Solution:**
1. Wait 5 minutes for cache to expire
2. OR restart Lambda function to force reload
3. OR reduce `POLICY_CACHE_TTL` in `rbac.ts` (not recommended for production)

```bash
# Force Lambda restart by updating environment variable
aws lambda update-function-configuration \
  --function-name authbridge-verification-staging-approveCase \
  --environment Variables={FORCE_RESTART=true} \
  --region af-south-1
```

---

### Issue: Duplicate Policies

**Symptoms:** Same policy appears multiple times in DynamoDB.

**Cause:** Policy added multiple times without checking existence.

**Solution:**
```typescript
// Always check before adding
const exists = await enforcer.hasPolicy('analyst', 'case', 'export');
if (!exists) {
  await enforcer.addPolicy('analyst', 'case', 'export');
}
```

---

## Security Best Practices

### 1. Principle of Least Privilege
- Assign users the minimum role required for their job function
- Regularly review and audit role assignments
- Remove roles when users change responsibilities

### 2. Separation of Duties
- Compliance officers cannot approve/reject cases
- Analysts cannot manage users or API keys
- Developers cannot modify production data

### 3. Role Expiry
- Set expiry dates for temporary role assignments
- Implement automated role revocation for inactive users
- Review role assignments quarterly

### 4. Audit All Role Changes
- Log all role assignments in audit trail
- Require approval for admin role assignments
- Monitor for unauthorized role escalation

### 5. Multi-Factor Authentication
- Require MFA for admin role access
- Enforce MFA for sensitive operations (user management, API key creation)

### 6. Regular Policy Reviews
- Review policies quarterly for unnecessary permissions
- Remove unused roles
- Update policies based on security incidents

---

## API Reference

### Check Permission

```typescript
import { RBACMiddleware } from '../middleware/rbac';

const rbac = new RBACMiddleware();
const allowed = await rbac.checkPermission(userId, 'case', 'approve');

if (!allowed) {
  return {
    statusCode: 403,
    body: JSON.stringify({ error: 'Permission denied' })
  };
}
```

### Require Permission (Middleware)

```typescript
import { requirePermission } from '../middleware/rbac';

export const handler = middy(async (event) => {
  // Handler logic - permission already checked
})
  .use(requirePermission('case', 'approve'));
```

---

## References

- [Casbin Documentation](https://casbin.org/docs/overview)
- [Story 5.4: IAM & Access Control](_bmad-output/implementation-artifacts/5-4-iam-access-control.md)
- [Casbin Model Configuration](services/verification/casbin-model.conf)
- [DynamoDB Adapter Implementation](services/verification/src/services/casbin-adapter.ts)

---

## Appendix: Complete Policy List

```typescript
// services/verification/scripts/init-casbin-policies.ts
export const DEFAULT_POLICIES = [
  // Admin - Full access
  ['admin', 'case', 'view'],
  ['admin', 'case', 'approve'],
  ['admin', 'case', 'reject'],
  ['admin', 'case', 'assign'],
  ['admin', 'case', 'note'],
  ['admin', 'case', 'export'],
  ['admin', 'case', 'delete'],
  ['admin', 'document', 'view'],
  ['admin', 'document', 'download'],
  ['admin', 'document', 'delete'],
  ['admin', 'user', 'view'],
  ['admin', 'user', 'create'],
  ['admin', 'user', 'update'],
  ['admin', 'user', 'delete'],
  ['admin', 'user', 'assign_role'],
  ['admin', 'audit', 'view'],
  ['admin', 'audit', 'export'],
  ['admin', 'webhook', 'configure'],
  ['admin', 'webhook', 'test'],
  ['admin', 'webhook', 'delete'],
  ['admin', 'api_key', 'create'],
  ['admin', 'api_key', 'rotate'],
  ['admin', 'api_key', 'revoke'],

  // Analyst - Case review and approval
  ['analyst', 'case', 'view'],
  ['analyst', 'case', 'approve'],
  ['analyst', 'case', 'reject'],
  ['analyst', 'case', 'note'],
  ['analyst', 'document', 'view'],
  ['analyst', 'document', 'download'],
  ['analyst', 'audit', 'view'],

  // Reviewer - Read-only access
  ['reviewer', 'case', 'view'],
  ['reviewer', 'document', 'view'],
  ['reviewer', 'audit', 'view'],

  // API User - Programmatic access
  ['api_user', 'case', 'view'],
  ['api_user', 'case', 'create'],
  ['api_user', 'document', 'upload'],
  ['api_user', 'webhook', 'configure'],

  // Support - Customer assistance
  ['support', 'case', 'view'],
  ['support', 'case', 'note'],
  ['support', 'document', 'view'],
  ['support', 'document', 'download'],
  ['support', 'audit', 'view'],

  // Compliance Officer - Audit and export
  ['compliance', 'case', 'view'],
  ['compliance', 'case', 'export'],
  ['compliance', 'document', 'view'],
  ['compliance', 'document', 'download'],
  ['compliance', 'audit', 'view'],
  ['compliance', 'audit', 'export'],

  // Developer - Technical access
  ['developer', 'case', 'view'],
  ['developer', 'document', 'view'],
  ['developer', 'audit', 'view'],
];

// Role hierarchy (inheritance)
export const ROLE_HIERARCHY = [
  ['admin', 'analyst'],  // Admin inherits all analyst permissions
];
```

---

_Last Updated: 2026-01-18_
_Next Review: Quarterly or after security incidents_
