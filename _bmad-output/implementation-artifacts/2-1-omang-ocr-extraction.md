# Story 2.1: Omang OCR Extraction

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

**🚨 UPDATED AFTER EPIC 1.5 RETROSPECTIVE:**
- **Async Processing Pattern Decision:** Must choose between Direct Lambda invocation (recommended), SQS, or EventBridge before implementation
- **Integration Testing:** Now required for all Epic 2 stories (framework being created in prep sprint)
- **AWS Service Quotas:** Research Textract quotas during implementation (can happen in parallel)

## Story

As the system,
I want to extract text from Omang card images using AWS Textract,
So that I can validate the document and populate case data.

## Acceptance Criteria

1. **Given** an Omang card image is uploaded
   **When** the OCR service processes the image
   **Then** the following fields are extracted: Full Name, Omang Number, Date of Birth, Address, Expiry Date
   **And** extraction confidence scores are recorded
   **And** the extracted data is stored with the verification case

## Tasks / Subtasks

- [ ] Task 1: AWS Textract Integration Setup (AC: #1)
  - [ ] Add AWS Textract SDK dependencies (@aws-sdk/client-textract)
  - [ ] Configure IAM permissions for Textract operations
  - [ ] Set up Textract client with af-south-1 region
  - [ ] Create Textract service wrapper with error handling
  - [ ] Add CloudWatch metrics for Textract operations

- [ ] Task 2: Omang Field Extraction Logic (AC: #1)
  - [ ] Implement DetectDocumentText for Omang front side
  - [ ] Parse Textract response to extract structured fields
  - [ ] Map Omang-specific field locations and patterns
  - [ ] Extract Full Name (typically top of card)
  - [ ] Extract Omang Number (9-digit format)
  - [ ] Extract Date of Birth (DD/MM/YYYY format)
  - [ ] Extract Address (Plot, Locality, District)
  - [ ] Extract Expiry Date (10 years from issue)
  - [ ] Handle multi-line address parsing

- [ ] Task 3: Confidence Score Recording (AC: #1)
  - [ ] Capture per-field confidence scores from Textract
  - [ ] Calculate overall extraction confidence
  - [ ] Flag low-confidence extractions (<80%) for manual review
  - [ ] Store confidence metadata with extracted data
  - [ ] Log confidence scores for analytics

- [ ] Task 4: OCR Result Storage (AC: #1)
  - [ ] Update document entity with OCR results
  - [ ] Store extracted fields in DynamoDB
  - [ ] Update verification case with extracted data
  - [ ] Store raw Textract response for debugging
  - [ ] Update document status (uploaded → processed)

- [ ] Task 5: Async Processing Pattern Decision & Implementation (AC: #1)
  - [ ] **DECISION REQUIRED:** Choose async processing pattern (Direct Lambda invocation, SQS queue, or EventBridge)
  - [ ] Document decision rationale in architecture doc
  - [ ] Create Lambda handler for OCR processing
  - [ ] Implement chosen async pattern to trigger OCR on document upload
  - [ ] Handle Textract job completion callbacks
  - [ ] Update case status on OCR completion
  - [ ] Add integration tests for async flow

- [ ] Task 6: Error Handling & Retry Logic (AC: #1)
  - [ ] Handle Textract API errors (throttling, timeouts)
  - [ ] Implement exponential backoff for retries
  - [ ] Handle poor quality images (unreadable text)
  - [ ] Store error details for debugging
  - [ ] Notify on repeated failures

- [ ] Task 7: Testing & Validation (AC: #1)
  - [ ] Create test Omang images (synthetic data)
  - [ ] Unit test field extraction logic
  - [ ] Unit test confidence score calculation
  - [ ] Integration test with real Textract API
  - [ ] Test error scenarios (blurry, rotated images)
  - [ ] Test multi-line address parsing
  - [ ] Validate extracted data format

- [ ] Task 8: Documentation & Monitoring (AC: #1)
  - [ ] Document Omang field extraction patterns
  - [ ] Document confidence score thresholds
  - [ ] Add CloudWatch alarms for OCR failures
  - [ ] Create dashboard for OCR metrics
  - [ ] Document manual review triggers

## Dev Notes

### 🔥 CRITICAL MISSION: OCR EXTRACTION ENGINE

This story is the **foundation of Omang verification**. The quality of OCR extraction directly impacts:
- **Verification accuracy** — bad OCR = false rejections
- **Manual review workload** — low confidence = more human review
- **Customer experience** — failed extractions = frustrated users
- **Compliance** — incorrect data = regulatory risk

**Your mission:** Build a robust, production-ready OCR engine that handles real-world Omang cards with high accuracy and graceful degradation.

### Omang Card Specifications

**Physical Characteristics:**
- **Size:** 85.6mm × 53.98mm (credit card size, ISO/IEC 7810 ID-1)
- **Material:** Plastic card with embedded chip
- **Sides:** Front (photo + personal data), Back (address + barcode)
- **Colors:** Blue and white with Botswana coat of arms
- **Security Features:** Hologram, microprinting, UV elements

**Front Side Fields:**
```
┌─────────────────────────────────────────┐
│  REPUBLIC OF BOTSWANA                   │
│  [Coat of Arms]                         │
│                                         │
│  [Photo]    SURNAME: MOGOROSI          │
│             FIRST NAMES: KGOSI THABO   │
│             OMANG NO: 123456789        │
│             DATE OF BIRTH: 15/03/1985  │
│             SEX: M                      │
│             DATE OF ISSUE: 15/03/2015  │
│             DATE OF EXPIRY: 15/03/2025 │
│                                         │
│  [Signature]                            │
└─────────────────────────────────────────┘
```

**Back Side Fields:**
```
┌─────────────────────────────────────────┐
│  ADDRESS:                               │
│  PLOT 12345                             │
│  GABORONE                               │
│  SOUTH EAST DISTRICT                    │
│                                         │
│  [Barcode]                              │
│  [Chip]                                 │
└─────────────────────────────────────────┘
```

**Field Specifications:**

| Field | Format | Example | Notes |
|-------|--------|---------|-------|
| Surname | Text | MOGOROSI | All caps, may have spaces |
| First Names | Text | KGOSI THABO | All caps, multiple names |
| Omang Number | 9 digits | 123456789 | No spaces, no dashes |
| Date of Birth | DD/MM/YYYY | 15/03/1985 | Always slash-separated |
| Sex | M or F | M | Single character |
| Date of Issue | DD/MM/YYYY | 15/03/2015 | Always slash-separated |
| Date of Expiry | DD/MM/YYYY | 15/03/2025 | 10 years from issue |
| Address | Multi-line | PLOT 12345<br>GABORONE<br>SOUTH EAST DISTRICT | 3 lines typical |

### AWS Textract Integration

**Service:** AWS Textract
**API:** DetectDocumentText (synchronous, <1 page)
**Region:** af-south-1 (Cape Town) — MANDATORY for DPA 2024
**Pricing:** $1.50 per 1,000 pages (text extraction)

### ⚠️ AWS Textract Quotas (af-south-1 Region)

**CRITICAL:** af-south-1 falls under "Other Regions" with significantly lower quotas than US regions.

| API | Default Quota | US Regions | Notes |
|-----|---------------|------------|-------|
| DetectDocumentText (sync) | **1 TPS** | 25 TPS | Main API for Omang OCR |
| StartDocumentTextDetection (async) | **1 TPS** | 25 TPS | For multi-page docs |
| GetDocumentTextDetection | **5 TPS** | 25 TPS | Polling async results |
| Max concurrent async jobs | **100** | 100 | Same across regions |

**Impact on Production:**
- 1 TPS = 60 documents/minute = 3,600 documents/hour
- For high-volume periods, may need to request quota increase
- Consider implementing request queuing to smooth traffic spikes
- Monitor CloudWatch metrics for throttling

**Mitigation Strategies:**
1. **Request Quota Increase:** Submit AWS Support ticket for production workloads
2. **Request Queuing:** Use SQS to buffer OCR requests during spikes
3. **Caching:** Cache OCR results to avoid re-processing same documents
4. **Retry with Backoff:** Handle `ProvisionedThroughputExceededException` gracefully

**Why DetectDocumentText (not AnalyzeDocument):**
- Omang is a single-page document (front or back)
- DetectDocumentText is faster and cheaper
- No need for form/table analysis
- Synchronous response (<5 seconds)

**Textract Response Structure:**
```json
{
  "DocumentMetadata": {
    "Pages": 1
  },
  "Blocks": [
    {
      "BlockType": "PAGE",
      "Id": "1",
      "Confidence": 99.5
    },
    {
      "BlockType": "LINE",
      "Id": "2",
      "Text": "SURNAME: MOGOROSI",
      "Confidence": 99.2,
      "Geometry": {
        "BoundingBox": {
          "Width": 0.3,
          "Height": 0.02,
          "Left": 0.4,
          "Top": 0.2
        }
      }
    },
    {
      "BlockType": "WORD",
      "Id": "3",
      "Text": "SURNAME:",
      "Confidence": 99.5
    },
    {
      "BlockType": "WORD",
      "Id": "4",
      "Text": "MOGOROSI",
      "Confidence": 99.0
    }
  ]
}
```

**Extraction Strategy:**
1. Call DetectDocumentText with S3 object reference
2. Parse LINE blocks (easier than WORD blocks)
3. Use regex patterns to identify field labels
4. Extract values following labels
5. Validate extracted values against expected formats
6. Calculate confidence scores per field

### Field Extraction Patterns

**Pattern-Based Extraction (Recommended):**

```typescript
// Omang front side patterns
const PATTERNS = {
  surname: /SURNAME:\s*([A-Z\s]+)/i,
  firstNames: /FIRST\s+NAMES?:\s*([A-Z\s]+)/i,
  omangNumber: /OMANG\s+NO\.?:\s*(\d{9})/i,
  dateOfBirth: /DATE\s+OF\s+BIRTH:\s*(\d{2}\/\d{2}\/\d{4})/i,
  sex: /SEX:\s*([MF])/i,
  dateOfIssue: /DATE\s+OF\s+ISSUE:\s*(\d{2}\/\d{2}\/\d{4})/i,
  dateOfExpiry: /DATE\s+OF\s+EXPIRY:\s*(\d{2}\/\d{2}\/\d{4})/i,
};

// Omang back side patterns
const ADDRESS_PATTERNS = {
  plot: /PLOT\s+(\d+[A-Z]?)/i,
  locality: /^([A-Z\s]+)$/,  // Second line typically
  district: /(DISTRICT|REGION)$/i,  // Third line typically
};
```

**Position-Based Extraction (Fallback):**
- If pattern matching fails, use bounding box positions
- Omang fields are consistently positioned
- Use Y-coordinate to identify field rows
- Use X-coordinate to separate labels from values

### Confidence Score Calculation

**Per-Field Confidence:**
- Use Textract's confidence score for each extracted word
- Average confidence across all words in a field
- Flag fields with confidence <80% for manual review

**Overall Extraction Confidence:**
```typescript
const overallConfidence = (
  (surnameConfidence * 1.5) +  // Name is critical
  (firstNamesConfidence * 1.5) +
  (omangNumberConfidence * 2.0) +  // Most critical
  (dobConfidence * 1.0) +
  (addressConfidence * 1.0)
) / 7.0;
```

**Confidence Thresholds:**
- **>= 95%:** Auto-approve (high confidence)
- **80-94%:** Proceed with validation (medium confidence)
- **< 80%:** Flag for manual review (low confidence)

### DynamoDB Schema Updates

**Document Entity (DOC#) — Add OCR Results:**
```typescript
{
  PK: "CASE#<verificationId>",
  SK: "DOC#<documentId>",
  documentId: "doc_abc123",
  documentType: "omang_front",
  s3Key: "client_abc/ver_def/omang_front-123.jpg",
  status: "processed",  // uploaded → processing → processed
  uploadedAt: "2026-01-14T10:00:00Z",
  processedAt: "2026-01-14T10:00:05Z",

  // NEW: OCR Results
  ocrData: {
    extractedFields: {
      surname: "MOGOROSI",
      firstNames: "KGOSI THABO",
      omangNumber: "123456789",
      dateOfBirth: "15/03/1985",
      sex: "M",
      dateOfIssue: "15/03/2015",
      dateOfExpiry: "15/03/2025"
    },
    confidence: {
      surname: 99.2,
      firstNames: 98.5,
      omangNumber: 99.8,
      dateOfBirth: 97.3,
      sex: 99.9,
      dateOfIssue: 96.8,
      dateOfExpiry: 97.1,
      overall: 98.4
    },
    rawTextractResponse: { /* Full Textract response */ },
    extractionMethod: "pattern",  // pattern | position | manual
    processingTimeMs: 4523
  }
}
```

**Verification Case Entity (CASE#) — Add Extracted Data:**
```typescript
{
  PK: "CASE#<verificationId>",
  SK: "META",
  verificationId: "ver_abc123",
  status: "documents_complete",  // documents_uploading → documents_complete

  // NEW: Extracted Customer Data
  customerData: {
    fullName: "KGOSI THABO MOGOROSI",
    omangNumber: "123456789",  // ENCRYPTED in production
    dateOfBirth: "1985-03-15",  // ISO 8601 format
    sex: "M",
    address: {
      plot: "12345",
      locality: "GABORONE",
      district: "SOUTH EAST DISTRICT"
    },
    documentExpiry: "2025-03-15",
    extractionConfidence: 98.4,
    extractedAt: "2026-01-14T10:00:05Z"
  }
}
```

### Async Processing Architecture

**🚨 DECISION REQUIRED: Choose Async Processing Pattern**

This decision was deferred from Epic 1.5 and must be made during Story 2.1 planning.

**Option 1: EventBridge (Recommended for MVP):**
```
Document Upload → DynamoDB Stream → EventBridge Rule → OCR Lambda
```
**Pros:**
- Decoupled architecture
- Easy to add more event consumers later
- Built-in retry and dead-letter queue
- No additional infrastructure cost (pay per event)

**Cons:**
- Slightly more complex setup
- Requires DynamoDB Streams enabled

**Option 2: SQS Queue:**
```
Document Upload → SQS Message → OCR Lambda (batch processing)
```
**Pros:**
- Simple and reliable
- Built-in retry and visibility timeout
- Good for batch processing

**Cons:**
- Additional infrastructure to manage
- Requires polling or Lambda trigger
- Cost for queue operations

**Option 3: Direct Invocation (Simplest for MVP):**
```
Document Upload Handler → Invoke OCR Lambda (async)
```
**Pros:**
- Simplest implementation
- No additional infrastructure
- Lambda async invocation is reliable
- Can migrate to EventBridge/SQS later if needed

**Cons:**
- Tighter coupling between services
- Harder to add additional event consumers
- No built-in retry mechanism (must implement manually)

**Recommendation from Epic 1.5 Retrospective:** Use **Option 3 (Direct Invocation)** for MVP:
- Simplest implementation
- No additional infrastructure
- Lambda async invocation is reliable
- Can migrate to EventBridge/SQS later if needed

**Decision Criteria:**
- Simplicity for MVP
- Time to implement
- Future extensibility needs
- Cost considerations

**Action:** Document final decision in architecture doc before implementation begins.

**Implementation:**
```typescript
// In upload-document.ts handler
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({ region: 'af-south-1' });

// After successful S3 upload and DynamoDB write
await lambdaClient.send(new InvokeCommand({
  FunctionName: 'authbridge-verification-dev-processOCR',
  InvocationType: 'Event',  // Async invocation
  Payload: JSON.stringify({
    verificationId,
    documentId,
    s3Key,
    documentType
  })
}));
```

### Error Handling Strategy

**Textract API Errors:**
- `ProvisionedThroughputExceededException` → Retry with exponential backoff
- `InvalidS3ObjectException` → Mark document as failed, notify user
- `UnsupportedDocumentException` → Mark as failed, suggest re-upload
- `ThrottlingException` → Retry with backoff (AWS SDK handles automatically)

**Poor Quality Images:**
- Textract returns low confidence (<50%) → Flag for manual review
- No text detected → Mark as failed, suggest better lighting/focus
- Rotated image → Attempt rotation correction, retry

**Partial Extraction:**
- Some fields extracted, others missing → Store partial data
- Flag missing fields for manual entry
- Don't block verification flow on partial data

**Retry Logic:**
```typescript
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

async function extractWithRetry(s3Key: string, retries = 0): Promise<OcrResult> {
  try {
    return await textractService.detectDocumentText(s3Key);
  } catch (error) {
    if (retries < MAX_RETRIES && isRetryable(error)) {
      const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, retries);
      await sleep(backoffMs);
      return extractWithRetry(s3Key, retries + 1);
    }
    throw error;
  }
}
```

### Testing Strategy

**Integration Tests (NEW REQUIREMENT from Epic 1.5 Retrospective):**
- Test end-to-end flow: document upload → async trigger → OCR processing → result storage
- Test with real Textract API (use test images)
- Test async Lambda invocation (or chosen pattern)
- Test DynamoDB updates across the flow
- Verify document status transitions
- Test error handling and retry logic

**Unit Tests (Vitest):**
- Test pattern matching with sample text
- Test confidence score calculation
- Test field validation (format, length)
- Test error handling (missing fields, invalid formats)
- Mock Textract responses

**Integration Tests:**
- Test with real Textract API (use test images)
- Test async Lambda invocation
- Test DynamoDB updates
- Test end-to-end flow (upload → OCR → storage)

**Test Data:**
- Create synthetic Omang images (use image generation)
- Use various quality levels (clear, blurry, rotated)
- Test edge cases (long names, special characters)
- Test missing fields (damaged cards)

**Sample Test Cases:**
```typescript
describe('OmangOcrService', () => {
  it('should extract all fields from clear Omang front', async () => {
    const result = await ocrService.extractOmangFront(testImageS3Key);
    expect(result.extractedFields.omangNumber).toBe('123456789');
    expect(result.confidence.overall).toBeGreaterThan(95);
  });

  it('should flag low confidence extractions', async () => {
    const result = await ocrService.extractOmangFront(blurryImageS3Key);
    expect(result.confidence.overall).toBeLessThan(80);
    expect(result.requiresManualReview).toBe(true);
  });

  it('should handle missing fields gracefully', async () => {
    const result = await ocrService.extractOmangFront(partialImageS3Key);
    expect(result.extractedFields.omangNumber).toBeDefined();
    expect(result.extractedFields.address).toBeUndefined();
    expect(result.missingFields).toContain('address');
  });
});
```

### Performance Requirements

- **OCR Processing Time:** < 5 seconds (p95)
- **Lambda Timeout:** 30 seconds
- **Lambda Memory:** 512MB (Textract API calls are I/O bound)
- **Concurrent Processing:** 10 documents/second per client
- **Success Rate:** > 90% (clear images)

### Security & Compliance

**PII Protection:**
- Omang numbers are PII — encrypt at rest in DynamoDB
- Use KMS encryption for sensitive fields
- Never log Omang numbers in CloudWatch
- Mask in logs: `omang: ***6789` (last 4 only)

**Audit Trail:**
- Log all OCR operations (timestamp, document ID, confidence)
- Store raw Textract responses for debugging
- Track manual review triggers
- Retain for 5 years (FIA requirement)

**Data Residency:**
- All Textract calls must use af-south-1 region
- S3 bucket must be in af-south-1
- DynamoDB table must be in af-south-1

### Technology Stack & Dependencies

**AWS SDK v3 Packages:**
```json
{
  "@aws-sdk/client-textract": "^3.700.0",
  "@aws-sdk/client-lambda": "^3.700.0",
  "@aws-sdk/client-kms": "^3.700.0"
}
```

**Utilities:**
```json
{
  "date-fns": "^4.1.0",  // Date parsing and validation
  "zod": "^3.24.1"       // Runtime validation
}
```

### File Structure

**Expected Files:**
```
services/verification/
├── src/
│   ├── handlers/
│   │   └── process-ocr.ts              # Lambda handler for OCR processing
│   ├── services/
│   │   ├── textract.ts                 # Textract client wrapper
│   │   ├── omang-ocr.ts                # Omang-specific extraction logic
│   │   └── ocr-storage.ts              # Store OCR results in DynamoDB
│   ├── utils/
│   │   ├── field-extractors.ts         # Pattern-based field extraction
│   │   ├── confidence-calculator.ts    # Confidence score calculation
│   │   └── omang-validator.ts          # Validate extracted Omang data
│   └── types/
│       └── ocr.ts                      # OCR types and interfaces
├── tests/
│   ├── unit/
│   │   ├── field-extractors.test.ts
│   │   ├── confidence-calculator.test.ts
│   │   └── omang-validator.test.ts
│   └── integration/
│       └── process-ocr.test.ts
└── test-data/
    └── omang-samples/                  # Synthetic test images
        ├── clear-front.jpg
        ├── blurry-front.jpg
        └── rotated-front.jpg
```

### Integration with Existing Codebase

**From Epic 1.5 Retrospective - Critical Updates:**

**Async Processing Pattern Decision:**
- **Status:** DECISION REQUIRED before implementation
- **Options:** Direct Lambda invocation (recommended), SQS queue, or EventBridge
- **Action:** Review options above, document decision in architecture doc
- **Impact:** Affects how OCR is triggered after document upload

**Integration Testing Requirement:**
- **Status:** NEW REQUIREMENT from Epic 1.5 retrospective
- **Action:** All Epic 2 stories must include integration tests
- **Framework:** Integration test framework will be created during 3-day prep sprint
- **Coverage:** Must test end-to-end flow (upload → OCR → storage)

**From Story 1.5.3 (Document Upload):**
- Reuse S3Service for accessing uploaded images
- Reuse DocumentService for updating document status
- Trigger OCR after successful document upload
- Update document entity with OCR results

**From Story 1.5.2+1.5.4 (Core Verification):**
- Reuse DynamoDB service layer
- Update verification case with extracted data
- Reuse entity key generation utilities
- Update case status after OCR completion

**From Story 1.5.1 (Authentication):**
- Reuse audit logging service
- Reuse structured logging utilities
- Reuse error handling patterns

### Serverless Framework Configuration

**serverless.yml (verification service - add OCR function):**
```yaml
functions:
  processOCR:
    handler: src/handlers/process-ocr.handler
    timeout: 30
    memorySize: 512
    environment:
      TABLE_NAME: ${self:provider.environment.TABLE_NAME}
      BUCKET_NAME: ${self:provider.environment.BUCKET_NAME}
      KMS_KEY_ID: ${self:custom.kmsKeyId}
    iamRoleStatements:
      - Effect: Allow
        Action:
          - textract:DetectDocumentText
        Resource: '*'
      - Effect: Allow
        Action:
          - s3:GetObject
        Resource: arn:aws:s3:::${self:provider.environment.BUCKET_NAME}/*
      - Effect: Allow
        Action:
          - dynamodb:UpdateItem
          - dynamodb:GetItem
        Resource:
          - arn:aws:dynamodb:${self:provider.region}:*:table/${self:provider.environment.TABLE_NAME}
      - Effect: Allow
        Action:
          - kms:Decrypt
          - kms:Encrypt
          - kms:GenerateDataKey
        Resource: arn:aws:kms:${self:provider.region}:*:key/${self:custom.kmsKeyId}
```

### CloudWatch Metrics & Alarms

**Custom Metrics:**
- `OCR/ProcessingTime` — Time to process OCR (ms)
- `OCR/ConfidenceScore` — Average confidence score
- `OCR/SuccessRate` — Percentage of successful extractions
- `OCR/ManualReviewRate` — Percentage flagged for review
- `OCR/FieldExtractionRate` — Per-field extraction success

**Alarms:**
- OCR success rate < 85% → Alert engineering
- Average confidence < 90% → Alert operations
- Processing time > 10s (p95) → Alert engineering
- Manual review rate > 30% → Alert operations

### Manual Review Triggers

**Automatic Triggers:**
- Overall confidence < 80%
- Any critical field confidence < 70% (Omang number, name, DOB)
- Missing critical fields
- Textract API errors after retries
- Validation failures (invalid format, expired document)

**Manual Review Workflow:**
1. Case flagged with `requiresManualReview: true`
2. Analyst opens case in Backoffice
3. Analyst views extracted data alongside original image
4. Analyst corrects/completes missing fields
5. Analyst approves or rejects case
6. Audit log records manual intervention

### References

**Source Documents:**
- [Epic 2 Definition: _bmad-output/planning-artifacts/epics.md#Epic-2-Story-2.1]
- [Architecture: _bmad-output/planning-artifacts/architecture.md#ADR-007-AWS-Textract]
- [Story 1.5.3 (Document Upload): _bmad-output/implementation-artifacts/1.5-3-document-upload-endpoint-s3.md]
- [Story 1.5.2+1.5.4 (Core Verification): _bmad-output/implementation-artifacts/1.5-2-4-core-verification-infrastructure.md]
- [Project Context: _bmad-output/project-context.md]

**External Documentation:**
- [AWS Textract DetectDocumentText: https://docs.aws.amazon.com/textract/latest/dg/API_DetectDocumentText.html]
- [Textract Best Practices: https://docs.aws.amazon.com/textract/latest/dg/best-practices.html]
- [Textract Pricing: https://aws.amazon.com/textract/pricing/]
- [Botswana Omang Specifications: https://www.gov.bw/omang-card]

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_
