# Biometric Face Matching

This document describes the biometric face matching process used in AuthBridge verification.

## Overview

Biometric verification is the final gate before approval. It compares the selfie captured during verification to the ID photo on the Omang document using AWS Rekognition.

## Process Flow

```
1. Selfie Upload (Story 1.5) → Liveness Session Created
2. Omang Front Upload → OCR Extraction (Story 2.1)
3. OCR Validation (Story 2.2) → Validation Passes
4. Biometric Processing (Story 2.3) ← THIS DOCUMENT
   a. Validate Liveness Session Results
   b. Compare Selfie to ID Photo
   c. Calculate Overall Score
   d. Store Results & Update Status
```

## AWS Rekognition APIs

### Face Liveness Detection

**API:** `GetFaceLivenessSessionResults`

Validates that the selfie was captured from a live person, not a photo/video/mask.

**Thresholds:**
- **>= 80%:** Pass liveness check
- **< 80%:** Flag for manual review
- **Status != SUCCEEDED:** Flag for manual review

### Face Comparison

**API:** `CompareFaces`

Compares the selfie to the ID photo extracted from the Omang document.

**Parameters:**
- `SimilarityThreshold: 80` — Only return matches >= 80%
- `QualityFilter: AUTO` — Filter low-quality faces automatically

**Thresholds:**
- **>= 95%:** High confidence match (auto-approve)
- **80-94%:** Medium confidence match (proceed with caution)
- **< 80%:** Low confidence (flag for manual review)
- **No FaceMatches:** No match found (flag for manual review)

## Overall Score Calculation

The overall biometric score is a weighted average:

```
overallScore = (livenessScore * 0.3) + (similarityScore * 0.7)
```

**Rationale:** Face similarity is weighted more heavily (70%) because it's the primary identity verification. Liveness (30%) confirms the person is present but is secondary to identity match.

**Pass Criteria:**
- Liveness passed (>= 80% AND status SUCCEEDED)
- Similarity passed (>= 80%)
- Overall score >= 80%

## Manual Review Triggers

Cases are flagged for manual review when:

1. **Liveness confidence < 80%** — Possible spoofing attempt
2. **Similarity score < 80%** — Faces don't match well enough
3. **Liveness status != SUCCEEDED** — Liveness check failed
4. **No face detected in selfie** — Image quality issue
5. **No face detected in ID photo** — Document quality issue
6. **Multiple faces detected** — Ambiguous identity
7. **Face too small or blurry** — Quality score < 70

## DynamoDB Schema

### Document Entity (DOC#) — Biometric Results

```typescript
{
  PK: "CASE#<verificationId>",
  SK: "DOC#<documentId>",
  status: "biometric_processed",
  biometricData: {
    liveness: {
      confidence: 98.5,
      status: "SUCCEEDED",
      passed: true,
      sessionId: "session_abc123",
      auditImages: ["s3://bucket/audit/image1.jpg"]
    },
    faceComparison: {
      similarity: 92.5,
      passed: true,
      sourceImageFace: { confidence: 99.9, boundingBox: {...} },
      targetImageFace: { confidence: 99.8, boundingBox: {...} }
    },
    overallScore: 94.0,
    passed: true,
    requiresManualReview: false,
    processedAt: "2026-01-15T10:00:00Z",
    processingTimeMs: 2341
  }
}
```

### Verification Case (META) — Biometric Summary

```typescript
{
  PK: "CASE#<verificationId>",
  SK: "META",
  status: "biometric_complete",  // or "biometric_failed"
  biometricSummary: {
    livenessScore: 98.5,
    similarityScore: 92.5,
    overallScore: 94.0,
    passed: true,
    requiresManualReview: false,
    processedAt: "2026-01-15T10:00:00Z"
  }
}
```

## Error Handling

### Retryable Errors

These errors trigger exponential backoff retry (max 3 attempts):

- `ProvisionedThroughputExceededException` — Rate limit exceeded
- `ThrottlingException` — AWS throttling
- `ServiceUnavailableException` — Temporary AWS issue
- `InternalServerError` — AWS internal error

### Non-Retryable Errors

These errors fail immediately and flag for manual review:

- `InvalidImageFormatException` — Bad image format
- `ImageTooLargeException` — Image exceeds size limit
- `InvalidParameterException` — Bad API parameters

## CloudWatch Metrics

| Metric | Description |
|--------|-------------|
| `BiometricProcessingCount` | Total biometric operations |
| `BiometricSuccess` | Successful processing count |
| `BiometricFailure` | Failed processing count |
| `BiometricProcessingTime` | Processing duration (ms) |
| `BiometricLivenessScore` | Liveness confidence (%) |
| `BiometricSimilarityScore` | Face similarity (%) |
| `BiometricOverallScore` | Weighted overall score (%) |
| `BiometricPassed` | Passed biometric check count |
| `BiometricFailed` | Failed biometric check count |
| `BiometricManualReviewRequired` | Flagged for review count |
| `RekognitionError` | Rekognition API errors |
| `FaceDetectionIssue` | Face detection problems |

## CloudWatch Alarms

| Alarm | Threshold | Description |
|-------|-----------|-------------|
| Pass Rate | < 70% | Biometric pass rate too low |
| Similarity Score | < 85% avg | Average similarity dropping |
| Processing Time | > 5s (p95) | Processing too slow |
| Manual Review Rate | > 40% | Too many manual reviews |
| Face Detection Issues | > 15% | Image quality problems |
| DLQ Messages | >= 1 | Failed messages in DLQ |

## Performance Requirements

- **Processing Time:** < 5 seconds (p95)
- **Lambda Timeout:** 60 seconds
- **Lambda Memory:** 1024MB
- **Concurrent Processing:** 5 TPS (Rekognition quota in af-south-1)
- **Success Rate:** > 85% (clear images with matching faces)

## Security & Compliance

- **PII Protection:** Biometric data encrypted at rest in DynamoDB
- **Logging:** Scores masked in logs (`similarity=**%`)
- **Audit Trail:** All operations logged with timestamps
- **Data Residency:** All processing in af-south-1 (Cape Town)
- **Retention:** 5 years per FIA requirements
