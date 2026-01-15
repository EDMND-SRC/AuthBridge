# Deployment Runbook - AuthBridge

**Owner:** Charlie (Senior Dev)
**Last Updated:** 2026-01-15
**Status:** Complete

---

## Overview

This runbook provides step-by-step instructions for deploying AuthBridge services to AWS af-south-1 (Cape Town) region.

---

## Prerequisites

### Tools Required

- AWS CLI v2 configured with af-south-1 access
- Node.js 22.x
- pnpm 10.x
- Serverless Framework 3.x
- Docker (for local testing)

### AWS Permissions

Deploying user/role needs:
- Lambda: Full access
- API Gateway: Full access
- DynamoDB: Full access
- S3: Full access
- CloudWatch: Full access
- IAM: PassRole
- Cognito: Full access
- SQS: Full access
- KMS: Full access

### Environment Variables

```bash
# Required for all deployments
export AWS_REGION=af-south-1
export AWS_PROFILE=authbridge-deploy

# Service-specific (set in .env files)
COGNITO_USER_POOL_ID=af-south-1_xxxxx
COGNITO_CLIENT_ID=xxxxx
JWT_SECRET=<secure-random-string>
```

---

## Deployment Stages

| Stage | Environment | URL | Purpose |
|-------|-------------|-----|---------|
| dev | Development | localhost:3000 | Local development |
| staging | Staging | *.execute-api.af-south-1.amazonaws.com/staging | Testing |
| prod | Production | api.authbridge.io | Live |

---

## Service Deployment Order

Deploy services in this order to respect dependencies:

1. **Shared Infrastructure** (CloudFormation)
2. **Auth Service** (Serverless)
3. **Verification Service** (Serverless)
4. **Backoffice** (Netlify)

---

## 1. Shared Infrastructure

### Deploy CloudFormation Stacks

```bash
# Navigate to infrastructure
cd services/shared/cloudformation

# Deploy shared resources (DynamoDB, S3, KMS)
aws cloudformation deploy \
  --template-file dynamodb-table.yml \
  --stack-name authbridge-dynamodb-staging \
  --parameter-overrides Stage=staging \
  --capabilities CAPABILITY_IAM \
  --region af-south-1

# Deploy Cognito User Pool (required for user authentication)
aws cloudformation deploy \
  --template-file cognito-user-pool.yml \
  --stack-name authbridge-cognito-staging \
  --parameter-overrides Stage=staging ProjectName=authbridge \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region af-south-1

# Verify deployments
aws cloudformation describe-stacks \
  --stack-name authbridge-dynamodb-staging \
  --region af-south-1

aws cloudformation describe-stacks \
  --stack-name authbridge-cognito-staging \
  --region af-south-1
```

### Get Cognito Outputs

```bash
# Get User Pool ID and Client ID for .env.local
aws cloudformation describe-stacks \
  --stack-name authbridge-cognito-staging \
  --query 'Stacks[0].Outputs' \
  --region af-south-1

# Update .env.local with:
# COGNITO_USER_POOL_ID=<UserPoolId output>
# COGNITO_CLIENT_ID=<UserPoolClientId output>
```

### Outputs to Note

- DynamoDB Table ARN
- S3 Bucket Name
- KMS Key ID
- Cognito User Pool ID
- Cognito Client ID

---

## 2. Auth Service

### Build

```bash
cd services/auth

# Install dependencies
pnpm install

# Build TypeScript
pnpm build

# Run tests
pnpm test
```

### Deploy to Staging

```bash
# Deploy to staging
pnpm run deploy:staging

# Or manually with serverless
npx serverless deploy --stage staging --region af-south-1
```

### Verify Deployment

```bash
# Get API endpoint
npx serverless info --stage staging

# Test health endpoint
curl https://<api-id>.execute-api.af-south-1.amazonaws.com/staging/health

# Test create session
curl -X POST https://<api-id>.execute-api.af-south-1.amazonaws.com/staging/sessions \
  -H "Content-Type: application/json" \
  -d '{"clientId": "test-client"}'
```

### Rollback (if needed)

```bash
# Rollback to previous version
npx serverless rollback --stage staging --timestamp <timestamp>

# Or redeploy previous commit
git checkout <previous-commit>
pnpm build
pnpm run deploy:staging
```

---

## 3. Verification Service

### Build

```bash
cd services/verification

# Install dependencies
pnpm install

# Build TypeScript
pnpm build

# Run tests (unit only, skip integration if no DynamoDB Local)
pnpm test -- --testPathIgnorePatterns=integration
```

### Deploy to Staging

```bash
# Deploy to staging
pnpm run deploy:staging

# Or manually with serverless
npx serverless deploy --stage staging --region af-south-1
```

### Verify Deployment

```bash
# Get API endpoint
npx serverless info --stage staging

# Test health endpoint
curl https://<api-id>.execute-api.af-south-1.amazonaws.com/staging/health

# Test create verification (requires valid session token)
curl -X POST https://<api-id>.execute-api.af-south-1.amazonaws.com/staging/verifications \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"documentType": "omang"}'
```

### Verify SQS Queues

```bash
# Check OCR queue
aws sqs get-queue-attributes \
  --queue-url https://sqs.af-south-1.amazonaws.com/<account>/authbridge-ocr-queue-staging \
  --attribute-names All

# Check Biometric queue
aws sqs get-queue-attributes \
  --queue-url https://sqs.af-south-1.amazonaws.com/<account>/authbridge-biometric-queue-staging \
  --attribute-names All
```

### Rollback (if needed)

```bash
npx serverless rollback --stage staging --timestamp <timestamp>
```

---

## 4. Backoffice (Frontend)

### Build

```bash
cd apps/backoffice

# Install dependencies
pnpm install

# Build for production
pnpm build
```

### Deploy to Netlify

```bash
# Deploy to staging (draft)
netlify deploy --dir=dist

# Deploy to production
netlify deploy --dir=dist --prod
```

### Verify Deployment

1. Open staging URL in browser
2. Verify login page loads
3. Test authentication flow
4. Verify case list loads

---

## Post-Deployment Verification

### Health Checks

```bash
# Auth service
curl https://<auth-api>.execute-api.af-south-1.amazonaws.com/staging/health

# Verification service
curl https://<verification-api>.execute-api.af-south-1.amazonaws.com/staging/health
```

### Smoke Tests

```bash
# Run smoke test suite
pnpm run test:smoke --stage staging
```

### CloudWatch Logs

```bash
# Check auth service logs
aws logs tail /aws/lambda/authbridge-auth-staging-createSession --follow

# Check verification service logs
aws logs tail /aws/lambda/authbridge-verification-staging-processOCR --follow
```

### CloudWatch Alarms

Verify all alarms are in OK state:
- OCR failure rate
- Biometric failure rate
- Duplicate detection rate
- API error rate

---

## Production Deployment

### Pre-Production Checklist

- [ ] All staging tests passing
- [ ] Load testing completed
- [ ] Security review completed
- [ ] Stakeholder approval obtained
- [ ] Rollback plan documented
- [ ] On-call engineer assigned

### Deploy to Production

```bash
# Deploy auth service
cd services/auth
pnpm run deploy:prod

# Deploy verification service
cd services/verification
pnpm run deploy:prod

# Deploy backoffice
cd apps/backoffice
netlify deploy --dir=dist --prod
```

### Post-Production Verification

1. Run production smoke tests
2. Monitor CloudWatch dashboards
3. Verify all alarms are OK
4. Test end-to-end verification flow
5. Notify stakeholders of successful deployment

---

## Rollback Procedures

### Lambda Rollback

```bash
# List deployment history
npx serverless deploy list --stage prod

# Rollback to specific timestamp
npx serverless rollback --stage prod --timestamp <timestamp>
```

### Database Rollback

DynamoDB point-in-time recovery:

```bash
# Restore to specific time
aws dynamodb restore-table-to-point-in-time \
  --source-table-name AuthBridgeTable \
  --target-table-name AuthBridgeTable-restored \
  --restore-date-time <timestamp>
```

### Frontend Rollback

```bash
# Netlify rollback via UI
# Or redeploy previous commit
git checkout <previous-commit>
pnpm build
netlify deploy --dir=dist --prod
```

---

## Troubleshooting

### Common Issues

#### Lambda Cold Start

**Symptom:** First request takes 5+ seconds
**Solution:** Enable provisioned concurrency for critical functions

#### DynamoDB Throttling

**Symptom:** `ProvisionedThroughputExceededException`
**Solution:** Switch to on-demand billing or increase capacity

#### Textract Quota Exceeded

**Symptom:** `ProvisionedThroughputExceededException` from Textract
**Solution:** SQS queue should handle this; check reserved concurrency

#### API Gateway Timeout

**Symptom:** 504 Gateway Timeout
**Solution:** Check Lambda timeout (max 29s for API Gateway integration)

### Log Analysis

```bash
# Search for errors in last hour
aws logs filter-log-events \
  --log-group-name /aws/lambda/authbridge-verification-staging-processOCR \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern "ERROR"
```

---

## Monitoring

### CloudWatch Dashboards

- **Verification Dashboard:** OCR, biometric, duplicate detection metrics
- **API Dashboard:** Request count, latency, error rate
- **Cost Dashboard:** Lambda invocations, DynamoDB usage, S3 storage

### Alerts

| Alert | Threshold | Action |
|-------|-----------|--------|
| OCR Failure Rate | > 15% | Page on-call |
| Biometric Failure Rate | > 20% | Page on-call |
| API Error Rate | > 5% | Page on-call |
| Lambda Duration | > 25s | Investigate |

---

## Contacts

| Role | Name | Contact |
|------|------|---------|
| On-Call Engineer | Rotating | PagerDuty |
| DevOps Lead | Charlie | charlie@authbridge.io |
| Architect | Winston | winston@authbridge.io |
| Product Owner | Alice | alice@authbridge.io |

---

## References

- [Serverless Framework Docs](https://www.serverless.com/framework/docs)
- [AWS Lambda Deployment](https://docs.aws.amazon.com/lambda/latest/dg/deploying-lambda-apps.html)
- [Netlify CLI](https://docs.netlify.com/cli/get-started/)
- [AWS CloudWatch Logs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html)

