# Data Retention Policies

**Document Version:** 1.0
**Created:** 2026-01-18
**Owner:** Alice (Product Owner)
**Purpose:** Define retention periods for all data types in AuthBridge

---

## Overview

This document defines data retention policies for AuthBridge to ensure compliance with:
- **Data Protection Act 2024 (Botswana)** - Data minimization and retention limits
- **FIA AML/KYC Requirements** - 5-year retention for financial records
- **GDPR-like Rights** - Right to erasure and data portability

---

## Retention Policy Summary

| Data Type | Retention Period | Storage Location | Deletion Method | Compliance Requirement |
|-----------|------------------|------------------|-----------------|------------------------|
| Verification Cases | 5 years | DynamoDB | Soft delete → Hard delete (30 days) | FIA AML/KYC |
| Document Images | 5 years | S3 | Soft delete → Hard delete (30 days) | FIA AML/KYC |
| OCR Extracted Data | 5 years | DynamoDB | Soft delete → Hard delete (30 days) | FIA AML/KYC |
| Biometric Data | 5 years | DynamoDB | Soft delete → Hard delete (30 days) | FIA AML/KYC |
| Audit Logs | 5 years | DynamoDB + CloudWatch | Immutable, never deleted | FIA AML/KYC |
| User Accounts | Until deleted | DynamoDB | Immediate hard delete | DPA 2024 |
| API Keys | Until revoked | DynamoDB | Immediate hard delete | DPA 2024 |
| Webhook Logs | 90 days | DynamoDB | TTL-based deletion | Operational |
| Session Tokens | 30 minutes | DynamoDB | TTL-based deletion | Security |
| Data Export Files | 7 days | S3 | Lifecycle policy | DPA 2024 |
| Data Deletion Requests | 90 days | DynamoDB | TTL-based deletion | DPA 2024 |

---

## Detailed Retention Policies

### 1. Verification Cases

**Retention Period:** 5 years from case creation
**Storage:** DynamoDB (`CASE#{verificationId}`)
**Deletion Method:** Two-phase deletion

**Phase 1: Soft Delete (Immediate)**
- Status changed to `deleted`
- PII fields replaced with `[DELETED]`
- `deletedAt` timestamp added
- Case remains queryable for audit purposes

**Phase 2: Hard Delete (30 days after soft delete)**
- DynamoDB item permanently deleted
- S3 documents permanently deleted
- Audit logs anonymized (PII hashed)

**Compliance:** FIA AML/KYC requires 5-year retention for identity verification records.

**Implementation:**
```typescript
// Soft delete
await dynamodb.updateItem({
  Key: { PK: `CASE#${verificationId}`, SK: 'META' },
  UpdateExpression: 'SET #status = :deleted, deletedAt = :now, omangNumber = :redacted',
  ExpressionAttributeValues: {
    ':deleted': 'deleted',
    ':now': new Date().toISOString(),
    ':redacted': '[DELETED]'
  }
});

// Hard delete (scheduled job)
await dynamodb.deleteItem({
  Key: { PK: `CASE#${verificationId}`, SK: 'META' }
});
```

---

### 2. Document Images

**Retention Period:** 5 years from upload
**Storage:** S3 (`authbridge-documents-{stage}`)
**Deletion Method:** S3 object deletion

**Soft Delete:**
- S3 object tagged with `deleted=true`
- Presigned URLs revoked
- Object remains in S3 for 30 days

**Hard Delete:**
- S3 object permanently deleted
- All versions deleted (if versioning enabled)

**Compliance:** FIA AML/KYC requires retention of identity documents.

**Implementation:**
```typescript
// Soft delete (tag object)
await s3.putObjectTagging({
  Bucket: 'authbridge-documents-staging',
  Key: `client1/ver_123/omang-front.jpg`,
  Tagging: { TagSet: [{ Key: 'deleted', Value: 'true' }] }
});

// Hard delete
await s3.deleteObject({
  Bucket: 'authbridge-documents-staging',
  Key: `client1/ver_123/omang-front.jpg`
});
```

---

### 3. Audit Logs

**Retention Period:** 5 years (immutable)
**Storage:** DynamoDB + CloudWatch Logs
**Deletion Method:** Never deleted, only anonymized

**Anonymization (after data deletion request):**
- PII fields hashed with SHA-256
- Omang numbers: `***1234` → `SHA256(omangNumber)`
- Names: `John Doe` → `SHA256(name)`
- Audit structure preserved for compliance

**Compliance:** FIA AML/KYC requires 5-year audit trail.

**Implementation:**
```typescript
// Anonymize audit logs
await dynamodb.updateItem({
  Key: { PK: `AUDIT#${date}`, SK: `${timestamp}#${eventId}` },
  UpdateExpression: 'SET metadata.omangNumber = :hash, anonymizedAt = :now',
  ExpressionAttributeValues: {
    ':hash': crypto.createHash('sha256').update(omangNumber).digest('hex'),
    ':now': new Date().toISOString()
  }
});
```

---

### 4. User Accounts

**Retention Period:** Until user deletion request
**Storage:** DynamoDB (`USER#{userId}`)
**Deletion Method:** Immediate hard delete

**Deletion Process:**
1. User requests account deletion
2. All associated data deleted (cases, documents)
3. User account permanently deleted
4. Audit logs anonymized

**Compliance:** DPA 2024 right to erasure.

---

### 5. API Keys

**Retention Period:** Until revoked
**Storage:** DynamoDB (`APIKEY#{keyId}`)
**Deletion Method:** Immediate hard delete

**Revocation Process:**
1. API key marked as `revoked`
2. Key hash removed from DynamoDB
3. Audit log entry created
4. Key cannot be used for authentication

---

### 6. Session Tokens

**Retention Period:** 30 minutes
**Storage:** DynamoDB (`SESSION#{sessionId}`)
**Deletion Method:** TTL-based automatic deletion

**Implementation:**
```typescript
// Create session with TTL
await dynamodb.putItem({
  Item: {
    PK: `SESSION#${sessionId}`,
    SK: 'META',
    ttl: Math.floor(Date.now() / 1000) + (30 * 60) // 30 minutes
  }
});
```

---

### 7. Data Export Files

**Retention Period:** 7 days
**Storage:** S3 (`authbridge-data-exports-{stage}`)
**Deletion Method:** S3 lifecycle policy

**Implementation:**
```yaml
# S3 Lifecycle Policy
LifecycleConfiguration:
  Rules:
    - Id: DeleteExportsAfter7Days
      Status: Enabled
      ExpirationInDays: 7
```

---

## Compliance Matrix

| Requirement | Policy | Evidence |
|-------------|--------|----------|
| **FIA AML/KYC** | 5-year retention | Verification cases, documents, audit logs retained for 5 years |
| **DPA 2024 Data Minimization** | Delete after purpose fulfilled | Soft delete → Hard delete (30 days) |
| **DPA 2024 Right to Erasure** | Delete on request | Data deletion API with 24-hour SLA |
| **DPA 2024 Right to Portability** | Export on request | Data export API with 5-minute SLA |
| **GDPR-like Audit Trail** | Immutable logs | Audit logs retained 5 years, never deleted |

---

## Automated Retention Enforcement

### DynamoDB TTL

**Enabled for:**
- Session tokens (30 minutes)
- Webhook logs (90 days)
- Data deletion requests (90 days)

**Configuration:**
```bash
aws dynamodb update-time-to-live \
  --table-name AuthBridgeTable \
  --time-to-live-specification "Enabled=true, AttributeName=ttl" \
  --region af-south-1
```

### S3 Lifecycle Policies

**Enabled for:**
- Data export files (7 days)

**Configuration:**
```yaml
# services/verification/serverless.yml
DataExportBucket:
  Type: AWS::S3::Bucket
  Properties:
    LifecycleConfiguration:
      Rules:
        - Id: DeleteExportsAfter7Days
          Status: Enabled
          ExpirationInDays: 7
```

### Scheduled Hard Deletion

**EventBridge Rule:** Daily at 2 AM UTC

**Function:** `scheduledHardDelete`

**Process:**
1. Query deletion queue for items older than 30 days
2. Delete S3 objects
3. Delete DynamoDB items
4. Anonymize audit logs
5. Log completion

**Configuration:**
```yaml
# services/verification/serverless.yml
scheduledHardDelete:
  handler: src/handlers/scheduled-hard-delete.scheduledHardDelete
  timeout: 900  # 15 minutes
  events:
    - schedule:
        rate: cron(0 2 * * ? *)  # Daily at 2 AM UTC
        enabled: true
```

---

## Monitoring & Reporting

### CloudWatch Metrics

**Metrics to track:**
- `DataRetention/CasesDeleted` - Cases deleted per day
- `DataRetention/DocumentsDeleted` - Documents deleted per day
- `DataRetention/AuditLogsAnonymized` - Audit logs anonymized per day
- `DataRetention/HardDeleteDuration` - Time to complete hard deletion

### Compliance Reports

**Monthly Report:**
- Total cases retained
- Cases deleted (soft + hard)
- Audit logs anonymized
- Data export requests fulfilled
- Data deletion requests fulfilled

**Annual Report:**
- Total data volume by type
- Retention policy compliance rate
- Data deletion SLA compliance
- Audit log integrity verification

---

## References

- [Data Protection Act 2024 (Botswana)](https://www.gov.bw/)
- [FIA AML/KYC Requirements](https://www.fia.org.bw/)
- [Story 5.3: Data Export & Deletion](_bmad-output/implementation-artifacts/5-3-data-export-deletion.md)
- [Data Export & Deletion Workflow](data-export-deletion-workflow.md)

---

_Last Updated: 2026-01-18_
_Next Review: Annually or after regulatory changes_
