# DynamoDB Schema Design

## Table: AuthBridgeTable

**Region:** af-south-1 (Cape Town)
**Billing Mode:** On-demand
**Encryption:** At-rest with AWS KMS (aws/dynamodb key)
**Point-in-time Recovery:** Enabled (35-day retention)
**TTL Attribute:** `ttl` (Unix timestamp)

## Single-Table Design Pattern

This service uses a single-table design with entity prefixes to store multiple entity types in one table.

### Entity Prefixes

| Entity Type | PK Pattern | SK Pattern |
|-------------|------------|------------|
| Verification Case | `CASE#<verificationId>` | `META` |
| Document | `CASE#<verificationId>` | `DOC#<documentId>` |
| Session (from auth service) | `SESSION#<sessionId>` | `META` |
| API Key (from auth service) | `APIKEY#<keyId>` | `META` |
| Audit Log (from auth service) | `AUDIT#<date>` | `<timestamp>#<eventId>` |

## Verification Entity Schema

### Primary Key Structure

```
PK: CASE#<verificationId>
SK: META
```

### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `PK` | String | Primary key: `CASE#<verificationId>` |
| `SK` | String | Sort key: `META` |
| `verificationId` | String | Unique verification ID (UUID v4 with `ver_` prefix) |
| `clientId` | String | Client who created the verification |
| `status` | String | Verification status (see lifecycle below) |
| `documentType` | String | Document type: `omang`, `passport`, `drivers_license`, `id_card` |
| `customerMetadata` | Map | Customer information (email, phone, externalId, redirectUrl) |
| `createdAt` | String | ISO 8601 timestamp |
| `updatedAt` | String | ISO 8601 timestamp |
| `submittedAt` | String | ISO 8601 timestamp (optional) |
| `completedAt` | String | ISO 8601 timestamp (optional) |
| `expiresAt` | String | ISO 8601 timestamp (30 days from creation) |
| `ttl` | Number | Unix timestamp for DynamoDB TTL cleanup |
| `GSI1PK` | String | GSI1 partition key: `CLIENT#<clientId>` |
| `GSI1SK` | String | GSI1 sort key: `<status>#<createdAt>` |
| `GSI2PK` | String | GSI2 partition key: `DATE#<YYYY-MM-DD>` |
| `GSI2SK` | String | GSI2 sort key: `<createdAt>#<verificationId>` |

### Example Item

```json
{
  "PK": "CASE#ver_abc123def456",
  "SK": "META",
  "verificationId": "ver_abc123def456",
  "clientId": "client_xyz789",
  "status": "created",
  "documentType": "omang",
  "customerMetadata": {
    "email": "customer@example.com",
    "phone": "+26771234567",
    "externalId": "cust_123",
    "redirectUrl": "https://client.com/callback"
  },
  "createdAt": "2026-01-14T10:00:00Z",
  "updatedAt": "2026-01-14T10:00:00Z",
  "expiresAt": "2026-02-13T10:00:00Z",
  "ttl": 1739448000,
  "GSI1PK": "CLIENT#client_xyz789",
  "GSI1SK": "created#2026-01-14T10:00:00Z",
  "GSI2PK": "DATE#2026-01-14",
  "GSI2SK": "2026-01-14T10:00:00Z#ver_abc123def456"
}
```

## Document Entity Schema

### Primary Key Structure

```
PK: CASE#<verificationId>
SK: DOC#<documentId>
```

### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `PK` | String | Primary key: `CASE#<verificationId>` |
| `SK` | String | Sort key: `DOC#<documentId>` |
| `documentId` | String | Unique document ID (UUID v4 with `doc_` prefix) |
| `verificationId` | String | Parent verification ID |
| `documentType` | String | Document type: `omang_front`, `omang_back`, `selfie`, etc. |
| `s3Key` | String | S3 object key |
| `s3Bucket` | String | S3 bucket name |
| `fileSize` | Number | File size in bytes |
| `mimeType` | String | MIME type (e.g., `image/jpeg`) |
| `uploadedAt` | String | ISO 8601 timestamp |
| `status` | String | Document status: `uploaded`, `processing`, `processed`, `failed` |
| `processingResults` | Map | OCR data, biometric scores, quality checks (optional) |

## Global Secondary Indexes

### GSI1: Query by Client ID + Status

**Purpose:** Get all verifications for a client, optionally filtered by status

**Key Schema:**
```
GSI1PK: CLIENT#<clientId>
GSI1SK: <status>#<createdAt>
```

**Projection:** ALL

**Example Query:**
```typescript
// Get all verifications for client_xyz789 with status "pending_review"
const params = {
  TableName: 'AuthBridgeTable',
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :status)',
  ExpressionAttributeValues: {
    ':pk': 'CLIENT#client_xyz789',
    ':status': 'pending_review'
  }
};
```

### GSI2: Query by Creation Date

**Purpose:** Get all verifications created on a specific date

**Key Schema:**
```
GSI2PK: DATE#<YYYY-MM-DD>
GSI2SK: <createdAt>#<verificationId>
```

**Projection:** ALL

**Example Query:**
```typescript
// Get all verifications created on 2026-01-14
const params = {
  TableName: 'AuthBridgeTable',
  IndexName: 'GSI2',
  KeyConditionExpression: 'GSI2PK = :pk',
  ExpressionAttributeValues: {
    ':pk': 'DATE#2026-01-14'
  }
};
```

### GSI3: Query by User (from auth service)

**Purpose:** Audit logs by user

**Key Schema:**
```
GSI3PK: USER#<userId>
GSI3SK: <timestamp>#<eventId>
```

## Verification Status Lifecycle

```
created → documents_uploading → documents_complete → submitted → processing
  → pending_review → in_review → approved/rejected/auto_rejected/resubmission_required/expired
```

## Access Patterns

| Pattern | Method | Description |
|---------|--------|-------------|
| Get verification by ID | `GetItem` | PK=`CASE#<id>`, SK=`META` |
| Get all documents for verification | `Query` | PK=`CASE#<id>`, SK begins_with `DOC#` |
| Get verifications by client + status | `Query GSI1` | GSI1PK=`CLIENT#<id>`, GSI1SK begins_with `<status>` |
| Get verifications by date | `Query GSI2` | GSI2PK=`DATE#<YYYY-MM-DD>` |
| Create verification | `PutItem` | Conditional: `attribute_not_exists(PK)` |
| Update verification status | `UpdateItem` | Update `status` and `updatedAt` |

## Data Protection (DPA 2024 Compliance)

- **Encryption at rest:** AWS KMS with `aws/dynamodb` key
- **Encryption in transit:** TLS 1.2+
- **PII fields:** `customerMetadata.email`, `customerMetadata.phone` (encrypted at attribute level)
- **Data residency:** af-south-1 (Cape Town) region only
- **TTL cleanup:** Automatic deletion after 30 days
- **Audit logs:** All operations logged with 5-year retention

## Performance Characteristics

- **Write latency:** < 10ms (p99)
- **Read latency:** < 5ms (p99)
- **GSI query latency:** < 20ms (p99)
- **On-demand scaling:** Automatic, no capacity planning
- **Burst capacity:** Up to 40,000 RCU/WCU per table

## Cost Optimization

- **On-demand billing:** Pay per request (no idle capacity costs)
- **TTL cleanup:** Automatic deletion reduces storage costs
- **Single-table design:** Reduces table count and management overhead
- **Projection type ALL:** Simplifies queries but increases storage (acceptable trade-off)
