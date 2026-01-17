# AuthBridge Deployment Runbook

## Overview

This runbook provides step-by-step instructions for deploying AuthBridge to staging and production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Staging Deployment](#staging-deployment)
4. [Production Deployment](#production-deployment)
5. [Rollback Procedures](#rollback-procedures)
6. [Health Checks](#health-checks)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

```bash
# Node.js 22.x LTS
node --version  # Should be v22.x.x

# pnpm 9.x
pnpm --version  # Should be 9.x.x

# AWS CLI v2
aws --version  # Should be aws-cli/2.x.x

# Serverless Framework 3.x
serverless --version  # Should be 3.x.x

# jq (for JSON parsing)
jq --version
```

### AWS Configuration

```bash
# Configure AWS credentials for af-south-1
aws configure --profile authbridge-staging
# AWS Access Key ID: [from 1Password]
# AWS Secret Access Key: [from 1Password]
# Default region name: af-south-1
# Default output format: json

aws configure --profile authbridge-production
# Same as above with production credentials
```

### Environment Variables

Create `.env.staging` and `.env.production` files:

```bash
# .env.staging
AWS_PROFILE=authbridge-staging
AWS_REGION=af-south-1
STAGE=staging
COGNITO_USER_POOL_ID=af-south-1_xxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
JWT_SECRET=staging-jwt-secret-min-32-characters
JWT_ISSUER=authbridge
SESSION_TOKEN_EXPIRY_HOURS=0.5
SDK_BASE_URL=https://sdk-staging.authbridge.io
```

```bash
# .env.production
AWS_PROFILE=authbridge-production
AWS_REGION=af-south-1
STAGE=production
COGNITO_USER_POOL_ID=af-south-1_yyyyyyyy
COGNITO_CLIENT_ID=yyyyyyyyyyyyyyyyyyyyyyyyyy
JWT_SECRET=[RETRIEVE FROM AWS SECRETS MANAGER]
JWT_ISSUER=authbridge
SESSION_TOKEN_EXPIRY_HOURS=0.5
SDK_BASE_URL=https://sdk.authbridge.io
```

---

## Environment Configuration

### AWS Resources (One-Time Setup)

#### 1. Deploy DynamoDB Table

```bash
# Staging
aws cloudformation deploy \
  --template-file services/shared/cloudformation/dynamodb-table.yml \
  --stack-name authbridge-dynamodb-staging \
  --parameter-overrides Stage=staging \
  --profile authbridge-staging \
  --region af-south-1

# Production
aws cloudformation deploy \
  --template-file services/shared/cloudformation/dynamodb-table.yml \
  --stack-name authbridge-dynamodb-production \
  --parameter-overrides Stage=production \
  --profile authbridge-production \
  --region af-south-1
```

#### 2. Deploy KMS Keys

```bash
# Staging
aws cloudformation deploy \
  --template-file services/shared/cloudformation/kms-keys.yml \
  --stack-name authbridge-kms-staging \
  --parameter-overrides Stage=staging \
  --capabilities CAPABILITY_NAMED_IAM \
  --profile authbridge-staging \
  --region af-south-1

# Production
aws cloudformation deploy \
  --template-file services/shared/cloudformation/kms-keys.yml \
  --stack-name authbridge-kms-production \
  --parameter-overrides Stage=production \
  --capabilities CAPABILITY_NAMED_IAM \
  --profile authbridge-production \
  --region af-south-1
```

#### 3. Deploy Cognito User Pool

```bash
# Staging
aws cloudformation deploy \
  --template-file services/shared/cloudformation/cognito-user-pool.yml \
  --stack-name authbridge-cognito-staging \
  --parameter-overrides Stage=staging \
  --profile authbridge-staging \
  --region af-south-1

# Production
aws cloudformation deploy \
  --template-file services/shared/cloudformation/cognito-user-pool.yml \
  --stack-name authbridge-cognito-production \
  --parameter-overrides Stage=production \
  --profile authbridge-production \
  --region af-south-1
```

---

## Staging Deployment

### Pre-Deployment Checklist

- [ ] All tests passing locally (`pnpm test`)
- [ ] Code reviewed and approved
- [ ] Environment variables configured
- [ ] AWS credentials valid
- [ ] No active incidents in staging

### Step 1: Build Services

```bash
# Install dependencies
pnpm install

# Build all services
pnpm --filter @authbridge/auth-service build
pnpm --filter @authbridge/verification-service build
```

### Step 2: Run Tests

```bash
# Unit tests
pnpm --filter @authbridge/auth-service test
pnpm --filter @authbridge/verification-service test

# Integration tests (requires DynamoDB Local)
pnpm --filter @authbridge/auth-service test:integration
pnpm --filter @authbridge/verification-service test:integration
```

### Step 3: Deploy Auth Service

```bash
cd services/auth

# Load environment
source ../../.env.staging

# Deploy
serverless deploy --stage staging --verbose

# Verify deployment
serverless info --stage staging
```

**Expected Output:**
```
Service Information
service: authbridge-auth
stage: staging
region: af-south-1
stack: authbridge-auth-staging
endpoints:
  POST - https://xxxxxxxxxx.execute-api.af-south-1.amazonaws.com/staging/sessions
  GET - https://xxxxxxxxxx.execute-api.af-south-1.amazonaws.com/staging/sessions/{sessionId}
  POST - https://xxxxxxxxxx.execute-api.af-south-1.amazonaws.com/staging/api/v1/api-keys
  ...
```

### Step 4: Deploy Verification Service

```bash
cd services/verification

# Load environment
source ../../.env.staging

# Deploy
serverless deploy --stage staging --verbose

# Verify deployment
serverless info --stage staging
```

### Step 5: Deploy Backoffice (Netlify)

```bash
cd apps/backoffice

# Build
pnpm build

# Deploy to Netlify (staging)
netlify deploy --dir=dist --site=authbridge-staging

# For production preview
netlify deploy --dir=dist --site=authbridge-staging --prod
```

### Step 6: Verify Deployment

```bash
# Health check - Auth Service
curl -s https://xxxxxxxxxx.execute-api.af-south-1.amazonaws.com/staging/health | jq

# Health check - Verification Service
curl -s https://yyyyyyyyyy.execute-api.af-south-1.amazonaws.com/staging/health | jq

# Test API key creation
curl -X POST https://xxxxxxxxxx.execute-api.af-south-1.amazonaws.com/staging/api/v1/api-keys \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "test-key", "scopes": ["verifications:create"]}' | jq
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Staging deployment successful
- [ ] Staging smoke tests passing
- [ ] Change request approved
- [ ] Rollback plan reviewed
- [ ] On-call engineer notified
- [ ] Maintenance window scheduled (if needed)

### Step 1: Create Deployment Tag

```bash
# Create release tag
git tag -a v1.0.0 -m "Release v1.0.0 - Epic 4 Complete"
git push origin v1.0.0
```

### Step 2: Deploy Auth Service

```bash
cd services/auth

# Load production environment
source ../../.env.production

# Deploy with confirmation
serverless deploy --stage production --verbose

# Verify deployment
serverless info --stage production
```

### Step 3: Deploy Verification Service

```bash
cd services/verification

# Load production environment
source ../../.env.production

# Deploy with confirmation
serverless deploy --stage production --verbose

# Verify deployment
serverless info --stage production
```

### Step 4: Deploy Backoffice (Netlify)

```bash
cd apps/backoffice

# Build for production
VITE_API_URL=https://api.authbridge.io pnpm build

# Deploy to Netlify (production)
netlify deploy --dir=dist --site=authbridge-production --prod
```

### Step 5: Post-Deployment Verification

```bash
# Run smoke tests
./scripts/smoke-tests.sh production

# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AuthBridge/Verification \
  --metric-name ApiLatency \
  --start-time $(date -u -v-5M +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 60 \
  --statistics Average \
  --profile authbridge-production \
  --region af-south-1

# Check for errors in CloudWatch Logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/authbridge-verification-production-createVerification \
  --start-time $(date -u -v-5M +%s)000 \
  --filter-pattern "ERROR" \
  --profile authbridge-production \
  --region af-south-1
```

---

## Rollback Procedures

### Serverless Rollback

```bash
# List previous deployments
serverless deploy list --stage production

# Rollback to previous version
serverless rollback --timestamp 1705401600000 --stage production
```

### Manual Rollback

```bash
# 1. Identify previous working version
git log --oneline -10

# 2. Checkout previous version
git checkout v0.9.0

# 3. Rebuild and deploy
pnpm --filter @authbridge/auth-service build
cd services/auth
serverless deploy --stage production

# 4. Verify rollback
serverless info --stage production
```

### Database Rollback

```bash
# DynamoDB Point-in-Time Recovery
aws dynamodb restore-table-to-point-in-time \
  --source-table-name AuthBridgeTable \
  --target-table-name AuthBridgeTable-Restored \
  --restore-date-time 2026-01-16T10:00:00Z \
  --profile authbridge-production \
  --region af-south-1
```

---

## Health Checks

### API Health Endpoints

| Service | Endpoint | Expected Response |
|---------|----------|-------------------|
| Auth | `/health` | `{"status": "healthy"}` |
| Verification | `/health` | `{"status": "healthy"}` |

### CloudWatch Alarms

| Alarm | Threshold | Action |
|-------|-----------|--------|
| API 5XX Errors | > 1% | Page on-call |
| API Latency p95 | > 500ms | Alert Slack |
| DynamoDB Throttling | > 0 | Alert Slack |
| Lambda Errors | > 1% | Page on-call |

### Monitoring Dashboard

- **CloudWatch Dashboard:** `authbridge-production`
- **Grafana:** https://grafana.authbridge.io
- **Datadog:** https://app.datadoghq.com/dashboard/authbridge

---

## Troubleshooting

### Common Issues

#### 1. Lambda Cold Start Timeout

**Symptom:** First request after idle period times out

**Solution:**
```bash
# Enable provisioned concurrency
aws lambda put-provisioned-concurrency-config \
  --function-name authbridge-verification-production-createVerification \
  --qualifier production \
  --provisioned-concurrent-executions 5 \
  --profile authbridge-production \
  --region af-south-1
```

#### 2. DynamoDB Throttling

**Symptom:** `ProvisionedThroughputExceededException`

**Solution:**
```bash
# Check current capacity
aws dynamodb describe-table \
  --table-name AuthBridgeTable \
  --profile authbridge-production \
  --region af-south-1 | jq '.Table.BillingModeSummary'

# Table uses on-demand billing, so throttling indicates hot partition
# Review access patterns and add GSI if needed
```

#### 3. API Gateway 502 Bad Gateway

**Symptom:** Intermittent 502 errors

**Solution:**
```bash
# Check Lambda logs
aws logs tail /aws/lambda/authbridge-verification-production-createVerification \
  --follow \
  --profile authbridge-production \
  --region af-south-1

# Common causes:
# - Lambda timeout (increase timeout in serverless.yml)
# - Memory exhaustion (increase memorySize)
# - Unhandled exception (check error handling)
```

#### 4. Cognito Token Validation Failure

**Symptom:** 401 Unauthorized with valid token

**Solution:**
```bash
# Verify Cognito User Pool ID
aws cognito-idp describe-user-pool \
  --user-pool-id $COGNITO_USER_POOL_ID \
  --profile authbridge-production \
  --region af-south-1

# Check token issuer matches
# Token iss claim should be: https://cognito-idp.af-south-1.amazonaws.com/{userPoolId}
```

---

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| On-Call Engineer | Rotating | PagerDuty |
| DevOps Lead | [Name] | [Phone] |
| AWS Support | - | AWS Console |
| Netlify Support | - | support@netlify.com |

---

## Deployment History

| Date | Version | Deployer | Notes |
|------|---------|----------|-------|
| 2026-01-16 | v1.0.0 | Edmond | Epic 4 Complete |
| 2026-01-15 | v0.9.0 | Edmond | Epic 3 Complete |
| 2026-01-14 | v0.8.0 | Edmond | Epic 2 Complete |

---

_Document Version: 1.0_
_Last Updated: 2026-01-16_
_Author: Charlie (Senior Dev)_
