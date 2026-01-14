# Omang OCR Extraction Documentation

## Overview

The OCR extraction system uses AWS Textract to extract text from Omang ID card images. This document covers field extraction patterns, confidence score thresholds, and manual review triggers.

## Omang Card Field Extraction

### Front Side Fields

| Field | Pattern | Example | Weight |
|-------|---------|---------|--------|
| Surname | `SURNAME:?\s*([A-Z\s]+)` | MOGOROSI | 1.5x |
| First Names | `FIRST\s+NAMES?:?\s*([A-Z\s]+)` | KGOSI THABO | 1.5x |
| Omang Number | `OMANG\s+(?:NO\|NUMBER)\.?:?\s*(\d{9})` | 123456789 | 2.0x |
| Date of Birth | `DATE\s+OF\s+BIRTH:?\s*(\d{2}\/\d{2}\/\d{4})` | 15/03/1985 | 1.0x |
| Sex | `SEX:?\s*([MF])` | M | 0.5x |
| Date of Issue | `DATE\s+OF\s+ISSUE:?\s*(\d{2}\/\d{2}\/\d{4})` | 15/03/2015 | 0.5x |
| Date of Expiry | `DATE\s+OF\s+EXPIRY:?\s*(\d{2}\/\d{2}\/\d{4})` | 15/03/2025 | 0.5x |

### Back Side Fields (Address)

| Field | Pattern | Example |
|-------|---------|---------|
| Plot | `PLOT\s+(\d+[A-Z]?)` | 12345 |
| Locality | Heuristic (middle line) | GABORONE |
| District | `(.*?)\s+DISTRICT` | SOUTH EAST DISTRICT |

## Confidence Score Thresholds

### Per-Field Confidence

Textract provides a confidence score (0-100%) for each detected text block. We capture this per-field.

### Overall Confidence Calculation

```
overallConfidence = (
  (surnameConfidence * 1.5) +
  (firstNamesConfidence * 1.5) +
  (omangNumberConfidence * 2.0) +  // Most critical
  (dobConfidence * 1.0) +
  (sexConfidence * 0.5) +
  (dateOfIssueConfidence * 0.5) +
  (dateOfExpiryConfidence * 0.5)
) / totalWeight
```

### Threshold Levels

| Threshold | Value | Action |
|-----------|-------|--------|
| High Confidence | ≥ 95% | Auto-approve |
| Medium Confidence | 80-94% | Proceed with validation |
| Low Confidence | < 80% | Flag for manual review |
| Critical Field Threshold | < 70% | Flag for manual review (Omang number) |

### Environment Variables

```bash
OCR_CONFIDENCE_HIGH=95      # Auto-approve threshold
OCR_CONFIDENCE_LOW=80       # Manual review threshold
OCR_CRITICAL_FIELD_THRESHOLD=70  # Critical field threshold
```

## Image Quality Assessment

### Quality Checks

1. **No Text Detected** - Image is blank or facing wrong direction
2. **Insufficient Text** - Less than 3 text blocks detected
3. **Very Low Confidence** - Average confidence < 30%
4. **Blurry Image** - Average confidence 30-50%
5. **Poor Lighting** - >50% of blocks have confidence < 30%
6. **Partial Document** - Missing expected Omang indicators

### Quality Score Calculation

- Start at 100
- Deduct 30 for insufficient text
- Deduct 50 for very low confidence
- Deduct 25 for blurry image
- Deduct 20 for poor lighting
- Deduct 15 for partial document

### Recapture Triggers

Request recapture when:
- Image is not readable (quality score = 0)
- Quality score < 30%
- Less than 50% of required fields extracted

## Manual Review Triggers

### Automatic Triggers

| Trigger | Condition | Severity |
|---------|-----------|----------|
| Low Overall Confidence | < 80% | HIGH |
| Critical Field Low Confidence | Omang number < 70% | HIGH |
| Missing Critical Fields | surname, firstNames, omangNumber, DOB | HIGH |
| Poor Image Quality | Quality score < 30% | MEDIUM |
| Textract API Errors | After 3 retries | HIGH |
| Validation Failures | Invalid format, expired document | MEDIUM |

### Manual Review Workflow

1. Case flagged with `requiresManualReview: true`
2. Document stored with `ocrData.imageQuality` assessment
3. Analyst opens case in Backoffice
4. Analyst views extracted data alongside original image
5. Analyst corrects/completes missing fields
6. Analyst approves or rejects case
7. Audit log records manual intervention

## CloudWatch Metrics

### Custom Metrics (Namespace: AuthBridge/Verification)

| Metric | Unit | Description |
|--------|------|-------------|
| OcrProcessingCount | Count | Total OCR operations |
| OcrSuccess | Count | Successful extractions |
| OcrFailure | Count | Failed extractions |
| OcrProcessingTime | Milliseconds | Processing duration |
| OcrConfidenceScore | Percent | Extraction confidence |
| OcrManualReviewRequired | Count | Manual review flags |
| PoorQualityImage | Count | Poor quality detections |
| ImageQualityScore | Percent | Image quality score |
| TextractError | Count | Textract API errors |

### Dimensions

- `DocumentType`: omang_front, omang_back, selfie
- `ErrorType`: THROTTLING, INVALID_S3_OBJECT, UNSUPPORTED_DOCUMENT, POOR_QUALITY, UNKNOWN

## CloudWatch Alarms

| Alarm | Condition | Action |
|-------|-----------|--------|
| OCR Success Rate | < 85% for 15 min | Alert engineering |
| OCR Confidence | < 90% avg for 15 min | Alert operations |
| Processing Time | > 10s (p95) for 10 min | Alert engineering |
| Manual Review Rate | > 30% per hour | Alert operations |
| DLQ Messages | ≥ 1 message | Alert engineering |

## Error Handling

### Textract API Errors

| Error | Handling | Retry |
|-------|----------|-------|
| ProvisionedThroughputExceededException | Exponential backoff | Yes (3x) |
| ThrottlingException | Exponential backoff | Yes (3x) |
| InvalidS3ObjectException | Mark failed | No |
| UnsupportedDocumentException | Mark failed | No |

### Retry Configuration

- Max retries: 3
- Initial backoff: 1 second
- Backoff multiplier: 2x (1s, 2s, 4s)
- SQS visibility timeout: 6 minutes
- DLQ after: 3 failed attempts

## Failure Notifications

### SNS Alerts

Notifications sent to `authbridge-ocr-alerts-{stage}` topic when:
- Document fails OCR 3+ times
- Poor quality image detected
- CloudWatch alarm triggered

### Alert Format

```
OCR Processing Failure Alert
=============================
Verification ID: ver_abc123
Document ID: doc_xyz789
Document Type: omang_front

Error Details:
- Type: THROTTLING
- Message: Rate exceeded
- Attempt Count: 3
- Timestamp: 2026-01-14T10:00:00Z
```

## Data Storage

### Document Entity (DOC#)

```typescript
{
  PK: "CASE#<verificationId>",
  SK: "DOC#<documentId>",
  status: "processed",
  ocrData: {
    extractedFields: { ... },
    confidence: { overall: 98.4, ... },
    rawTextractResponse: { ... },
    extractionMethod: "pattern",
    processingTimeMs: 4523,
    requiresManualReview: false,
    missingFields: [],
    imageQuality: {
      isReadable: true,
      qualityScore: 95,
      issues: [],
      recommendation: "Image quality is acceptable."
    }
  }
}
```

### Verification Case (META)

```typescript
{
  PK: "CASE#<verificationId>",
  SK: "META",
  customerData: {
    fullName: "KGOSI THABO MOGOROSI",
    omangNumber: "123456789",
    dateOfBirth: "1985-03-15",
    sex: "M",
    address: { plot: "12345", locality: "GABORONE", district: "SOUTH EAST DISTRICT" },
    documentExpiry: "2025-03-15",
    extractionConfidence: 98.4,
    extractedAt: "2026-01-14T10:00:05Z"
  }
}
```

## AWS Region Compliance

All Textract operations MUST use `af-south-1` (Cape Town) region for DPA 2024 compliance.

### Textract Quotas (af-south-1)

| API | Default Quota | Notes |
|-----|---------------|-------|
| DetectDocumentText (sync) | 1 TPS | Main API for Omang OCR |
| Max concurrent async jobs | 100 | Same across regions |

### Mitigation

- SQS queue with batchSize: 1
- Lambda reservedConcurrency: 1
- Exponential backoff on throttling
