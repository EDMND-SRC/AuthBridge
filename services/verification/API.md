# Verification Service API Documentation

## Base URL

- **Staging:** `https://api-staging.authbridge.io`
- **Production:** `https://api.authbridge.io`

## Authentication

All endpoints require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

The token must include a `clientId` claim.

## Endpoints

### POST /api/v1/verifications

Create a new verification case.

**Request:**

```json
{
  "documentType": "omang",
  "customerMetadata": {
    "email": "customer@example.com",
    "phone": "+26771234567",
    "externalId": "cust_123",
    "redirectUrl": "https://client.com/verification-complete"
  },
  "idempotencyKey": "req_abc123"
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `documentType` | string | Yes | One of: `omang`, `passport`, `drivers_license`, `id_card` |
| `customerMetadata.email` | string | No | Valid email address |
| `customerMetadata.phone` | string | No | E.164 format (e.g., `+26771234567`) |
| `customerMetadata.externalId` | string | No | Client's customer ID (max 255 chars) |
| `customerMetadata.redirectUrl` | string | No | HTTPS URL for redirect after completion |
| `idempotencyKey` | string | No | Unique key for request deduplication (max 255 chars) |

**Response (201 Created):**

```json
{
  "verificationId": "ver_abc123def456",
  "status": "created",
  "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "sdkUrl": "https://sdk.authbridge.io?token=eyJhbGci...",
  "expiresAt": "2026-01-14T11:30:00Z",
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-14T11:00:00Z"
  }
}
```

**Error Responses:**

- **400 Bad Request:** Invalid request parameters
- **401 Unauthorized:** Missing or invalid authentication
- **429 Too Many Requests:** Rate limit exceeded
- **500 Internal Server Error:** Server error

**Example Error Response:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid document type",
    "details": [
      {
        "field": "documentType",
        "message": "Must be one of: omang, passport, drivers_license, id_card"
      }
    ]
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-14T11:00:00Z"
  }
}
```

### GET /api/v1/verifications/{verificationId}

Get verification case by ID.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `verificationId` | string | Verification ID (e.g., `ver_abc123def456`) |

**Response (200 OK):**

```json
{
  "verificationId": "ver_abc123def456",
  "status": "created",
  "documentType": "omang",
  "customerMetadata": {
    "email": "customer@example.com",
    "phone": "+26771234567",
    "externalId": "cust_123",
    "redirectUrl": "https://client.com/verification-complete"
  },
  "createdAt": "2026-01-14T11:00:00Z",
  "updatedAt": "2026-01-14T11:00:00Z",
  "expiresAt": "2026-02-13T11:00:00Z",
  "meta": {
    "requestId": "req_xyz789",
    "timestamp": "2026-01-14T11:05:00Z"
  }
}
```

**Error Responses:**

- **401 Unauthorized:** Missing or invalid authentication
- **403 Forbidden:** Client does not own this verification
- **404 Not Found:** Verification not found
- **500 Internal Server Error:** Server error

## Rate Limits

- **Per client:** 100 verifications/minute
- **Per API key:** Configurable (default 100 req/min)
- **Global:** 10,000 req/sec (API Gateway burst limit)

When rate limit is exceeded, the API returns:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 60
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-14T11:00:00Z"
  }
}
```

## Idempotency

To prevent duplicate verification creation, include an `idempotencyKey` in the request. If a request with the same idempotency key is received within 24 hours, the API returns the existing verification instead of creating a new one.

**Example:**

```bash
curl -X POST https://api.authbridge.io/api/v1/verifications \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "omang",
    "customerMetadata": {},
    "idempotencyKey": "unique_request_123"
  }'
```

## Verification Status Lifecycle

```
created → documents_uploading → documents_complete → submitted → processing
  → pending_review → in_review → approved/rejected/resubmission_required
```

## Data Retention

- Verification cases expire after 30 days
- DynamoDB TTL automatically deletes expired records
- Audit logs retained for 5 years (FIA compliance)

## Security

- All endpoints require HTTPS
- PII is encrypted at rest (AWS KMS)
- Audit logs created for all operations
- Rate limiting enforced per client
- CORS enabled for authorized origins
