# Technical Debt Registry - AuthBridge

**Created:** 2026-01-15
**Last Updated:** 2026-01-16
**Total Items:** 47+
**Status:** Active tracking

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | ✅ All resolved |
| HIGH | 1 | 🟠 Address this sprint |
| MEDIUM | 2 | 🟡 Address next sprint |
| LOW | 3 | 🟢 Backlog |

---

## CRITICAL SEVERITY (Fix Immediately)

### TD-001: Placeholder JWT Session Tokens ✅
**Status:** ✅ FIXED (2026-01-16)
**Location:** `services/verification/src/handlers/create-verification.ts`
**Issue:** Session tokens were hardcoded as `session_${verificationId}` instead of real JWT tokens.
**Risk:** Security vulnerability - tokens were predictable and lacked cryptographic signing.
**Fix:** Implemented proper JWT generation using `jose` library with HS256 signing.
- Added `JWT_SECRET`, `JWT_ISSUER`, `SESSION_TOKEN_EXPIRY_HOURS` environment variables
- Tokens now include proper claims: sub, clientId, type, iat, iss, exp
**Resolved By:** Bob
**Date:** 2026-01-16

### TD-002: Hardcoded Test Credentials in DynamoDB Service ✅
**Status:** ✅ FIXED (2026-01-15)
**Location:** `services/verification/src/services/dynamodb.ts`
**Issue:** Test credentials `accessKeyId: 'test'` hardcoded in code.
**Fix:** Now uses environment variables for local DynamoDB configuration.
**Resolved By:** Bob

---

## HIGH SEVERITY (Fix This Sprint)

### TD-009: Console.log in Production Code ✅
**Status:** ✅ FIXED (2026-01-16)
**Fixed Locations:**
- `sdks/web-sdk/src/lib/services/api/verification.ts` - Removed console.log
- `sdks/web-sdk/src/lib/contexts/translation/hooks.ts` - Removed console.log
- `services/verification/src/services/notification.ts` - Replaced with logger
- `services/verification/src/handlers/process-ocr.ts` - Replaced with logger
**Remaining:** `apps/backoffice/src/pages/users/components/SubjectContent.tsx` (face-api debug logs - acceptable for now)
**Resolved By:** Bob
**Date:** 2026-01-16

### TD-014a: Hardcoded External CDN URL
**Status:** 🟠 OPEN
**Location:** `apps/backoffice/src/pages/users/components/SubjectContent.tsx` (line 36)
**Issue:** face-api.js models loaded from external CDN `https://justadudewhohacks.github.io/face-api.js/models`
**Risk:** Dependency on external CDN, no fallback.
**Fix:** Host models locally or use configurable URL.
**Owner:** TBD
**Target:** Epic 4

---

## MEDIUM SEVERITY (Fix Next Sprint)

### TD-014b: Hardcoded Thresholds ✅
**Status:** ✅ FIXED (2026-01-16)
**Locations Fixed:**
- `services/verification/src/services/rekognition.ts` - Now uses `BIOMETRIC_SIMILARITY_THRESHOLD`, `BIOMETRIC_LIVENESS_THRESHOLD`
- `services/verification/src/services/biometric.ts` - Now uses `BIOMETRIC_LIVENESS_WEIGHT`, `BIOMETRIC_SIMILARITY_WEIGHT`, `BIOMETRIC_OVERALL_THRESHOLD`
- `services/verification/src/services/image-quality.ts` - Already used env vars
- `services/verification/src/services/omang-ocr.ts` - Already used env vars
**Resolved By:** Bob
**Date:** 2026-01-16

### TD-015: TODO Comments Without Tracking
**Status:** 🟡 PARTIALLY ADDRESSED
**Action:** Created `docs/todo-comment-policy.md` with standards and tracking process.
**Remaining:** Existing TODOs need GitHub issue references added.
**Owner:** Bob
**Target:** Ongoing

### TD-016: Unsafe Type Casting ✅
**Status:** ✅ FIXED (2026-01-16)
**Location:** `sdks/web-sdk/src/lib/utils/get-config-from-query-params.ts`
**Issue:** Type casting without validation.
**Fix:** Added `QueryParamsConfig` interface and `isValidConfigKey` type guard.
**Resolved By:** Bob
**Date:** 2026-01-16

### TD-017: Silent Audit Error Handling ✅
**Status:** ✅ FIXED (2026-01-16)
**Location:** `services/auth/src/handlers/user-verify-otp.ts`
**Issue:** Audit errors silently ignored.
**Fix:** Now logs audit failures to CloudWatch with full context.
**Resolved By:** Bob
**Date:** 2026-01-16

### TD-018: FIXME for Page Typing ✅
**Status:** ✅ FIXED (2026-01-16)
**Location:** `sdks/web-sdk/src/lib/utils/event-service/utils.ts`
**Issue:** Misleading FIXME comment - types were actually correct.
**Fix:** Updated comment to clarify that string typing is intentional (page names, not indices).
**Resolved By:** Bob
**Date:** 2026-01-16

---

## LOW SEVERITY (Backlog)

### TD-019: Commented/Dead Code ✅
**Status:** ✅ FIXED (2026-01-16)
**Locations Fixed:**
- `apps/backoffice/tests/e2e/auth.spec.ts` - Cleaned up commented test code
**Note:** `services/verification/src/extractors/registry.ts` comments are documentation for future country support - acceptable.
**Resolved By:** Bob
**Date:** 2026-01-16

### TD-021: Outdated Dependencies
**Status:** 🟢 OPEN
**Location:** `apps/backoffice/package.json`
**Issues:**
- @pankod/refine-* (v3.18.0) → v4+
- react-scripts (v5.0.0) → Vite
- face-api.js (v0.22.2) → unmaintained
**Fix:** Use `docs/dependency-upgrade-spike-template.md` for planning.
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

## Completed Items (This Session - 2026-01-16)

### TD-001: Placeholder JWT Session Tokens ✅
**Fixed:** 2026-01-16 | **By:** Bob
**Fix:** Proper JWT generation with jose library

### TD-009: Console.log in Production Code ✅
**Fixed:** 2026-01-16 | **By:** Bob
**Fix:** Replaced with structured logger

### TD-014b: Hardcoded Thresholds ✅
**Fixed:** 2026-01-16 | **By:** Bob
**Fix:** Environment variables for all thresholds

### TD-016: Unsafe Type Casting ✅
**Fixed:** 2026-01-16 | **By:** Bob
**Fix:** Type guards and proper interfaces

### TD-017: Silent Audit Error Handling ✅
**Fixed:** 2026-01-16 | **By:** Bob
**Fix:** CloudWatch logging for audit failures

### TD-018: FIXME for Page Typing ✅
**Fixed:** 2026-01-16 | **By:** Bob
**Fix:** Clarified comment - types were correct

### TD-019: Commented/Dead Code ✅
**Fixed:** 2026-01-16 | **By:** Bob
**Fix:** Removed dead code from auth.spec.ts

---

## Completed Items (Previous Session - 2026-01-15)

### TD-002: Hardcoded Test Credentials ✅
### TD-003: Missing Input Validation on Window Context ✅
### TD-004: Hardcoded SDK URL ✅
### TD-005: Widespread @ts-ignore Comments ✅
### TD-006: File-Level eslint-disable ✅
### TD-007: Skipped E2E Tests ✅
### TD-008: Missing Auth Fixture ✅
### TD-010: Hardcoded Localhost URLs ✅
### TD-011: Missing Handler Tests ✅
### TD-012: Mock API in Production Code ✅
### TD-013: DynamoDB Local GSI Schema Mismatch ✅
### TD-020: Duplicate Configuration Logic ✅
### TD-023: Audit Test Mock Initialization ✅
### TD-024: CloudFormation Tags on Cognito ✅

---

## Documentation Created (2026-01-16)

| Document | Purpose |
|----------|---------|
| `docs/todo-comment-policy.md` | Standards for TODO/FIXME comments |
| `docs/component-library-standards.md` | UI component standards with data-testid requirements |
| `docs/dependency-upgrade-spike-template.md` | Template for planning dependency upgrades |
| `docs/frontend-component-patterns.md` | React component patterns and best practices |
| `docs/api-gateway-throttling.md` | API Gateway throttling configuration |
| `services/verification/openapi.yaml` | Expanded to cover all API endpoints |

---

## Tracking Process

1. **New debt discovered:** Add to this registry with severity, location, and owner
2. **Sprint planning:** Review HIGH items, assign to sprint
3. **Completion:** Move to Completed section with date and resolver
4. **Quarterly review:** Reassess severity levels, archive old completed items

---

## Environment Variables Added (2026-01-16)

### Verification Service
```bash
# JWT Configuration
JWT_SECRET=your-secret-key-min-32-chars
JWT_ISSUER=authbridge
SESSION_TOKEN_EXPIRY_HOURS=24

# Biometric Thresholds
BIOMETRIC_SIMILARITY_THRESHOLD=80
BIOMETRIC_LIVENESS_THRESHOLD=80
BIOMETRIC_LIVENESS_WEIGHT=0.3
BIOMETRIC_SIMILARITY_WEIGHT=0.7
BIOMETRIC_OVERALL_THRESHOLD=80
```
