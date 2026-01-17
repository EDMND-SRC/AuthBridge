# Story 5.2: Comprehensive Audit Logging

Status: ready-for-dev

## Story

As a compliance officer,
I want complete audit trails for all actions,
So that I can demonstrate compliance to regulators.

## Acceptance Criteria

1. **Given** any action occurs in the system
   **When** the action completes
   **Then** an audit log entry is created with: timestamp, user ID, action type, resource ID, IP address
   **And** audit logs are immutable (append-only)
   **And** logs are retained for 5 years
   **And** audit logs are queryable by date range and user

## Quick Reference

| Item | Value |
|------|-------|
| KMS Key | `AuditLogEncryptionKey` (already exists in `kms-keys.yml`) |
| Log Group | `/aws/lambda/authbridge-verification-${stage}/audit` |
| Retention | 1825 days (5 years) for DPA 2024 compliance |
| Storage | DynamoDB + CloudWatch Logs (dual write) |
| Query Methods | DynamoDB GSI (fast), CloudWatch Insights (detailed) |
| Actions Tracked | 40+ actions across verification, case management, user actions |
| Encryption | All audit logs encrypted with dedicated KMS key |
| GSI Numbers | GSI5 (by user), GSI6 (by resource), GSI7 (by action) |
| Existing Handlers | 18 handlers exist, 5 need creation |

## Quick Decision Tree

**Which audit method to use?**
```
Handler Type → Audit Method
├─ Case action (approve/reject/assign/note) → logCase[Action]
├─ Document action (upload/view/download) → logDocument[Action]
├─ User action (login/logout/role change) → logUser[Action]
├─ Webhook action (configure/send/retry) → logWebhook[Action]
├─ API key action (create/rotate/revoke) → logApiKey[Action]
└─ System error (auth/permission) → logUnauthorizedAccess / logPermissionDenied
```

## Tasks / Subtasks

- [ ] Task 1: Expand AuditService for All Actions (AC: #1)
  - [ ] Subtask 1.1: Add case management actions (approve, reject, assign, note)
  - [ ] Subtask 1.2: Add user actions (login, logout, permission change)
  - [ ] Subtask 1.3: Add document actions (upload, view, download, delete)
  - [ ] Subtask 1.4: Add webhook actions (configure, send, retry, fail)
  - [ ] Subtask 1.5: Add API key actions (create, rotate, revoke)

- [ ] Task 2: DynamoDB Audit Trail Storage (AC: #1)
  - [ ] Subtask 2.1: Create audit table schema with GSI for user/date queries
  - [ ] Subtask 2.2: Implement dual-write (DynamoDB + CloudWatch Logs)
  - [ ] Subtask 2.3: Add TTL for 5-year retention (1825 days)
  - [ ] Subtask 2.4: Enable point-in-time recovery (PITR)
  - [ ] Subtask 2.5: Configure encryption with AuditLogEncryptionKey

- [ ] Task 3: IP Address and User Context Capture (AC: #1)
  - [ ] Subtask 3.1: Create middleware to extract IP from API Gateway event
  - [ ] Subtask 3.2: Extract user ID from JWT token or API key
  - [ ] Subtask 3.3: Add request context to all audit log entries
  - [ ] Subtask 3.4: Handle anonymous actions (webhook callbacks, system events)
  - [ ] Subtask 3.5: Add user agent and client ID to metadata

- [ ] Task 4: Audit Query API (AC: #1)
  - [ ] Subtask 4.1: Create GET /api/v1/audit endpoint with filters
  - [ ] Subtask 4.2: Support query by date range (required)
  - [ ] Subtask 4.3: Support query by user ID (optional)
  - [ ] Subtask 4.4: Support query by action type (optional)
  - [ ] Subtask 4.5: Support query by resource ID (optional)
  - [ ] Subtask 4.6: Add pagination (limit 100 per page)
  - [ ] Subtask 4.7: Return results sorted by timestamp descending

- [ ] Task 5: Immutability Enforcement (AC: #1)
  - [ ] Subtask 5.1: Remove update/delete permissions from IAM policies
  - [ ] Subtask 5.2: Add DynamoDB condition to prevent overwrites
  - [ ] Subtask 5.3: Add CloudWatch Logs retention lock
  - [ ] Subtask 5.4: Document immutability guarantees
  - [ ] Subtask 5.5: Add monitoring for unauthorized modification attempts

- [ ] Task 6: Integration with All Handlers (AC: #1)
  - [ ] Subtask 6.1: Add audit logging to all case management handlers (8 handlers)
  - [ ] Subtask 6.2: Add audit logging to all document handlers (4 handlers)
  - [ ] Subtask 6.3: Add audit logging to all webhook handlers (3 handlers)
  - [ ] Subtask 6.4: Add audit logging to all API key handlers (3 handlers)
  - [ ] Subtask 6.5: Add audit logging to all user management handlers (5 handlers)


- [ ] Task 7: Testing & Validation (AC: #1)
  - [ ] Subtask 7.1: Unit tests for expanded AuditService methods
  - [ ] Subtask 7.2: Integration tests for DynamoDB audit storage
  - [ ] Subtask 7.3: Integration tests for audit query API
  - [ ] Subtask 7.4: Test immutability enforcement
  - [ ] Subtask 7.5: Test 5-year retention with TTL
  - [ ] Subtask 7.6: Load test audit logging (1000 events/sec)

## Dev Notes

### Architecture Overview

**Dual-Write Strategy:**
```
Action → AuditService → [DynamoDB (queryable) + CloudWatch Logs (backup)]
                              ↓                           ↓
                         GSI for queries          5-year retention
                         Fast retrieval           Detailed analysis
```

**Why Dual-Write?**
1. **DynamoDB**: Fast queries for dashboard, API, compliance reports
2. **CloudWatch Logs**: Backup, detailed analysis with Insights, AWS-native retention

### Existing Foundation (Story 5.1)

**✅ Already Implemented:**
- `AuditService` class with CloudWatch Logs integration
- Encryption-specific audit actions (DATA_ENCRYPTED, DATA_DECRYPTED, etc.)
- CloudWatch Logs client with error handling
- Structured JSON logging format
- Test coverage (12 tests passing)

**📍 Current Location:** `services/verification/src/services/audit.ts`

**🎯 This Story Expands:**
- Add 40+ new audit actions (case, user, document, webhook, API key)
- Add DynamoDB storage for fast queries
- Add IP address and user context capture
- Add audit query API endpoint
- Integrate with all 23 handlers

### Handler Inventory (Existing vs. New)

**✅ Existing Handlers (18 - from previous stories):**
1. `approve-case.ts` - UPDATE with logCaseApproved
2. `reject-case.ts` - UPDATE with logCaseRejected
3. `add-note.ts` - UPDATE with logCaseNoteAdded
4. `get-case.ts` - UPDATE with logCaseViewed
5. `list-cases.ts` - No audit needed (read-only list)
6. `get-notes.ts` - No audit needed (read-only list)
7. `bulk-approve.ts` - UPDATE with batch logCaseApproved
8. `bulk-reject.ts` - UPDATE with batch logCaseRejected
9. `upload-document.ts` - UPDATE with logDocumentUploaded
10. `get-verification.ts` - UPDATE with logDocumentViewed
11. `get-verification-status.ts` - No audit needed (status check)
12. `refresh-document-url.ts` - UPDATE with logDocumentViewed
13. `configure-webhook.ts` - UPDATE with logWebhookConfigured
14. `send-webhook.ts` - UPDATE with logWebhookSent
15. `test-webhook.ts` - UPDATE with logWebhookSent
16. `create-verification.ts` - UPDATE with logCaseCreated
17. `process-ocr.ts` - UPDATE with logOcrCompleted/logOcrFailed
18. `process-biometric.ts` - UPDATE with logBiometricMatchRun

**🆕 New Handlers to Create (5):**
1. `get-audit-logs.ts` - NEW: Audit query API endpoint
2. `create-api-key.ts` - NEW: API key creation (if not exists)
3. `rotate-api-key.ts` - NEW: API key rotation (if not exists)
4. `revoke-api-key.ts` - NEW: API key revocation (if not exists)
5. `export-case.ts` - NEW: Case data export for GDPR (if not exists)

**Note**: User management handlers (login, logout, create-user, etc.) are in the `services/auth` service, not verification service. Coordinate with auth service team for those integrations.


### Complete Audit Action Taxonomy

**Category 1: Case Management (10 actions)**
```typescript
'CASE_CREATED'           // Verification case created
'CASE_VIEWED'            // Case details viewed
'CASE_ASSIGNED'          // Case assigned to analyst
'CASE_APPROVED'          // Case approved by analyst
'CASE_REJECTED'          // Case rejected by analyst
'CASE_RESUBMISSION_REQUESTED'  // More info requested
'CASE_NOTE_ADDED'        // Note/comment added
'CASE_STATUS_CHANGED'    // Status manually changed
'CASE_EXPORTED'          // Case data exported
'CASE_DELETED'           // Case deleted (GDPR)
```

**Category 2: Document Management (8 actions)**
```typescript
'DOCUMENT_UPLOADED'      // Document uploaded to S3
'DOCUMENT_VIEWED'        // Document image viewed
'DOCUMENT_DOWNLOADED'    // Document downloaded
'DOCUMENT_DELETED'       // Document deleted
'OCR_STARTED'            // OCR processing started
'OCR_COMPLETED'          // OCR extraction completed
'OCR_FAILED'             // OCR extraction failed
'BIOMETRIC_MATCH_RUN'    // Face matching executed
```

**Category 3: User Management (7 actions)**
```typescript
'USER_LOGIN'             // User logged in
'USER_LOGOUT'            // User logged out
'USER_CREATED'           // New user account created
'USER_UPDATED'           // User profile updated
'USER_DELETED'           // User account deleted
'USER_ROLE_CHANGED'      // User role/permissions changed
'USER_PASSWORD_RESET'    // Password reset requested
```

**Category 4: Webhook Management (5 actions)**
```typescript
'WEBHOOK_CONFIGURED'     // Webhook URL configured
'WEBHOOK_SENT'           // Webhook notification sent
'WEBHOOK_RETRY'          // Webhook retry attempted
'WEBHOOK_FAILED'         // Webhook delivery failed
'WEBHOOK_DELETED'        // Webhook configuration deleted
```


**Category 5: API Key Management (5 actions)**
```typescript
'API_KEY_CREATED'        // New API key generated
'API_KEY_ROTATED'        // API key rotated
'API_KEY_REVOKED'        // API key revoked
'API_KEY_USED'           // API key used for authentication
'API_KEY_RATE_LIMITED'   // API key hit rate limit
```

**Category 6: Data Protection (5 actions - already implemented in Story 5.1)**
```typescript
'DATA_ENCRYPTED'         // ✅ Field encrypted
'DATA_DECRYPTED'         // ✅ Field decrypted
'ENCRYPTION_ERROR'       // ✅ Encryption failed
'DECRYPTION_ERROR'       // ✅ Decryption failed
'CACHE_CLEARED'          // ✅ Decryption cache cleared
```

**Category 7: System Events (5 actions)**
```typescript
'SYSTEM_ERROR'           // Unhandled system error
'RATE_LIMIT_EXCEEDED'    // Rate limit hit
'INVALID_REQUEST'        // Validation error
'UNAUTHORIZED_ACCESS'    // Auth failure
'PERMISSION_DENIED'      // Authorization failure
```

**Total: 45 audit actions** (40 new + 5 existing from Story 5.1)

### Complete Type Definitions

**Add to `services/verification/src/types/audit.ts`:**

```typescript
export type AuditAction =
  // Case Management
  | 'CASE_CREATED'
  | 'CASE_VIEWED'
  | 'CASE_ASSIGNED'
  | 'CASE_APPROVED'
  | 'CASE_REJECTED'
  | 'CASE_RESUBMISSION_REQUESTED'
  | 'CASE_NOTE_ADDED'
  | 'CASE_STATUS_CHANGED'
  | 'CASE_EXPORTED'
  | 'CASE_DELETED'
  // Document Management
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_VIEWED'
  | 'DOCUMENT_DOWNLOADED'
  | 'DOCUMENT_DELETED'
  | 'OCR_STARTED'
  | 'OCR_COMPLETED'
  | 'OCR_FAILED'
  | 'BIOMETRIC_MATCH_RUN'
  // User Management
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'USER_ROLE_CHANGED'
  | 'USER_PASSWORD_RESET'
  // Webhook Management
  | 'WEBHOOK_CONFIGURED'
  | 'WEBHOOK_SENT'
  | 'WEBHOOK_RETRY'
  | 'WEBHOOK_FAILED'
  | 'WEBHOOK_DELETED'
  // API Key Management
  | 'API_KEY_CREATED'
  | 'API_KEY_ROTATED'
  | 'API_KEY_REVOKED'
  | 'API_KEY_USED'
  | 'API_KEY_RATE_LIMITED'
  // Data Protection (from Story 5.1)
  | 'DATA_ENCRYPTED'
  | 'DATA_DECRYPTED'
  | 'ENCRYPTION_ERROR'
  | 'DECRYPTION_ERROR'
  | 'CACHE_CLEARED'
  | 'KMS_KEY_ACCESSED'
  // System Events
  | 'SYSTEM_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED_ACCESS'
  | 'PERMISSION_DENIED';

export interface AuditLogEntry {
  PK: string;                    // AUDIT#{date}
  SK: string;                    // {timestamp}#{eventId}
  eventId: string;
  timestamp: string;             // ISO 8601
  date: string;                  // YYYY-MM-DD
  action: AuditAction;
  userId: string | null;
  resourceId: string | null;
  resourceType: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  clientId: string | null;
  status: 'success' | 'failure';
  errorCode: string | null;
  metadata: Record<string, any>;
  ttl: number;                   // Unix timestamp (5 years from now)
  // GSI keys
  GSI5PK: string | null;         // USER#{userId}
  GSI5SK: string;                // {timestamp}#{eventId}
  GSI6PK: string | null;         // {resourceType}#{resourceId}
  GSI6SK: string;                // {timestamp}#{eventId}
  GSI7PK: string;                // ACTION#{action}
  GSI7SK: string;                // {timestamp}#{eventId}
}

export interface CreateAuditEntryInput {
  action: AuditAction;
  userId?: string | null;
  resourceId?: string | null;
  resourceType?: string | null;
  fieldName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  clientId?: string | null;
  status: 'success' | 'failure';
  errorCode?: string | null;
  metadata?: Record<string, any>;
}
```

### DynamoDB Audit Table Schema

```typescript
// Primary Key Pattern
PK: AUDIT#{date}              // Partition by date (e.g., AUDIT#2026-01-17)
SK: {timestamp}#{eventId}     // Sort by timestamp + UUID

// Attributes
{
  PK: 'AUDIT#2026-01-17',
  SK: '2026-01-17T10:30:45.123Z#uuid-123',
  eventId: 'uuid-123',
  timestamp: '2026-01-17T10:30:45.123Z',
  date: '2026-01-17',
  action: 'CASE_APPROVED',
  userId: 'USER#analyst-123',
  resourceId: 'CASE#ver-456',
  resourceType: 'case',
  ipAddress: '41.190.123.45',
  userAgent: 'Mozilla/5.0...',
  clientId: 'CLIENT#acme-corp',
  status: 'success',
  metadata: {
    reason: 'All documents verified',
    previousStatus: 'pending_review'
  },
  ttl: 1893456000  // 5 years from now (Unix timestamp)
}
```


**GSI5: Query by User**
```typescript
GSI5PK: USER#{userId}         // Partition by user
GSI5SK: {timestamp}#{eventId} // Sort by timestamp
```

**GSI6: Query by Resource**
```typescript
GSI6PK: {resourceType}#{resourceId}  // Partition by resource
GSI6SK: {timestamp}#{eventId}        // Sort by timestamp
```

**GSI7: Query by Action Type**
```typescript
GSI7PK: ACTION#{action}       // Partition by action
GSI7SK: {timestamp}#{eventId} // Sort by timestamp
```

**Note**: GSI1-GSI4 are already used (GSI4 for API key lookup from Story 4.4). This story adds GSI5, GSI6, GSI7 for audit queries.

### CloudFormation Updates

**Add to `services/verification/serverless.yml`:**
```yaml
resources:
  Resources:
    # Audit Log Group with 5-year retention
    AuditLogGroup:
      Type: AWS::Logs::LogGroup
      Properties:
        LogGroupName: /aws/lambda/authbridge-verification-${self:provider.stage}/audit
        RetentionInDays: 1825  # 5 years
        KmsKeyId: !ImportValue authbridge-kms-${self:provider.stage}-AuditKeyArn

    # DynamoDB table for audit trail (already exists in main table)
    # Add GSIs to existing AuthBridgeTable resource:
    # GSI5: Audit by User
    # GSI6: Audit by Resource
    # GSI7: Audit by Action
    # Note: GSI1-GSI4 already exist for other purposes

  # IAM permissions for audit logging
  iamRoleStatements:
    - Effect: Allow
      Action:
        - logs:CreateLogStream
        - logs:PutLogEvents
      Resource:
        - !GetAtt AuditLogGroup.Arn
    - Effect: Allow
      Action:
        - kms:Decrypt
        - kms:GenerateDataKey
      Resource: !ImportValue authbridge-kms-${self:provider.stage}-AuditKeyArn
```


### Expanded AuditService Implementation

**Update `services/verification/src/services/audit.ts`:**

```typescript
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

export class AuditService {
  private dynamodb: DynamoDBClient;
  private tableName: string;

  constructor() {
    // ... existing CloudWatch setup ...
    this.dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION || 'af-south-1' });
    this.tableName = process.env.TABLE_NAME || 'AuthBridgeTable';
  }

  async logEvent(input: CreateAuditEntryInput): Promise<AuditLogEntry> {
    const now = new Date();
    const eventId = randomUUID();

    const entry: AuditLogEntry = {
      PK: `AUDIT#${now.toISOString().split('T')[0]}`,
      SK: `${now.toISOString()}#${eventId}`,
      eventId,
      timestamp: now.toISOString(),
      date: now.toISOString().split('T')[0],
      action: input.action,
      userId: input.userId || null,
      resourceId: input.resourceId || null,
      resourceType: input.resourceType || null,
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
      clientId: input.clientId || null,
      status: input.status,
      errorCode: input.errorCode || null,
      metadata: input.metadata || {},
      ttl: Math.floor(Date.now() / 1000) + (5 * 365 * 24 * 60 * 60), // 5 years
      // GSI keys (using GSI5, GSI6, GSI7 - GSI1-4 already in use)
      GSI5PK: input.userId ? `USER#${input.userId}` : null,
      GSI5SK: `${now.toISOString()}#${eventId}`,
      GSI6PK: input.resourceId ? `${input.resourceType}#${input.resourceId}` : null,
      GSI6SK: `${now.toISOString()}#${eventId}`,
      GSI7PK: `ACTION#${input.action}`,
      GSI7SK: `${now.toISOString()}#${eventId}`,
    };

    // Dual write: DynamoDB + CloudWatch Logs
    await Promise.all([
      this.writeToDynamoDB(entry),
      this.logToCloudWatch(entry),
    ]);

    return entry;
  }

  private async writeToDynamoDB(entry: AuditLogEntry): Promise<void> {
    try {
      await this.dynamodb.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: marshall(entry, { removeUndefinedValues: true }),
          // Immutability: Prevent overwrites
          ConditionExpression: 'attribute_not_exists(PK)',
        })
      );
    } catch (error) {
      console.error('Failed to write audit log to DynamoDB:', error);
      // Don't fail the operation if audit logging fails
    }
  }

  // ... existing logToCloudWatch method ...
}
```


### New Audit Methods (Add to AuditService)

```typescript
// Case Management
async logCaseCreated(caseId: string, userId: string, ipAddress: string, metadata?: any): Promise<void> {
  await this.logEvent({
    action: 'CASE_CREATED',
    userId,
    resourceId: caseId,
    resourceType: 'case',
    ipAddress,
    status: 'success',
    metadata,
  });
}

async logCaseApproved(caseId: string, userId: string, ipAddress: string, reason?: string): Promise<void> {
  await this.logEvent({
    action: 'CASE_APPROVED',
    userId,
    resourceId: caseId,
    resourceType: 'case',
    ipAddress,
    status: 'success',
    metadata: { reason },
  });
}

async logCaseRejected(caseId: string, userId: string, ipAddress: string, reason: string): Promise<void> {
  await this.logEvent({
    action: 'CASE_REJECTED',
    userId,
    resourceId: caseId,
    resourceType: 'case',
    ipAddress,
    status: 'success',
    metadata: { reason },
  });
}

async logCaseNoteAdded(caseId: string, userId: string, ipAddress: string, noteId: string): Promise<void> {
  await this.logEvent({
    action: 'CASE_NOTE_ADDED',
    userId,
    resourceId: caseId,
    resourceType: 'case',
    ipAddress,
    status: 'success',
    metadata: { noteId },
  });
}

// Document Management
async logDocumentUploaded(docId: string, caseId: string, userId: string, ipAddress: string): Promise<void> {
  await this.logEvent({
    action: 'DOCUMENT_UPLOADED',
    userId,
    resourceId: docId,
    resourceType: 'document',
    ipAddress,
    status: 'success',
    metadata: { caseId },
  });
}

async logDocumentViewed(docId: string, userId: string, ipAddress: string): Promise<void> {
  await this.logEvent({
    action: 'DOCUMENT_VIEWED',
    userId,
    resourceId: docId,
    resourceType: 'document',
    ipAddress,
    status: 'success',
  });
}
```


// User Management
async logUserLogin(userId: string, ipAddress: string, userAgent: string): Promise<void> {
  await this.logEvent({
    action: 'USER_LOGIN',
    userId,
    resourceId: userId,
    resourceType: 'user',
    ipAddress,
    userAgent,
    status: 'success',
  });
}

async logUserLogout(userId: string, ipAddress: string): Promise<void> {
  await this.logEvent({
    action: 'USER_LOGOUT',
    userId,
    resourceId: userId,
    resourceType: 'user',
    ipAddress,
    status: 'success',
  });
}

async logUserRoleChanged(targetUserId: string, adminUserId: string, ipAddress: string, oldRole: string, newRole: string): Promise<void> {
  await this.logEvent({
    action: 'USER_ROLE_CHANGED',
    userId: adminUserId,
    resourceId: targetUserId,
    resourceType: 'user',
    ipAddress,
    status: 'success',
    metadata: { oldRole, newRole },
  });
}

// Webhook Management
async logWebhookConfigured(webhookId: string, userId: string, ipAddress: string, url: string): Promise<void> {
  await this.logEvent({
    action: 'WEBHOOK_CONFIGURED',
    userId,
    resourceId: webhookId,
    resourceType: 'webhook',
    ipAddress,
    status: 'success',
    metadata: { url },
  });
}

async logWebhookSent(webhookId: string, caseId: string, status: 'success' | 'failure', statusCode?: number): Promise<void> {
  await this.logEvent({
    action: 'WEBHOOK_SENT',
    resourceId: webhookId,
    resourceType: 'webhook',
    status,
    metadata: { caseId, statusCode },
  });
}
```


// API Key Management
async logApiKeyCreated(keyId: string, userId: string, ipAddress: string, clientId: string): Promise<void> {
  await this.logEvent({
    action: 'API_KEY_CREATED',
    userId,
    resourceId: keyId,
    resourceType: 'api_key',
    ipAddress,
    clientId,
    status: 'success',
  });
}

async logApiKeyUsed(keyId: string, clientId: string, ipAddress: string, endpoint: string): Promise<void> {
  await this.logEvent({
    action: 'API_KEY_USED',
    resourceId: keyId,
    resourceType: 'api_key',
    ipAddress,
    clientId,
    status: 'success',
    metadata: { endpoint },
  });
}

async logApiKeyRateLimited(keyId: string, clientId: string, ipAddress: string): Promise<void> {
  await this.logEvent({
    action: 'API_KEY_RATE_LIMITED',
    resourceId: keyId,
    resourceType: 'api_key',
    ipAddress,
    clientId,
    status: 'failure',
  });
}

// System Events
async logUnauthorizedAccess(userId: string | null, ipAddress: string, endpoint: string, reason: string): Promise<void> {
  await this.logEvent({
    action: 'UNAUTHORIZED_ACCESS',
    userId,
    ipAddress,
    status: 'failure',
    metadata: { endpoint, reason },
  });
}

async logPermissionDenied(userId: string, ipAddress: string, resource: string, action: string): Promise<void> {
  await this.logEvent({
    action: 'PERMISSION_DENIED',
    userId,
    ipAddress,
    status: 'failure',
    metadata: { resource, action },
  });
}
```


### Request Context Middleware

**Create `services/verification/src/middleware/audit-context.ts`:**

```typescript
import middy from '@middy/core';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

export interface AuditContext {
  userId: string | null;
  clientId: string | null;
  ipAddress: string;
  userAgent: string;
}

export const auditContextMiddleware = (): middy.MiddlewareObj<APIGatewayProxyEvent, any, Error, Context> => ({
  before: async (request) => {
    const event = request.event;

    // Extract IP address (API Gateway provides this)
    const ipAddress =
      event.requestContext?.identity?.sourceIp ||
      event.headers?.['X-Forwarded-For']?.split(',')[0] ||
      'unknown';

    // Extract user agent
    const userAgent = event.headers?.['User-Agent'] || 'unknown';

    // Extract user ID from JWT token (if authenticated)
    let userId: string | null = null;
    let clientId: string | null = null;

    if (event.requestContext?.authorizer?.claims) {
      userId = event.requestContext.authorizer.claims.sub || null;
      clientId = event.requestContext.authorizer.claims['custom:clientId'] || null;
    }

    // Attach to request context for handlers to use
    (request as any).auditContext = {
      userId,
      clientId,
      ipAddress,
      userAgent,
    } as AuditContext;
  },
});

// Helper to get audit context from request
export function getAuditContext(request: any): AuditContext {
  return request.auditContext || {
    userId: null,
    clientId: null,
    ipAddress: 'unknown',
    userAgent: 'unknown',
  };
}
```


### Audit Query API

**Create `services/verification/src/handlers/get-audit-logs.ts`:**

```typescript
import middy from '@middy/core';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { auditContextMiddleware } from '../middleware/audit-context';
import { securityHeadersMiddleware } from '../middleware/security-headers';

const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });
const tableName = process.env.TABLE_NAME || 'AuthBridgeTable';

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const { startDate, endDate, userId, action, resourceId, limit = '100', nextToken } = event.queryStringParameters || {};

    // Validate required parameters
    if (!startDate || !endDate) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'startDate and endDate are required' }),
      };
    }

    // Query strategy based on filters
    let queryParams: any;

    if (userId) {
      // Query by user (GSI5)
      queryParams = {
        TableName: tableName,
        IndexName: 'GSI5',
        KeyConditionExpression: 'GSI5PK = :userId AND GSI5SK BETWEEN :start AND :end',
        ExpressionAttributeValues: {
          ':userId': { S: `USER#${userId}` },
          ':start': { S: `${startDate}T00:00:00.000Z#` },
          ':end': { S: `${endDate}T23:59:59.999Z#~` },
        },
      };
    } else if (action) {
      // Query by action (GSI7)
      queryParams = {
        TableName: tableName,
        IndexName: 'GSI7',
        KeyConditionExpression: 'GSI7PK = :action AND GSI7SK BETWEEN :start AND :end',
        ExpressionAttributeValues: {
          ':action': { S: `ACTION#${action}` },
          ':start': { S: `${startDate}T00:00:00.000Z#` },
          ':end': { S: `${endDate}T23:59:59.999Z#~` },
        },
      };
    } else if (resourceId) {
      // Query by resource (GSI6) - requires resourceType
      const resourceType = event.queryStringParameters?.resourceType;
      if (!resourceType) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'resourceType is required when querying by resourceId' }),
        };
      }
      queryParams = {
        TableName: tableName,
        IndexName: 'GSI6',
        KeyConditionExpression: 'GSI6PK = :resource AND GSI6SK BETWEEN :start AND :end',
        ExpressionAttributeValues: {
          ':resource': { S: `${resourceType}#${resourceId}` },
          ':start': { S: `${startDate}T00:00:00.000Z#` },
          ':end': { S: `${endDate}T23:59:59.999Z#~` },
        },
      };
    } else {
      // Query by date range (primary key)
      // Note: This requires querying each date individually
      // For simplicity, query single date or implement batch query
      queryParams = {
        TableName: tableName,
        KeyConditionExpression: 'PK = :date',
        ExpressionAttributeValues: {
          ':date': { S: `AUDIT#${startDate}` },
        },
      };
    }

    queryParams.Limit = parseInt(limit);
    queryParams.ScanIndexForward = false; // Descending order (newest first)

    if (nextToken) {
      queryParams.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
    }

    const response = await dynamodb.send(new QueryCommand(queryParams));
    const items = response.Items?.map(item => unmarshall(item)) || [];

    return {
      statusCode: 200,
      body: JSON.stringify({
        items,
        nextToken: response.LastEvaluatedKey
          ? Buffer.from(JSON.stringify(response.LastEvaluatedKey)).toString('base64')
          : null,
      }),
    };
  } catch (error) {
    console.error('Error querying audit logs:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to query audit logs' }),
    };
  }
}

export const getAuditLogs = middy(handler)
  .use(auditContextMiddleware())
  .use(securityHeadersMiddleware());
```

**Add to `services/verification/serverless.yml` functions:**
```yaml
functions:
  getAuditLogs:
    handler: src/handlers/get-audit-logs.getAuditLogs
    events:
      - http:
          path: /api/v1/audit
          method: get
          authorizer: aws_iam
          cors: true
```


### Handler Integration Examples

**Batch Audit Logging Pattern (for bulk operations):**

```typescript
// services/verification/src/handlers/bulk-approve.ts
async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { caseIds, reason } = JSON.parse(event.body || '{}');
  const auditContext = getAuditContext(event);

  try {
    // Approve all cases
    await Promise.all(
      caseIds.map(caseId => dynamodbService.updateCase(caseId, { status: 'approved' }))
    );

    // Batch audit logging (parallel, not sequential)
    await Promise.all(
      caseIds.map(caseId =>
        auditService.logCaseApproved(
          caseId,
          auditContext.userId!,
          auditContext.ipAddress,
          reason
        )
      )
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `${caseIds.length} cases approved` }),
    };
  } catch (error) {
    console.error('Error bulk approving cases:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to bulk approve cases' }),
    };
  }
}
```

**Example 1: Approve Case Handler**

```typescript
// services/verification/src/handlers/approve-case.ts
import { AuditService } from '../services/audit';
import { getAuditContext } from '../middleware/audit-context';

const auditService = new AuditService();

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { caseId } = event.pathParameters || {};
  const { reason } = JSON.parse(event.body || '{}');
  const auditContext = getAuditContext(event);

  try {
    // Approve case logic...
    await dynamodbService.updateCase(caseId, { status: 'approved' });

    // Audit log
    await auditService.logCaseApproved(
      caseId,
      auditContext.userId!,
      auditContext.ipAddress,
      reason
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Case approved' }),
    };
  } catch (error) {
    console.error('Error approving case:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to approve case' }),
    };
  }
}

export const approveCase = middy(handler)
  .use(auditContextMiddleware())
  .use(securityHeadersMiddleware());
```

**Example 2: Document Upload Handler**

```typescript
// services/verification/src/handlers/upload-document.ts
async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { caseId } = event.pathParameters || {};
  const auditContext = getAuditContext(event);

  try {
    // Upload document to S3...
    const docId = await s3Service.uploadDocument(caseId, documentData);

    // Audit log
    await auditService.logDocumentUploaded(
      docId,
      caseId,
      auditContext.userId || 'anonymous',
      auditContext.ipAddress
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ documentId: docId }),
    };
  } catch (error) {
    console.error('Error uploading document:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to upload document' }),
    };
  }
}
```


**Example 3: User Login Handler**

```typescript
// services/auth/src/handlers/login.ts
async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { email, password } = JSON.parse(event.body || '{}');
  const auditContext = getAuditContext(event);

  try {
    // Authenticate user...
    const user = await cognitoService.authenticate(email, password);

    // Audit log
    await auditService.logUserLogin(
      user.userId,
      auditContext.ipAddress,
      auditContext.userAgent
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ token: user.token }),
    };
  } catch (error) {
    // Audit failed login attempt
    await auditService.logUnauthorizedAccess(
      null,
      auditContext.ipAddress,
      '/api/v1/auth/login',
      'Invalid credentials'
    );

    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid credentials' }),
    };
  }
}
```

### Immutability Enforcement

**IAM Policy (Add to `serverless.yml`):**
```yaml
iamRoleStatements:
  # Allow write-only access to audit logs
  - Effect: Allow
    Action:
      - dynamodb:PutItem
    Resource: !GetAtt AuthBridgeTable.Arn
    Condition:
      StringEquals:
        'dynamodb:LeadingKeys': 'AUDIT#*'

  # Explicitly deny updates and deletes
  - Effect: Deny
    Action:
      - dynamodb:UpdateItem
      - dynamodb:DeleteItem
    Resource: !GetAtt AuthBridgeTable.Arn
    Condition:
      StringEquals:
        'dynamodb:LeadingKeys': 'AUDIT#*'
```

**DynamoDB Condition Expression:**
```typescript
// Already implemented in writeToDynamoDB method
await this.dynamodb.send(
  new PutItemCommand({
    TableName: this.tableName,
    Item: marshall(entry),
    ConditionExpression: 'attribute_not_exists(PK)', // Prevent overwrites
  })
);
```


### Testing Strategy

**🚨 CRITICAL: Docker Prohibited - Use Java/Homebrew for DynamoDB Local**

This project prohibits Docker usage. For local testing with DynamoDB Local:

1. **Install DynamoDB Local via Homebrew:**
   ```bash
   brew install dynamodb-local
   ```

2. **Start DynamoDB Local:**
   ```bash
   dynamodb-local
   # Runs on http://localhost:8000
   ```

3. **Configure tests to use local endpoint:**
   ```typescript
   const dynamodb = new DynamoDBClient({
     endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
     region: 'af-south-1',
   });
   ```

**Unit Tests (`audit.test.ts` - expand existing):**
```typescript
describe('AuditService - Case Management', () => {
  it('logs case approval with reason', async () => {
    await service.logCaseApproved('CASE#123', 'USER#analyst', '41.190.1.1', 'All verified');

    expect(dynamodbMock.calls()).toHaveLength(1);
    const call = dynamodbMock.calls()[0];
    const item = unmarshall(call.args[0].input.Item);

    expect(item.action).toBe('CASE_APPROVED');
    expect(item.userId).toBe('USER#analyst');
    expect(item.ipAddress).toBe('41.190.1.1');
    expect(item.metadata.reason).toBe('All verified');
  });

  it('logs case rejection with reason', async () => {
    await service.logCaseRejected('CASE#123', 'USER#analyst', '41.190.1.1', 'Blurry image');

    const call = dynamodbMock.calls()[0];
    const item = unmarshall(call.args[0].input.Item);

    expect(item.action).toBe('CASE_REJECTED');
    expect(item.metadata.reason).toBe('Blurry image');
  });
});

describe('AuditService - User Management', () => {
  it('logs user login with IP and user agent', async () => {
    await service.logUserLogin('USER#123', '41.190.1.1', 'Mozilla/5.0');

    const call = dynamodbMock.calls()[0];
    const item = unmarshall(call.args[0].input.Item);

    expect(item.action).toBe('USER_LOGIN');
    expect(item.ipAddress).toBe('41.190.1.1');
    expect(item.userAgent).toBe('Mozilla/5.0');
  });

  it('logs role change with old and new roles', async () => {
    await service.logUserRoleChanged('USER#target', 'USER#admin', '41.190.1.1', 'analyst', 'admin');

    const call = dynamodbMock.calls()[0];
    const item = unmarshall(call.args[0].input.Item);

    expect(item.action).toBe('USER_ROLE_CHANGED');
    expect(item.metadata.oldRole).toBe('analyst');
    expect(item.metadata.newRole).toBe('admin');
  });
});

describe('AuditService - Immutability', () => {
  it('prevents overwriting existing audit entries', async () => {
    dynamodbMock.on(PutItemCommand).rejects({
      name: 'ConditionalCheckFailedException',
    });

    // Should not throw - gracefully handle
    await service.logCaseApproved('CASE#123', 'USER#analyst', '41.190.1.1');

    expect(dynamodbMock.calls()).toHaveLength(1);
  });
});
```


**Integration Tests (Staging Environment):**
```typescript
describe('Audit Query API', () => {
  it('queries audit logs by date range', async () => {
    const response = await fetch(
      `${API_URL}/api/v1/audit?startDate=2026-01-17&endDate=2026-01-17`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.items).toBeInstanceOf(Array);
  });

  it('queries audit logs by user', async () => {
    const response = await fetch(
      `${API_URL}/api/v1/audit?startDate=2026-01-01&endDate=2026-01-31&userId=USER#analyst`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = await response.json();
    expect(data.items.every(item => item.userId === 'USER#analyst')).toBe(true);
  });

  it('queries audit logs by action type', async () => {
    const response = await fetch(
      `${API_URL}/api/v1/audit?startDate=2026-01-01&endDate=2026-01-31&action=CASE_APPROVED`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = await response.json();
    expect(data.items.every(item => item.action === 'CASE_APPROVED')).toBe(true);
  });

  it('paginates results', async () => {
    const response1 = await fetch(
      `${API_URL}/api/v1/audit?startDate=2026-01-01&endDate=2026-01-31&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data1 = await response1.json();
    expect(data1.items).toHaveLength(10);
    expect(data1.nextToken).toBeDefined();

    const response2 = await fetch(
      `${API_URL}/api/v1/audit?startDate=2026-01-01&endDate=2026-01-31&limit=10&nextToken=${data1.nextToken}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data2 = await response2.json();
    expect(data2.items).toHaveLength(10);
    expect(data2.items[0].eventId).not.toBe(data1.items[0].eventId);
  });
});
```


### CloudWatch Insights Queries (Examples)

| Query Purpose | CloudWatch Insights Query |
|---------------|---------------------------|
| Failed logins by IP | `filter action = "UNAUTHORIZED_ACCESS" \| stats count() by ipAddress \| sort count desc` |
| Approval rate by analyst | `filter action in ["CASE_APPROVED", "CASE_REJECTED"] \| stats count() by userId, action` |
| Document upload failures | `filter action = "DOCUMENT_UPLOADED" and status = "failure" \| sort @timestamp desc` |
| API key usage by client | `filter action = "API_KEY_USED" \| stats count() by clientId, metadata.endpoint` |

### Performance Considerations

| Metric | Value | Notes |
|--------|-------|-------|
| **DynamoDB Write** | 10 WCU (on-demand) | ~100 audit events/sec |
| **DynamoDB Read** | 5 RCU (on-demand) | Audit queries |
| **Storage** | ~1KB/entry × 10M/year | 10GB/year |
| **DynamoDB Cost** | ~$2.50/month | 1M audit entries |
| **CloudWatch Logs** | ~$5-10/month | 10K verifications/month |
| **Query Latency** | <100ms (PK), <200ms (GSI) | By date, user, action, resource |


### Compliance Checklist

**Data Protection Act 2024 Requirements:**
- [x] 5-year retention period (TTL set to 1825 days)
- [x] Immutable audit trail (IAM deny + condition expression)
- [x] Encrypted at rest (KMS AuditLogEncryptionKey)
- [x] Encrypted in transit (TLS 1.2+)
- [x] Queryable by date range and user
- [x] Includes timestamp, user ID, action, resource ID, IP address
- [x] Dual storage (DynamoDB + CloudWatch Logs)

**FIA AML/KYC Requirements:**
- [x] Complete audit trail for case decisions
- [x] Analyst identification for all actions
- [x] Reason codes for rejections
- [x] Document access tracking
- [x] User role change tracking

### Monitoring & Alerts

**CloudWatch Alarms:**
```yaml
# Add to serverless.yml
AuditLogWriteFailureAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: authbridge-audit-write-failure-${self:provider.stage}
    MetricName: AuditWriteFailures
    Namespace: AuthBridge/Audit
    Statistic: Sum
    Period: 300
    EvaluationPeriods: 1
    Threshold: 10
    ComparisonOperator: GreaterThanThreshold
    AlarmActions:
      - !Ref AlertTopic

AuditLogVolumeAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: authbridge-audit-volume-spike-${self:provider.stage}
    MetricName: AuditLogEntries
    Namespace: AuthBridge/Audit
    Statistic: Sum
    Period: 300
    EvaluationPeriods: 2
    Threshold: 10000
    ComparisonOperator: GreaterThanThreshold
    AlarmActions:
      - !Ref AlertTopic
```


### File Structure

```
services/verification/
├── src/
│   ├── services/
│   │   ├── audit.ts                    # UPDATE: Add 40+ new audit methods
│   │   └── audit.test.ts               # UPDATE: Add tests for new methods (target: 50+ tests)
│   ├── middleware/
│   │   ├── audit-context.ts            # NEW: Extract IP, user, client from request
│   │   └── audit-context.test.ts       # NEW: Test context extraction
│   ├── handlers/
│   │   ├── get-audit-logs.ts           # NEW: Audit query API endpoint
│   │   ├── get-audit-logs.test.ts      # NEW: Test audit queries
│   │   ├── approve-case.ts             # UPDATE: Add logCaseApproved
│   │   ├── reject-case.ts              # UPDATE: Add logCaseRejected
│   │   ├── add-note.ts                 # UPDATE: Add logCaseNoteAdded
│   │   ├── upload-document.ts          # UPDATE: Add logDocumentUploaded
│   │   ├── configure-webhook.ts        # UPDATE: Add logWebhookConfigured
│   │   ├── send-webhook.ts             # UPDATE: Add logWebhookSent
│   │   ├── test-webhook.ts             # UPDATE: Add logWebhookSent
│   │   ├── create-verification.ts      # UPDATE: Add logCaseCreated
│   │   ├── get-verification.ts         # UPDATE: Add logDocumentViewed
│   │   ├── refresh-document-url.ts     # UPDATE: Add logDocumentViewed
│   │   ├── process-ocr.ts              # UPDATE: Add logOcrCompleted/Failed
│   │   ├── process-biometric.ts        # UPDATE: Add logBiometricMatchRun
│   │   ├── bulk-approve.ts             # UPDATE: Add batch logCaseApproved
│   │   └── bulk-reject.ts              # UPDATE: Add batch logCaseRejected
│   └── types/
│       └── audit.ts                    # UPDATE: Add complete type definitions
└── serverless.yml                      # UPDATE: Add GSI5-7, IAM, alarms, getAuditLogs function
```

### Handlers Requiring Audit Integration (18 existing + 1 new)

**✅ Existing Handlers to Update (18):**

**Case Management (8):**
1. `create-verification.ts` → logCaseCreated
2. `get-case.ts` → logCaseViewed
3. `approve-case.ts` → logCaseApproved
4. `reject-case.ts` → logCaseRejected
5. `add-note.ts` → logCaseNoteAdded
6. `get-notes.ts` → No audit (read-only list)
7. `bulk-approve.ts` → batch logCaseApproved
8. `bulk-reject.ts` → batch logCaseRejected

**Document Management (5):**
9. `upload-document.ts` → logDocumentUploaded
10. `get-verification.ts` → logDocumentViewed
11. `refresh-document-url.ts` → logDocumentViewed
12. `process-ocr.ts` → logOcrCompleted / logOcrFailed
13. `process-biometric.ts` → logBiometricMatchRun

**Webhook Management (3):**
14. `configure-webhook.ts` → logWebhookConfigured
15. `send-webhook.ts` → logWebhookSent
16. `test-webhook.ts` → logWebhookSent

**System (2):**
17. `get-verification-status.ts` → No audit (status check only)
18. `list-cases.ts` → No audit (read-only list)

**🆕 New Handlers to Create (1):**
1. `get-audit-logs.ts` → NEW: Audit query API endpoint

**📝 Note on Missing Handlers:**
- API key handlers (create/rotate/revoke) don't exist yet - will be created in future story
- User management handlers (login/logout) are in `services/auth` service
- Case export/delete handlers don't exist yet - will be created for GDPR compliance story


### Previous Story Learnings (Story 5.1)

**✅ Patterns to Reuse:**
1. **Dual-Write Strategy**: DynamoDB + CloudWatch Logs (proven reliable)
2. **Error Handling**: Don't fail operations if audit logging fails
3. **KMS Integration**: Use dedicated AuditLogEncryptionKey (already exists)
4. **Test Strategy**: Unit tests with mocks + integration tests in staging
5. **CloudWatch Metrics**: Emit custom metrics for monitoring

**✅ Code Patterns:**
```typescript
// Pattern 1: Graceful error handling
try {
  await this.writeToDynamoDB(entry);
} catch (error) {
  console.error('Failed to write audit log:', error);
  // Don't throw - continue operation
}

// Pattern 2: Structured logging
const entry: AuditLogEntry = {
  eventId: randomUUID(),
  timestamp: new Date().toISOString(),
  action: input.action,
  // ... all required fields
};

// Pattern 3: Middleware integration
export const handler = middy(baseHandler)
  .use(auditContextMiddleware())
  .use(securityHeadersMiddleware());
```

**✅ Testing Patterns:**
```typescript
// Pattern 1: Mock AWS SDK clients
const dynamodbMock = mockClient(DynamoDBClient);
const cloudwatchLogsMock = mockClient(CloudWatchLogsClient);

// Pattern 2: Verify audit log structure
const call = dynamodbMock.calls()[0];
const item = unmarshall(call.args[0].input.Item);
expect(item.action).toBe('CASE_APPROVED');

// Pattern 3: Test error scenarios
dynamodbMock.on(PutItemCommand).rejects(new Error('DynamoDB error'));
await service.logEvent({ ... }); // Should not throw
```

**🚨 Lessons Learned:**
1. **CloudFormation Stack Names**: Use exact stack names from deployment (e.g., `authbridge-kms-keys-${stage}`)
2. **Test Counts**: Keep test counts accurate in documentation
3. **Package Size**: Exclude root node_modules to avoid 1.9GB packages
4. **Code Review**: Run 2-3 review passes to catch all issues


### Git Intelligence (Recent Commits)

**Recent Work Patterns:**
1. **Commit fa8ab7c**: Code review fixes for encryption (CF exports, queryByDate decryption, test counts)
   - Pattern: Multiple review passes to catch edge cases
   - Lesson: Always verify CloudFormation export names match actual stack outputs

2. **Commit cea8ffa**: Story 5.1 data encryption implementation
   - Pattern: Comprehensive dev notes with examples
   - Pattern: Dual-write strategy (DynamoDB + CloudWatch)
   - Pattern: Extensive testing (61 tests)

3. **Commit 6f51b78 & 90d4e43**: Webhook consistency fixes
   - Pattern: Iterative code review improvements
   - Lesson: Consistency across similar handlers is critical

**Code Conventions Established:**
- Use `middy` for all Lambda handlers
- Apply `auditContextMiddleware()` and `securityHeadersMiddleware()` to all HTTP handlers
- Use `mockClient` from `aws-sdk-client-mock` for testing
- Structure tests with `describe` blocks by feature area
- Use TypeScript strict mode with explicit types

### Architecture Alignment

**From `project-context.md`:**
- ✅ AWS af-south-1 region (Data Protection Act 2024 compliance)
- ✅ DynamoDB single-table design with GSIs
- ✅ CloudWatch Logs for audit trail
- ✅ KMS encryption for sensitive data
- ✅ 5-year retention for compliance

**From `architecture.md`:**
- ✅ Structured JSON logging format
- ✅ Log levels: ERROR, WARN, INFO, DEBUG
- ✅ Audit trail for compliance (5-year retention)
- ✅ CloudWatch metrics and alarms
- ✅ IAM least privilege (dedicated roles)

**From `epics.md` (Story 5.2):**
- ✅ Timestamp, user ID, action type, resource ID, IP address
- ✅ Immutable audit logs (append-only)
- ✅ 5-year retention
- ✅ Queryable by date range and user


### Security Best Practices

**1. IP Address Privacy:**
- Store IP addresses for audit purposes only
- Do not use for geolocation or tracking
- Comply with Data Protection Act 2024 requirements

**2. User Context:**
- Extract user ID from JWT claims (authenticated requests)
- Use "anonymous" for unauthenticated requests (webhook callbacks)
- Never log passwords or sensitive credentials

**3. Metadata Sanitization:**
- Sanitize metadata before logging (remove PII if not needed)
- Log only what's necessary for audit purposes
- Encrypt sensitive metadata fields if required

**4. Access Control:**
- Restrict audit log access to compliance officers and admins
- Use Casbin RBAC policies for fine-grained access
- Log all audit log access attempts

**5. Retention & Deletion:**
- 5-year retention via DynamoDB TTL
- CloudWatch Logs retention policy (1825 days)
- No manual deletion allowed (immutability)

### Deployment Checklist

**Pre-Deployment:**
- [ ] Update `services/verification/src/types/audit.ts` with complete type definitions
- [ ] Expand `AuditService` with 40+ new methods
- [ ] Create `audit-context.ts` middleware
- [ ] Create `get-audit-logs.ts` handler
- [ ] Update 15 existing handlers with audit logging
- [ ] Add GSI5, GSI6, GSI7 to DynamoDB table (via CloudFormation)
- [ ] Update `serverless.yml` with IAM policies, alarms, and getAuditLogs function
- [ ] Write unit tests (target: 50+ tests)
- [ ] Write integration tests (target: 10+ tests)
- [ ] Install DynamoDB Local via Homebrew for local testing

**Staging Deployment:**
- [ ] Deploy updated verification service
- [ ] Verify GSI5, GSI6, GSI7 created successfully
- [ ] Test audit logging for all action types
- [ ] Test audit query API with all filters (user, action, resource, date)
- [ ] Verify immutability (attempt update/delete should fail)
- [ ] Verify 5-year TTL set correctly (check sample entries)
- [ ] Check CloudWatch Logs ingestion
- [ ] Run load test (1000 events/sec)

**Production Deployment:**
- [ ] Deploy to production after staging validation
- [ ] Monitor CloudWatch alarms for 24 hours
- [ ] Verify audit log volume matches expectations
- [ ] Run compliance audit query tests
- [ ] Document deployment in runbook


### References

- [Source: services/verification/src/services/audit.ts] - Existing AuditService implementation (Story 5.1)
- [Source: services/verification/src/services/audit.test.ts] - Existing test patterns (12 tests)
- [Source: services/shared/cloudformation/kms-keys.yml] - AuditLogEncryptionKey definition
- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.2] - Story requirements and acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Logging-Patterns] - Structured logging format
- [Source: _bmad-output/planning-artifacts/architecture.md#DynamoDB-Schema] - Single-table design pattern
- [Source: services/verification/project-context.md] - AWS region and compliance requirements
- [Source: _bmad-output/implementation-artifacts/5-1-data-encryption-implementation.md] - Previous story patterns and learnings

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

(To be filled during implementation)

### Completion Notes List

(To be filled during implementation)

### File List

(To be filled during implementation)

---

**Story Status**: ready-for-dev
**Created**: 2026-01-17
**Created By**: Bob (Scrum Master)
**Epic**: 5 - Security & Compliance Foundation
**Dependencies**: Story 5.1 (Data Encryption Implementation) - ✅ DONE
**Estimated Effort**: 3-5 days
**Priority**: HIGH (MVP requirement)

