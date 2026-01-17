# Casbin RBAC Policy Definitions

## Overview

AuthBridge uses [Casbin](https://casbin.org/) for Role-Based Access Control (RBAC). This document defines all roles, permissions, and policies for the system.

## Model Definition

```ini
# casbin-model.conf
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && keyMatch2(r.obj, p.obj) && r.act == p.act
```

## Roles Hierarchy

```
                    ┌─────────────┐
                    │   admin     │
                    │ (superuser) │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │  compliance │ │   analyst   │ │  developer  │
    │   officer   │ │             │ │             │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           │        ┌──────▼──────┐        │
           │        │   reviewer  │        │
           │        └─────────────┘        │
           │                               │
    ┌──────▼──────┐                 ┌──────▼──────┐
    │ audit_viewer│                 │  api_user   │
    └─────────────┘                 └─────────────┘
```

## Role Definitions

### admin (Superuser)
Full system access. Can manage users, configure system settings, and access all data.

### compliance_officer
Access to audit logs, data export/deletion, and compliance reports. Cannot modify verification decisions.

### analyst
Can review and make decisions on verification cases. Full case management access.

### reviewer
Can view cases and add notes, but cannot approve/reject. Read-only case access.

### developer
API access for integration. Can create verifications and upload documents via API.

### api_user
Limited API access. Can only access their own client's data.

### audit_viewer
Read-only access to audit logs. Cannot access case data.

---

## Policy Definitions

### Policy CSV Format

```csv
# casbin-policy.csv

# =============================================================================
# Role Inheritance (g = role, parent_role)
# =============================================================================
g, admin, compliance_officer
g, admin, analyst
g, admin, developer
g, compliance_officer, audit_viewer
g, analyst, reviewer

# =============================================================================
# Admin Policies
# =============================================================================
p, admin, /api/v1/*, *
p, admin, /admin/*, *

# =============================================================================
# Compliance Officer Policies
# =============================================================================
# Audit logs - full access
p, compliance_officer, /api/v1/audit-logs, read
p, compliance_officer, /api/v1/audit-logs/*, read
p, compliance_officer, /api/v1/audit-logs/export, create

# Data requests - full access
p, compliance_officer, /api/v1/data-requests, read
p, compliance_officer, /api/v1/data-requests, create
p, compliance_officer, /api/v1/data-requests/*, read
p, compliance_officer, /api/v1/data-requests/*/approve, update

# Reports - full access
p, compliance_officer, /api/v1/reports, read
p, compliance_officer, /api/v1/reports/*, read
p, compliance_officer, /api/v1/reports/export, create

# Cases - read only (no decisions)
p, compliance_officer, /api/v1/cases, read
p, compliance_officer, /api/v1/cases/*, read

# =============================================================================
# Analyst Policies
# =============================================================================
# Cases - full management
p, analyst, /api/v1/cases, read
p, analyst, /api/v1/cases/*, read
p, analyst, /api/v1/cases/*/approve, update
p, analyst, /api/v1/cases/*/reject, update
p, analyst, /api/v1/cases/*/notes, read
p, analyst, /api/v1/cases/*/notes, create
p, analyst, /api/v1/cases/*/assign, update
p, analyst, /api/v1/cases/bulk-approve, update
p, analyst, /api/v1/cases/bulk-reject, update

# Verifications - read only
p, analyst, /api/v1/verifications/*, read

# Documents - read only
p, analyst, /api/v1/verifications/*/documents, read
p, analyst, /api/v1/verifications/*/documents/*, read

# Dashboard metrics
p, analyst, /api/v1/dashboard, read
p, analyst, /api/v1/dashboard/*, read

# =============================================================================
# Reviewer Policies
# =============================================================================
# Cases - read and notes only
p, reviewer, /api/v1/cases, read
p, reviewer, /api/v1/cases/*, read
p, reviewer, /api/v1/cases/*/notes, read
p, reviewer, /api/v1/cases/*/notes, create

# Verifications - read only
p, reviewer, /api/v1/verifications/*, read

# Documents - read only
p, reviewer, /api/v1/verifications/*/documents, read

# =============================================================================
# Developer Policies (API Integration)
# =============================================================================
# API Keys - manage own keys
p, developer, /api/v1/api-keys, read
p, developer, /api/v1/api-keys, create
p, developer, /api/v1/api-keys/*, read
p, developer, /api/v1/api-keys/*, delete
p, developer, /api/v1/api-keys/*/rotate, update

# Verifications - full CRUD
p, developer, /api/v1/verifications, create
p, developer, /api/v1/verifications, read
p, developer, /api/v1/verifications/*, read
p, developer, /api/v1/verifications/*/documents, create
p, developer, /api/v1/verifications/*/submit, update

# Webhooks - configure
p, developer, /api/v1/webhooks/configure, update
p, developer, /api/v1/webhooks/test, create

# Usage & billing
p, developer, /api/v1/usage, read
p, developer, /api/v1/usage/*, read

# =============================================================================
# API User Policies (Limited API Access)
# =============================================================================
# Verifications - own client only
p, api_user, /api/v1/verifications, create
p, api_user, /api/v1/verifications/*, read
p, api_user, /api/v1/verifications/*/documents, create

# Webhooks - configure own
p, api_user, /api/v1/webhooks/configure, update

# =============================================================================
# Audit Viewer Policies
# =============================================================================
p, audit_viewer, /api/v1/audit-logs, read
p, audit_viewer, /api/v1/audit-logs/*, read
```

---

## Resource Patterns

| Pattern | Description | Example |
|---------|-------------|---------|
| `/api/v1/cases` | All cases | List cases |
| `/api/v1/cases/*` | Single case | Get case by ID |
| `/api/v1/cases/*/approve` | Approve action | Approve case |
| `/api/v1/cases/*/notes` | Case notes | Add/read notes |
| `/api/v1/verifications` | All verifications | Create verification |
| `/api/v1/verifications/*` | Single verification | Get status |
| `/api/v1/verifications/*/documents` | Documents | Upload document |

## Actions

| Action | HTTP Method | Description |
|--------|-------------|-------------|
| `create` | POST | Create new resource |
| `read` | GET | Read resource(s) |
| `update` | PUT/PATCH/POST | Update resource |
| `delete` | DELETE | Delete resource |

---

## Implementation

### TypeScript Enforcer

```typescript
// services/shared/src/rbac/enforcer.ts
import { newEnforcer, Enforcer } from 'casbin';
import { DynamoDBAdapter } from 'casbin-dynamodb-adapter';

let enforcer: Enforcer | null = null;

export async function getEnforcer(): Promise<Enforcer> {
  if (enforcer) return enforcer;

  const adapter = new DynamoDBAdapter({
    tableName: 'AuthBridgeCasbinPolicies',
    region: 'af-south-1',
  });

  enforcer = await newEnforcer('casbin-model.conf', adapter);
  return enforcer;
}

export async function checkPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const e = await getEnforcer();
  return e.enforce(userId, resource, action);
}

export async function getUserRoles(userId: string): Promise<string[]> {
  const e = await getEnforcer();
  return e.getRolesForUser(userId);
}

export async function assignRole(userId: string, role: string): Promise<void> {
  const e = await getEnforcer();
  await e.addRoleForUser(userId, role);
}

export async function removeRole(userId: string, role: string): Promise<void> {
  const e = await getEnforcer();
  await e.deleteRoleForUser(userId, role);
}
```

### Middleware

```typescript
// services/shared/src/middleware/rbac.ts
import { APIGatewayProxyEvent } from 'aws-lambda';
import { checkPermission } from '../rbac/enforcer.js';
import { ForbiddenError } from '../utils/errors.js';

export function requirePermission(resource: string, action: string) {
  return async (event: APIGatewayProxyEvent): Promise<void> => {
    const userId = event.requestContext.authorizer?.userId;

    if (!userId) {
      throw new ForbiddenError('User not authenticated');
    }

    // Replace path parameters with wildcards for matching
    const normalizedResource = resource
      .replace(/{[^}]+}/g, '*');

    const allowed = await checkPermission(userId, normalizedResource, action);

    if (!allowed) {
      throw new ForbiddenError(
        `Permission denied: ${action} on ${resource}`,
        { userId, resource, action }
      );
    }
  };
}
```

### Handler Usage

```typescript
// services/verification/src/handlers/approve-case.ts
import { requirePermission } from '@authbridge/shared/middleware/rbac';

export async function handler(event: APIGatewayProxyEvent) {
  // Check permission before processing
  await requirePermission('/api/v1/cases/*/approve', 'update')(event);

  // ... rest of handler logic
}
```

---

## DynamoDB Schema for Policies

### Casbin Policy Table

```
TableName: AuthBridgeCasbinPolicies

PK: POLICY#{ptype}
SK: {v0}#{v1}#{v2}

Attributes:
- ptype: "p" | "g" (policy or grouping)
- v0: subject (user or role)
- v1: object (resource pattern)
- v2: action
- v3-v5: additional fields (optional)
- createdAt: string
- updatedAt: string
```

### User Role Assignment

```
PK: USER#{userId}
SK: ROLE#{role}

Attributes:
- userId: string
- role: string
- assignedBy: string
- assignedAt: string
```

---

## Default Role Assignments

| User Type | Default Role | Notes |
|-----------|--------------|-------|
| System Admin | admin | First user, manual assignment |
| Compliance Team | compliance_officer | Assigned by admin |
| Case Reviewers | analyst | Assigned by admin |
| Junior Reviewers | reviewer | Assigned by admin |
| API Clients | api_user | Auto-assigned on API key creation |
| Developers | developer | Assigned by admin |

---

## Audit Logging

All permission checks are logged:

```json
{
  "timestamp": "2026-01-16T12:00:00Z",
  "eventType": "rbac.permission_check",
  "userId": "user_abc123",
  "resource": "/api/v1/cases/case_xyz/approve",
  "action": "update",
  "result": "allowed",
  "roles": ["analyst"],
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

---

## Security Considerations

1. **Principle of Least Privilege** - Users get minimum required permissions
2. **Role Separation** - Compliance cannot make case decisions
3. **Audit Trail** - All permission checks logged
4. **No Direct Policy Modification** - Only admin can modify policies
5. **Client Isolation** - API users can only access their own data
6. **MFA for Admin** - Admin role requires MFA

---

## Migration Plan

### Phase 1: Core Roles (Epic 5)
- [ ] Deploy Casbin policy table
- [ ] Implement enforcer service
- [ ] Add middleware to all handlers
- [ ] Create admin, analyst, api_user roles

### Phase 2: Extended Roles (Epic 6)
- [ ] Add compliance_officer role
- [ ] Add reviewer role
- [ ] Add audit_viewer role
- [ ] Implement role management UI

### Phase 3: Fine-Grained Permissions (Phase 2)
- [ ] Client-specific permissions
- [ ] Resource-level permissions
- [ ] Time-based access controls

---

_Document Version: 1.0_
_Last Updated: 2026-01-16_
_Author: Winston (Architect)_
