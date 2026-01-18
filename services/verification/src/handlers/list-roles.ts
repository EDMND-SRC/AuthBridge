import middy from '@middy/core';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { auditContextMiddleware } from '../middleware/audit-context.js';
import { securityHeadersMiddleware } from '../middleware/security-headers.js';
import { requirePermission } from '../middleware/rbac.js';
import type { RoleDefinition } from '../types/rbac.js';

const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    name: 'admin',
    description:
      'Full system access. Can manage users, configure system settings, and access all data.',
    inherits: ['compliance_officer', 'analyst', 'developer'],
  },
  {
    name: 'compliance_officer',
    description:
      'Access to audit logs, data export/deletion, and compliance reports. Cannot modify verification decisions.',
    inherits: ['audit_viewer'],
  },
  {
    name: 'analyst',
    description: 'Can review and make decisions on verification cases. Full case management access.',
    inherits: ['reviewer'],
  },
  {
    name: 'reviewer',
    description: 'Can view cases and add notes, but cannot approve/reject. Read-only case access.',
  },
  {
    name: 'developer',
    description: 'API access for integration. Can create verifications and upload documents via API.',
  },
  {
    name: 'api_user',
    description: "Limited API access. Can only access their own client's data.",
  },
  {
    name: 'audit_viewer',
    description: 'Read-only access to audit logs. Cannot access case data.',
  },
];

async function baseHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    return {
      statusCode: 200,
      body: JSON.stringify({
        roles: ROLE_DEFINITIONS,
        meta: {
          timestamp: new Date().toISOString(),
        },
      }),
    };
  } catch (error) {
    console.error('Error listing roles:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to list roles' }),
    };
  }
}

export const handler = middy(baseHandler)
  .use(auditContextMiddleware())
  .use(requirePermission('/api/v1/roles', 'read'))
  .use(securityHeadersMiddleware());
