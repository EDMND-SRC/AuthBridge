# AWS Service Quotas - af-south-1 (Cape Town)

**Owner:** Winston (Architect)
**Last Updated:** 2026-01-15
**Region:** af-south-1 (Cape Town, South Africa)

---

## Overview

This document lists all AWS service quotas relevant to AuthBridge in the af-south-1 region. The Cape Town region falls under "Other Regions" with significantly lower default quotas than US regions.

**⚠️ IMPORTANT:** Always check quotas before implementing new AWS service integrations. Request quota increases via AWS Support for production workloads.

---

## AWS Textract (OCR)

**Used by:** Story 2.1 - Omang OCR Extraction

| API | Default Quota (af-south-1) | US Regions | Notes |
|-----|---------------------------|------------|-------|
| DetectDocumentText (sync) | **1 TPS** | 25 TPS | Main API for Omang OCR |
| StartDocumentTextDetection (async) | **1 TPS** | 25 TPS | For multi-page docs |
| GetDocumentTextDetection | **5 TPS** | 25 TPS | Polling async results |
| Max concurrent async jobs | **100** | 100 | Same across regions |

**Impact on Production:**
- 1 TPS = 60 documents/minute = 3,600 documents/hour
- For high-volume periods, request quota increase via AWS Support
- SQS queue pattern naturally throttles requests

**Mitigation Strategies:**
1. Use SQS with batch size 1 and reserved concurrency 1
2. Request quota increase for production workloads
3. Cache OCR results to avoid re-processing
4. Implement exponential backoff for throttling

**Pricing:** $1.50 per 1,000 pages (text extraction)

---

## AWS Rekognition (Biometrics)

**Used by:** Story 2.3 - Biometric Face Matching

| API | Default Quota (af-south-1) | US Regions | Notes |
|-----|---------------------------|------------|-------|
| DetectFaceLiveness | **5 TPS** | 25 TPS | Liveness detection |
| CompareFaces | **5 TPS** | 50 TPS | Face comparison |
| DetectFaces | **5 TPS** | 50 TPS | Face detection |

**Impact on Production:**
- 5 TPS = 300 verifications/minute = 18,000 verifications/hour
- Sufficient for MVP (10K verifications/month = ~14/hour average)
- For high-volume periods, request quota increase

**Mitigation Strategies:**
1. Use SQS with reserved concurrency 5
2. Request quota increase for production workloads
3. Cache biometric results
4. Implement exponential backoff for throttling

**Pricing:**
- Face Liveness: $0.04 per check
- Face Comparison: $0.001 per image pair
- Total per verification: ~$0.041 (~P0.62)

---

## AWS Lambda

**Used by:** All backend services

| Quota | Default (af-south-1) | Notes |
|-------|---------------------|-------|
| Concurrent executions | **1,000** | Per account |
| Function timeout | **15 minutes** | Max |
| Memory | **10,240 MB** | Max |
| Deployment package size | **50 MB** (zipped) | Direct upload |
| Deployment package size | **250 MB** (unzipped) | Including layers |

**Current Configuration:**
- Auth service: 512 MB, 30s timeout
- Verification service: 512-1024 MB, 30-60s timeout
- Reserved concurrency: 1 (OCR), 5 (biometrics)

---

## API Gateway

**Used by:** All REST APIs

| Quota | Default (af-south-1) | Notes |
|-------|---------------------|-------|
| Requests per second | **10,000** | Per account |
| Payload size | **10 MB** | Request/response |
| Timeout | **29 seconds** | Integration timeout |
| WebSocket connections | **500** | Concurrent |

**Current Configuration:**
- Rate limiting: 50 requests/second per client
- Burst: 100 requests
- Timeout: 29 seconds (Lambda integration)

---

## DynamoDB

**Used by:** All data storage

| Quota | Default (af-south-1) | Notes |
|-------|---------------------|-------|
| Read capacity units | **40,000** | Per table |
| Write capacity units | **40,000** | Per table |
| Item size | **400 KB** | Max |
| GSI per table | **20** | Max |
| LSI per table | **5** | Max |

**Current Configuration:**
- Billing mode: On-demand (pay-per-request)
- GSIs: 2 (GSI1 for client queries, GSI2 for Omang hash lookups)
- Point-in-time recovery: Enabled
- Encryption: AWS managed keys

---

## S3

**Used by:** Document storage

| Quota | Default (af-south-1) | Notes |
|-------|---------------------|-------|
| Bucket count | **100** | Per account |
| Object size | **5 TB** | Max |
| PUT/COPY/POST/DELETE | **3,500** | Requests/second/prefix |
| GET/HEAD | **5,500** | Requests/second/prefix |

**Current Configuration:**
- Bucket: authbridge-documents-{stage}
- Encryption: SSE-S3
- Versioning: Enabled
- Lifecycle: 5-year retention

---

## Cognito

**Used by:** User authentication (Epic 3+)

| Quota | Default (af-south-1) | Notes |
|-------|---------------------|-------|
| User pools | **60** | Per account |
| Users per pool | **40,000,000** | Max |
| App clients per pool | **200** | Max |
| API requests | **120** | Per second |

**Current Configuration:**
- User pool: authbridge-users-{stage}
- Auth flow: Passwordless (email OTP, passkeys)
- MFA: Optional (TOTP)

---

## SQS

**Used by:** Async processing (OCR, biometrics)

| Quota | Default (af-south-1) | Notes |
|-------|---------------------|-------|
| Queues | **Unlimited** | Per account |
| Message size | **256 KB** | Max |
| Message retention | **14 days** | Max |
| Visibility timeout | **12 hours** | Max |
| In-flight messages | **120,000** | Standard queue |

**Current Configuration:**
- OCR Queue: batch size 1, visibility 60s, DLQ after 3 retries
- Biometric Queue: batch size 1, visibility 120s, DLQ after 3 retries

---

## CloudWatch

**Used by:** Monitoring and alerting

| Quota | Default (af-south-1) | Notes |
|-------|---------------------|-------|
| Metrics | **Unlimited** | Custom metrics |
| Alarms | **5,000** | Per account |
| Dashboards | **500** | Per account |
| Log groups | **1,000,000** | Per account |

**Current Configuration:**
- Custom metrics: OCR, Biometric, Duplicate Detection
- Alarms: 6 (OCR failures, biometric failures, duplicate rates)
- Dashboards: 2 (Verification, Duplicate Detection)

---

## KMS

**Used by:** Encryption

| Quota | Default (af-south-1) | Notes |
|-------|---------------------|-------|
| Keys | **100,000** | Per account |
| Requests | **30,000** | Per second |
| Aliases | **50,000** | Per account |

**Current Configuration:**
- Key: authbridge-encryption-key-{stage}
- Usage: Omang number encryption, document encryption

---

## Quota Increase Requests

### How to Request

1. Go to AWS Service Quotas console
2. Select the service (e.g., Textract)
3. Find the quota to increase
4. Click "Request quota increase"
5. Provide business justification

### Recommended Increases for Production

| Service | Quota | Current | Requested | Justification |
|---------|-------|---------|-----------|---------------|
| Textract | DetectDocumentText TPS | 1 | 10 | Production OCR volume |
| Rekognition | CompareFaces TPS | 5 | 25 | Production biometric volume |
| Lambda | Concurrent executions | 1,000 | 3,000 | Peak traffic handling |

---

## Monitoring Quotas

### CloudWatch Alarms

Set up alarms for quota usage:

```yaml
# serverless.yml
resources:
  Resources:
    TextractQuotaAlarm:
      Type: AWS::CloudWatch::Alarm
      Properties:
        AlarmName: textract-quota-usage
        MetricName: ThrottledRequests
        Namespace: AWS/Textract
        Statistic: Sum
        Period: 300
        EvaluationPeriods: 1
        Threshold: 10
        ComparisonOperator: GreaterThanThreshold
```

### Service Quotas Dashboard

Monitor quota usage in AWS Console:
- Service Quotas → Dashboard → Usage
- Set up CloudWatch alarms for approaching limits

---

## References

- [AWS Service Quotas Documentation](https://docs.aws.amazon.com/servicequotas/latest/userguide/intro.html)
- [Textract Quotas](https://docs.aws.amazon.com/textract/latest/dg/limits.html)
- [Rekognition Quotas](https://docs.aws.amazon.com/rekognition/latest/dg/limits.html)
- [Lambda Quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html)
- [DynamoDB Quotas](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html)

