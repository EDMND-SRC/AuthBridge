# Story 2.2: Omang Format Validation

Status: done

## Story

As the system,
I want to validate Omang number format and expiry,
So that I can reject invalid documents early.

## Acceptance Criteria

1. **Given** an Omang number is extracted
   **When** validation runs
   **Then** the 9-digit format is verified
   **And** expiry date is checked (10-year validity)
   **And** invalid formats return clear error messages
   **And** validation results are logged for audit

## Tasks / Subtasks

- [x] Task 1: Omang Number Format Validation (AC: #1)
  - [x] Implement 9-digit numeric validation
  - [x] Reject non-numeric characters
  - [x] Reject numbers with incorrect length
  - [x] Return structured validation errors

- [x] Task 2: Expiry Date Validation (AC: #1)
  - [x] Parse expiry date from OCR results
  - [x] Validate 10-year validity from issue date
  - [x] Check if document is expired
  - [x] Calculate days until expiry
  - [x] Flag documents expiring within 30 days

- [x] Task 3: Validation Service Integration (AC: #1)
  - [x] Create OmangValidationService
  - [x] Integrate with process-ocr handler
  - [x] Update verification case with validation results
  - [x] Store validation errors in DynamoDB
  - [x] Trigger manual review for validation failures

- [x] Task 4: Error Handling & Logging (AC: #1)
  - [x] Return clear, actionable error messages
  - [x] Log all validation attempts with results
  - [x] Record validation metrics in CloudWatch
  - [x] Create audit trail for compliance

- [x] Task 5: Testing (AC: #1)
  - [x] Unit tests for format validation
  - [x] Unit tests for expiry validation
  - [x] Integration tests with OCR flow
  - [x] Test edge cases (expired, expiring soon, invalid formats)

## Dev Notes

### 🔥 CRITICAL MISSION: VALIDATION GUARDRAILS

This story is the **first line of defense** against invalid documents. Validation must:
- **Fail fast** — reject invalid documents before expensive biometric processing
- **Be precise** — clear error messages guide users to fix issues
- **Be auditable** — every validation decision must be logged for compliance
- **Be extensible** — future stories will add checksum validation (Story 8.1)

**Your mission:** Build a robust validation layer that catches format errors early and provides clear feedback.

### Omang Number Specifications

**Format Rules:**
- **Length:** Exactly 9 digits
- **Characters:** Numeric only (0-9)
- **No separators:** No spaces, dashes, or special characters
- **Leading zeros:** Allowed (e.g., `012345678`)

**Valid Examples:**
- `123456789`
- `012345678`
- `999999999`

**Invalid Examples:**
- `12345678` (8 digits - too short)
- `1234567890` (10 digits - too long)
- `12345678A` (contains letter)
- `123-456-789` (contains dashes)
- `123 456 789` (contains spaces)

**Future Enhancement (Story 8.1):**
- Checksum validation using Luhn algorithm or Botswana-specific algorithm
- This story focuses on format only, not checksum

### Expiry Date Validation Rules

**Omang Validity Period:**
- **Standard validity:** 10 years from date of issue
- **Expiry date format:** DD/MM/YYYY (extracted by Story 2.1)
- **Grace period:** None — expired means invalid

**Validation Logic:**
```typescript
const issueDate = parseDate(ocrData.dateOfIssue); // DD/MM/YYYY
const expiryDate = parseDate(ocrData.dateOfExpiry); // DD/MM/YYYY
const today = new Date();

// Check 1: Expiry date is 10 years after issue date
const expectedExpiry = addYears(issueDate, 10);
if (!isSameDay(expiryDate, expectedExpiry)) {
  return { valid: false, error: 'Expiry date does not match 10-year validity' };
}

// Check 2: Document is not expired
if (isBefore(expiryDate, today)) {
  return { valid: false, error: 'Document has expired', expiredDays: differenceInDays(today, expiryDate) };
}

// Check 3: Flag documents expiring soon (within 30 days)
const daysUntilExpiry = differenceInDays(expiryDate, today);
if (daysUntilExpiry <= 30) {
  return { valid: true, warning: 'Document expires soon', daysUntilExpiry };
}

return { valid: true };
```

**Edge Cases:**
- **Missing expiry date:** If OCR failed to extract expiry, flag for manual review (don't auto-reject)
- **Invalid date format:** If date cannot be parsed, flag for manual review
- **Future issue date:** If issue date is in the future, reject as invalid
- **Expiry before issue:** If expiry is before issue date, reject as invalid

### Integration with Story 2.1 (OCR Extraction)

**Data Flow:**
```
Document Upload (Story 1.5.3)
  ↓
SQS Queue
  ↓
process-ocr.ts (Story 2.1)
  ↓ OCR extraction complete
OmangValidationService (Story 2.2) ← YOU ARE HERE
  ↓ Validation complete
Update verification case status
  ↓
Next: Biometric matching (Story 2.3)
```

**Where to Integrate:**
- **File:** `services/verification/src/handlers/process-ocr.ts`
- **Location:** After OCR extraction, before storing results
- **Pattern:** Call validation service, store results, update case status

**Example Integration:**
```typescript
// In process-ocr.ts handler (after OCR extraction)
const ocrResult = await omangOcrService.extractOmangData(s3Key, documentType);

// NEW: Validate extracted data
const validationResult = await omangValidationService.validate(ocrResult.extractedFields);

if (!validationResult.valid) {
  // Store validation errors
  await ocrStorageService.storeOcrResult(verificationId, documentId, {
    ...ocrResult,
    validationErrors: validationResult.errors,
    requiresManualReview: true
  });

  // Update case status
  await dynamoDbService.updateItem({
    PK: `CASE#${verificationId}`,
    SK: 'META',
    status: 'validation_failed',
    validationErrors: validationResult.errors
  });

  return; // Don't proceed to biometric matching
}

// Validation passed - continue with storage
await ocrStorageService.storeOcrResult(verificationId, documentId, ocrResult);
```

### DynamoDB Schema Updates

**Document Entity (DOC#) — Add Validation Results:**
```typescript
{
  PK: "CASE#<verificationId>",
  SK: "DOC#<documentId>",
  documentId: "doc_abc123",
  documentType: "omang_front",
  status: "validated", // processed → validated | validation_failed

  // From Story 2.1
  ocrData: {
    extractedFields: { /* ... */ },
    confidence: { /* ... */ }
  },

  // NEW: Validation Results
  validation: {
    omangNumber: {
      valid: true,
      format: "valid",
      value: "123456789"
    },
    expiry: {
      valid: true,
      expired: false,
      daysUntilExpiry: 365,
      expiryDate: "2025-03-15",
      issueDate: "2015-03-15"
    },
    overall: {
      valid: true,
      errors: [],
      warnings: []
    },
    validatedAt: "2026-01-14T10:00:10Z"
  }
}
```

**Verification Case Entity (CASE#) — Update Status:**
```typescript
{
  PK: "CASE#<verificationId>",
  SK: "META",
  status: "documents_validated", // documents_complete → documents_validated | validation_failed

  // NEW: Validation Summary
  validationSummary: {
    allDocumentsValid: true,
    invalidDocuments: [],
    warnings: ["Document expires in 25 days"],
    validatedAt: "2026-01-14T10:00:10Z"
  }
}
```

### Validation Error Messages

**User-Facing Error Messages (for SDK/API):**
- **Invalid format:** "Omang number must be exactly 9 digits"
- **Expired document:** "This Omang card has expired. Please use a valid document."
- **Expiring soon:** "Your Omang card expires in {days} days. Consider renewing soon."
- **Invalid dates:** "The dates on this document appear incorrect. Please verify and resubmit."

**Internal Error Codes (for logging/debugging):**
- `OMANG_INVALID_LENGTH` — Not 9 digits
- `OMANG_INVALID_CHARACTERS` — Contains non-numeric characters
- `OMANG_EXPIRED` — Expiry date in the past
- `OMANG_EXPIRY_MISMATCH` — Expiry not 10 years from issue
- `OMANG_INVALID_DATES` — Date parsing failed or dates are illogical

### CloudWatch Metrics

**Custom Metrics:**
- `Validation/OmangFormatValid` — Count of valid format validations
- `Validation/OmangFormatInvalid` — Count of invalid format validations
- `Validation/OmangExpired` — Count of expired documents
- `Validation/OmangExpiringSoon` — Count of documents expiring within 30 days
- `Validation/ValidationTime` — Time to validate (ms)

**Alarms:**
- High invalid format rate (>10% over 1 hour) → Alert operations
- High expired document rate (>20% over 1 hour) → Alert operations

### Testing Strategy

**Unit Tests (Vitest):**
```typescript
describe('OmangValidationService', () => {
  describe('validateOmangNumber', () => {
    it('should accept valid 9-digit Omang number', () => {
      const result = service.validateOmangNumber('123456789');
      expect(result.valid).toBe(true);
    });

    it('should reject Omang number with 8 digits', () => {
      const result = service.validateOmangNumber('12345678');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('9 digits');
    });

    it('should reject Omang number with letters', () => {
      const result = service.validateOmangNumber('12345678A');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('numeric');
    });

    it('should accept Omang number with leading zeros', () => {
      const result = service.validateOmangNumber('012345678');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateExpiry', () => {
    it('should accept valid non-expired document', () => {
      const issueDate = '15/03/2015';
      const expiryDate = '15/03/2025';
      const result = service.validateExpiry(issueDate, expiryDate);
      expect(result.valid).toBe(true);
    });

    it('should reject expired document', () => {
      const issueDate = '15/03/2010';
      const expiryDate = '15/03/2020';
      const result = service.validateExpiry(issueDate, expiryDate);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should flag document expiring within 30 days', () => {
      const today = new Date();
      const issueDate = format(subYears(today, 10), 'dd/MM/yyyy');
      const expiryDate = format(addDays(today, 25), 'dd/MM/yyyy');
      const result = service.validateExpiry(issueDate, expiryDate);
      expect(result.valid).toBe(true);
      expect(result.warning).toContain('expires soon');
    });

    it('should reject expiry not 10 years from issue', () => {
      const issueDate = '15/03/2015';
      const expiryDate = '15/03/2024'; // Only 9 years
      const result = service.validateExpiry(issueDate, expiryDate);
      expect(result.valid).toBe(false);
    });
  });
});
```

**Integration Tests:**
```typescript
describe('OCR + Validation Flow', () => {
  it('should validate Omang after successful OCR extraction', async () => {
    // Upload document
    const uploadResult = await testClient.uploadDocument(verificationId, {
      documentType: 'omang_front',
      image: validOmangImage
    });

    // Wait for OCR + validation
    await waitForProcessing(verificationId, uploadResult.documentId);

    // Check validation results
    const verification = await testClient.getVerification(verificationId);
    expect(verification.documents[0].validation.overall.valid).toBe(true);
    expect(verification.status).toBe('documents_validated');
  });

  it('should reject document with invalid Omang format', async () => {
    // Upload document with invalid Omang (8 digits)
    const uploadResult = await testClient.uploadDocument(verificationId, {
      documentType: 'omang_front',
      image: invalidOmangImage // OCR will extract "12345678"
    });

    // Wait for OCR + validation
    await waitForProcessing(verificationId, uploadResult.documentId);

    // Check validation failed
    const verification = await testClient.getVerification(verificationId);
    expect(verification.documents[0].validation.overall.valid).toBe(false);
    expect(verification.status).toBe('validation_failed');
  });
});
```

### File Structure

**Expected Files:**
```
services/verification/
├── src/
│   ├── services/
│   │   ├── omang-validation.ts         # NEW: Omang validation service
│   │   ├── omang-validation.test.ts    # NEW: Unit tests
│   │   └── omang-ocr.ts                # EXISTING: From Story 2.1
│   ├── handlers/
│   │   └── process-ocr.ts              # MODIFY: Add validation call
│   └── types/
│       └── validation.ts               # NEW: Validation types
└── tests/
    └── integration/
        └── validation.test.ts          # NEW: Integration tests
```

### Technology Stack & Dependencies

**Existing Dependencies (from Story 2.1):**
```json
{
  "date-fns": "^4.1.0"  // Date parsing and validation
}
```

**No new dependencies needed** — use existing date-fns for date operations.

### Integration with Existing Codebase

**From Story 2.1 (Omang OCR Extraction):**
- Reuse OCR extracted fields: `omangNumber`, `dateOfIssue`, `dateOfExpiry`
- Reuse OcrStorageService for storing validation results
- Reuse DynamoDB service layer for case updates
- Reuse metrics utility for validation metrics

**From Story 1.5.2+1.5.4 (Core Verification):**
- Reuse DynamoDB service layer
- Reuse entity key generation utilities
- Reuse structured logging utilities

**From Story 1.5.1 (Authentication):**
- Reuse audit logging service
- Reuse error handling patterns

### Previous Story Intelligence (Story 2.1)

**Key Learnings from Story 2.1:**
1. **SQS Pattern Works Well** — Direct Lambda invocation chosen for async processing, respects Textract 1 TPS quota
2. **Confidence Thresholds** — 80% overall confidence triggers manual review, critical fields <70% also trigger review
3. **Error Handling** — ImageQualityService and NotificationService handle poor quality images and failures
4. **Integration Tests Required** — Epic 1.5 retrospective mandated integration tests for all Epic 2 stories
5. **Metrics Are Critical** — CloudWatch metrics and alarms catch issues early

**Patterns to Reuse:**
- Service-oriented architecture (TextractService, OmangOcrService, OcrStorageService)
- Comprehensive unit tests with mocked dependencies
- Integration tests using test helpers from `tests/integration/helpers/`
- CloudWatch metrics for monitoring
- Structured error responses with clear messages

**Files to Reference:**
- `services/verification/src/services/omang-ocr.ts` — Pattern for validation service
- `services/verification/src/handlers/process-ocr.ts` — Where to integrate validation
- `services/verification/src/utils/metrics.ts` — Add validation metrics
- `services/verification/tests/integration/process-ocr.test.ts` — Pattern for integration tests

### Git Intelligence (Recent Commits)

**Recent Work Patterns:**
- **Story 2.1 completed** (commit `61e8bc1`) — OCR extraction fully implemented
- **Staging deployment live** (commit `3b1426e`) — Auth + Verification services deployed to af-south-1
- **Integration test framework** (commit `286807f`) — Test helpers created for DynamoDB and API testing
- **Epic 1.5 complete** (commit `921438a`) — Backend foundation in place

**Code Patterns Established:**
- TypeScript strict mode with Zod validation
- Vitest for unit tests, co-located with source files
- Integration tests in `tests/integration/` folder
- Serverless Framework for Lambda deployment
- AWS SDK v3 for all AWS services
- CloudWatch metrics for monitoring

### Architecture Compliance

**From Project Context:**
- **Node.js 22 LTS** — Use latest Node.js features
- **AWS af-south-1** — All resources in Cape Town region
- **DynamoDB single-table design** — Use entity prefixes (CASE#, DOC#)
- **TypeScript strict mode** — No `any` types without justification
- **Zod for validation** — Runtime validation at boundaries

**From ADRs:**
- **ADR-003: Error Handling** — Return structured `{ error, meta }` responses
- **ADR-005: Testing Pyramid** — Unit tests for business logic, integration tests for contracts

### Security & Compliance

**PII Protection:**
- Omang numbers are PII — never log full numbers
- Use masked format in logs: `omang: ***6789` (last 4 only)
- Validation errors should not expose full Omang numbers

**Audit Trail:**
- Log all validation attempts with results
- Store validation decisions in DynamoDB
- Retain for 5 years (FIA requirement)

**Data Residency:**
- All processing in af-south-1 region
- No data leaves Botswana

### Performance Requirements

- **Validation Time:** < 50ms (p95) — simple format checks
- **Lambda Timeout:** 30 seconds (same as process-ocr)
- **Lambda Memory:** 512MB (same as process-ocr)

### Manual Review Triggers

**Automatic Triggers for Manual Review:**
- Invalid Omang format (not 9 digits, contains non-numeric)
- Expired document
- Expiry date mismatch (not 10 years from issue)
- Missing or unparseable dates
- Any validation error

**Manual Review Workflow:**
1. Case flagged with `requiresManualReview: true`
2. Validation errors stored in `validationErrors` array
3. Analyst reviews in Backoffice (Story 3.2)
4. Analyst can override validation or reject case

### References

**Source Documents:**
- [Epic 2 Definition: _bmad-output/planning-artifacts/epics.md#Epic-2-Story-2.2]
- [Story 2.1 (OCR Extraction): _bmad-output/implementation-artifacts/2-1-omang-ocr-extraction.md]
- [Story 1.5.2+1.5.4 (Core Verification): _bmad-output/implementation-artifacts/1.5-2-4-core-verification-infrastructure.md]
- [Project Context: _bmad-output/project-context.md]

**External Documentation:**
- [Botswana Omang Specifications: https://www.gov.bw/omang-card]
- [Data Protection Act 2024: https://www.gov.bw/data-protection]

## Dev Agent Record

### Agent Model Used

Claude 3.5 Sonnet (Kiro AI Agent - Amelia)

### Debug Log References

- All 319 tests passing (26 test files)
- Validation service: 25/25 unit tests passing
- Integration with process-ocr: All tests updated and passing
- No regressions introduced

### Completion Notes List

**Task 1-2: Omang Validation Service**
- Created `OmangValidationService` with format and expiry validation
- Implemented 9-digit numeric validation with clear error messages
- Implemented expiry validation with 10-year validity check (1-day tolerance for leap years)
- Added warning for documents expiring within 30 days
- Created comprehensive type definitions in `validation.ts`

**Task 3: Integration with OCR Flow**
- Integrated validation into `process-ocr.ts` handler
- Validation runs after OCR extraction for `omang_front` documents only
- Validation requires all three fields: omangNumber, dateOfIssue, dateOfExpiry
- Failed validation marks document for manual review
- Updated `OcrStorageService.storeOcrResults()` to accept and store validation results
- Document status transitions: processed → validated (success) or validation_failed (failure)

**Task 4: Error Handling & Metrics**
- Added `recordOmangValidationMetrics()` to CloudWatch metrics utility
- Metrics track: ValidationValid, ValidationInvalid, specific error types, warnings
- Clear error messages: "Omang number must be exactly 9 digits", "Document has expired", etc.
- Validation errors logged with verificationId and documentId for audit trail
- Warnings logged separately (e.g., "expires soon")

**Task 5: Comprehensive Testing**
- 25 unit tests for OmangValidationService (format, expiry, full validation)
- Updated all process-ocr handler tests (unit + integration)
- Updated ocr-storage tests for new signature
- Edge cases covered: expired, expiring soon, invalid formats, missing fields, future dates
- All existing tests remain passing (no regressions)

**Technical Decisions:**
- Used 1-day tolerance for 10-year expiry check (handles leap years gracefully)
- Validation only runs when all required fields present (omangNumber, dateOfIssue, dateOfExpiry)
- date-fns library added as dependency for date operations
- Validation results stored in DynamoDB document entity under `ocrData.validation`

### File List

**New Files:**
- `services/verification/src/types/validation.ts` - Validation type definitions
- `services/verification/src/services/omang-validation.ts` - Validation service implementation
- `services/verification/src/services/omang-validation.test.ts` - Comprehensive unit tests (25 tests)

**Modified Files:**
- `services/verification/src/handlers/process-ocr.ts` - Integrated validation after OCR
- `services/verification/src/handlers/process-ocr.test.ts` - Updated test expectations
- `services/verification/src/services/ocr-storage.ts` - Added validation result parameter
- `services/verification/src/services/ocr-storage.test.ts` - Added validation storage tests
- `services/verification/src/utils/metrics.ts` - Added validation metrics function
- `services/verification/src/utils/metrics.test.ts` - Added validation metrics tests
- `services/verification/tests/integration/process-ocr.test.ts` - Updated integration tests
- `services/verification/package.json` - Added date-fns dependency
- `pnpm-lock.yaml` - Updated lockfile for date-fns
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Updated story status
- `_bmad-output/implementation-artifacts/2-2-omang-format-validation.md` - This file
