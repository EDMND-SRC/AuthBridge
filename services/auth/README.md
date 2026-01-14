# AuthBridge Authentication Service

API authentication and session management service for AuthBridge.

## Features

- JWT token generation and validation (30-minute expiration)
- Session management with DynamoDB TTL
- Lambda authorizer for API Gateway
- Rate limiting per API key
- Comprehensive audit logging
- PII masking in logs

## Architecture

- **Runtime:** Node.js 22.x
- **Framework:** Serverless Framework
- **Region:** af-south-1 (Cape Town) - Data Protection Act 2024 compliance
- **Storage:** DynamoDB single-table design (in-memory for MVP)

## Setup

### Prerequisites

- Node.js 22.x
- pnpm 10.x
- AWS CLI configured with af-south-1 credentials

### Installation

```bash
pnpm install
```

### Environment Variables

Create `.env` file:

```bash
AWS_REGION=af-south-1
AWS_ACCOUNT_ID=979237821231
COGNITO_USER_POOL_ID=<to_be_created>
COGNITO_CLIENT_ID=<to_be_created>
JWT_SECRET=<generate_secure_secret>
```

## Development

### Run Tests

```bash
pnpm test                    # Run all tests
pnpm test:watch              # Watch mode
pnpm test:coverage           # Coverage report
```

### Build

```bash
pnpm build
```

### Local Development

```bash
pnpm serverless offline
```

## Deployment

### Staging

```bash
pnpm deploy:staging
```

### Production

```bash
pnpm deploy:production
```

## API Endpoints

### POST /sessions

Create a new verification session.

**Request:**
```json
{
  "userId": "user_123",
  "clientId": "client_456",
  "deviceType": "desktop"
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "token": "jwt_token",
  "expiresAt": "2026-01-14T14:30:00Z",
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-01-14T14:00:00Z"
  }
}
```

### GET /sessions/{sessionId}

Validate an existing session.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "session": {
    "sessionId": "uuid",
    "userId": "user_123",
    "status": "active",
    "expiresAt": "2026-01-14T14:30:00Z"
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-01-14T14:00:00Z"
  }
}
```

## Error Responses

### 401 Unauthorized

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-01-14T14:00:00Z"
  }
}
```

### 429 Rate Limited

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 60 seconds."
  },
  "meta": {
    "requestId": "req_123",
    "retryAfter": 60
  }
}
```

## Security

- All tokens expire after 30 minutes
- Maximum 50 concurrent sessions per user
- PII is never logged (Omang numbers, names, addresses)
- All API calls require HTTPS
- Audit logs retained for 5 years (FIA compliance)

## Testing

Test coverage: 100% for security-critical code (token validation, encryption)

```bash
# Run specific test file
pnpm test src/services/cognito.test.ts

# Run with coverage
pnpm test:coverage
```

## Integration with Web SDK

Update `sdks/web-sdk/src/lib/configuration/configuration.ts`:

```typescript
backendConfig: {
  baseUrl: 'https://api.authbridge.io',
  auth: {
    method: 'jwt',
    authorizationHeader: 'Bearer <token>',
  },
}
```

## License

Proprietary - AuthBridge
