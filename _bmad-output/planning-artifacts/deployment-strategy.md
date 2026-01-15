---
project_name: 'AuthBridge'
document_type: 'deployment-strategy'
date: '2026-01-15'
author: 'Amelia (Dev Agent)'
status: 'authoritative'
version: '2.0'
---

# AuthBridge Deployment Strategy

**Authoritative Reference for All Agents**

---

## Quick Reference

| What | Where | How |
|------|-------|-----|
| Backend APIs | AWS Lambda (af-south-1) | Serverless Framework |
| Backoffice App | Netlify | Auto-deploy from GitHub |
| Documentation | Netlify | Auto-deploy from GitHub |
| Web SDK | AWS CloudFront + S3 | Manual deploy script |
| DNS | AWS Route 53 | Points to all services |

---

## Understanding the Architecture

### Why This Setup?

AuthBridge uses a **hybrid hosting strategy** that optimizes for:

1. **Data Compliance** — All PII stays in AWS af-south-1 (Cape Town) per Botswana DPA 2024
2. **Developer Experience** — Netlify provides instant deploys, preview URLs, and zero-config CI/CD
3. **Cost Efficiency** — Netlify Free tier for frontends, AWS pay-per-use for backend
4. **Performance** — CloudFront CDN for SDK, API Gateway for low-latency APIs

### How It All Connects

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Route 53 (DNS)                              │
│                      authbridge.io zone                             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Netlify     │       │  AWS API GW     │       │  CloudFront     │
│               │       │                 │       │                 │
│ app.          │       │ api.            │       │ sdk.            │
│ docs.         │       │ api-staging.    │       │ sdk-staging.    │
│ authbridge.io │       │ authbridge.io   │       │ authbridge.io   │
└───────────────┘       └─────────────────┘       └─────────────────┘
        │                         │                         │
        │                         ▼                         │
        │               ┌─────────────────┐                 │
        │               │  AWS Lambda     │                 │
        │               │  (af-south-1)   │                 │
        │               │                 │                 │
        │               │ • Auth Service  │                 │
        │               │ • Verification  │                 │
        │               └─────────────────┘                 │
        │                         │                         │
        │                         ▼                         │
        │               ┌─────────────────┐                 │
        │               │  AWS Data       │                 │
        │               │                 │                 │
        │               │ • DynamoDB      │                 │
        │               │ • S3 (docs)     │◄────────────────┘
        │               │ • Cognito       │
        │               │ • Textract      │
        │               │ • Rekognition   │
        │               └─────────────────┘
        │
        ▼
┌───────────────┐
│   GitHub      │
│               │
│ Auto-deploy   │
│ on push to    │
│ main branch   │
└───────────────┘
```

### What Route 53 Does (and Doesn't Do)

**Route 53 is ONLY a DNS service** — it doesn't host anything.

Think of it like a phone book:
- User types `app.authbridge.io` in browser
- Route 53 says "that's at Netlify's servers"
- Browser connects to Netlify

**Route 53 Records:**

| Record | Type | Points To | Purpose |
|--------|------|-----------|---------|
| `authbridge.io` | A | Netlify | Marketing landing page |
| `www.authbridge.io` | CNAME | Netlify | Redirect to root |
| `app.authbridge.io` | CNAME | Netlify | Backoffice dashboard |
| `docs.authbridge.io` | CNAME | Netlify | Documentation site |
| `api.authbridge.io` | A/ALIAS | API Gateway | Production API |
| `api-staging.authbridge.io` | A/ALIAS | API Gateway | Staging API |
| `sdk.authbridge.io` | A/ALIAS | CloudFront | SDK CDN |
| `sdk-staging.authbridge.io` | A/ALIAS | CloudFront | Staging SDK |

### What Netlify Does

**Netlify hosts static sites and SPAs** with:
- Automatic builds when you push to GitHub
- Preview URLs for every pull request
- Instant rollbacks
- Free SSL certificates
- Global CDN

**AuthBridge uses Netlify for:**
- `apps/backoffice/` → `app.authbridge.io`
- `apps/docs/` → `docs.authbridge.io`

**Netlify does NOT:**
- Store any PII (all data calls go to AWS APIs)
- Run backend code (that's Lambda)
- Host the SDK (that's CloudFront)

---

## Domain Configuration

### Primary Domain: `authbridge.io`

| Property | Value |
|----------|-------|
| Domain | `authbridge.io` |
| Registrar | AWS Route 53 |
| Hosted Zone ID | `Z042764728ORST8KRU245` |
| Registration Date | 2026-01-13 |
| Annual Cost | ~$39/year |
| Status | ✅ ACTIVE |

### Subdomain Architecture

| Subdomain | Purpose | Hosting | Status |
|-----------|---------|---------|--------|
| `api.authbridge.io` | Production API | AWS API Gateway | 🔜 Pending |
| `api-staging.authbridge.io` | Staging API | AWS API Gateway | 🔜 Pending |
| `app.authbridge.io` | Backoffice Dashboard | Netlify | ✅ LIVE |
| `sdk.authbridge.io` | Web SDK CDN | CloudFront | 🔜 Pending |
| `docs.authbridge.io` | Documentation | Netlify | ✅ LIVE |

### Current Staging Endpoints (Temporary)

Until custom domains are configured:

```
Auth API:         https://zscpgvpyk9.execute-api.af-south-1.amazonaws.com/staging
Verification API: https://maybpud8y5.execute-api.af-south-1.amazonaws.com/staging
```

---

## AWS Infrastructure

### Region: `af-south-1` (Cape Town)

**MANDATORY** — Botswana Data Protection Act 2024 requires all PII to remain within Botswana or approved jurisdictions. AWS Cape Town is the closest compliant region.

### Services Used

| Service | Purpose | Pricing Model |
|---------|---------|---------------|
| **Lambda** | Serverless compute | Pay per invocation |
| **API Gateway** | REST API management | Pay per request |
| **DynamoDB** | Primary database | On-demand (pay per read/write) |
| **S3** | Document storage | Pay per GB stored |
| **Cognito** | User authentication | Free tier: 50K MAU |
| **Textract** | OCR extraction | $1.50 per 1K pages |
| **Rekognition** | Biometric verification | $0.04 per liveness check |
| **CloudFront** | SDK CDN | Pay per GB transferred |
| **CloudWatch** | Monitoring & logs | Pay per GB ingested |
| **KMS** | Encryption keys | $1/month per key |
| **SQS** | Message queues | Free tier: 1M requests |
| **SNS** | Notifications | Free tier: 1M publishes |

### Estimated Monthly Costs (MVP)

| Service | Estimate | Notes |
|---------|----------|-------|
| Lambda | $5-10 | ~100K invocations |
| API Gateway | $3-5 | ~100K requests |
| DynamoDB | $5-10 | On-demand, ~10K verifications |
| S3 | $2-5 | ~50GB documents |
| Textract | $15-30 | ~10K OCR extractions |
| Rekognition | $400-500 | ~10K liveness checks ($0.04 each) |
| CloudFront | $1-2 | SDK distribution |
| CloudWatch | $5-10 | Logs and metrics |
| **Total** | **~$450-600/month** | Rekognition is the big cost |

---

## Netlify Configuration

### Account Details

| Property | Value |
|----------|-------|
| Team Name | BridgeArc |
| Account Slug | edmond-moepswa |
| Plan | Free |
| Sites Limit | 500 |
| Current Sites | 0 |

### Sites (LIVE)

| Site | Custom Domain | Netlify URL | Status |
|------|---------------|-------------|--------|
| `authbridge-backoffice` | `app.authbridge.io` | `authbridge-backoffice.netlify.app` | ✅ LIVE |
| `authbridge-docs` | `docs.authbridge.io` | `authbridge-docs.netlify.app` | ✅ LIVE |

**Created:** 2026-01-15
**GitHub Repo:** `BridgeArc/AuthBridge` (main branch)
**Build Settings:**
- Backoffice: `apps/backoffice` → `pnpm build` → `dist`
- Docs: `apps/docs` → `pnpm build` → `dist`

### Environment Variables (Netlify Dashboard)

Set these in Netlify site settings:

```bash
# API Endpoints
VITE_API_URL=https://api.authbridge.io
VITE_AUTH_API_URL=https://api.authbridge.io/auth

# Feature Flags
VITE_ENABLE_ANALYTICS=true

# Public Keys (safe to expose)
VITE_AMPLITUDE_API_KEY=fe56210857e4724d4fab72935a964794
```

### netlify.toml Configuration

Create `apps/backoffice/netlify.toml`:

```toml
[build]
  command = "pnpm build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

---

## Deployment Workflows

### Backend (AWS Lambda)

**Tool:** Serverless Framework 4.x

```bash
# Deploy auth service to staging
cd services/auth
serverless deploy --stage staging

# Deploy verification service to staging
cd services/verification
serverless deploy --stage staging

# Deploy to production (requires confirmation)
serverless deploy --stage production
```

**Current Staging Deployments:**
- Auth: `https://zscpgvpyk9.execute-api.af-south-1.amazonaws.com/staging`
- Verification: `https://maybpud8y5.execute-api.af-south-1.amazonaws.com/staging`

### Frontend (Netlify)

**Option 1: Auto-deploy (Recommended)**
1. Connect GitHub repo to Netlify
2. Set base directory to `apps/backoffice` or `apps/docs`
3. Push to `main` → auto-deploys to production
4. Open PR → creates preview URL

**Option 2: Manual CLI Deploy**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login (uses token from .env.local)
export NETLIFY_AUTH_TOKEN=nfp_Cz3gCDxeCxj1oG2CJQUjJEK7iY4jEeKg1c78
netlify login

# Deploy backoffice
cd apps/backoffice
pnpm build
netlify deploy --prod --dir=dist
```

### SDK (CloudFront + S3)

```bash
# Build SDK
cd sdks/web-sdk
pnpm build

# Upload to S3
aws s3 sync dist/ s3://authbridge-sdk-staging/v1/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id XXXXX \
  --paths "/v1/*"
```

---

## SSL/TLS Configuration

### Certificate Strategy

| Domain | Certificate Provider | Type |
|--------|---------------------|------|
| `*.authbridge.io` | AWS ACM | Wildcard |
| Netlify sites | Netlify (auto) | Per-site |

**AWS ACM Certificate:**
- Region: `us-east-1` (required for CloudFront)
- Auto-renewal: Enabled
- Validation: DNS (Route 53)

**Netlify SSL:**
- Automatic provisioning via Let's Encrypt
- Auto-renewal
- No configuration needed

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: |
          cd services/auth && serverless deploy --stage staging
          cd ../verification && serverless deploy --stage staging

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: |
          cd services/auth && serverless deploy --stage production
          cd ../verification && serverless deploy --stage production
```

### Branch Strategy

| Branch | Deploys To | Approval |
|--------|------------|----------|
| `main` | Production | Manual |
| `develop` | Staging | Auto |
| `feature/*` | Preview (Netlify) | Auto |

---

## Monitoring & Alerting

### CloudWatch Alarms

| Alarm | Threshold | Action |
|-------|-----------|--------|
| API 5xx Errors | > 10/min | SNS → Email |
| API Latency | > 3s p95 | SNS → Email |
| Lambda Errors | > 5/min | SNS → Email |
| DynamoDB Throttling | > 0 | SNS → Email |
| OCR Success Rate | < 85% | SNS → Email |
| Biometric Pass Rate | < 70% | SNS → Email |

### Log Retention

| Log Type | Retention | Storage |
|----------|-----------|---------|
| Application Logs | 30 days | CloudWatch |
| Audit Logs | 5 years | S3 (compliance) |
| Access Logs | 90 days | CloudWatch |

---

## Security Checklist

- [x] All traffic over HTTPS
- [x] API Gateway throttling enabled
- [x] Lambda functions have least-privilege IAM
- [x] DynamoDB encryption at rest (KMS)
- [x] S3 bucket encryption (AES-256)
- [x] S3 bucket public access blocked
- [ ] WAF rules configured
- [ ] CloudFront signed URLs for documents
- [ ] Secrets in AWS Secrets Manager
- [ ] VPC for Lambda (future)

---

## Rollback Procedures

### Lambda Rollback

```bash
# List recent deployments
serverless deploy list --stage production

# Rollback to specific timestamp
serverless rollback --stage production --timestamp 1234567890
```

### Netlify Rollback

1. Go to Netlify Dashboard → Site → Deploys
2. Find the previous working deploy
3. Click "Publish deploy"

### Database Rollback

DynamoDB doesn't have built-in rollback. Options:
1. Point-in-time recovery (enable in DynamoDB settings)
2. Restore from S3 backup (if configured)

---

## Future: Phase 2 Domain Migration

**Target Domain:** `authbridge.co.bw` (post-funding)

When funded, migrate to local `.co.bw` TLD:
1. Purchase `authbridge.co.bw` via Webmart.co.bw (~P200/year)
2. Configure DNS records
3. Set up redirects: `authbridge.io` → `authbridge.co.bw`
4. Update all client integrations
5. Update SSL certificates

---

## Credentials Reference

All credentials stored in `.env.local`:

| Credential | Purpose | Rotation |
|------------|---------|----------|
| `AWS_ACCESS_KEY_ID` | AWS API access | 90 days |
| `AWS_SECRET_ACCESS_KEY` | AWS API access | 90 days |
| `NETLIFY_TOKEN` | Netlify API/CLI | Never expires |
| `GITHUB_TOKEN` | GitHub API | 90 days |

---

---

## Implementation Log

### 2026-01-15: Netlify Sites & DNS Setup

**Completed by:** Amelia (Dev Agent)

1. **Netlify Sites Created:**
   - `authbridge-backoffice` (ID: `ca6360e9-d21a-471a-8b2a-500b2206fff8`)
   - `authbridge-docs` (ID: `97eb94d1-4293-4d09-affa-225dda2be026`)

2. **GitHub Integration:**
   - Repo: `BridgeArc/AuthBridge`
   - Branch: `main`
   - Auto-deploy on push enabled

3. **Route 53 DNS Records Added:**
   - `app.authbridge.io` CNAME → `authbridge-backoffice.netlify.app`
   - `docs.authbridge.io` CNAME → `authbridge-docs.netlify.app`
   - Change ID: `C044840623UYNO1EYEH6K`

4. **Config Files Created:**
   - `apps/backoffice/netlify.toml`
   - `apps/docs/netlify.toml`

**Next Steps:**
- Trigger first deploy by pushing to main
- Verify SSL certificates auto-provision
- Set environment variables in Netlify dashboard

---

_Last Updated: 2026-01-15_
