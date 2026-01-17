# AuthBridge Deployment Architecture

## Overview

AuthBridge uses a multi-stack CloudFormation architecture deployed to AWS af-south-1 (Cape Town) for Data Protection Act 2024 compliance.

## Stack Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                    Deployment Order                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. authbridge-kms-{stage}                                      │
│     └── KMS keys for encryption                                 │
│         ├── DataEncryptionKey (PII, documents)                  │
│         ├── AuditLogEncryptionKey (audit logs)                  │
│         └── WebhookSecretKey (webhook secrets)                  │
│                                                                  │
│  2. authbridge-dynamodb-{stage}                                 │
│     └── DynamoDB single-table design                            │
│         ├── GSI1-4: Verification queries                        │
│         └── GSI5-7: Audit log queries                           │
│                                                                  │
│  3. authbridge-auth-{stage}                                     │
│     └── Authentication service                                  │
│         ├── JWT authorizer                                      │
│         ├── API key authorizer (used by verification)           │
│         └── User management                                     │
│                                                                  │
│  4. authbridge-verification-{stage}                             │
│     └── Verification service                                    │
│         ├── Case management                                     │
│         ├── Document processing (OCR, biometric)                │
│         ├── Webhook notifications                               │
│         └── Audit logging                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## API Gateway Endpoint Types

| Stage      | Endpoint Type | Reason                                    |
|------------|---------------|-------------------------------------------|
| staging    | EDGE          | Historical - deployed before REGIONAL     |
| production | REGIONAL      | Data residency - keeps traffic in region  |

**IMPORTANT**: Do not change endpoint type on existing API Gateways. This causes deployment failures because AWS cannot change endpoint type while updates are in progress.

## Common Deployment Issues

### 1. Stack in UPDATE_ROLLBACK_FAILED State

**Symptom**: Deployment fails with "Stack is in UPDATE_ROLLBACK_FAILED state"

**Cause**: Previous deployment failed and rollback also failed

**Fix**:
```bash
# List failed resources
aws cloudformation describe-stack-events \
  --stack-name authbridge-verification-staging \
  --region af-south-1 \
  --query 'StackEvents[?ResourceStatus==`UPDATE_FAILED`].LogicalResourceId'

# Skip failed resources and continue rollback
aws cloudformation continue-update-rollback \
  --stack-name authbridge-verification-staging \
  --region af-south-1 \
  --resources-to-skip ResourceName1 ResourceName2
```

### 2. API Gateway Endpoint Type Conflict

**Symptom**: "Unable to change the endpoint type while the previous endpoint type update is still in progress"

**Cause**: serverless.yml has different endpoint type than existing API Gateway

**Fix**: Match the endpoint type in serverless.yml to the existing API Gateway:
```yaml
# Check existing endpoint type
aws apigateway get-rest-apis --region af-south-1 \
  --query 'items[?contains(name, `verification`)].[name,endpointConfiguration.types]'

# Update serverless.yml to match
endpointType: EDGE  # or REGIONAL
```

### 3. KMS Key Permission for CloudWatch Logs

**Symptom**: "The specified KMS key does not exist or is not allowed to be used"

**Cause**: KMS key policy missing CloudWatch Logs service principal

**Fix**: Add to KMS key policy in kms-keys.yml:
```yaml
- Sid: AllowCloudWatchLogsEncryption
  Effect: Allow
  Principal:
    Service: !Sub 'logs.${AWS::Region}.amazonaws.com'
  Action:
    - kms:Encrypt*
    - kms:Decrypt*
    - kms:ReEncrypt*
    - kms:GenerateDataKey*
    - kms:Describe*
  Resource: '*'
  Condition:
    ArnLike:
      'kms:EncryptionContext:aws:logs:arn': !Sub 'arn:aws:logs:${AWS::Region}:${AWS::AccountId}:*'
```

### 4. Cross-Service Authorizer Not Found

**Symptom**: "Function not found: authbridge-auth-staging-apiKeyAuthorizer"

**Cause**: Auth service not deployed before verification service

**Fix**: Deploy services in correct order:
```bash
# Use the deployment script
./scripts/deploy-services.sh staging
```

### 5. Large Package Size / Slow Uploads

**Symptom**: Package is 5+ MB, uploads take 10+ minutes

**Cause**: AWS SDK bundled instead of using Lambda runtime, dev dependencies included

**Fix**: Use esbuild with AWS SDK externalized:
```yaml
plugins:
  - serverless-esbuild

custom:
  esbuild:
    bundle: true
    minify: true
    exclude:
      - '@aws-sdk/*'
      - '@smithy/*'
```

## Deployment Commands

### Full Deployment (Recommended)
```bash
./scripts/deploy-services.sh staging
```

### Individual Service Deployment
```bash
# KMS Keys
aws cloudformation deploy \
  --stack-name authbridge-kms-staging \
  --template-file services/shared/cloudformation/kms-keys.yml \
  --parameter-overrides Stage=staging \
  --capabilities CAPABILITY_NAMED_IAM \
  --region af-south-1

# Auth Service
cd services/auth && npx serverless deploy --stage staging

# Verification Service
cd services/verification && npx serverless deploy --stage staging
```

### Package Size Check
```bash
cd services/verification
npx serverless package --stage staging
ls -lh .serverless/*.zip
```

## Environment Variables

Required environment variables for production:
- `JWT_SECRET`: Strong secret for JWT signing
- `COGNITO_USER_POOL_ID`: Cognito user pool ID
- `COGNITO_CLIENT_ID`: Cognito app client ID

## Monitoring

After deployment, verify:
1. CloudWatch Log Groups created
2. SQS Queues created (OCR, Biometric, Webhook)
3. S3 Bucket with KMS encryption
4. CloudWatch Alarms configured
5. API Gateway endpoints accessible
