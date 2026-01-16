# API Gateway Throttling Configuration

## Overview

AuthBridge uses AWS API Gateway throttling to protect backend services and ensure fair usage.

## Current Configuration

### Default Limits (per client)
| Endpoint | Rate Limit | Burst Limit |
|----------|------------|-------------|
| POST /verifications | 100/sec | 200 |
| POST /documents | 50/sec | 100 |
| GET /cases | 200/sec | 400 |
| POST /approve | 20/sec | 50 |
| POST /reject | 20/sec | 50 |

### Bulk Operations
| Endpoint | Rate Limit | Burst Limit |
|----------|------------|-------------|
| POST /bulk-approve | 5/sec | 10 |
| POST /bulk-reject | 5/sec | 10 |

## Serverless Configuration

```yaml
# serverless.yml
provider:
  apiGateway:
    throttling:
      burstLimit: 200
      rateLimit: 100


functions:
  createVerification:
    events:
      - http:
          path: /api/v1/verifications
          method: post
          throttling:
            burstLimit: 200
            rateLimit: 100

  bulkApprove:
    events:
      - http:
          path: /api/v1/cases/bulk-approve
          method: post
          throttling:
            burstLimit: 10
            rateLimit: 5
```

## Usage Plans

### Standard Plan
- 10,000 requests/day
- 100 requests/second
- For development and small deployments

### Enterprise Plan
- 1,000,000 requests/day
- 1,000 requests/second
- Custom burst limits
- Dedicated support

## Error Responses

### 429 Too Many Requests
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please retry after 1 second.",
    "retryAfter": 1
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-16T10:00:00Z"
  }
}
```

## Client Implementation

### Retry with Exponential Backoff
```typescript
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '1');
      await sleep(retryAfter * 1000 * Math.pow(2, attempt));
      continue;
    }

    return response;
  }
  throw new Error('Max retries exceeded');
}
```

## Monitoring

### CloudWatch Alarms
- `4XXError` > 10% triggers warning
- `429` errors > 100/min triggers alert
- Latency p99 > 2s triggers investigation

### Dashboard Metrics
- Requests per second by endpoint
- Throttled requests count
- Client usage distribution
