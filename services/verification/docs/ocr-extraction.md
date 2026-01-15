# Omang & Driver's Licence OCR Extraction Documentation

## Overview

The OCR extraction system uses AWS Textract to extract text from Botswana identity documents. This document covers field extraction patterns, confidence score thresholds, and manual review triggers for both Omang (National ID) and Driver's Licence documents.

## Omang Card Field Extraction

### Front Side Fields

| Field | Pattern | Example | Weight |
|-------|---------|---------|--------|
| Surname | `SURNAME:?\s*([A-Z\s]+)` | MOEPSWA | 1.5x |
| Forenames | `FORENAMES?:?\s*([A-Z\s]+)` | MOTLOTLEGI EDMOND P | 1.5x |
| ID Number | `ID\s+NUMBER:?\s*(\d{9})` | 059016012 | 2.0x |
| Date of Birth | `DATE\s+OF\s+BIRTH:?\s*(\d{2}\/\d{2}\/\d{4})` | 25/08/1994 | 1.0x |
| Place of Birth | `PLACE\s+OF\s+BIRTH:?\s*([A-Z\s]+)` | FRANCISTOWN | 0.5x |

### Back Side Fields

| Field | Pattern | Example | Weight |
|-------|---------|---------|--------|
| Nationality | `NATIONALITY:?\s*([A-Z\s]+)` | MOTSWANA | 0.5x |
| Sex | `SEX:?\s*([MF])` | M | 0.5x |
| Colour of Eyes | `COLOUR\s+OF\s+EYES:?\s*([A-Z\s]+)` | BROWN | 0.3x |
| Date of Expiry | `DATE\s+OF\s+EXPIRY:?\s*(\d{2}\/\d{2}\/\d{4})` | 22/05/2032 | 0.5x |
| Place of Application | `PLACE\s+OF\s+APPLICATION:?\s*([A-Z\s]+)` | GABORONE | 0.3x |

### Back Side Fields (Address - Optional)

| Field | Pattern | Example |
|-------|---------|---------|
| Plot | `PLOT\s+(\d+[A-Z]?)` | 12345 |
| Locality | Heuristic (middle line) | GABORONE |
| District | `(.*?)\s+DISTRICT` | SOUTH EAST DISTRICT |

## Driver's Licence Field Extraction

### Front Side Fields

| Field | Pattern | Example | Weight |
|-------|---------|---------|--------|
| Surname | First all-caps name line | MOEPSWA | 1.5x |
| Forenames | Second all-caps name line | MOTLOTLEGI EDMOND P | 1.5x |
| ID: Omang | `ID:?\s*Omang\s*(\d{9})` | 059016012 | 2.0x |
| Gender | `Gender:?\s*([MF])` | M | 0.5x |
| Date of Birth | `Date\s+of\s+Birth:?\s*(\d{2}\/\d{2}\/\d{4})` | 25/08/1994 | 1.0x |
| Licence Number | `Licence\s+Number:?\s*(\d+)` | 687215 | 1.5x |
| Class | `Class\s+([A-Z0-9]+)` | B | 1.0x |
| Validity Period | `Validity\s+Period:?\s*([A-Za-z]+\s+\d{4})\s*-\s*([A-Za-z]+\s+\d{4})` | Oct 2024 - Oct 2029 | 0.5x |
| First Issue | `First\s+Issue:?\s*(\d{2}\/\d{2}\/\d{4})` | 04/10/2024 | 0.3x |
| Driver Restriction | `Driver\s+Restriction:?\s*(\d)` | 0 | 0.3x |
| Veh. Restr. | `Veh\.?\s*Restr\.?:?\s*(\d)` | 0 | 0.3x |
| Endorsement | `Endorsement:?\s*(Yes\|No)` | No | 0.3x |

### Driver Restriction Codes

| Code | Meaning |
|------|---------|
| 0 | None |
| 1 | Glasses/contact lenses |
| 2 | Artificial limb |

### Vehicle Restriction Codes

| Code | Meaning |
|------|---------|
| 0 | None |
| 1 | Automatic transmission |
| 2 | Electrically powered |
| 3 | Physically disabled |
| 4 | Bus >16,000kg (GVM) permitted |

### Licence Class Categories

| Class | Description |
|-------|-------------|
| A | Motorcycle >125cc |
| A1 | Motorcycle ≤125cc |
| B | Light vehicle ≤3500kg, GVM ≤750kg |
| C1 | Medium vehicle, GVM ≤16,000kg |
| C | Heavy vehicle, GVM >16,000kg |
| EB | Light vehicle with trailer |
| EC1 | Medium vehicle with trailer |
| EC | Heavy vehicle with trailer |

### PrDP Categories (Professional Driving Permit)

| Code | Meaning |
|------|---------|
| P | Passengers |
| G | Goods |
| H | Hazardous |

### Back Side Fields

The back of the driver's licence contains:
- Vehicle class category icons and descriptions
- Driver restrictions legend
- Vehicle restrictions legend
- PrDP categories legend
- Barcode with licence reference number

## Confidence Score Thresholds

### Per-Field Confidence

Textract provides a confidence score (0-100%) for each detected text block. We capture this per-field.

### Overall Confidence Calculation

```
// Front side
overallConfidenceFront = (
  (surnameConfidence * 1.5) +
  (forenamesConfidence * 1.5) +
  (idNumberConfidence * 2.0) +  // Most critical
  (dobConfidence * 1.0) +
  (placeOfBirthConfidence * 0.5)
) / totalWeight

// Back side
overallConfidenceBack = (
  (nationalityConfidence * 0.5) +
  (sexConfidence * 0.5) +
  (colourOfEyesConfidence * 0.3) +
  (dateOfExpiryConfidence * 0.5) +
  (placeOfApplicationConfidence * 0.3)
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
| Critical Field Low Confidence | ID Number < 70% | HIGH |
| Missing Critical Fields | surname, forenames, idNumber, DOB | HIGH |
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
    fullName: "MOTLOTLEGI EDMOND P MOEPSWA",
    idNumber: "059016012",
    dateOfBirth: "1994-08-25",
    placeOfBirth: "FRANCISTOWN",
    nationality: "MOTSWANA",
    sex: "M",
    colourOfEyes: "BROWN",
    address: { plot: "12345", locality: "GABORONE", district: "SOUTH EAST DISTRICT" },
    documentExpiry: "2032-05-22",
    placeOfApplication: "GABORONE",
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
