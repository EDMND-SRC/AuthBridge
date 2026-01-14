---
project_name: 'AuthBridge'
document_type: 'deployment-strategy'
date: '2026-01-14'
author: 'Amelia (Dev Agent)'
status: 'authoritative'
version: '1.0'
---

# AuthBridge Deployment Strategy

**Authoritative Reference for All Agents**

---

## Domain Configuration

### Primary Domain: `authbridge.io`

**Status:** ACTIVE (Purchased via Route 53 on 2026-01-13)

| Property | Value |
|----------|-------|
| Domain | `authbridge.io` |
| Registrar | AWS Route 53 |
| Hosted Zone ID | `Z042764728ORST8KRU245` |
| Registration Date | 2026-01-13 |
| Annual Cost | ~$39/year |

### Subdomain Architecture

| Subdomain | Purpose | Hosting |
|-----------|---------|---------|
| `api.authbridge.io` | Production API Gateway | AWS API Gateway |
| `api-staging.authbridge.io` | Staging API Gateway | AWS API Gateway |
| `app.authbridge.io` | Backoffice Dashboard | Netlify |
| `sdk.authbridge.io` | Web SDK CDN | CloudFront |
| `docs.authbridge.io` | Documentation Site | Netlify |

### Environment URLs

**Production:**
```
API:        https://api.authbridge.io
Backoffice: https://app.authbridge.io
SDK:        https://sdk.authbridge.io
Docs:       https://docs.authbridge.io
```

**Staging:**
```
API:        https://api-staging.authbridge.io
Backoffice: https://app-staging.authbridge.io
SDK:        https://sdk-staging.authbridge.io
```

---

## AWS Infrastructure

### Region: `af-south-1` (Cape Town)

**MANDATORY** - Data Protection Act 2024 requires all PII to remain within Botswana or approved jurisdictions. AWS Cape Town is the closest compliant region.

### Core Services

| Service | Purpose | Configuration |
|---------|---------|---------------|
| Lambda | Serverless compute | Node.js 22 runtime |
| API Gateway | REST API management | Regional endpoint |
| DynamoDB | Primary database | On-demand, single-table |
| S3 | Document storage | Encrypted at rest (KMS) |
| Cognito | Authentication | User Pools with passwordless |
| Textract | OCR extraction | Async processing |
| Rekognition | Biometric verification | Face Liveness |
| CloudFront | CDN | SDK distribution |
| CloudWatch | Monitoring | Logs, metrics, alarms |
| KMS | Encryption | PII encryption keys |

### IAM Configuration

- Service-specific IAM roles per Lambda function
- Least-privilege access policies
- Cross-account access disabled

---

## Hosting Strategy

### Backend (AWS Lambda)

**Deployment Tool:** Serverless Framework 4.x

```bash
# Deploy to staging
serverless deploy --stage staging

# Deploy to production (requires confirmation)
serverless deploy --stage production
```

**Services:**
- `services/auth/` → `authbridge-auth-{stage}`
- `services/verification/` → `authbridge-verification-{stage}`

### Frontend (Netlify)

**Sites:**
- Backoffice: `app.authbridge.io`
- Docs: `docs.authbridge.io`

**Deployment:**
- Auto-deploy on push to `main` (production)
- Preview deploys for PRs
- Environment variables managed in Netlify dashboard

### SDK (CloudFront)

**Distribution:**
- Origin: S3 bucket `authbridge-sdk-{stage}`
- Cache: 24-hour TTL for versioned assets
- Invalidation: On new SDK release

**CDN URLs:**
```html
<!-- Production -->
<script src="https://sdk.authbridge.io/v1/authbridge.min.js"></script>

<!-- Staging -->
<script src="https://sdk-staging.authbridge.io/v1/authbridge.min.js"></script>
```

---

## Environment Variables

### Authoritative Source: `.env.local`

All deployment-related credentials are stored in `.env.local`:

```bash
# AWS
AWS_ACCESS_KEY_ID=<redacted>
AWS_SECRET_ACCESS_KEY=<redacted>
AWS_DEFAULT_REGION=af-south-1

# Domain
DOMAIN_NAME=authbridge.io

# Netlify
NETLIFY_TOKEN=<redacted>
```

### Per-Environment Configuration

**Staging:**
- `TABLE_NAME=AuthBridgeTable-staging`
- `S3_BUCKET=authbridge-documents-staging`
- `COGNITO_USER_POOL_ID=af-south-1_staging`

**Production:**
- `TABLE_NAME=AuthBridgeTable`
- `S3_BUCKET=authbridge-documents`
- `COGNITO_USER_POOL_ID=af-south-1_production`

---

## Deployment Workflow

### CI/CD Pipeline

```
Push to branch → GitHub Actions → Build → Test → Deploy
```

**Branches:**
- `main` → Production (manual approval required)
- `develop` → Staging (auto-deploy)
- `feature/*` → Preview environments

### Pre-Deployment Checklist

1. ✅ All tests passing
2. ✅ No lint errors
3. ✅ CHANGELOG.md updated
4. ✅ Version bumped (if applicable)
5. ✅ Environment variables verified

### Rollback Procedure

```bash
# Lambda rollback
serverless rollback --stage production --timestamp <timestamp>

# Netlify rollback
# Use Netlify dashboard to restore previous deploy
```

---

## SSL/TLS Configuration

- **Certificate Provider:** AWS Certificate Manager (ACM)
- **Certificate Type:** Wildcard (`*.authbridge.io`)
- **Auto-Renewal:** Enabled
- **Minimum TLS:** 1.2

---

## DNS Configuration (Route 53)

### Hosted Zone: `authbridge.io`

| Record | Type | Value |
|--------|------|-------|
| `authbridge.io` | A | Netlify (marketing) |
| `api.authbridge.io` | A | API Gateway |
| `app.authbridge.io` | CNAME | Netlify |
| `sdk.authbridge.io` | A | CloudFront |
| `docs.authbridge.io` | CNAME | Netlify |

---

## Future: Phase 2 Domain Migration

**Target Domain:** `authbridge.co.bw` (post-funding)

When funded, migrate to local `.co.bw` TLD:
1. Purchase `authbridge.co.bw` via Webmart.co.bw (~P200/year)
2. Configure DNS records
3. Set up redirects: `authbridge.io` → `authbridge.co.bw`
4. Update all client integrations

**Note:** The `.co.bw` references in PRD and UX spec are for this future state, not current deployment.

---

## Security Considerations

- All traffic over HTTPS (HTTP redirects to HTTPS)
- API Gateway throttling enabled
- WAF rules for common attacks
- DDoS protection via CloudFront/Shield
- Secrets in AWS Secrets Manager (production)

---

## Monitoring & Alerting

- **CloudWatch Alarms:** Error rates, latency, 5xx responses
- **CloudWatch Dashboards:** Real-time metrics
- **Log Retention:** 30 days (CloudWatch), 5 years (audit logs)

---

_Last Updated: 2026-01-14_
