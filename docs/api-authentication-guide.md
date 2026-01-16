# API Authentication Guide

## Overview

AuthBridge provides secure API authentication using API keys for server-to-server integration. This guide covers how to create, manage, and use API keys to authenticate your requests.

## Authentication Methods

### API Key Authentication (Recommended)

API keys are the recommended method for server-to-server integration. They provide:
- Long-lived credentials (no expiration by default)
- Configurable rate limits per key
- Granular scope control
- Easy rotation without downtime

### JWT Token Authentication

JWT tokens are used by the Backoffice UI and expire after 24 hours. They are not recommended for server-to-server integration.

## API Key Format

AuthBridge API keys follow this format:

```
ab_{environment}_{random}
```

- **Prefix**: `ab_` (AuthBridge)
- **Environment**: `live` (production) or `test` (sandbox)
- **Random**: 32 hexadecimal characters (128-bit entropy)

**Examples:**
```
ab_live_1234567890abcdef1234567890abcdef
ab_test_9876543210fedcba9876543210fedcba
```

## Creating API Keys

### Via Backoffice Dashboard

1. Log in to the Backoffice at `https://app.authbridge.io`
2. Navigate to **Settings** → **API Keys**
3. Click **Create API Key**
4. Configure:
   - **Name**: Descriptive name (e.g., "Production Server")
   - **Scopes**: `read`, `write`, or both
   - **Rate Limit**: Requests per minute (default: 100)
   - **Expiration**: Optional expiry date
5. Click **Create**
6. **IMPORTANT**: Copy the API key immediately - it will only be shown once!

### Via API

**Endpoint:** `POST /api/v1/api-keys`

**Authentication:** Requires JWT token (Backoffice login)

**Request:**
```json
{
  "clientId": "client-123",
  "name": "Production Server",
  "scopes": ["read", "write"],
  "rateLimit": 100,
  "expiresInDays": 365
}
```

**Response:**
```json
{
  "keyId": "key-abc123",
  "apiKey": "ab_live_1234567890abcdef1234567890abcdef",
  "name": "Production Server",
  "scopes": ["read", "write"],
  "rateLimit": 100,
  "expiresAt": "2027-01-16T00:00:00Z",
  "createdAt": "2026-01-16T00:00:00Z",
  "warning": "Store this API key securely. It cannot be retrieved again.",
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-16T10:00:00Z"
  }
}
```

## Using API Keys

Include your API key in the `Authorization` header of every request:

```bash
curl https://api.authbridge.io/api/v1/verifications \
  -H "Authorization: Bearer ab_live_1234567890abcdef1234567890abcdef" \
  -H "Content-Type: application/json" \
  -d '{
    "endUserId": "user-123",
    "documentType": "omang",
    "country": "BW"
  }'
```

### Code Examples

**Node.js:**
```javascript
const response = await fetch('https://api.authbridge.io/api/v1/verifications', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.AUTHBRIDGE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    endUserId: 'user-123',
    documentType: 'omang',
    country: 'BW',
  }),
});

const data = await response.json();
```

**Python:**
```python
import os
import requests

response = requests.post(
    'https://api.authbridge.io/api/v1/verifications',
    headers={
        'Authorization': f'Bearer {os.environ["AUTHBRIDGE_API_KEY"]}',
        'Content-Type': 'application/json',
    },
    json={
        'endUserId': 'user-123',
        'documentType': 'omang',
        'country': 'BW',
    }
)

data = response.json()
```

**PHP:**
```php
<?php
$apiKey = getenv('AUTHBRIDGE_API_KEY');

$ch = curl_init('https://api.authbridge.io/api/v1/verifications');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $apiKey,
    'Content-Type: application/json',
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'endUserId' => 'user-123',
    'documentType' => 'omang',
    'country' => 'BW',
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$data = json_decode($response, true);
curl_close($ch);
?>
```

## Managing API Keys

### List API Keys

**Endpoint:** `GET /api/v1/api-keys`

**Response:**
```json
{
  "keys": [
    {
      "keyId": "key-abc123",
      "name": "Production Server",
      "createdAt": "2026-01-01T00:00:00Z",
      "expiresAt": null,
      "lastUsed": "2026-01-16T10:00:00Z",
      "status": "active",
      "scopes": ["read", "write"],
      "rateLimit": 100
    }
  ],
  "meta": {
    "requestId": "req_xyz789",
    "timestamp": "2026-01-16T10:00:00Z"
  }
}
```

### Revoke API Key

**Endpoint:** `DELETE /api/v1/api-keys/{keyId}`

**Response:**
```json
{
  "message": "API key revoked successfully",
  "keyId": "key-abc123",
  "meta": {
    "requestId": "req_xyz789",
    "timestamp": "2026-01-16T10:00:00Z"
  }
}
```

### Rotate API Key

**Endpoint:** `POST /api/v1/api-keys/{keyId}/rotate`

**Response:**
```json
{
  "keyId": "key-def456",
  "apiKey": "ab_live_newkey567890abcdef567890abcdef",
  "name": "Production Server",
  "scopes": ["read", "write"],
  "rateLimit": 100,
  "expiresAt": null,
  "createdAt": "2026-01-16T10:00:00Z",
  "warning": "Store this API key securely. It cannot be retrieved again.",
  "meta": {
    "requestId": "req_xyz789",
    "timestamp": "2026-01-16T10:00:00Z"
  }
}
```

**Note:** The old key is immediately revoked when rotation completes.

## Rate Limiting

### Default Limits

- **50 requests/second** per API key (API Gateway throttling)
- **100 requests/minute** per API key (application-level)
- **1000 requests/minute** per IP address (DDoS protection)

### Rate Limit Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705401600
```

### Rate Limit Exceeded

When you exceed the rate limit, you'll receive a `429 Too Many Requests` response:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "API key rate limit exceeded. Try again in 45 seconds."
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-16T10:00:00Z"
  }
}
```

**Response Headers:**
```
HTTP/1.1 429 Too Many Requests
Retry-After: 45
X-RateLimit-Reset: 1705401645
```

### Handling Rate Limits

**Exponential Backoff:**
```javascript
async function makeRequestWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    return response;
  }

  throw new Error('Max retries exceeded');
}
```

## Security Best Practices

### Storage

- **Never commit API keys to version control**
- Store keys in environment variables or secure vaults (AWS Secrets Manager, HashiCorp Vault)
- Use different keys for development, staging, and production

### Rotation

- Rotate API keys regularly (every 90 days recommended)
- Rotate immediately if a key is compromised
- Use the rotation endpoint for zero-downtime key updates

### Scopes

- Use the principle of least privilege
- Create separate keys for read-only and write operations
- Limit scopes to only what's needed for each integration

### Monitoring

- Monitor API key usage in the Backoffice dashboard
- Set up alerts for unusual activity
- Review audit logs regularly

## Error Responses

### Invalid API Key

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid API key"
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-16T10:00:00Z"
  }
}
```

### Expired API Key

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "API key has expired"
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-16T10:00:00Z"
  }
}
```

### Revoked API Key

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "API key is revoked"
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-16T10:00:00Z"
  }
}
```

## Support

For API key issues or questions:
- Email: api@authbridge.io
- Documentation: https://docs.authbridge.io
- Status: https://status.authbridge.io

## Changelog

### 2026-01-16
- Initial API key authentication documentation
- Added code examples for Node.js, Python, PHP
- Documented rate limiting and error responses
