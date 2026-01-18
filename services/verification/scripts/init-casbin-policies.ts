import { DynamoDBClient, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import type { CasbinPolicy } from '../src/types/rbac.js';

const dynamodb = new DynamoDBClient({ region: 'af-south-1' });
const tableName = process.env.CASBIN_TABLE_NAME || 'AuthBridgeCasbinPolicies-staging';

/**
 * Initialize Casbin policies from docs/casbin-rbac-policies.md
 * Run this script once after deploying the Casbin table
 */
async function initializePolicies() {
  console.log('Initializing Casbin policies...');

  const policies: CasbinPolicy[] = [];
  const now = new Date().toISOString();

  // Role inheritance (g = role, parent_role)
  const roleInheritance = [
    ['admin', 'compliance_officer'],
    ['admin', 'analyst'],
    ['admin', 'developer'],
    ['compliance_officer', 'audit_viewer'],
    ['analyst', 'reviewer'],
  ];

  roleInheritance.forEach(([role, parent]) => {
    policies.push({
      PK: 'POLICY#g',
      SK: `${role}#${parent}`,
      ptype: 'g',
      v0: role,
      v1: parent,
      createdAt: now,
      updatedAt: now,
    });
  });

  // Admin policies (full access)
  policies.push(
    {
      PK: 'POLICY#p',
      SK: 'admin#/api/v1/*#create',
      ptype: 'p',
      v0: 'admin',
      v1: '/api/v1/*',
      v2: 'create',
      createdAt: now,
      updatedAt: now,
    },
    {
      PK: 'POLICY#p',
      SK: 'admin#/api/v1/*#read',
      ptype: 'p',
      v0: 'admin',
      v1: '/api/v1/*',
      v2: 'read',
      createdAt: now,
      updatedAt: now,
    },
    {
      PK: 'POLICY#p',
      SK: 'admin#/api/v1/*#update',
      ptype: 'p',
      v0: 'admin',
      v1: '/api/v1/*',
      v2: 'update',
      createdAt: now,
      updatedAt: now,
    },
    {
      PK: 'POLICY#p',
      SK: 'admin#/api/v1/*#delete',
      ptype: 'p',
      v0: 'admin',
      v1: '/api/v1/*',
      v2: 'delete',
      createdAt: now,
      updatedAt: now,
    }
  );

  // Compliance Officer policies
  const compliancePolicies = [
    ['compliance_officer', '/api/v1/audit', 'read'],
    ['compliance_officer', '/api/v1/audit/*', 'read'],
    ['compliance_officer', '/api/v1/audit/export', 'create'],
    ['compliance_officer', '/api/v1/data-requests', 'read'],
    ['compliance_officer', '/api/v1/data-requests', 'create'],
    ['compliance_officer', '/api/v1/data-requests/*', 'read'],
    ['compliance_officer', '/api/v1/data-requests/*/approve', 'update'],
    ['compliance_officer', '/api/v1/reports', 'read'],
    ['compliance_officer', '/api/v1/reports/*', 'read'],
    ['compliance_officer', '/api/v1/reports/export', 'create'],
    ['compliance_officer', '/api/v1/cases', 'read'],
    ['compliance_officer', '/api/v1/cases/*', 'read'],
  ];

  compliancePolicies.forEach(([subject, object, action]) => {
    policies.push({
      PK: 'POLICY#p',
      SK: `${subject}#${object}#${action}`,
      ptype: 'p',
      v0: subject,
      v1: object,
      v2: action,
      createdAt: now,
      updatedAt: now,
    });
  });

  // Analyst policies
  const analystPolicies = [
    ['analyst', '/api/v1/cases', 'read'],
    ['analyst', '/api/v1/cases/*', 'read'],
    ['analyst', '/api/v1/cases/*/approve', 'update'],
    ['analyst', '/api/v1/cases/*/reject', 'update'],
    ['analyst', '/api/v1/cases/*/notes', 'read'],
    ['analyst', '/api/v1/cases/*/notes', 'create'],
    ['analyst', '/api/v1/cases/*/assign', 'update'],
    ['analyst', '/api/v1/cases/bulk-approve', 'update'],
    ['analyst', '/api/v1/cases/bulk-reject', 'update'],
    ['analyst', '/api/v1/verifications/*', 'read'],
    ['analyst', '/api/v1/verifications/*/documents', 'read'],
    ['analyst', '/api/v1/verifications/*/documents/*', 'read'],
    ['analyst', '/api/v1/dashboard', 'read'],
    ['analyst', '/api/v1/dashboard/*', 'read'],
  ];

  analystPolicies.forEach(([subject, object, action]) => {
    policies.push({
      PK: 'POLICY#p',
      SK: `${subject}#${object}#${action}`,
      ptype: 'p',
      v0: subject,
      v1: object,
      v2: action,
      createdAt: now,
      updatedAt: now,
    });
  });

  // Reviewer policies
  const reviewerPolicies = [
    ['reviewer', '/api/v1/cases', 'read'],
    ['reviewer', '/api/v1/cases/*', 'read'],
    ['reviewer', '/api/v1/cases/*/notes', 'read'],
    ['reviewer', '/api/v1/cases/*/notes', 'create'],
    ['reviewer', '/api/v1/verifications/*', 'read'],
    ['reviewer', '/api/v1/verifications/*/documents', 'read'],
  ];

  reviewerPolicies.forEach(([subject, object, action]) => {
    policies.push({
      PK: 'POLICY#p',
      SK: `${subject}#${object}#${action}`,
      ptype: 'p',
      v0: subject,
      v1: object,
      v2: action,
      createdAt: now,
      updatedAt: now,
    });
  });

  // Developer policies
  const developerPolicies = [
    ['developer', '/api/v1/api-keys', 'read'],
    ['developer', '/api/v1/api-keys', 'create'],
    ['developer', '/api/v1/api-keys/*', 'read'],
    ['developer', '/api/v1/api-keys/*', 'delete'],
    ['developer', '/api/v1/api-keys/*/rotate', 'update'],
    ['developer', '/api/v1/verifications', 'create'],
    ['developer', '/api/v1/verifications', 'read'],
    ['developer', '/api/v1/verifications/*', 'read'],
    ['developer', '/api/v1/verifications/*/documents', 'create'],
    ['developer', '/api/v1/verifications/*/submit', 'update'],
    ['developer', '/api/v1/webhooks/configure', 'update'],
    ['developer', '/api/v1/webhooks/test', 'create'],
    ['developer', '/api/v1/usage', 'read'],
    ['developer', '/api/v1/usage/*', 'read'],
  ];

  developerPolicies.forEach(([subject, object, action]) => {
    policies.push({
      PK: 'POLICY#p',
      SK: `${subject}#${object}#${action}`,
      ptype: 'p',
      v0: subject,
      v1: object,
      v2: action,
      createdAt: now,
      updatedAt: now,
    });
  });

  // API User policies
  const apiUserPolicies = [
    ['api_user', '/api/v1/verifications', 'create'],
    ['api_user', '/api/v1/verifications/*', 'read'],
    ['api_user', '/api/v1/verifications/*/documents', 'create'],
    ['api_user', '/api/v1/webhooks/configure', 'update'],
  ];

  apiUserPolicies.forEach(([subject, object, action]) => {
    policies.push({
      PK: 'POLICY#p',
      SK: `${subject}#${object}#${action}`,
      ptype: 'p',
      v0: subject,
      v1: object,
      v2: action,
      createdAt: now,
      updatedAt: now,
    });
  });

  // Audit Viewer policies
  const auditViewerPolicies = [
    ['audit_viewer', '/api/v1/audit', 'read'],
    ['audit_viewer', '/api/v1/audit/*', 'read'],
  ];

  auditViewerPolicies.forEach(([subject, object, action]) => {
    policies.push({
      PK: 'POLICY#p',
      SK: `${subject}#${object}#${action}`,
      ptype: 'p',
      v0: subject,
      v1: object,
      v2: action,
      createdAt: now,
      updatedAt: now,
    });
  });

  // Batch write policies to DynamoDB (25 items per batch)
  const batchSize = 25;
  for (let i = 0; i < policies.length; i += batchSize) {
    const batch = policies.slice(i, i + batchSize);

    await dynamodb.send(
      new BatchWriteItemCommand({
        RequestItems: {
          [tableName]: batch.map(policy => ({
            PutRequest: {
              Item: marshall(policy, { removeUndefinedValues: true }),
            },
          })),
        },
      })
    );

    console.log(`Wrote batch ${Math.floor(i / batchSize) + 1} (${batch.length} policies)`);
  }

  console.log(`✅ Successfully initialized ${policies.length} Casbin policies`);
}

// Run initialization
initializePolicies()
  .then(() => {
    console.log('Policy initialization complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Policy initialization failed:', error);
    process.exit(1);
  });
