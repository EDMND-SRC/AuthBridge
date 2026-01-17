# Data Export & Deletion Workflow Design

## Overview

This document defines the workflow for handling data subject requests under the Data Protection Act 2024 (Botswana). AuthBridge must support:

1. **Data Export (Right of Access)** - Export all personal data for a data subject
2. **Data Deletion (Right to Erasure)** - Delete or anonymize personal data

## Compliance Requirements

| Requirement | SLA | Implementation |
|-------------|-----|----------------|
| Data Export | 5 minutes | Automated export to JSON/ZIP |
| Data Deletion | 24 hours | Soft delete + scheduled hard delete |
| Audit Trail | 5 years | Immutable audit logs retained |
| Breach Notification | 72 hours | Automated alerting system |

## Data Subject Request Types

### 1. Data Export Request (DSAR - Data Subject Access Request)

**Trigger:** API endpoint or Backoffice UI action

**Data Included:**
- Verification cases (all statuses)
- Uploaded documents (presigned URLs)
- OCR extracted data
- Biometric scores (not raw images)
- Audit logs related to the subject
- Webhook delivery logs

**Data Excluded:**
- Internal system logs
- Aggregated analytics
- Other users' data

### 2. Data Deletion Request

**Trigger:** API endpoint or Backoffice UI action

**Deletion Scope:**
- Personal data (name, email, phone, address)
- Document images (S3 objects)
- OCR extracted data
- Biometric data

**Retained (Anonymized):**
- Verification case metadata (anonymized)
- Audit logs (required for compliance)
- Aggregated statistics

---

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Data Subject Request Flow                     │
└─────────────────────────────────────────────────────────────────┘

┌──────────┐     ┌──────────────┐     ┌─────────────────┐
│  Client  │────▶│ API Gateway  │────▶│ Request Handler │
│  Portal  │     │              │     │                 │
└──────────┘     └──────────────┘     └────────┬────────┘
                                               │
                                               ▼
                                      ┌────────────────┐
                                      │ Validation &   │
                                      │ Authorization  │
                                      └────────┬───────┘
                                               │
                      ┌────────────────────────┼────────────────────────┐
                      │                        │                        │
                      ▼                        ▼                        ▼
              ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
              │ Export Worker │       │ Delete Worker │       │ Audit Logger  │
              │               │       │               │       │               │
              │ - Query Data  │       │ - Soft Delete │       │ - Log Request │
              │ - Generate    │       │ - Queue Hard  │       │ - Log Actions │
              │   Export      │       │   Delete      │       │ - Retain 5yr  │
              │ - Upload S3   │       │ - Anonymize   │       │               │
              └───────┬───────┘       └───────┬───────┘       └───────────────┘
                      │                       │
                      ▼                       ▼
              ┌───────────────┐       ┌───────────────┐
              │ Notification  │       │ Scheduled     │
              │ Service       │       │ Hard Delete   │
              │               │       │ (30 days)     │
              │ - Email Link  │       │               │
              │ - Webhook     │       │ - S3 Objects  │
              └───────────────┘       │ - DynamoDB    │
                                      └───────────────┘
```

---

## API Endpoints

### POST /api/v1/data-requests/export

Create a data export request.

**Request:**
```json
{
  "subjectIdentifier": {
    "type": "email" | "omangNumber" | "verificationId",
    "value": "john@example.com"
  },
  "format": "json" | "csv",
  "notificationEmail": "john@example.com"
}
```

**Response:**
```json
{
  "requestId": "dsr_abc123",
  "type": "export",
  "status": "processing",
  "estimatedCompletionTime": "2026-01-16T12:05:00Z",
  "meta": {
    "requestId": "req_xyz",
    "timestamp": "2026-01-16T12:00:00Z"
  }
}
```

### POST /api/v1/data-requests/delete

Create a data deletion request.

**Request:**
```json
{
  "subjectIdentifier": {
    "type": "email" | "omangNumber" | "verificationId",
    "value": "john@example.com"
  },
  "reason": "user_request" | "data_retention_expired" | "legal_requirement",
  "confirmDeletion": true
}
```

**Response:**
```json
{
  "requestId": "dsr_def456",
  "type": "deletion",
  "status": "pending_confirmation",
  "scheduledDeletionDate": "2026-02-15T12:00:00Z",
  "meta": {
    "requestId": "req_xyz",
    "timestamp": "2026-01-16T12:00:00Z"
  }
}
```

### GET /api/v1/data-requests/{requestId}

Check status of a data request.

**Response (Export Complete):**
```json
{
  "requestId": "dsr_abc123",
  "type": "export",
  "status": "completed",
  "downloadUrl": "https://s3.af-south-1.amazonaws.com/...",
  "downloadExpiresAt": "2026-01-16T13:00:00Z",
  "completedAt": "2026-01-16T12:02:00Z",
  "meta": {
    "requestId": "req_xyz",
    "timestamp": "2026-01-16T12:05:00Z"
  }
}
```

---

## DynamoDB Schema

### Data Request Entity

```
PK: DSR#{requestId}
SK: META
GSI1PK: SUBJECT#{subjectIdentifier}
GSI1SK: {createdAt}#{requestId}

Attributes:
- requestId: string
- type: "export" | "deletion"
- status: "pending" | "processing" | "completed" | "failed" | "cancelled"
- subjectIdentifier: { type, value }
- requestedBy: string (clientId or userId)
- reason: string (for deletion)
- exportUrl: string (for export, presigned URL)
- exportExpiresAt: string
- scheduledDeletionDate: string (for deletion)
- completedAt: string
- errorMessage: string (if failed)
- createdAt: string
- updatedAt: string
- ttl: number (auto-delete after 90 days)
```

### Deletion Queue Entity

```
PK: DELETION_QUEUE#{date}
SK: {scheduledTime}#{requestId}

Attributes:
- requestId: string
- subjectIdentifier: { type, value }
- itemsToDelete: [
    { type: "dynamodb", pk: "...", sk: "..." },
    { type: "s3", bucket: "...", key: "..." }
  ]
- status: "pending" | "processing" | "completed"
- createdAt: string
```

---

## Export Data Structure

### JSON Export Format

```json
{
  "exportMetadata": {
    "exportId": "dsr_abc123",
    "exportedAt": "2026-01-16T12:02:00Z",
    "subjectIdentifier": "john@example.com",
    "dataCategories": ["verifications", "documents", "auditLogs"]
  },
  "personalData": {
    "email": "john@example.com",
    "name": "John Doe",
    "phone": "+26771234567"
  },
  "verifications": [
    {
      "verificationId": "ver_abc123",
      "status": "approved",
      "documentType": "omang",
      "createdAt": "2026-01-15T10:00:00Z",
      "completedAt": "2026-01-15T10:05:00Z",
      "extractedData": {
        "fullName": "John Doe",
        "omangNumber": "123456789",
        "dateOfBirth": "1990-01-15"
      },
      "biometricScore": 92.5,
      "documents": [
        {
          "documentId": "doc_xyz",
          "documentType": "omang_front",
          "downloadUrl": "https://...",
          "uploadedAt": "2026-01-15T10:01:00Z"
        }
      ]
    }
  ],
  "auditLogs": [
    {
      "timestamp": "2026-01-15T10:00:00Z",
      "action": "verification.created",
      "details": { "verificationId": "ver_abc123" }
    }
  ]
}
```

---

## Deletion Process

### Phase 1: Soft Delete (Immediate)

1. Mark all verification cases as `status: deleted`
2. Remove PII from DynamoDB records (set to `[DELETED]`)
3. Revoke all presigned URLs
4. Log deletion request in audit trail

### Phase 2: Hard Delete (30 days later)

1. Delete S3 objects (document images)
2. Delete DynamoDB items (except audit logs)
3. Anonymize audit logs (replace PII with hashes)
4. Log hard deletion completion

### Anonymization Rules

| Field | Anonymization Method |
|-------|---------------------|
| Email | `[DELETED]` |
| Name | `[DELETED]` |
| Phone | `[DELETED]` |
| Omang Number | SHA-256 hash (for duplicate detection) |
| Address | `[DELETED]` |
| Document Images | Deleted from S3 |

---

## Implementation Checklist

### Lambda Functions

- [ ] `create-data-request.ts` - Handle export/deletion requests
- [ ] `process-export.ts` - Generate data export
- [ ] `process-deletion.ts` - Execute soft delete
- [ ] `scheduled-hard-delete.ts` - Execute hard delete (EventBridge scheduled)
- [ ] `get-data-request-status.ts` - Check request status

### DynamoDB Updates

- [ ] Add `deletedAt` field to verification case schema
- [ ] Add `anonymizedAt` field for audit compliance
- [ ] Create GSI for subject identifier queries

### S3 Configuration

- [ ] Configure lifecycle policy for deleted objects
- [ ] Enable versioning for audit trail
- [ ] Configure CORS for export downloads

### Monitoring

- [ ] CloudWatch alarm for failed requests
- [ ] Dashboard for request volume and SLA compliance
- [ ] SNS alerts for deletion queue backlog

---

## Security Considerations

1. **Authentication Required** - All data requests require valid API key or JWT
2. **Authorization Check** - Verify requester has access to subject's data
3. **Rate Limiting** - Max 10 requests per hour per client
4. **Audit Logging** - All requests logged with requester identity
5. **Encryption** - Export files encrypted with KMS key
6. **Expiring URLs** - Export download URLs expire in 1 hour
7. **MFA for Deletion** - Production deletion requires MFA confirmation

---

## Compliance Mapping

| Data Protection Act 2024 | AuthBridge Implementation |
|--------------------------|---------------------------|
| Right of Access (Section 12) | Data Export API |
| Right to Erasure (Section 14) | Data Deletion API |
| Data Portability (Section 13) | JSON/CSV export formats |
| Audit Trail (Section 25) | Immutable audit logs |
| Breach Notification (Section 30) | 72-hour alerting system |
| Data Retention (Section 22) | 5-year audit log retention |

---

## Timeline

| Phase | Deliverable | Target |
|-------|-------------|--------|
| Phase 1 | API endpoints + soft delete | Epic 5 Story 5.3 |
| Phase 2 | Hard delete scheduler | Epic 5 Story 5.3 |
| Phase 3 | Backoffice UI | Epic 6 |
| Phase 4 | Customer portal self-service | Phase 2 |

---

_Document Version: 1.0_
_Last Updated: 2026-01-16_
_Author: Winston (Architect)_
