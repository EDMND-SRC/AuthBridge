# Technical Debt Registry - AuthBridge

**Created:** 2026-01-15
**Last Updated:** 2026-01-15
**Total Items:** 47+
**Status:** Active tracking

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 2 | 🔴 Needs immediate attention |
| HIGH | 4 | 🟠 Address this sprint |
| MEDIUM | 8 | 🟡 Address next sprint |
| LOW | 6 | 🟢 Backlog |

---

## CRITICAL SEVERITY (Fix Immediately)

### TD-001: Placeholder JWT Session Tokens
**Status:** 🔴 OPEN
**Location:** `services/verification/src/handlers/create-verification.ts` (lines 18-23)
**Issue:** Session tokens are hardcoded as `session_${verificationId}` instead of real JWT tokens.
**Risk:** Security vulnerability - tokens are predictable and lack cryptographic signing.
**Fix:** Integrate with auth service JWT generation.
**Owner:** Charlie
**Target:** Before Epic 3

### TD-002: Hardcoded Test Credentials in DynamoDB Service
**Status:** ✅ FIXED (2026-01-15)
**Location:** `services/verification/src/services/dynamodb.ts`
**Issue:** Test credentials `accessKeyId: 'test'` hardcoded in code.
**Fix:** Now uses environment variables for local DynamoDB configuration.
**Resolved By:** Bob

---

## HIGH SEVERITY (Fix This Sprint)

### TD-003: Missing Input Validation on Window Context ✅
**Status:** ✅ FIXED (2026-01-15)
**Location:** `sdks/web-sdk/src/lib/services/api/verification.ts`
**Issue:** Session token and clientId read from `window` without validation.
**Fix:** Added Zod validation schema `WindowContextSchema` and `getValidatedWindowContext()` function.
**Resolved By:** Bob

### TD-004: Hardcoded SDK URL ✅
**Status:** ✅ FIXED (2026-01-15)
**Location:** `services/verification/src/handlers/create-verification.ts`
**Issue:** SDK URL hardcoded as `https://sdk.authbridge.io`.
**Fix:** Now uses `SDK_BASE_URL` environment variable with fallback.
**Resolved By:** Bob

### TD-005: Widespread @ts-ignore Comments ✅
**Status:** ✅ FIXED (2026-01-15)
**Locations Fixed:**
- `apps/backoffice/src/pages/users/hooks/index.tsx` - Added proper `RouteParams` and `SelectedUserData` types
- `apps/backoffice/src/hooks/useFilter/useFilter.tsx` - Added `FilterState<TRecord>` type
- `sdks/web-sdk/src/lib/contexts/translation/hooks.ts` - Added proper typing to `get()` function
**Resolved By:** Bob

### TD-006: File-Level eslint-disable in configuration-manager.ts ✅
**Status:** ✅ FIXED (2026-01-15)
**Location:** `sdks/web-sdk/src/lib/utils/configuration-manager.ts`
**Issue:** 5 eslint rules disabled at file level.
**Fix:** Complete refactor with proper TypeScript types, removed all file-level disables.
**Resolved By:** Bob

### TD-007: Skipped E2E Tests for Case Management ✅
**Status:** ✅ FIXED (2026-01-15)
**Location:** `apps/backoffice/tests/e2e/cases.spec.ts`
**Issue:** 11 test cases skipped with `.skip()`.
**Fix:** Enabled all tests using new auth fixture.
**Resolved By:** Bob

### TD-008: Missing Auth Fixture for Playwright ✅
**Status:** ✅ FIXED (2026-01-15)
**Location:** `apps/backoffice/tests/e2e/fixtures/auth.fixture.ts`
**Issue:** Auth fixture commented out, cannot run authenticated tests.
**Fix:** Created comprehensive auth fixture with `authenticatedPage` and `authenticatedContext`.
**Resolved By:** Bob

### TD-009: Console.log in Production Code
**Status:** 🟠 PARTIALLY FIXED
**Fixed Locations:**
- `sdks/web-sdk/src/lib/services/api/verification.ts` - Removed console.log
- `sdks/web-sdk/src/lib/contexts/translation/hooks.ts` - Removed console.log
**Remaining Locations:**
- `services/verification/src/services/notification.ts`
- `services/verification/src/handlers/process-ocr.ts`
- `apps/backoffice/src/pages/users/components/SubjectContent.tsx`
**Owner:** Charlie
**Target:** Epic 3

### TD-010: Hardcoded Localhost URLs ✅
**Status:** ✅ FIXED (2026-01-15)
**Fixed Locations:**
- `apps/backoffice/vite.config.authbridge.ts` - Now uses `VITE_API_URL` env var
- `sdks/web-sdk/src/lib/services/api/verification.ts` - Now uses `VITE_API_URL` or `API_URL` env var
**Remaining:** `apps/backoffice/playwright.config.ts` (acceptable for test config)
**Resolved By:** Bob

### TD-011: Missing Handler Tests ✅
**Status:** ✅ FIXED (2026-01-15)
**Tests Created:**
- `services/auth/src/handlers/user-me.test.ts` (7 tests)
- `services/auth/src/handlers/user-logout.test.ts` (7 tests)
- `services/auth/src/handlers/user-refresh-token.test.ts` (10 tests)
**Remaining:** Verification service handlers (lower priority)
**Resolved By:** Bob

### TD-012: Mock API in Production Code ✅
**Status:** ✅ FIXED (2026-01-15)
**Location:** `sdks/web-sdk/src/lib/services/api/verification.ts`
**Issue:** Mock API implementation mixed with production code.
**Fix:** Clearly separated mock path with `useMockApi` flag from validated config.
**Resolved By:** Bob

---

## MEDIUM SEVERITY (Fix Next Sprint)

### TD-013: Hardcoded External CDN URL
**Status:** 🟡 OPEN
**Location:** `apps/backoffice/src/pages/users/components/SubjectContent.tsx` (line 36)
**Issue:** face-api.js models loaded from external CDN.
**Risk:** Dependency on external CDN, no fallback.
**Fix:** Host models locally or use configurable URL.
**Owner:** TBD
**Target:** Epic 4

### TD-014: Hardcoded Thresholds
**Status:** � OPEN
**Locations:**
- `services/verification/src/services/rekognition.ts` (lines 14-15)
- `services/verification/src/services/biometric.ts` (lines 9-10)
- `services/verification/src/services/image-quality.ts` (lines 8-9)
- `services/verification/src/services/omang-ocr.ts` (lines 10-12)
**Issue:** 10+ hardcoded thresholds for OCR, biometrics, image quality.
**Risk:** Cannot tune without code changes.
**Fix:** Move to environment variables or config file.
**Owner:** Winston
**Target:** Epic 4

### TD-015: TODO Comments Without Tracking
**Status:** 🟡 OPEN
**Count:** 7+ TODO/FIXME comments without tickets
**Risk:** Technical debt not tracked, easy to forget.
**Fix:** Create tickets for each TODO, add ticket reference in comment.
**Owner:** Bob
**Target:** Ongoing

### TD-016: Unsafe Type Casting
**Status:** 🟡 OPEN
**Location:** `sdks/web-sdk/src/lib/utils/get-config-from-query-params.ts` (lines 37-39)
**Issue:** Type casting without validation.
**Risk:** Runtime errors.
**Fix:** Add proper type guards.
**Owner:** TBD
**Target:** Epic 4

### TD-017: Silent Audit Error Handling
**Status:** 🟡 OPEN
**Location:** `services/auth/src/handlers/user-verify-otp.ts` (lines 103-110)
**Issue:** Audit errors silently ignored.
**Risk:** Security events may not be recorded.
**Fix:** Log audit failures to CloudWatch, add alerting.
**Owner:** Charlie
**Target:** Epic 4

### TD-018: FIXME for Page Typing
**Status:** 🟡 OPEN
**Location:** `sdks/web-sdk/src/lib/utils/event-service/utils.ts` (line 92)
**Issue:** currentPage/previousPage typed as string incorrectly.
**Risk:** Type safety issue.
**Fix:** Fix IAppState types.
**Owner:** TBD
**Target:** Epic 4

---

## LOW SEVERITY (Backlog)

### TD-019: Commented/Dead Code
**Status:** � OPEN
**Locations:**
- `apps/backoffice/tests/e2e/auth.spec.ts` (lines 122-123)
- `services/verification/src/extractors/index.ts` (lines 13-16)
**Issue:** Dead code left in repository.
**Fix:** Remove commented code.
**Owner:** TBD
**Target:** Backlog

### TD-020: Duplicate Configuration Logic ✅
**Status:** ✅ FIXED (2026-01-15)
**Location:** `sdks/web-sdk/src/lib/utils/configuration-manager.ts`
**Issue:** Duplicate uiPack.update() calls.
**Fix:** Refactored to single update in `updateConfiguration()`.
**Resolved By:** Bob

### TD-021: Outdated Dependencies
**Status:** � OPEN
**Location:** `apps/backoffice/package.json`
**Issues:**
- @pankod/refine-* (v3.18.0) → v4+
- react-scripts (v5.0.0) → Vite
- face-api.js (v0.22.2) → unmaintained
**Fix:** Upgrade dependencies.
**Owner:** TBD
**Target:** Epic 4+

### TD-022: Missing Integration Test Documentation
**Status:** 🟢 OPEN
**Location:** `services/verification/tests/integration/`
**Issue:** Tests require TEST_INTEGRATION=true flag, not documented.
**Fix:** Add to README, CI/CD pipeline.
**Owner:** Dana
**Target:** Backlog

---

## Completed Items (This Session)

### TD-002: Hardcoded Test Credentials ✅
**Fixed:** 2026-01-15 | **By:** Bob
**Fix:** Environment variables for local DynamoDB

### TD-003: Missing Input Validation on Window Context ✅
**Fixed:** 2026-01-15 | **By:** Bob
**Fix:** Zod validation schema for window context

### TD-004: Hardcoded SDK URL ✅
**Fixed:** 2026-01-15 | **By:** Bob
**Fix:** SDK_BASE_URL environment variable

### TD-005: Widespread @ts-ignore Comments ✅
**Fixed:** 2026-01-15 | **By:** Bob
**Fix:** Proper TypeScript types in hooks and utilities

### TD-006: File-Level eslint-disable ✅
**Fixed:** 2026-01-15 | **By:** Bob
**Fix:** Complete refactor of configuration-manager.ts

### TD-007: Skipped E2E Tests ✅
**Fixed:** 2026-01-15 | **By:** Bob
**Fix:** Enabled tests with auth fixture

### TD-008: Missing Auth Fixture ✅
**Fixed:** 2026-01-15 | **By:** Bob
**Fix:** Created auth.fixture.ts

### TD-010: Hardcoded Localhost URLs ✅
**Fixed:** 2026-01-15 | **By:** Bob
**Fix:** Environment variables for API URLs

### TD-011: Missing Handler Tests ✅
**Fixed:** 2026-01-15 | **By:** Bob
**Fix:** 24 new unit tests for auth handlers

### TD-012: Mock API in Production Code ✅
**Fixed:** 2026-01-15 | **By:** Bob
**Fix:** Separated mock path with feature flag

### TD-020: Duplicate Configuration Logic ✅
**Fixed:** 2026-01-15 | **By:** Bob
**Fix:** Refactored to single update

### TD-023: Audit Test Mock Initialization ✅
**Fixed:** 2026-01-15 | **By:** Bob
**Fix:** Moved import after mock setup

### TD-024: CloudFormation Tags on Cognito ✅
**Fixed:** 2026-01-15 | **By:** Bob
**Fix:** Removed unsupported Tags property

---

## Tracking Process

1. **New debt discovered:** Add to this registry with severity, location, and owner
2. **Sprint planning:** Review HIGH items, assign to sprint
3. **Completion:** Move to Completed section with date and resolver
4. **Quarterly review:** Reassess severity levels, archive old completed items

---

## Cognito Deployment Info

**Stack Name:** authbridge-cognito-staging
**Region:** af-south-1
**User Pool ID:** af-south-1_P3KlQawlR
**Client ID:** 7jcf16r6c2gf2nnvo4kh1mtksg

Add to `.env.local`:
```
COGNITO_USER_POOL_ID=af-south-1_P3KlQawlR
COGNITO_CLIENT_ID=7jcf16r6c2gf2nnvo4kh1mtksg
```
