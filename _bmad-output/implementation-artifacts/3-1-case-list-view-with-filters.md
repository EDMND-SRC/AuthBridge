# Story 3.1: Case List View with Filters

Status: ready-for-dev

## Story

As a compliance officer,
I want to view all verification cases with filtering options,
So that I can efficiently manage my review queue.

## Acceptance Criteria

**Given** the user is logged into the Backoffice
**When** they navigate to the Cases page
**Then** cases are displayed in a table with: Customer Name, Omang, Status, Date, Assignee
**And** filters are available for: Status, Date Range, Document Type, Assignee
**And** search works by name, Omang number, or email
**And** results load in < 1 second

## Tasks / Subtasks

- [ ] Task 1: Set up React 19.2 + Mantine 8.3 frontend infrastructure (AC: All)
  - [ ] Subtask 1.1: Upgrade React 18 → 19.2 and enable React Compiler
  - [ ] Subtask 1.2: Upgrade Mantine 7 → 8.3 with new component APIs
  - [ ] Subtask 1.3: Configure Vite 7.2 with Rolldown bundler
  - [ ] Subtask 1.4: Set up TanStack Query v5 for data fetching
  - [ ] Subtask 1.5: Configure authentication with AWS Cognito (already implemented)

- [ ] Task 2: Create case list API endpoint with filtering (AC: All)
  - [ ] Subtask 2.1: Implement GET /api/v1/cases with query parameters
  - [ ] Subtask 2.2: Add DynamoDB query with GSI for status filtering
  - [ ] Subtask 2.3: Implement search by name, Omang, email
  - [ ] Subtask 2.4: Add pagination support (limit, cursor)
  - [ ] Subtask 2.5: Optimize query performance for <1s response time

- [ ] Task 3: Build case list UI component (AC: Table display)
  - [ ] Subtask 3.1: Create CaseListTable component with Mantine Table
  - [ ] Subtask 3.2: Display columns: Customer Name, Omang (masked), Status, Date, Assignee
  - [ ] Subtask 3.3: Add status badge component with color coding
  - [ ] Subtask 3.4: Implement row click navigation to case detail
  - [ ] Subtask 3.5: Add loading states and empty states

- [ ] Task 4: Implement filter controls (AC: Filters available)
  - [ ] Subtask 4.1: Create FilterBar component with Mantine Select/DatePicker
  - [ ] Subtask 4.2: Add status filter dropdown (Pending, In Review, Approved, Rejected)
  - [ ] Subtask 4.3: Add date range picker (Today, Last 7 days, Last 30 days, Custom)
  - [ ] Subtask 4.4: Add document type filter (Omang, Passport, Driver's License)
  - [ ] Subtask 4.5: Add assignee filter (dropdown of analysts)

- [ ] Task 5: Implement search functionality (AC: Search works)
  - [ ] Subtask 5.1: Create SearchInput component with debounce
  - [ ] Subtask 5.2: Implement search by customer name
  - [ ] Subtask 5.3: Implement search by Omang number (last 4 digits only)
  - [ ] Subtask 5.4: Implement search by email
  - [ ] Subtask 5.5: Add search result highlighting

- [ ] Task 6: Add E2E tests with Playwright (AC: All)
  - [ ] Subtask 6.1: Set up Playwright test framework
  - [ ] Subtask 6.2: Create test fixtures for authenticated user
  - [ ] Subtask 6.3: Test case list loads and displays data
  - [ ] Subtask 6.4: Test filters update results correctly
  - [ ] Subtask 6.5: Test search functionality
  - [ ] Subtask 6.6: Test pagination and performance

## Dev Notes

### Critical Context from Epic 2 Retrospective

**PREPARATION COMPLETED:**
- ✅ User authentication (AWS Cognito) implemented during prep sprint
- ✅ DynamoDB schema supports case listing with GSI
- ✅ S3 presigned URLs available for document viewing
- ✅ Integration test framework ready

**FRONTEND SETUP REQUIRED (This Story):**
- React 19.2 + Mantine 8.3 upgrade (estimated 1 day)
- Vite 7.2 with Rolldown configuration
- TanStack Query v5 setup
- E2E testing with Playwright (estimated 1 day)

**KEY LEARNINGS FROM EPIC 2:**
- Comprehensive dev notes accelerate development significantly
- Integration tests with real AWS services provide confidence
- Documentation discoverability matters (setup guides visible in main README)
- SQS async pattern handles AWS quotas naturally

### Architecture Patterns and Constraints

**Frontend Stack (from ADR-008):**
- React 19.2 with React Compiler for automatic optimization
- Mantine 8.3 UI component library
- Refine 5 admin panel framework
- TanStack Query v5 for data fetching and caching
- Vite 7.2 with Rolldown bundler (Rust-based, faster builds)

**Authentication (from ADR-004):**
- AWS Cognito User Pools with passwordless support
- JWT tokens for API authentication (1-hour expiry)
- Casbin RBAC for authorization (roles: admin, analyst, reviewer)

**API Patterns (from ADR-003):**
- Endpoint: GET /api/v1/cases
- Query params: status, dateFrom, dateTo, documentType, assignee, search, limit, cursor
- Response format: `{ data: [...], meta: { requestId, timestamp, pagination } }`
- Response time target: <500ms (p95)

**DynamoDB Query Pattern (from ADR-003):**
```typescript
// GSI1: Query cases by status
const params = {
  TableName: 'AuthBridgeTable',
  IndexName: 'StatusIndex',
  KeyConditionExpression: 'GSI1PK = :status',
  ExpressionAttributeValues: {
    ':status': `STATUS#${status}`
  },
  Limit: 20
};
```

**Data Masking (from Project Context):**
- NEVER log full Omang numbers
- Display format: `***1234` (last 4 digits only)
- Full Omang only visible in case detail view with audit logging

### Source Tree Components to Touch

**New Files to Create:**
```
apps/backoffice/src/
├── features/cases/
│   ├── components/
│   │   ├── CaseListTable.tsx          # Main table component
│   │   ├── CaseStatusBadge.tsx        # Status indicator
│   │   ├── FilterBar.tsx              # Filter controls
│   │   ├── SearchInput.tsx            # Search with debounce
│   │   └── CaseListEmpty.tsx          # Empty state
│   ├── hooks/
│   │   ├── useCases.ts                # TanStack Query hook
│   │   └── useCaseFilters.ts          # Filter state management
│   ├── types/
│   │   └── case.ts                    # Case type definitions
│   └── pages/
│       └── CaseListPage.tsx           # Main page component

services/backend/src/handlers/cases/
├── list.ts                             # GET /api/v1/cases handler
├── list.test.ts                        # Unit tests
└── types.ts                            # Request/response types

apps/backoffice/tests/e2e/
├── cases/
│   ├── case-list.spec.ts              # E2E tests
│   └── case-filters.spec.ts           # Filter tests
└── fixtures/
    └── cases.ts                        # Test data fixtures
```

**Files to Modify:**
```
apps/backoffice/package.json            # Upgrade React, Mantine, add TanStack Query
apps/backoffice/vite.config.ts          # Configure Vite 7.2 + Rolldown
apps/backoffice/src/App.tsx             # Add cases route
apps/backoffice/playwright.config.ts    # Configure Playwright
services/backend/serverless.yml         # Add cases/list endpoint
```

### Testing Standards Summary

**Unit Tests (Vitest):**
- Test all business logic in handlers
- Mock DynamoDB calls with aws-sdk-client-mock
- Test filter combinations and edge cases
- Target: >85% coverage

**Integration Tests:**
- Test API endpoint with real DynamoDB Local
- Verify query performance <1s
- Test pagination and cursor logic
- Use existing integration test framework from Epic 2

**E2E Tests (Playwright):**
- Test complete user flow: login → cases page → filters → search
- Test accessibility (WCAG 2.1 AA)
- Test responsive design (mobile, tablet, desktop)
- Use auth fixture from TD-008 fix

**Performance Tests:**
- Load test with 1000+ cases
- Verify <1s page load time
- Test filter response time
- Monitor CloudWatch metrics

### Project Structure Notes

**Alignment with Unified Project Structure:**
- Follow monorepo structure: `apps/backoffice/` for frontend
- Use `packages/common/` for shared types (Case, Document, User)
- Backend handlers in `services/backend/src/handlers/cases/`
- E2E tests in `apps/backoffice/tests/e2e/`

**Detected Conflicts or Variances:**
- Existing backoffice uses React 18 + Mantine 7 → Upgrade required
- Existing backoffice uses Refine 3.18 → Upgrade to Refine 5 required
- No conflicts with existing auth implementation (Cognito already set up)

### References

**Architecture Decisions:**
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-008] React 19 + Mantine 8 for Backoffice
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-003] DynamoDB Single-Table Design
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-004] AWS Cognito Authentication
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-005] Casbin RBAC Authorization

**Epic Context:**
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-3] Case Management Dashboard
- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.1] Case List View with Filters

**Retrospective Insights:**
- [Source: _bmad-output/implementation-artifacts/epic-2-retro-2026-01-15.md#Next-Epic-Preparation] Frontend setup required
- [Source: _bmad-output/implementation-artifacts/epic-2-retro-2026-01-15.md#Action-Items] E2E testing setup needed

**Project Context:**
- [Source: _bmad-output/project-context.md#Technology-Stack] Node.js 22, React 19.2, Mantine 8.3
- [Source: _bmad-output/project-context.md#Data-Protection-Rules] PII masking requirements
- [Source: _bmad-output/project-context.md#Testing-Rules] Playwright configuration

**Technical Debt:**
- [Source: _bmad-output/implementation-artifacts/technical-debt-registry.md#TD-007] E2E tests enabled with auth fixture
- [Source: _bmad-output/implementation-artifacts/technical-debt-registry.md#TD-021] Outdated dependencies (React, Mantine, Refine)

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_


---

## 🎯 DEVELOPER CONTEXT: Ultimate Implementation Guide

### Mission Critical: What This Story Achieves

This is the **FIRST UI story** in the AuthBridge project. You're building the foundation for the entire Case Management Dashboard. Every decision you make here sets patterns that will be replicated across Epic 3.

**Business Impact:**
- Compliance officers can finally see and manage verification cases
- First user-facing payoff for all the backend work from Epics 1.5 and 2
- Enables manual review workflow (approve/reject) in subsequent stories

**Technical Impact:**
- Establishes React 19.2 + Mantine 8.3 patterns for all future UI work
- Sets up TanStack Query patterns for data fetching
- Creates reusable components (table, filters, search) for other pages
- Defines API contract for case management endpoints

### 🚨 CRITICAL: What Makes This Story Different

**This is NOT a greenfield project.** You're working in a brownfield codebase built on Ballerine open-source platform. Key implications:

1. **Existing Backoffice App:** There's already a React app at `apps/backoffice/` with:
   - React 18.2 (needs upgrade to 19.2)
   - Mantine 5.7 (needs upgrade to 8.3)
   - Refine 3.18 (needs upgrade to 5.x)
   - Existing auth implementation (AWS Cognito - already working)

2. **Existing Backend Services:** Epic 2 completed the verification pipeline:
   - Cases are stored in DynamoDB with `CASE#` prefix
   - OCR data, biometric scores, and duplicate detection flags are available
   - S3 presigned URLs for document viewing are ready
   - Authentication middleware is implemented

3. **Existing Test Infrastructure:**
   - Integration test framework from Epic 2 prep sprint
   - Auth fixture for Playwright (TD-008 fix)
   - DynamoDB Local setup documented

**Your Job:** Upgrade the frontend stack, build the case list UI, and create the API endpoint. Don't reinvent patterns that already exist.

### 🏗️ Technical Requirements (MUST FOLLOW)

#### 1. Frontend Stack Upgrade

**React 19.2 Migration:**
```bash
# Upgrade React
pnpm add react@19.2.0 react-dom@19.2.0 --filter @ballerine/backoffice

# Enable React Compiler (automatic optimization)
pnpm add babel-plugin-react-compiler --filter @ballerine/backoffice --save-dev
```

**Vite 7.2 Configuration:**
```typescript
// apps/backoffice/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { rolldown } from 'vite-plugin-rolldown';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { target: '19' }]]
      }
    }),
    rolldown()
  ],
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'mantine-vendor': ['@mantine/core', '@mantine/hooks'],
          'query-vendor': ['@tanstack/react-query']
        }
      }
    }
  }
});
```

**Mantine 8.3 Migration:**
```bash
# Upgrade Mantine
pnpm add @mantine/core@8.3.0 @mantine/hooks@8.3.0 @mantine/dates@8.3.0 --filter @ballerine/backoffice
```

**Key Breaking Changes:**
- `<Table>` → `<Table.ScrollContainer>` wrapper required
- `<Select>` → `data` prop now required (was `options`)
- `<DatePicker>` → Import from `@mantine/dates` (separate package)
- Theme API changed: `theme.colors.blue[6]` → `theme.colors.blue.6`

**TanStack Query v5 Setup:**
```bash
pnpm add @tanstack/react-query@5.0.0 --filter @ballerine/backoffice
```

```typescript
// apps/backoffice/src/providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

export const QueryProvider = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);
```

#### 2. API Endpoint Implementation

**Handler Structure:**
```typescript
// services/backend/src/handlers/cases/list.ts
import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'af-south-1' }));

export const handler: APIGatewayProxyHandler = async (event) => {
  const { status, dateFrom, dateTo, documentType, assignee, search, limit = '20', cursor } = event.queryStringParameters || {};

  // Build DynamoDB query
  const params = {
    TableName: process.env.TABLE_NAME,
    IndexName: 'StatusIndex',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: {
      ':pk': status ? `STATUS#${status}` : 'STATUS#pending'
    },
    Limit: parseInt(limit),
    ExclusiveStartKey: cursor ? JSON.parse(Buffer.from(cursor, 'base64').toString()) : undefined
  };

  // Add filters
  if (dateFrom || dateTo || documentType || assignee || search) {
    params.FilterExpression = [];
    if (dateFrom) {
      params.FilterExpression.push('createdAt >= :dateFrom');
      params.ExpressionAttributeValues[':dateFrom'] = dateFrom;
    }
    // ... add other filters
  }

  const result = await client.send(new QueryCommand(params));

  // Mask Omang numbers
  const cases = result.Items.map(item => ({
    ...item,
    omangNumber: item.omangNumber ? `***${item.omangNumber.slice(-4)}` : null
  }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: cases,
      meta: {
        requestId: event.requestContext.requestId,
        timestamp: new Date().toISOString(),
        pagination: {
          limit: parseInt(limit),
          cursor: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : null,
          hasMore: !!result.LastEvaluatedKey
        }
      }
    })
  };
};
```

**Serverless Configuration:**
```yaml
# services/backend/serverless.yml
functions:
  listCases:
    handler: src/handlers/cases/list.handler
    events:
      - http:
          path: /api/v1/cases
          method: get
          cors: true
          authorizer:
            name: cognitoAuthorizer
            type: COGNITO_USER_POOLS
            arn: ${env:COGNITO_USER_POOL_ARN}
    environment:
      TABLE_NAME: ${env:DYNAMODB_TABLE_NAME}
    iamRoleStatements:
      - Effect: Allow
        Action:
          - dynamodb:Query
        Resource:
          - arn:aws:dynamodb:${env:AWS_REGION}:*:table/${env:DYNAMODB_TABLE_NAME}
          - arn:aws:dynamodb:${env:AWS_REGION}:*:table/${env:DYNAMODB_TABLE_NAME}/index/StatusIndex
```

#### 3. Frontend Component Implementation

**TanStack Query Hook:**
```typescript
// apps/backoffice/src/features/cases/hooks/useCases.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface CaseFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  documentType?: string;
  assignee?: string;
  search?: string;
}

export const useCases = (filters: CaseFilters, page: number = 1) => {
  return useQuery({
    queryKey: ['cases', filters, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...filters,
        limit: '20',
        page: page.toString()
      });
      const response = await api.get(`/api/v1/cases?${params}`);
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    keepPreviousData: true // For smooth pagination
  });
};
```

**Case List Table Component:**
```typescript
// apps/backoffice/src/features/cases/components/CaseListTable.tsx
import { Table, Badge, Text, Group, ActionIcon } from '@mantine/core';
import { IconEye } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { CaseStatusBadge } from './CaseStatusBadge';

interface Case {
  caseId: string;
  customerName: string;
  omangNumber: string; // Already masked by API
  status: 'pending' | 'in-review' | 'approved' | 'rejected';
  documentType: string;
  assignee?: string;
  createdAt: string;
}

export const CaseListTable = ({ cases }: { cases: Case[] }) => {
  const navigate = useNavigate();

  return (
    <Table.ScrollContainer minWidth={800}>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Customer Name</Table.Th>
            <Table.Th>Omang</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Document Type</Table.Th>
            <Table.Th>Assignee</Table.Th>
            <Table.Th>Date</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {cases.map((case) => (
            <Table.Tr
              key={case.caseId}
              onClick={() => navigate(`/cases/${case.caseId}`)}
              style={{ cursor: 'pointer' }}
            >
              <Table.Td>
                <Text fw={500}>{case.customerName}</Text>
              </Table.Td>
              <Table.Td>
                <Text c="dimmed" ff="monospace">{case.omangNumber}</Text>
              </Table.Td>
              <Table.Td>
                <CaseStatusBadge status={case.status} />
              </Table.Td>
              <Table.Td>{case.documentType}</Table.Td>
              <Table.Td>{case.assignee || 'Unassigned'}</Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  {new Date(case.createdAt).toLocaleDateString('en-GB')}
                </Text>
              </Table.Td>
              <Table.Td>
                <ActionIcon variant="subtle" onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/cases/${case.caseId}`);
                }}>
                  <IconEye size={16} />
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
};
```

**Filter Bar Component:**
```typescript
// apps/backoffice/src/features/cases/components/FilterBar.tsx
import { Group, Select, Button } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconFilter, IconFilterOff } from '@tabler/icons-react';

export const FilterBar = ({ filters, onChange, onReset }) => {
  return (
    <Group gap="md" mb="md">
      <Select
        label="Status"
        placeholder="All statuses"
        data={[
          { value: 'pending', label: 'Pending' },
          { value: 'in-review', label: 'In Review' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' }
        ]}
        value={filters.status}
        onChange={(value) => onChange({ ...filters, status: value })}
        clearable
      />

      <DatePickerInput
        type="range"
        label="Date Range"
        placeholder="Select dates"
        value={[filters.dateFrom, filters.dateTo]}
        onChange={([from, to]) => onChange({ ...filters, dateFrom: from, dateTo: to })}
        clearable
      />

      <Select
        label="Document Type"
        placeholder="All types"
        data={[
          { value: 'omang', label: 'Omang' },
          { value: 'passport', label: 'Passport' },
          { value: 'drivers_licence', label: "Driver's License" }
        ]}
        value={filters.documentType}
        onChange={(value) => onChange({ ...filters, documentType: value })}
        clearable
      />

      <Button
        variant="light"
        leftSection={<IconFilterOff size={16} />}
        onClick={onReset}
      >
        Clear Filters
      </Button>
    </Group>
  );
};
```

**Search Input with Debounce:**
```typescript
// apps/backoffice/src/features/cases/components/SearchInput.tsx
import { TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';
import { useState, useEffect } from 'react';

export const SearchInput = ({ onSearch }) => {
  const [value, setValue] = useState('');
  const [debounced] = useDebouncedValue(value, 500);

  useEffect(() => {
    onSearch(debounced);
  }, [debounced, onSearch]);

  return (
    <TextInput
      placeholder="Search by name, Omang (last 4), or email"
      leftSection={<IconSearch size={16} />}
      value={value}
      onChange={(e) => setValue(e.currentTarget.value)}
      style={{ flex: 1 }}
    />
  );
};
```

#### 4. E2E Testing with Playwright

**Playwright Configuration:**
```typescript
// apps/backoffice/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] }
    }
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
});
```

**E2E Test:**
```typescript
// apps/backoffice/tests/e2e/cases/case-list.spec.ts
import { test, expect } from '@playwright/test';
import { authenticatedPage } from '../fixtures/auth.fixture';

test.describe('Case List Page', () => {
  test('should display case list with filters', async ({ page }) => {
    await authenticatedPage(page, 'analyst');

    // Navigate to cases page
    await page.goto('/cases');

    // Verify table loads
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(20); // Default page size

    // Test status filter
    await page.locator('select[name="status"]').selectOption('pending');
    await expect(page.locator('tbody tr')).toHaveCount.greaterThan(0);

    // Test search
    await page.locator('input[placeholder*="Search"]').fill('John');
    await page.waitForTimeout(600); // Wait for debounce
    await expect(page.locator('tbody tr')).toHaveCount.greaterThan(0);

    // Test row click navigation
    await page.locator('tbody tr').first().click();
    await expect(page).toHaveURL(/\/cases\/case_/);
  });

  test('should load in under 1 second', async ({ page }) => {
    await authenticatedPage(page, 'analyst');

    const startTime = Date.now();
    await page.goto('/cases');
    await page.locator('table').waitFor();
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(1000);
  });

  test('should be accessible (WCAG 2.1 AA)', async ({ page }) => {
    await authenticatedPage(page, 'analyst');
    await page.goto('/cases');

    // Run accessibility audit
    const accessibilityScanResults = await page.evaluate(() => {
      // Use axe-core or similar
      return { violations: [] };
    });

    expect(accessibilityScanResults.violations).toHaveLength(0);
  });
});
```

### 🔒 Security & Compliance Requirements

**Data Masking (CRITICAL):**
- NEVER display full Omang numbers in the list view
- Format: `***1234` (last 4 digits only)
- Full Omang only in case detail view with audit logging
- Mask in API response, not just frontend

**Audit Logging:**
- Log every case list query with user ID, filters, and timestamp
- Log search queries (but NOT the search term if it's an Omang number)
- Store audit logs in DynamoDB with 5-year retention

**Authorization:**
- Verify user has `analyst` or `admin` role via Casbin
- Filter cases by client ID (multi-tenant isolation)
- Return 403 Forbidden if unauthorized

**Rate Limiting:**
- API Gateway: 50 requests/second per user
- Implement exponential backoff in frontend for 429 responses

### 📊 Performance Requirements

**API Response Time:**
- Target: <500ms (p95)
- DynamoDB query optimization: Use GSI, limit results to 20
- Enable DynamoDB DAX caching if needed

**Frontend Load Time:**
- Target: <1 second for initial page load
- Code splitting: Separate vendor chunks (React, Mantine, TanStack Query)
- Lazy load filter components

**Bundle Size:**
- Target: <500KB for main bundle
- Use Rolldown tree-shaking
- Analyze with `pnpm build --analyze`

### 🧪 Testing Checklist

**Unit Tests:**
- [ ] API handler returns correct data structure
- [ ] Filters apply correctly to DynamoDB query
- [ ] Omang masking works correctly
- [ ] Pagination cursor encoding/decoding works
- [ ] Error handling for invalid filters

**Integration Tests:**
- [ ] API endpoint with real DynamoDB Local
- [ ] Query performance <1s with 1000+ cases
- [ ] Pagination works across multiple pages
- [ ] Search returns correct results

**E2E Tests:**
- [ ] Case list loads and displays data
- [ ] Filters update results correctly
- [ ] Search functionality works
- [ ] Pagination works
- [ ] Row click navigates to case detail
- [ ] Page loads in <1 second
- [ ] Accessibility (WCAG 2.1 AA) passes

**Performance Tests:**
- [ ] Load test with 1000+ cases
- [ ] Verify <1s page load time
- [ ] Test filter response time
- [ ] Monitor CloudWatch metrics

### 🚀 Deployment Checklist

**Before Deploying:**
- [ ] All tests passing (unit, integration, E2E)
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Bundle size <500KB
- [ ] Accessibility audit passes
- [ ] Performance metrics meet targets

**Deployment Steps:**
1. Deploy backend: `pnpm deploy:staging --filter @ballerine/backend`
2. Deploy frontend: `cd apps/backoffice && netlify deploy --dir=dist`
3. Run smoke tests against staging
4. Monitor CloudWatch for errors
5. Verify case list loads in production

**Rollback Plan:**
- Keep previous Lambda version for instant rollback
- Netlify auto-rollback on build failure
- DynamoDB schema is backward compatible

### 🐛 Common Pitfalls to Avoid

**1. Don't Reinvent Existing Patterns:**
- ✅ Use existing auth implementation (Cognito already set up)
- ✅ Use existing DynamoDB table (don't create new tables)
- ✅ Use existing integration test framework
- ❌ Don't create new authentication flows
- ❌ Don't change DynamoDB schema without ADR

**2. Don't Skip Upgrades:**
- ✅ Upgrade React 18 → 19.2 (required for React Compiler)
- ✅ Upgrade Mantine 7 → 8.3 (required for latest features)
- ✅ Upgrade Refine 3 → 5 (required for React 19 support)
- ❌ Don't try to use old versions (will cause conflicts)

**3. Don't Expose PII:**
- ✅ Mask Omang numbers in API response
- ✅ Log audit events without PII
- ✅ Use presigned URLs for documents (15-minute expiry)
- ❌ Don't log full Omang numbers
- ❌ Don't return unmasked data in list view

**4. Don't Ignore Performance:**
- ✅ Use DynamoDB GSI for efficient queries
- ✅ Implement pagination (don't load all cases)
- ✅ Use TanStack Query caching
- ❌ Don't scan entire DynamoDB table
- ❌ Don't load 1000+ cases without pagination

**5. Don't Skip Accessibility:**
- ✅ Use semantic HTML (`<table>`, `<th>`, `<td>`)
- ✅ Add ARIA labels for screen readers
- ✅ Test with keyboard navigation
- ❌ Don't use `<div>` for table structure
- ❌ Don't skip accessibility audit

### 📚 Additional Resources

**React 19 Migration Guide:**
- https://react.dev/blog/2024/12/05/react-19
- Breaking changes: https://react.dev/blog/2024/04/25/react-19-upgrade-guide

**Mantine 8 Migration Guide:**
- https://mantine.dev/changelog/8-0-0/
- Component API changes: https://mantine.dev/guides/migrations/

**TanStack Query v5 Docs:**
- https://tanstack.com/query/latest/docs/react/overview
- Migration from v4: https://tanstack.com/query/latest/docs/react/guides/migrating-to-v5

**Playwright Best Practices:**
- https://playwright.dev/docs/best-practices
- Auth fixtures: https://playwright.dev/docs/auth

**DynamoDB Query Optimization:**
- https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-query-scan.html
- GSI best practices: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-indexes.html

---

## 🎓 Learning from Previous Stories

### Epic 2 Learnings Applied to This Story

**1. Comprehensive Dev Notes Accelerate Development:**
- Epic 2 stories had 15+ pages of context → faster implementation
- This story includes detailed code examples and patterns
- All architecture decisions referenced with source links

**2. Integration Tests Provide Confidence:**
- Epic 2 had 443 tests passing (100% pass rate)
- This story requires integration tests with DynamoDB Local
- Use existing test framework from Epic 2 prep sprint

**3. Documentation Discoverability Matters:**
- Epic 2 had setup guides buried in subfolders → confusion
- This story includes setup instructions in main README
- All prerequisites clearly documented

**4. Preparation Sprints Pay Off:**
- Epic 2 prep sprint (DynamoDB swap, integration tests) was high-value
- User authentication already implemented in prep sprint
- Frontend setup happens during this story (parallel work)

### Previous Story Intelligence

**No previous stories in Epic 3** - this is the first story. However, Epic 2 provides valuable context:

**Epic 2 Story 2.4 (Duplicate Detection):**
- Implemented risk scoring algorithm (0-100 scale)
- Used SHA-256 hashing for privacy-preserving detection
- Created comprehensive documentation for compliance
- **Lesson:** Complex features need detailed documentation

**Epic 2 Story 2.3 (Biometric Matching):**
- Integrated AWS Rekognition Face Liveness
- Implemented weighted scoring (liveness 30%, similarity 70%)
- Used SQS async processing pattern
- **Lesson:** AWS service integrations are smoother than expected

**Epic 2 Story 2.1 (OCR Extraction):**
- Integrated AWS Textract for document OCR
- Used pattern-based field extraction (regex)
- Implemented SQS async processing
- **Lesson:** Pattern-based extraction works better than position-based

### Git Intelligence Summary

**Recent Commits (Last 5):**
1. `fix: Enable all E2E tests with auth fixture (TD-007, TD-008)` - Playwright tests now working
2. `fix: Replace hardcoded localhost URLs with env vars (TD-010)` - Environment configuration improved
3. `feat: Add unit tests for auth handlers (TD-011)` - 24 new tests for user-me, user-logout, user-refresh-token
4. `fix: Add Zod validation for window context (TD-003)` - SDK configuration validation
5. `chore: Update project-context.md with recent deployments` - Documentation updated

**Key Patterns from Recent Work:**
- Auth handlers use consistent error handling patterns
- Environment variables preferred over hardcoded values
- Comprehensive unit tests for all handlers
- Playwright auth fixture enables E2E testing

**Files Recently Modified:**
- `apps/backoffice/tests/e2e/fixtures/auth.fixture.ts` - Auth fixture created
- `services/auth/src/handlers/*.test.ts` - Unit tests added
- `apps/backoffice/vite.config.authbridge.ts` - Vite config updated
- `sdks/web-sdk/src/lib/utils/configuration-manager.ts` - Configuration refactored

**Actionable Insights:**
- Use auth fixture pattern for E2E tests in this story
- Follow error handling patterns from auth handlers
- Use environment variables for all configuration
- Add comprehensive unit tests for API handlers

---

## 🎯 Success Criteria Summary

**This story is DONE when:**

1. ✅ React 19.2 + Mantine 8.3 + Vite 7.2 upgraded and working
2. ✅ TanStack Query v5 configured for data fetching
3. ✅ GET /api/v1/cases endpoint deployed and tested
4. ✅ Case list table displays with all required columns
5. ✅ Filters work (status, date range, document type, assignee)
6. ✅ Search works (name, Omang last 4, email)
7. ✅ Pagination works with cursor-based navigation
8. ✅ Omang numbers masked in list view (`***1234`)
9. ✅ Page loads in <1 second
10. ✅ All tests passing (unit, integration, E2E)
11. ✅ Accessibility audit passes (WCAG 2.1 AA)
12. ✅ Deployed to staging and smoke tested
13. ✅ Sprint status updated to "ready-for-dev"

**Quality Gates:**
- No TypeScript errors
- No ESLint warnings
- Bundle size <500KB
- Test coverage >85%
- API response time <500ms (p95)
- Zero accessibility violations

---

**🚀 You're ready to build! This story sets the foundation for the entire Case Management Dashboard. Make it count!**
