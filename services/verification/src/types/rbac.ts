export type RoleName =
  | 'admin'
  | 'compliance_officer'
  | 'analyst'
  | 'reviewer'
  | 'developer'
  | 'api_user'
  | 'audit_viewer';

export type CasbinAction = 'create' | 'read' | 'update' | 'delete';

export interface RoleDefinition {
  name: RoleName;
  description: string;
  inherits?: RoleName[];
}

export interface PolicyRule {
  subject: string; // user or role
  object: string; // resource pattern
  action: CasbinAction;
}

export interface RoleAssignment {
  PK: string; // USER#{userId}
  SK: string; // ROLE#{role}
  userId: string;
  role: RoleName;
  assignedBy: string;
  assignedAt: string;
  expiresAt?: string; // optional time-based access
}

export interface CasbinPolicy {
  PK: string; // POLICY#{ptype}
  SK: string; // {v0}#{v1}#{v2}
  ptype: 'p' | 'g'; // policy or grouping
  v0: string; // subject
  v1: string; // object
  v2: string; // action
  v3?: string;
  v4?: string;
  v5?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionCheckResult {
  allowed: boolean;
  userId: string;
  resource: string;
  action: CasbinAction;
  roles: RoleName[];
  matchedPolicy?: PolicyRule;
}
