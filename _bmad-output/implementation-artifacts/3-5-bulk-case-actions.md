# Story 3.5: Bulk Case Actions

Status: done

## Story

As a compliance officer,
I want to approve or reject multiple cases at once,
So that I can process high-volume queues efficiently.

## Acceptance Criteria

**Given** the user is on the case list
**When** they select multiple cases using checkboxes
**Then** bulk action buttons appear (Approve Selected, Reject Selected)
**When** bulk approve is clicked
**Then** all selected cases are approved
**And** individual audit entries are created for each case

## Tasks / Subtasks

- [x] Task 1: Add checkbox selection to CaseListTable (AC: Select multiple cases)
  - [x] Subtask 1.1: Add checkbox column to table
  - [x] Subtask 1.2: Implement select all/none functionality
  - [x] Subtask 1.3: Track selected case IDs in state
  - [x] Subtask 1.4: Show selection count indicator
  - [x] Subtask 1.5: Clear selection after bulk action completes

- [x] Task 2: Create bulk action API endpoints (AC: All)
  - [x] Subtask 2.1: Implement POST /api/v1/cases/bulk-approve endpoint
  - [x] Subtask 2.2: Implement POST /api/v1/cases/bulk-reject endpoint
  - [x] Subtask 2.3: Add validation (max 50 cases per request)
  - [x] Subtask 2.4: Create individual audit log entries for each case
  - [x] Subtask 2.5: Return success/failure status for each case
  - [x] Subtask 2.6: Write unit tests for both endpoints (>85% coverage)

- [x] Task 3: Build BulkActionBar component (AC: Bulk action buttons appear)
  - [x] Subtask 3.1: Create sticky action bar that appears when cases selected
  - [x] Subtask 3.2: Add Approve Selected and Reject Selected buttons
  - [x] Subtask 3.3: Show selection count and Clear Selection button
  - [x] Subtask 3.4: Add loading states during bulk operations
  - [x] Subtask 3.5: Handle partial success scenarios

- [x] Task 4: Implement bulk reject modal (AC: Reject requires reason)
  - [x] Subtask 4.1: Reuse RejectReasonModal from Story 3.3
  - [x] Subtask 4.2: Update modal to handle bulk operations
  - [x] Subtask 4.3: Show confirmation with case count
  - [x] Subtask 4.4: Apply same reason to all selected cases
  - [x] Subtask 4.5: Handle validation errors gracefully

- [x] Task 5: Implement TanStack Query hooks (AC: All)
  - [x] Subtask 5.1: Create useBulkApprove mutation hook
  - [x] Subtask 5.2: Create useBulkReject mutation hook
  - [x] Subtask 5.3: Implement optimistic updates for selected cases
  - [x] Subtask 5.4: Handle cache invalidation after bulk operations
  - [x] Subtask 5.5: Add error handling and retry logic

- [x] Task 6: Update CaseListPage with bulk actions (AC: All)
  - [x] Subtask 6.1: Integrate checkbox selection into table
  - [x] Subtask 6.2: Add BulkActionBar component
  - [x] Subtask 6.3: Handle bulk approve workflow
  - [x] Subtask 6.4: Handle bulk reject workflow with modal
  - [x] Subtask 6.5: Show success/error notifications with counts

- [x] Task 7: Add E2E tests with Playwright (AC: All)
  - [x] Subtask 7.1: Test select multiple cases workflow
  - [x] Subtask 7.2: Test bulk approve (select → approve → success)
  - [x] Subtask 7.3: Test bulk reject (select → reject → reason → success)
  - [x] Subtask 7.4: Test partial success handling
  - [x] Subtask 7.5: Test validation (max 50 cases limit)
  - [x] Subtask 7.6: Test accessibility (keyboard navigation, ARIA)


## Dev Notes

### Critical Context from Stories 3.1, 3.2, 3.3, and 3.4

**COMPLETED IN STORY 3.1:**
- ✅ React 19.2 + Mantine 8.3 + Vite 7.2 upgraded
- ✅ TanStack Query v5 configured
- ✅ Case list API endpoint (GET /api/v1/cases)
- ✅ CaseListTable with status badges
- ✅ API client with exponential backoff retry

**COMPLETED IN STORY 3.2:**
- ✅ Case detail API endpoint (GET /api/v1/cases/{id})
- ✅ CaseDetailPage with all sections
- ✅ DocumentViewer, VerificationChecks, OCRDataPanel components
- ✅ Audit logging for case views
- ✅ Presigned URL generation for documents
- ✅ CaseHistory component with Timeline display

**COMPLETED IN STORY 3.3:**
- ✅ Approve/reject API endpoints with conditional updates
- ✅ ApproveRejectButtons component with loading states
- ✅ RejectReasonModal with form validation
- ✅ Webhook notification system (SQS-based retry)
- ✅ Optimistic UI updates with TanStack Query
- ✅ Audit logging for all decisions

**COMPLETED IN STORY 3.4:**
- ✅ Case notes API endpoints (add/get notes)
- ✅ AddNoteForm and NotesList components
- ✅ Immutable data pattern for audit compliance
- ✅ TanStack Query mutations with optimistic updates
- ✅ Timeline integration for note events

**REUSE FROM PREVIOUS STORIES:**
- `apps/backoffice/src/lib/api.ts` - API client with retry logic
- `apps/backoffice/src/providers/` - QueryProvider, MantineProvider
- `apps/backoffice/src/features/cases/hooks/useCases.ts` - TanStack Query hook for case list
- `apps/backoffice/src/features/cases/components/CaseStatusBadge.tsx` - Status display
- `apps/backoffice/src/features/cases/components/RejectReasonModal.tsx` - Reuse for bulk reject
- `apps/backoffice/tests/e2e/fixtures/auth.fixture.ts` - Auth fixture

**KEY LEARNINGS FROM STORIES 3.1-3.4:**
- Mantine 8.3 Table API: `Table.Thead`, `Table.Tbody`, `Table.Tr`, `Table.Td`
- Mantine Checkbox: `Checkbox` component with `checked` and `onChange` props
- TanStack Query mutations: `useMutation` for POST requests with optimistic updates
- Toast notifications: `notifications.show()` from `@mantine/notifications`
- Audit logging pattern: Every action logged with user ID, timestamp, IP
- Conditional updates: DynamoDB `ConditionExpression` to prevent race conditions
- Partial success handling: Return array of results with success/failure per item

### Architecture Patterns and Constraints

**Bulk Approve API Endpoint Pattern (from ADR-003):**
```typescript
// POST /api/v1/cases/bulk-approve
// Request: { caseIds: string[] }
// Response: {
//   data: {
//     results: [
//       { caseId: string, success: boolean, error?: string },
//       ...
//     ],
//     summary: {
//       total: number,
//       succeeded: number,
//       failed: number
//     }
//   },
//   meta: { requestId, timestamp }
// }
```

**Bulk Reject API Endpoint Pattern:**
```typescript
// POST /api/v1/cases/bulk-reject
// Request: { caseIds: string[], reason: string, notes?: string }
// Response: {
//   data: {
//     results: [
//       { caseId: string, success: boolean, error?: string },
//       ...
//     ],
//     summary: {
//       total: number,
//       succeeded: number,
//       failed: number
//     }
//   },
//   meta: { requestId, timestamp }
// }
```

**DynamoDB Bulk Operation Pattern:**
```typescript
// Process each case individually with conditional updates
// CRITICAL: Use TransactWriteItems for atomicity (max 100 items)
// For >100 cases, batch into multiple transactions

// For each case:
// 1. Conditional update: Check status is "pending_review" or "in_review"
// 2. Update case status to "approved" or "rejected"
// 3. Create audit log entry
// 4. Trigger webhook notification (async via SQS)

// Return individual results:
// - success: true if case updated successfully
// - success: false if condition failed (already processed, not found, etc.)
// - error: Human-readable error message
```

**Audit Log Entry for Bulk Actions:**
```typescript
// Create individual audit entry for EACH case
{
  PK: `CASE#${caseId}`,
  SK: `AUDIT#${timestamp}`,
  action: 'CASE_BULK_APPROVED' | 'CASE_BULK_REJECTED',
  resourceType: 'CASE',
  resourceId: caseId,
  userId: userId,
  userName: userName,
  ipAddress: ipAddress,
  timestamp: timestamp,
  details: {
    bulkOperationId: uuid(), // Same ID for all cases in bulk operation
    totalCasesInBulk: number,
    reason: string, // For bulk reject
    notes: string // Optional for bulk reject
  }
}
```

**Validation Rules:**
- Maximum 50 cases per bulk operation (prevent timeout)
- All cases must belong to same client (security)
- Only cases in "pending_review" or "in_review" status can be bulk processed
- Bulk reject requires reason code (same as single reject)
- User must have "analyst" or "admin" role


### Source Tree Components to Touch

**New Files to Create:**
```
apps/backoffice/src/features/cases/
├── components/
│   ├── BulkActionBar.tsx            # Sticky action bar with bulk buttons
│   └── CaseCheckbox.tsx             # Checkbox for case selection
├── hooks/
│   ├── useBulkApprove.ts            # TanStack Query mutation
│   ├── useBulkReject.ts             # TanStack Query mutation
│   └── useCaseSelection.ts          # Hook for managing selected cases
└── types/
    └── bulk-action.ts               # Bulk action types and interfaces

services/verification/src/handlers/
├── bulk-approve.ts                  # POST /api/v1/cases/bulk-approve
├── bulk-approve.test.ts             # Unit tests
├── bulk-reject.ts                   # POST /api/v1/cases/bulk-reject
└── bulk-reject.test.ts              # Unit tests

apps/backoffice/tests/e2e/
└── bulk-actions.spec.ts             # E2E tests for bulk operations
```

**Files to Modify:**
```
apps/backoffice/src/features/cases/components/CaseListTable.tsx  # Add checkbox column
apps/backoffice/src/features/cases/pages/CaseListPage.tsx        # Add BulkActionBar
apps/backoffice/src/features/cases/components/RejectReasonModal.tsx # Support bulk mode
apps/backoffice/src/features/cases/hooks/index.ts                # Export new hooks
apps/backoffice/src/features/cases/components/index.ts           # Export new components
apps/backoffice/src/features/cases/types/index.ts                # Export bulk types
services/verification/serverless.yml                             # Add bulk endpoints
services/verification/src/types/verification.ts                  # Add bulk types
_bmad-output/implementation-artifacts/sprint-status.yaml         # Update story status
```

### Testing Standards Summary

**Unit Tests (Vitest):**
- Test bulk approve handler processes multiple cases correctly
- Test bulk reject handler applies reason to all cases
- Test validation (max 50 cases, same client, valid statuses)
- Test partial success scenarios (some succeed, some fail)
- Test audit logging creates individual entries for each case
- Test conditional updates prevent race conditions
- Target: >85% coverage

**Integration Tests:**
- Test bulk approve endpoint with real DynamoDB Local
- Test bulk reject endpoint with reason validation
- Test webhook notifications triggered for each case
- Test error cases (invalid case IDs, already processed, etc.)
- Test transaction limits (>100 cases batching)

**E2E Tests (Playwright):**
- Test complete bulk approve workflow (select → approve → success)
- Test complete bulk reject workflow (select → reject → reason → success)
- Test select all/none functionality
- Test partial success handling (some cases fail)
- Test validation (max 50 cases limit)
- Test accessibility (keyboard navigation, ARIA attributes)
- Test selection persistence across page navigation

### Project Structure Notes

**Alignment with Stories 3.1-3.4 Patterns:**
- Follow same component structure in `features/cases/`
- Use TanStack Query mutations for POST requests
- Reuse API client from `src/lib/api.ts`
- Follow Mantine 8.3 Table/Checkbox conventions
- Use toast notifications for user feedback
- Reuse RejectReasonModal from Story 3.3

**UX Design Compliance:**
- Follow case list wireframe from UX Design Spec
- Use Botswana Blue (#75AADB) for primary actions
- Sticky action bar appears when cases selected
- Show selection count: "3 cases selected"
- Bulk action buttons: "Approve Selected" and "Reject Selected"
- Confirmation modal for bulk operations
- Success notification shows counts: "5 cases approved, 2 failed"

### References

**Architecture Decisions:**
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-003] API Response Format
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-003] DynamoDB Single-Table Design
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-005] Audit Logging

**Epic Context:**
- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.5] Bulk Case Actions
- [Source: _bmad-output/planning-artifacts/epics.md#FR22] Bulk actions (approve/reject multiple cases)

**UX Design:**
- [Source: _bmad-output/planning-artifacts/ux-design-spec.md#Case-List-View] Bulk Actions UI
- [Source: _bmad-output/planning-artifacts/ux-design-spec.md#Bulk-Actions] Checkbox selection pattern

**Previous Stories:**
- [Source: _bmad-output/implementation-artifacts/3-1-case-list-view-with-filters.md] Story 3.1 patterns
- [Source: _bmad-output/implementation-artifacts/3-2-case-detail-view.md] Story 3.2 patterns
- [Source: _bmad-output/implementation-artifacts/3-3-approve-reject-workflow.md] Story 3.3 patterns (RejectReasonModal)
- [Source: _bmad-output/implementation-artifacts/3-4-case-notes-comments.md] Story 3.4 patterns

**Project Context:**
- [Source: docs/project-overview.md] Project structure and conventions
- [Source: docs/architecture-backoffice.md] Backoffice architecture patterns


## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (Implementation) + Claude Opus 4.5 (Code Review)

### Debug Log References

N/A - All tests passing

### Completion Notes List

✅ **Task 1: Checkbox Selection** - Implemented useCaseSelection hook with full state management, updated CaseListTable with checkbox column, select all/none functionality, and selection count indicator. All 13 tests passing (6 hook tests + 7 component tests).

✅ **Task 2: Bulk API Endpoints** - Created bulk-approve and bulk-reject handlers with comprehensive validation (max 50 cases), conditional DynamoDB updates to prevent race conditions, individual audit log entries per case, and partial success handling. All 21 tests passing (10 bulk-approve + 11 bulk-reject).

✅ **Task 3: BulkActionBar Component** - Built sticky action bar with Approve/Reject buttons, selection count display, clear selection button, and loading states. All 7 tests passing.

✅ **Task 4: Bulk Reject Modal** - Extended RejectReasonModal to support bulk mode with case count display and shared reason application. Maintains backward compatibility with single-case rejection.

✅ **Task 5: TanStack Query Hooks** - Implemented useBulkApprove and useBulkReject mutations with cache invalidation, success/error notifications showing counts, and partial success handling (X succeeded, Y failed). All 13 tests passing (6 useBulkApprove + 7 useBulkReject).

✅ **Task 6: CaseListPage Integration** - Integrated all bulk action components into CaseListPage with selection state management, validation (max 50 cases), and automatic selection clearing on filter/page changes.

✅ **Task 7: E2E Tests** - Created comprehensive Playwright tests covering bulk approve/reject workflows, keyboard accessibility, selection persistence, and edge cases. 10 test scenarios implemented.

**Key Technical Decisions:**
- Used individual DynamoDB updates instead of TransactWriteItems to avoid 100-item limit
- Implemented partial success pattern: process all cases, return individual results
- Added bulkOperationId to link audit entries across bulk operation
- Clear selection on filter/page changes to prevent confusion
- Max 50 cases validation on both frontend and backend

### Code Review Fixes (2026-01-16)

**HIGH Severity (Fixed):**
- H1: Implemented webhook notifications via SQS for bulk operations (was TODO)
- H2: Added unit tests for useBulkApprove and useBulkReject hooks (13 new tests)
- H3: Removed skipped E2E tests, implemented proper test scenarios

**MEDIUM Severity (Fixed):**
- M3: Added UUID suffix to audit log SK to prevent timestamp collisions
- M4: Added retry logic with exponential backoff for transient DynamoDB errors
- M5: Added aria-live="polite" and role="status" to selection count for screen readers

**LOW Severity (Fixed):**
- L1: Standardized error message casing ("Case is not in a valid status...")
- L2: Added JSDoc documentation to useBulkApprove and useBulkReject hooks

### File List

**Backend (services/verification/):**
- src/handlers/bulk-approve.ts (NEW, UPDATED - webhook + retry)
- src/handlers/bulk-approve.test.ts (NEW, UPDATED - webhook tests)
- src/handlers/bulk-reject.ts (NEW, UPDATED - webhook + retry)
- src/handlers/bulk-reject.test.ts (NEW, UPDATED - webhook tests)
- serverless.yml (MODIFIED - added bulk endpoints)

**Frontend (apps/backoffice/):**
- src/features/cases/types/bulk-action.ts (NEW)
- src/features/cases/types/index.ts (MODIFIED - export bulk types)
- src/features/cases/hooks/useCaseSelection.ts (NEW)
- src/features/cases/hooks/useCaseSelection.test.ts (NEW)
- src/features/cases/hooks/useBulkApprove.ts (NEW, UPDATED - JSDoc)
- src/features/cases/hooks/useBulkApprove.test.tsx (NEW)
- src/features/cases/hooks/useBulkReject.ts (NEW, UPDATED - JSDoc)
- src/features/cases/hooks/useBulkReject.test.tsx (NEW)
- src/features/cases/hooks/index.ts (MODIFIED - export new hooks)
- src/features/cases/components/BulkActionBar.tsx (NEW, UPDATED - ARIA)
- src/features/cases/components/BulkActionBar.test.tsx (NEW)
- src/features/cases/components/CaseListTable.tsx (MODIFIED - added checkbox support)
- src/features/cases/components/CaseListTable.test.tsx (NEW)
- src/features/cases/components/RejectReasonModal.tsx (MODIFIED - added bulk mode)
- src/features/cases/components/index.ts (MODIFIED - export BulkActionBar)
- src/features/cases/pages/CaseListPage.tsx (MODIFIED - integrated bulk actions)
- tests/e2e/bulk-actions.spec.ts (NEW, UPDATED - removed skipped tests)

**Story Tracking:**
- _bmad-output/implementation-artifacts/3-5-bulk-case-actions.md (MODIFIED - marked all tasks complete)
- _bmad-output/implementation-artifacts/sprint-status.yaml (MODIFIED - story status updated)

---

## 🎯 DEVELOPER CONTEXT: Ultimate Implementation Guide

### Mission Critical: What This Story Achieves

This story completes the **high-volume case processing workflow** in Epic 3. After Stories 3.1 (list), 3.2 (detail), 3.3 (decisions), and 3.4 (notes), this enables **efficient batch processing** for compliance officers handling large queues.

**Business Impact:**
- Compliance officers can process 50+ cases in seconds instead of minutes
- Reduces manual repetition and fatigue
- Maintains full audit trail for regulatory compliance
- Enables rapid response to verification backlogs

**Technical Impact:**
- Establishes bulk operation patterns for future features
- Demonstrates DynamoDB transaction handling
- Implements partial success/failure handling
- Creates reusable selection management patterns

### 🚨 CRITICAL: What Makes This Story Different

**This story implements BULK OPERATIONS with PARTIAL SUCCESS handling.** Unlike Stories 3.1-3.4 which operate on single cases, this must handle scenarios where some cases succeed and others fail.

**MANDATORY REQUIREMENTS:**
1. **Partial Success:** Return individual results for each case (success/failure)
2. **Audit Logging:** Create individual audit entry for EACH case in bulk operation
3. **Validation:** Max 50 cases per request (prevent Lambda timeout)
4. **Conditional Updates:** Use DynamoDB conditions to prevent race conditions
5. **User Feedback:** Show clear success/failure counts in notifications
6. **Transaction Safety:** Use TransactWriteItems for atomicity (batch if >100 cases)

### 🏗️ Technical Requirements (MUST FOLLOW)

#### 1. Backend API Handler Implementation

**Bulk Approve Handler:**
```typescript
// services/verification/src/handlers/bulk-approve.ts
import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'af-south-1' }));

interface BulkApproveRequest {
  caseIds: string[];
}

interface CaseResult {
  caseId: string;
  success: boolean;
  error?: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const userId = event.requestContext.authorizer?.claims?.sub;
  const userName = event.requestContext.authorizer?.claims?.name || 'Unknown';
  const ipAddress = event.requestContext.identity.sourceIp;
  const timestamp = new Date().toISOString();

  // Parse request body
  const body: BulkApproveRequest = JSON.parse(event.body || '{}');
  const { caseIds } = body;

  // Validate request
  if (!caseIds || !Array.isArray(caseIds) || caseIds.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'caseIds array is required' })
    };
  }

  if (caseIds.length > 50) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Maximum 50 cases per bulk operation' })
    };
  }

  const bulkOperationId = uuidv4();
  const results: CaseResult[] = [];

  // Process each case individually
  for (const caseId of caseIds) {
    try {
      // Update case status with conditional check
      await ddbClient.send(new UpdateCommand({
        TableName: process.env.TABLE_NAME,
        Key: {
          PK: `CASE#${caseId}`,
          SK: 'META'
        },
        UpdateExpression: 'SET #status = :approved, updatedAt = :timestamp, approvedBy = :userId',
        ConditionExpression: '#status IN (:pending, :inReview)',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':approved': 'approved',
          ':pending': 'pending_review',
          ':inReview': 'in_review',
          ':timestamp': timestamp,
          ':userId': userId
        }
      }));

      // Create audit log entry
      await ddbClient.send(new PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: {
          PK: `CASE#${caseId}`,
          SK: `AUDIT#${timestamp}`,
          action: 'CASE_BULK_APPROVED',
          resourceType: 'CASE',
          resourceId: caseId,
          userId,
          userName,
          ipAddress,
          timestamp,
          details: {
            bulkOperationId,
            totalCasesInBulk: caseIds.length
          }
        }
      }));

      // TODO: Trigger webhook notification (async via SQS)

      results.push({ caseId, success: true });
    } catch (error: any) {
      // Handle conditional check failure or other errors
      const errorMessage = error.name === 'ConditionalCheckFailedException'
        ? 'Case not in valid status for approval'
        : 'Failed to approve case';

      results.push({
        caseId,
        success: false,
        error: errorMessage
      });
    }
  }

  // Calculate summary
  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: {
        results,
        summary: {
          total: caseIds.length,
          succeeded,
          failed
        }
      },
      meta: {
        requestId: event.requestContext.requestId,
        timestamp,
        bulkOperationId
      }
    })
  };
};
```

**Bulk Reject Handler:**
```typescript
// services/verification/src/handlers/bulk-reject.ts
import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'af-south-1' }));

interface BulkRejectRequest {
  caseIds: string[];
  reason: string;
  notes?: string;
}

interface CaseResult {
  caseId: string;
  success: boolean;
  error?: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const userId = event.requestContext.authorizer?.claims?.sub;
  const userName = event.requestContext.authorizer?.claims?.name || 'Unknown';
  const ipAddress = event.requestContext.identity.sourceIp;
  const timestamp = new Date().toISOString();

  // Parse request body
  const body: BulkRejectRequest = JSON.parse(event.body || '{}');
  const { caseIds, reason, notes } = body;

  // Validate request
  if (!caseIds || !Array.isArray(caseIds) || caseIds.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'caseIds array is required' })
    };
  }

  if (!reason || !reason.trim()) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Rejection reason is required' })
    };
  }

  if (caseIds.length > 50) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Maximum 50 cases per bulk operation' })
    };
  }

  const bulkOperationId = uuidv4();
  const results: CaseResult[] = [];

  // Process each case individually
  for (const caseId of caseIds) {
    try {
      // Update case status with conditional check
      await ddbClient.send(new UpdateCommand({
        TableName: process.env.TABLE_NAME,
        Key: {
          PK: `CASE#${caseId}`,
          SK: 'META'
        },
        UpdateExpression: 'SET #status = :rejected, updatedAt = :timestamp, rejectedBy = :userId, rejectionReason = :reason, rejectionNotes = :notes',
        ConditionExpression: '#status IN (:pending, :inReview)',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':rejected': 'rejected',
          ':pending': 'pending_review',
          ':inReview': 'in_review',
          ':timestamp': timestamp,
          ':userId': userId,
          ':reason': reason,
          ':notes': notes || ''
        }
      }));

      // Create audit log entry
      await ddbClient.send(new PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: {
          PK: `CASE#${caseId}`,
          SK: `AUDIT#${timestamp}`,
          action: 'CASE_BULK_REJECTED',
          resourceType: 'CASE',
          resourceId: caseId,
          userId,
          userName,
          ipAddress,
          timestamp,
          details: {
            bulkOperationId,
            totalCasesInBulk: caseIds.length,
            reason,
            notes: notes || ''
          }
        }
      }));

      // TODO: Trigger webhook notification (async via SQS)

      results.push({ caseId, success: true });
    } catch (error: any) {
      // Handle conditional check failure or other errors
      const errorMessage = error.name === 'ConditionalCheckFailedException'
        ? 'Case not in valid status for rejection'
        : 'Failed to reject case';

      results.push({
        caseId,
        success: false,
        error: errorMessage
      });
    }
  }

  // Calculate summary
  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: {
        results,
        summary: {
          total: caseIds.length,
          succeeded,
          failed
        }
      },
      meta: {
        requestId: event.requestContext.requestId,
        timestamp,
        bulkOperationId
      }
    })
  };
};
```

**Serverless Configuration:**
```yaml
# services/verification/serverless.yml
functions:
  bulkApprove:
    handler: src/handlers/bulk-approve.handler
    events:
      - http:
          path: /api/v1/cases/bulk-approve
          method: post
          cors: true
          authorizer:
            name: cognitoAuthorizer
            type: COGNITO_USER_POOLS
            arn: ${env:COGNITO_USER_POOL_ARN}
    environment:
      TABLE_NAME: ${env:DYNAMODB_TABLE_NAME}
    timeout: 30 # Increased for bulk operations
    iamRoleStatements:
      - Effect: Allow
        Action:
          - dynamodb:UpdateItem
          - dynamodb:PutItem
        Resource:
          - arn:aws:dynamodb:${env:AWS_REGION}:*:table/${env:DYNAMODB_TABLE_NAME}

  bulkReject:
    handler: src/handlers/bulk-reject.handler
    events:
      - http:
          path: /api/v1/cases/bulk-reject
          method: post
          cors: true
          authorizer:
            name: cognitoAuthorizer
            type: COGNITO_USER_POOLS
            arn: ${env:COGNITO_USER_POOL_ARN}
    environment:
      TABLE_NAME: ${env:DYNAMODB_TABLE_NAME}
    timeout: 30 # Increased for bulk operations
    iamRoleStatements:
      - Effect: Allow
        Action:
          - dynamodb:UpdateItem
          - dynamodb:PutItem
        Resource:
          - arn:aws:dynamodb:${env:AWS_REGION}:*:table/${env:DYNAMODB_TABLE_NAME}
```


#### 2. Frontend Component Implementation

**Type Definitions:**
```typescript
// apps/backoffice/src/features/cases/types/bulk-action.ts
export interface BulkApproveRequest {
  caseIds: string[];
}

export interface BulkRejectRequest {
  caseIds: string[];
  reason: string;
  notes?: string;
}

export interface CaseResult {
  caseId: string;
  success: boolean;
  error?: string;
}

export interface BulkOperationResponse {
  data: {
    results: CaseResult[];
    summary: {
      total: number;
      succeeded: number;
      failed: number;
    };
  };
  meta: {
    requestId: string;
    timestamp: string;
    bulkOperationId: string;
  };
}
```

**Case Selection Hook:**
```typescript
// apps/backoffice/src/features/cases/hooks/useCaseSelection.ts
import { useState, useCallback } from 'react';

export const useCaseSelection = () => {
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());

  const toggleCase = useCallback((caseId: string) => {
    setSelectedCaseIds(prev => {
      const next = new Set(prev);
      if (next.has(caseId)) {
        next.delete(caseId);
      } else {
        next.add(caseId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((caseIds: string[]) => {
    setSelectedCaseIds(new Set(caseIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCaseIds(new Set());
  }, []);

  const isSelected = useCallback((caseId: string) => {
    return selectedCaseIds.has(caseId);
  }, [selectedCaseIds]);

  return {
    selectedCaseIds: Array.from(selectedCaseIds),
    selectedCount: selectedCaseIds.size,
    toggleCase,
    selectAll,
    clearSelection,
    isSelected
  };
};
```

**TanStack Query Hooks:**
```typescript
// apps/backoffice/src/features/cases/hooks/useBulkApprove.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notifications } from '@mantine/notifications';
import type { BulkApproveRequest, BulkOperationResponse } from '../types/bulk-action';

export const useBulkApprove = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: BulkApproveRequest) => {
      const response = await api.post<BulkOperationResponse>(
        '/api/v1/cases/bulk-approve',
        request
      );
      return response.data;
    },
    onSuccess: (data) => {
      const { succeeded, failed } = data.data.summary;

      // Invalidate case list to refetch
      queryClient.invalidateQueries({ queryKey: ['cases'] });

      // Show success notification
      if (succeeded > 0 && failed === 0) {
        notifications.show({
          title: 'Success',
          message: `${succeeded} case${succeeded > 1 ? 's' : ''} approved successfully`,
          color: 'green'
        });
      } else if (succeeded > 0 && failed > 0) {
        notifications.show({
          title: 'Partial Success',
          message: `${succeeded} case${succeeded > 1 ? 's' : ''} approved, ${failed} failed`,
          color: 'yellow'
        });
      } else {
        notifications.show({
          title: 'Error',
          message: 'All cases failed to approve',
          color: 'red'
        });
      }
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to approve cases. Please try again.',
        color: 'red'
      });
    }
  });
};
```

```typescript
// apps/backoffice/src/features/cases/hooks/useBulkReject.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notifications } from '@mantine/notifications';
import type { BulkRejectRequest, BulkOperationResponse } from '../types/bulk-action';

export const useBulkReject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: BulkRejectRequest) => {
      const response = await api.post<BulkOperationResponse>(
        '/api/v1/cases/bulk-reject',
        request
      );
      return response.data;
    },
    onSuccess: (data) => {
      const { succeeded, failed } = data.data.summary;

      // Invalidate case list to refetch
      queryClient.invalidateQueries({ queryKey: ['cases'] });

      // Show success notification
      if (succeeded > 0 && failed === 0) {
        notifications.show({
          title: 'Success',
          message: `${succeeded} case${succeeded > 1 ? 's' : ''} rejected successfully`,
          color: 'green'
        });
      } else if (succeeded > 0 && failed > 0) {
        notifications.show({
          title: 'Partial Success',
          message: `${succeeded} case${succeeded > 1 ? 's' : ''} rejected, ${failed} failed`,
          color: 'yellow'
        });
      } else {
        notifications.show({
          title: 'Error',
          message: 'All cases failed to reject',
          color: 'red'
        });
      }
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to reject cases. Please try again.',
        color: 'red'
      });
    }
  });
};
```

**BulkActionBar Component:**
```typescript
// apps/backoffice/src/features/cases/components/BulkActionBar.tsx
import { Group, Button, Text, Paper } from '@mantine/core';
import { IconCheck, IconX, IconTrash } from '@tabler/icons-react';

interface BulkActionBarProps {
  selectedCount: number;
  onApprove: () => void;
  onReject: () => void;
  onClear: () => void;
  isLoading?: boolean;
}

export const BulkActionBar = ({
  selectedCount,
  onApprove,
  onReject,
  onClear,
  isLoading = false
}: BulkActionBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <Paper
      p="md"
      withBorder
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'var(--mantine-color-body)'
      }}
      data-testid="bulk-action-bar"
    >
      <Group justify="space-between">
        <Group gap="md">
          <Text fw={500}>
            {selectedCount} case{selectedCount > 1 ? 's' : ''} selected
          </Text>
          <Button
            variant="subtle"
            size="sm"
            onClick={onClear}
            leftSection={<IconTrash size={16} />}
            data-testid="clear-selection-button"
          >
            Clear Selection
          </Button>
        </Group>
        <Group gap="sm">
          <Button
            color="green"
            onClick={onApprove}
            loading={isLoading}
            leftSection={<IconCheck size={16} />}
            data-testid="bulk-approve-button"
          >
            Approve Selected
          </Button>
          <Button
            color="red"
            onClick={onReject}
            loading={isLoading}
            leftSection={<IconX size={16} />}
            data-testid="bulk-reject-button"
          >
            Reject Selected
          </Button>
        </Group>
      </Group>
    </Paper>
  );
};
```

**Update CaseListTable with Checkboxes:**
```typescript
// apps/backoffice/src/features/cases/components/CaseListTable.tsx
// Add to imports:
import { Checkbox } from '@mantine/core';

// Add props:
interface CaseListTableProps {
  cases: Case[];
  isLoading: boolean;
  selectedCaseIds?: string[];
  onToggleCase?: (caseId: string) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
}

// Add checkbox column to table header:
<Table.Thead>
  <Table.Tr>
    {onToggleCase && (
      <Table.Th style={{ width: 40 }}>
        <Checkbox
          checked={selectedCaseIds?.length === cases.length && cases.length > 0}
          indeterminate={
            selectedCaseIds && selectedCaseIds.length > 0 && selectedCaseIds.length < cases.length
          }
          onChange={() => {
            if (selectedCaseIds?.length === cases.length) {
              onClearSelection?.();
            } else {
              onSelectAll?.();
            }
          }}
          data-testid="select-all-checkbox"
        />
      </Table.Th>
    )}
    <Table.Th>Customer Name</Table.Th>
    <Table.Th>Omang/ID</Table.Th>
    <Table.Th>Status</Table.Th>
    <Table.Th>Date</Table.Th>
    <Table.Th>Assignee</Table.Th>
  </Table.Tr>
</Table.Thead>

// Add checkbox column to table body:
<Table.Tbody>
  {cases.map((case) => (
    <Table.Tr key={case.caseId}>
      {onToggleCase && (
        <Table.Td>
          <Checkbox
            checked={selectedCaseIds?.includes(case.caseId)}
            onChange={() => onToggleCase(case.caseId)}
            data-testid={`case-checkbox-${case.caseId}`}
          />
        </Table.Td>
      )}
      <Table.Td>{case.customerName}</Table.Td>
      <Table.Td>{case.omangNumber}</Table.Td>
      <Table.Td>
        <CaseStatusBadge status={case.status} />
      </Table.Td>
      <Table.Td>{formatDate(case.createdAt)}</Table.Td>
      <Table.Td>{case.assignee || 'Unassigned'}</Table.Td>
    </Table.Tr>
  ))}
</Table.Tbody>
```

**Update CaseListPage:**
```typescript
// apps/backoffice/src/features/cases/pages/CaseListPage.tsx
// Add to imports:
import { BulkActionBar } from '../components/BulkActionBar';
import { useCaseSelection } from '../hooks/useCaseSelection';
import { useBulkApprove } from '../hooks/useBulkApprove';
import { useBulkReject } from '../hooks/useBulkReject';
import { RejectReasonModal } from '../components/RejectReasonModal';
import { useState } from 'react';

// Inside component:
const {
  selectedCaseIds,
  selectedCount,
  toggleCase,
  selectAll,
  clearSelection,
  isSelected
} = useCaseSelection();

const bulkApprove = useBulkApprove();
const bulkReject = useBulkReject();
const [rejectModalOpen, setRejectModalOpen] = useState(false);

const handleBulkApprove = async () => {
  if (selectedCount > 50) {
    notifications.show({
      title: 'Error',
      message: 'Maximum 50 cases per bulk operation',
      color: 'red'
    });
    return;
  }

  await bulkApprove.mutateAsync({ caseIds: selectedCaseIds });
  clearSelection();
};

const handleBulkReject = () => {
  if (selectedCount > 50) {
    notifications.show({
      title: 'Error',
      message: 'Maximum 50 cases per bulk operation',
      color: 'red'
    });
    return;
  }

  setRejectModalOpen(true);
};

const handleRejectConfirm = async (reason: string, notes?: string) => {
  await bulkReject.mutateAsync({
    caseIds: selectedCaseIds,
    reason,
    notes
  });
  clearSelection();
  setRejectModalOpen(false);
};

// Add to JSX:
<BulkActionBar
  selectedCount={selectedCount}
  onApprove={handleBulkApprove}
  onReject={handleBulkReject}
  onClear={clearSelection}
  isLoading={bulkApprove.isPending || bulkReject.isPending}
/>

<CaseListTable
  cases={cases}
  isLoading={isLoading}
  selectedCaseIds={selectedCaseIds}
  onToggleCase={toggleCase}
  onSelectAll={() => selectAll(cases.map(c => c.caseId))}
  onClearSelection={clearSelection}
/>

<RejectReasonModal
  opened={rejectModalOpen}
  onClose={() => setRejectModalOpen(false)}
  onConfirm={handleRejectConfirm}
  isLoading={bulkReject.isPending}
  bulkMode={true}
  caseCount={selectedCount}
/>
```

**Update RejectReasonModal for Bulk Mode:**
```typescript
// apps/backoffice/src/features/cases/components/RejectReasonModal.tsx
// Add props:
interface RejectReasonModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: (reason: string, notes?: string) => void;
  isLoading?: boolean;
  bulkMode?: boolean;
  caseCount?: number;
}

// Update modal title and description:
<Modal
  opened={opened}
  onClose={onClose}
  title={bulkMode ? `Reject ${caseCount} Cases` : 'Reject Case'}
  size="md"
>
  <Text size="sm" c="dimmed" mb="md">
    {bulkMode
      ? `This reason will be applied to all ${caseCount} selected cases.`
      : 'Please provide a reason for rejecting this case.'}
  </Text>
  {/* Rest of form... */}
</Modal>
```


#### 3. Testing Implementation

**Unit Tests for Bulk Approve Handler:**
```typescript
// services/verification/src/handlers/bulk-approve.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { handler } from './bulk-approve';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('bulk-approve handler', () => {
  beforeEach(() => {
    ddbMock.reset();
    vi.clearAllMocks();
  });

  it('should approve multiple cases successfully', async () => {
    ddbMock.on(UpdateCommand).resolves({});
    ddbMock.on(PutCommand).resolves({});

    const event = {
      body: JSON.stringify({ caseIds: ['case-1', 'case-2', 'case-3'] }),
      requestContext: {
        authorizer: {
          claims: {
            sub: 'user-123',
            name: 'John Doe'
          }
        },
        identity: { sourceIp: '192.168.1.1' },
        requestId: 'req-123'
      }
    };

    const response = await handler(event as any, {} as any, {} as any);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.summary.total).toBe(3);
    expect(body.data.summary.succeeded).toBe(3);
    expect(body.data.summary.failed).toBe(0);
  });

  it('should handle partial success', async () => {
    // First case succeeds
    ddbMock.on(UpdateCommand, {
      Key: { PK: 'CASE#case-1', SK: 'META' }
    }).resolves({});

    // Second case fails (already processed)
    ddbMock.on(UpdateCommand, {
      Key: { PK: 'CASE#case-2', SK: 'META' }
    }).rejects({ name: 'ConditionalCheckFailedException' });

    // Third case succeeds
    ddbMock.on(UpdateCommand, {
      Key: { PK: 'CASE#case-3', SK: 'META' }
    }).resolves({});

    ddbMock.on(PutCommand).resolves({});

    const event = {
      body: JSON.stringify({ caseIds: ['case-1', 'case-2', 'case-3'] }),
      requestContext: {
        authorizer: { claims: { sub: 'user-123', name: 'John Doe' } },
        identity: { sourceIp: '192.168.1.1' },
        requestId: 'req-123'
      }
    };

    const response = await handler(event as any, {} as any, {} as any);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.summary.succeeded).toBe(2);
    expect(body.data.summary.failed).toBe(1);
    expect(body.data.results[1].success).toBe(false);
    expect(body.data.results[1].error).toContain('not in valid status');
  });

  it('should return 400 if caseIds is empty', async () => {
    const event = {
      body: JSON.stringify({ caseIds: [] }),
      requestContext: {
        authorizer: { claims: { sub: 'user-123', name: 'John Doe' } },
        identity: { sourceIp: '192.168.1.1' },
        requestId: 'req-123'
      }
    };

    const response = await handler(event as any, {} as any, {} as any);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe('caseIds array is required');
  });

  it('should return 400 if more than 50 cases', async () => {
    const caseIds = Array.from({ length: 51 }, (_, i) => `case-${i}`);
    const event = {
      body: JSON.stringify({ caseIds }),
      requestContext: {
        authorizer: { claims: { sub: 'user-123', name: 'John Doe' } },
        identity: { sourceIp: '192.168.1.1' },
        requestId: 'req-123'
      }
    };

    const response = await handler(event as any, {} as any, {} as any);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe('Maximum 50 cases per bulk operation');
  });

  it('should create individual audit log entries', async () => {
    ddbMock.on(UpdateCommand).resolves({});
    ddbMock.on(PutCommand).resolves({});

    const event = {
      body: JSON.stringify({ caseIds: ['case-1', 'case-2'] }),
      requestContext: {
        authorizer: { claims: { sub: 'user-123', name: 'John Doe' } },
        identity: { sourceIp: '192.168.1.1' },
        requestId: 'req-123'
      }
    };

    await handler(event as any, {} as any, {} as any);

    const putCalls = ddbMock.calls().filter(call => call.args[0] instanceof PutCommand);
    expect(putCalls.length).toBe(2); // One audit entry per case

    const auditEntries = putCalls.map(call => call.args[0].input.Item);
    expect(auditEntries[0].action).toBe('CASE_BULK_APPROVED');
    expect(auditEntries[1].action).toBe('CASE_BULK_APPROVED');
    expect(auditEntries[0].details.bulkOperationId).toBe(auditEntries[1].details.bulkOperationId);
  });
});
```

**E2E Tests:**
```typescript
// apps/backoffice/tests/e2e/bulk-actions.spec.ts
import { test, expect } from '@playwright/test';
import { authFixture } from './fixtures/auth.fixture';

test.describe('Bulk Case Actions', () => {
  test.use(authFixture);

  test('should select multiple cases and bulk approve', async ({ page }) => {
    await page.goto('/cases');

    // Select 3 cases
    await page.getByTestId('case-checkbox-case-1').check();
    await page.getByTestId('case-checkbox-case-2').check();
    await page.getByTestId('case-checkbox-case-3').check();

    // Verify bulk action bar appears
    await expect(page.getByTestId('bulk-action-bar')).toBeVisible();
    await expect(page.getByText('3 cases selected')).toBeVisible();

    // Click bulk approve
    await page.getByTestId('bulk-approve-button').click();

    // Verify success notification
    await expect(page.getByText('3 cases approved successfully')).toBeVisible();

    // Verify selection cleared
    await expect(page.getByTestId('bulk-action-bar')).not.toBeVisible();
  });

  test('should select multiple cases and bulk reject with reason', async ({ page }) => {
    await page.goto('/cases');

    // Select 2 cases
    await page.getByTestId('case-checkbox-case-1').check();
    await page.getByTestId('case-checkbox-case-2').check();

    // Click bulk reject
    await page.getByTestId('bulk-reject-button').click();

    // Verify modal opens with bulk mode
    await expect(page.getByText('Reject 2 Cases')).toBeVisible();
    await expect(page.getByText('This reason will be applied to all 2 selected cases')).toBeVisible();

    // Select reason and submit
    await page.getByTestId('reject-reason-select').click();
    await page.getByText('Blurry Image').click();
    await page.getByTestId('reject-confirm-button').click();

    // Verify success notification
    await expect(page.getByText('2 cases rejected successfully')).toBeVisible();
  });

  test('should select all cases using header checkbox', async ({ page }) => {
    await page.goto('/cases');

    // Click select all checkbox
    await page.getByTestId('select-all-checkbox').check();

    // Verify all cases selected
    await expect(page.getByText(/\d+ cases selected/)).toBeVisible();

    // Uncheck select all
    await page.getByTestId('select-all-checkbox').uncheck();

    // Verify selection cleared
    await expect(page.getByTestId('bulk-action-bar')).not.toBeVisible();
  });

  test('should clear selection using clear button', async ({ page }) => {
    await page.goto('/cases');

    // Select cases
    await page.getByTestId('case-checkbox-case-1').check();
    await page.getByTestId('case-checkbox-case-2').check();

    // Click clear selection
    await page.getByTestId('clear-selection-button').click();

    // Verify selection cleared
    await expect(page.getByTestId('bulk-action-bar')).not.toBeVisible();
  });

  test('should show error for more than 50 cases', async ({ page }) => {
    await page.goto('/cases');

    // Mock selecting 51 cases (would need to mock API or have test data)
    // This test assumes you have a way to select 51+ cases

    // Click bulk approve
    await page.getByTestId('bulk-approve-button').click();

    // Verify error notification
    await expect(page.getByText('Maximum 50 cases per bulk operation')).toBeVisible();
  });

  test('should handle partial success', async ({ page }) => {
    await page.goto('/cases');

    // Select cases (some will fail in mock)
    await page.getByTestId('case-checkbox-case-1').check();
    await page.getByTestId('case-checkbox-case-2').check();
    await page.getByTestId('case-checkbox-case-3').check();

    // Click bulk approve
    await page.getByTestId('bulk-approve-button').click();

    // Verify partial success notification
    await expect(page.getByText(/\d+ cases approved, \d+ failed/)).toBeVisible();
  });

  test('should be keyboard accessible', async ({ page }) => {
    await page.goto('/cases');

    // Tab to first checkbox
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('case-checkbox-case-1')).toBeFocused();

    // Select with Space
    await page.keyboard.press('Space');
    await expect(page.getByTestId('case-checkbox-case-1')).toBeChecked();

    // Tab to bulk approve button
    // (number of tabs depends on layout)
    await page.getByTestId('bulk-approve-button').focus();
    await expect(page.getByTestId('bulk-approve-button')).toBeFocused();

    // Activate with Enter
    await page.keyboard.press('Enter');

    // Verify success
    await expect(page.getByText(/case.*approved successfully/)).toBeVisible();
  });
});
```

### 🔬 Latest Technical Information

**Mantine 8.3 Checkbox Component (January 2026):**
- `Checkbox` component with `checked`, `indeterminate`, and `onChange` props
- Indeterminate state for "select all" when partially selected
- Accessible by default with ARIA attributes
- Keyboard navigation support (Space to toggle)

**TanStack Query v5 Mutation Patterns:**
- `useMutation` for POST requests with success/error callbacks
- `invalidateQueries` to refetch data after mutations
- No optimistic updates needed for bulk operations (too complex)
- Error handling with user-friendly notifications

**DynamoDB Conditional Updates (2026):**
- `ConditionExpression` prevents race conditions
- `ConditionalCheckFailedException` when condition fails
- Individual updates for each case (no transactions for >25 items)
- Audit logging for every successful update

**Partial Success Pattern:**
- Process each case individually in loop
- Catch errors per case, don't fail entire operation
- Return array of results with success/failure per case
- Show summary in notification (X succeeded, Y failed)

### 🚨 Common Pitfalls to Avoid

1. **Transaction Limits:** DynamoDB TransactWriteItems max 100 items - use individual updates for bulk operations
2. **Timeout Risk:** Lambda 30s timeout - limit to 50 cases per request
3. **Race Conditions:** Always use conditional updates to check case status
4. **Missing Audit Logs:** Create individual audit entry for EACH case
5. **Poor UX:** Show clear success/failure counts, not just "done"
6. **Selection State:** Clear selection after bulk operation completes
7. **Validation:** Enforce max 50 cases on both frontend and backend
8. **Partial Success:** Handle scenarios where some cases succeed and others fail

### ✅ Definition of Done

- [ ] Backend handlers pass all unit tests (>85% coverage)
- [ ] Frontend components render correctly with all states
- [ ] E2E tests pass for complete workflows
- [ ] Checkbox selection works (individual, select all, clear)
- [ ] Bulk approve processes multiple cases correctly
- [ ] Bulk reject requires reason and applies to all cases
- [ ] Partial success scenarios handled gracefully
- [ ] Audit logging creates individual entries for each case
- [ ] Validation enforces max 50 cases limit
- [ ] Success/failure counts shown in notifications
- [ ] Selection cleared after bulk operation
- [ ] Accessibility tested (keyboard navigation, ARIA)
- [ ] Sprint status updated to "ready-for-dev"
