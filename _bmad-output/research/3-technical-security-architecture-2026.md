---
research_type: technical_security
topic: AWS Serverless Security Best Practices
date: 2026-01-13
status: complete
confidence: high
sources: 15+
---

# Track 3: Technical Security Architecture - 2026

**Research Objective:** Define comprehensive security architecture for AWS serverless backend

**Executive Summary:** AWS Lambda + API Gateway + DynamoDB provides a secure, scalable foundation IF properly configured. Critical requirements: IAM least privilege, encryption at rest/transit, rate limiting, input validation, and secrets management. The free tier covers your needs, but security cannot be compromised.

---

## 1. SECURITY ARCHITECTURE OVERVIEW

### 1.1 Defense in Depth Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                               │
├─────────────────────────────────────────────────────────────────┤
│ Layer 1: Network (CloudFront, VPC, Security Groups)            │
│ Layer 2: API Gateway (Authentication, Rate Limiting, WAF)       │
│ Layer 3: Lambda (IAM Roles, Input Validation, Secrets)         │
│ Layer 4: Data (DynamoDB Encryption, S3 Encryption)             │
│ Layer 5: Monitoring (CloudWatch, CloudTrail, Alerts)           │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Security Principles

1. **Least Privilege** - Minimum permissions required
2. **Defense in Depth** - Multiple security layers
3. **Fail Secure** - Default deny, explicit allow
4. **Audit Everything** - Comprehensive logging
5. **Encrypt Everything** - Data at rest and in transit
6. **Zero Trust** - Verify every request
7. **Automate Security** - Infrastructure as Code

---

## 2. IAM SECURITY (CRITICAL)

### 2.1 Principle of Least Privilege

**Problem:** Over-permissioned IAM roles are the #1 security vulnerability in serverless

**Solution:** Dedicated IAM role per Lambda function with minimal permissions

**Example: Document Upload Lambda**
```yaml
# BAD - Overly permissive
Effect: Allow
Action:
  - s3:*
  - dynamodb:*
Resource: "*"

# GOOD - Least privilege
Effect: Allow
Action:
  - s3:PutObject
  - s3:PutObjectAcl
Resource:
  - arn:aws:s3:::authbridge-documents-prod/uploads/*
```

### 2.2 IAM Role Structure

**Per-Function Roles:**


| Lambda Function | Required Permissions | Resources |
|-----------------|---------------------|-----------|
| **auth/login** | cognito:InitiateAuth | UserPool ARN |
| **verify/upload** | s3:PutObject, dynamodb:PutItem | Specific bucket/table |
| **cases/list** | dynamodb:Query | Cases table + GSI |
| **cases/update** | dynamodb:UpdateItem | Cases table (specific PK) |
| **documents/process** | s3:GetObject, dynamodb:UpdateItem | Documents bucket/table |

**Best Practices:**
- ✅ One role per function
- ✅ Specific resource ARNs (no wildcards)
- ✅ Specific actions (no s3:*, dynamodb:*)
- ✅ Condition keys for additional restrictions
- ✅ Regular audits (quarterly)
- ❌ Never use AdministratorAccess
- ❌ Never use Resource: "*"
- ❌ Never share roles between functions

### 2.3 Resource-Based Policies

**Lambda Invocation Control:**
```json
{
  "Effect": "Allow",
  "Principal": {
    "Service": "apigateway.amazonaws.com"
  },
  "Action": "lambda:InvokeFunction",
  "Resource": "arn:aws:lambda:af-south-1:ACCOUNT:function:authbridge-*",
  "Condition": {
    "ArnLike": {
      "AWS:SourceArn": "arn:aws:execute-api:af-south-1:ACCOUNT:API_ID/*"
    }
  }
}
```

**S3 Bucket Policy:**
```json
{
  "Effect": "Deny",
  "Principal": "*",
  "Action": "s3:*",
  "Resource": "arn:aws:s3:::authbridge-documents-prod/*",
  "Condition": {
    "Bool": {
      "aws:SecureTransport": "false"
    }
  }
}
```

### 2.4 IAM Policy Conditions

**Restrict by IP (for admin functions):**
```json
"Condition": {
  "IpAddress": {
    "aws:SourceIp": ["YOUR_OFFICE_IP/32"]
  }
}
```

**Restrict by time (for maintenance):**
```json
"Condition": {
  "DateGreaterThan": {"aws:CurrentTime": "2026-01-01T00:00:00Z"},
  "DateLessThan": {"aws:CurrentTime": "2026-12-31T23:59:59Z"}
}
```

**Require MFA (for sensitive operations):**
```json
"Condition": {
  "Bool": {
    "aws:MultiFactorAuthPresent": "true"
  }
}
```

---

## 3. API GATEWAY SECURITY

### 3.1 Authentication & Authorization

**Cognito User Pool Authorizer:**
```yaml
authorizer:
  type: COGNITO_USER_POOLS
  authorizerId: !Ref ApiGatewayAuthorizer
  scopes:
    - authbridge/read
    - authbridge/write
```

**Lambda Authorizer (Custom JWT):**
```javascript
// Custom JWT validation
exports.handler = async (event) => {
  const token = event.authorizationToken;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check token expiry
    if (decoded.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }

    // Check user permissions
    const policy = generatePolicy(decoded.sub, 'Allow', event.methodArn);
    policy.context = {
      userId: decoded.sub,
      email: decoded.email,
      role: decoded.role
    };

    return policy;
  } catch (err) {
    throw new Error('Unauthorized');
  }
};
```

### 3.2 Rate Limiting & Throttling

**API Gateway Throttling:**
```yaml
# Per-stage throttling
throttle:
  burstLimit: 100    # Max concurrent requests
  rateLimit: 50      # Requests per second

# Per-method throttling
functions:
  uploadDocument:
    events:
      - http:
          throttle:
            burstLimit: 20
            rateLimit: 10
```

**Usage Plans & API Keys:**
```yaml
resources:
  Resources:
    UsagePlan:
      Type: AWS::ApiGateway::UsagePlan
      Properties:
        UsagePlanName: authbridge-standard
        Throttle:
          BurstLimit: 100
          RateLimit: 50
        Quota:
          Limit: 10000
          Period: MONTH
```

### 3.3 AWS WAF Integration

**DDoS Protection:**
```yaml
resources:
  Resources:
    WebACL:
      Type: AWS::WAFv2::WebACL
      Properties:
        Name: authbridge-waf
        Scope: REGIONAL
        DefaultAction:
          Allow: {}
        Rules:
          # Rate-based rule (DDoS protection)
          - Name: RateLimitRule
            Priority: 1
            Statement:
              RateBasedStatement:
                Limit: 2000
                AggregateKeyType: IP
            Action:
              Block: {}

          # Block known bad IPs
          - Name: IPBlockList
            Priority: 2
            Statement:
              IPSetReferenceStatement:
                Arn: !GetAtt BlockedIPSet.Arn
            Action:
              Block: {}

          # SQL injection protection
          - Name: SQLInjectionRule
            Priority: 3
            Statement:
              ManagedRuleGroupStatement:
                VendorName: AWS
                Name: AWSManagedRulesSQLiRuleSet
            Action:
              Block: {}
```

**Cost Note:** AWS WAF costs $5/month + $1 per rule + $0.60 per million requests. For free tier, use API Gateway throttling only.

### 3.4 CORS Configuration

**Secure CORS:**
```yaml
cors:
  origin: 'https://authbridge.co.bw'  # Specific domain, not '*'
  headers:
    - Content-Type
    - Authorization
    - X-Api-Key
  allowCredentials: true
  maxAge: 3600
```

---

## 4. LAMBDA SECURITY

### 4.1 Input Validation

**CRITICAL:** Never trust user input

**Validation Library:**
```javascript
const Joi = require('joi');

const omangSchema = Joi.object({
  omangNumber: Joi.string().pattern(/^\d{9}$/).required(),
  fullName: Joi.string().min(2).max(100).required(),
  dateOfBirth: Joi.date().max('now').required(),
  address: Joi.string().max(500).required()
});

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // Validate input
    const { error, value } = omangSchema.validate(body);
    if (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input', details: error.details })
      };
    }

    // Process validated data
    const result = await processVerification(value);

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

### 4.2 Secrets Management

**AWS Secrets Manager:**
```javascript
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

// Cache secrets (don't fetch on every invocation)
let cachedSecrets = null;

async function getSecrets() {
  if (cachedSecrets) return cachedSecrets;

  const data = await secretsManager.getSecretValue({
    SecretId: 'authbridge/prod/api-keys'
  }).promise();

  cachedSecrets = JSON.parse(data.SecretString);
  return cachedSecrets;
}

exports.handler = async (event) => {
  const secrets = await getSecrets();
  const apiKey = secrets.THIRD_PARTY_API_KEY;

  // Use apiKey...
};
```

**Environment Variables (for non-sensitive):**
```yaml
functions:
  processDocument:
    handler: src/handlers/documents/process.handler
    environment:
      DYNAMODB_TABLE: ${self:provider.environment.DYNAMODB_TABLE}
      S3_BUCKET: ${self:provider.environment.S3_BUCKET}
      # Never put secrets here!
```

### 4.3 Dependency Scanning

**Automated Vulnerability Scanning:**
```bash
# package.json
{
  "scripts": {
    "audit": "npm audit",
    "audit:fix": "npm audit fix",
    "security:check": "snyk test"
  },
  "devDependencies": {
    "snyk": "^1.1000.0"
  }
}
```

**GitHub Dependabot:**
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/services/backend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

### 4.4 Lambda Function Configuration

**Security Settings:**
```yaml
functions:
  processDocument:
    handler: src/handlers/documents/process.handler
    timeout: 30              # Limit execution time
    memorySize: 512          # Adequate but not excessive
    reservedConcurrency: 10  # Prevent runaway costs
    environment:
      NODE_ENV: production
    vpc:                     # Optional: VPC isolation
      securityGroupIds:
        - sg-xxxxx
      subnetIds:
        - subnet-xxxxx
```

---

## 5. DATA SECURITY

### 5.1 DynamoDB Encryption

**Encryption at Rest (Default):**
- DynamoDB encrypts all data at rest using AWS-managed keys (SSE-S3)
- **Upgrade to Customer-Managed Keys (CMK) for compliance:**

```yaml
resources:
  Resources:
    DynamoDBTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:provider.environment.DYNAMODB_TABLE}
        SSESpecification:
          SSEEnabled: true
          SSEType: KMS
          KMSMasterKeyId: !Ref DynamoDBKMSKey

    DynamoDBKMSKey:
      Type: AWS::KMS::Key
      Properties:
        Description: AuthBridge DynamoDB encryption key
        KeyPolicy:
          Statement:
            - Sid: Enable IAM User Permissions
              Effect: Allow
              Principal:
                AWS: !Sub 'arn:aws:iam::${AWS::AccountId}:root'
              Action: 'kms:*'
              Resource: '*'
            - Sid: Allow DynamoDB to use the key
              Effect: Allow
              Principal:
                Service: dynamodb.amazonaws.com
              Action:
                - 'kms:Decrypt'
                - 'kms:DescribeKey'
              Resource: '*'
```

**Encryption in Transit:**
- All DynamoDB connections use TLS 1.2+
- Enforce HTTPS-only in application code

**Attribute-Level Encryption (for sensitive fields):**
```javascript
const crypto = require('crypto');

function encryptField(plaintext, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

// Encrypt Omang number before storing
const omangEncrypted = encryptField(omangNumber, encryptionKey);
await dynamodb.putItem({
  TableName: 'AuthBridge',
  Item: {
    PK: { S: `USER#${userId}` },
    SK: { S: 'PROFILE' },
    omangNumber: { S: omangEncrypted.encrypted },
    omangIV: { S: omangEncrypted.iv },
    omangAuthTag: { S: omangEncrypted.authTag }
  }
});
```

### 5.2 S3 Security

**Bucket Encryption:**
```yaml
resources:
  Resources:
    DocumentsBucket:
      Type: AWS::S3::Bucket
      Properties:
        BucketName: ${self:provider.environment.S3_BUCKET}
        BucketEncryption:
          ServerSideEncryptionConfiguration:
            - ServerSideEncryptionByDefault:
                SSEAlgorithm: AES256  # Or aws:kms for CMK
        PublicAccessBlockConfiguration:
          BlockPublicAcls: true
          BlockPublicPolicy: true
          IgnorePublicAcls: true
          RestrictPublicBuckets: true
        VersioningConfiguration:
          Status: Enabled
        LifecycleConfiguration:
          Rules:
            - Id: DeleteOldVersions
              Status: Enabled
              NoncurrentVersionExpirationInDays: 30
```

**Presigned URLs (for secure uploads):**
```javascript
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

async function getUploadUrl(userId, documentType) {
  const key = `uploads/${userId}/${Date.now()}-${documentType}.jpg`;

  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Expires: 300,  // 5 minutes
    ContentType: 'image/jpeg',
    ServerSideEncryption: 'AES256',
    Metadata: {
      userId,
      documentType,
      uploadedAt: new Date().toISOString()
    }
  };

  const uploadUrl = await s3.getSignedUrlPromise('putObject', params);

  return { uploadUrl, key };
}
```

**S3 Access Logging:**
```yaml
LoggingConfiguration:
  DestinationBucketName: authbridge-logs-prod
  LogFilePrefix: s3-access/
```

### 5.3 Data Retention & Deletion

**Compliance Requirements:**
- Botswana Data Protection Act: Data minimization, storage limitation
- AML/KYC: Minimum 5 years retention

**Implementation:**
```javascript
// Soft delete (mark as deleted, actual deletion after retention period)
async function deleteUserData(userId) {
  const retentionDate = new Date();
  retentionDate.setFullYear(retentionDate.getFullYear() + 5);

  await dynamodb.updateItem({
    TableName: 'AuthBridge',
    Key: {
      PK: { S: `USER#${userId}` },
      SK: { S: 'PROFILE' }
    },
    UpdateExpression: 'SET deletedAt = :now, scheduledDeletion = :retention',
    ExpressionAttributeValues: {
      ':now': { S: new Date().toISOString() },
      ':retention': { S: retentionDate.toISOString() }
    }
  });
}

// Scheduled Lambda to permanently delete expired data
async function purgeExpiredData() {
  const now = new Date().toISOString();

  const items = await dynamodb.query({
    TableName: 'AuthBridge',
    IndexName: 'DeletionIndex',
    KeyConditionExpression: 'scheduledDeletion < :now',
    ExpressionAttributeValues: {
      ':now': { S: now }
    }
  });

  for (const item of items.Items) {
    // Delete from DynamoDB
    await dynamodb.deleteItem({
      TableName: 'AuthBridge',
      Key: { PK: item.PK, SK: item.SK }
    });

    // Delete from S3
    if (item.documents) {
      for (const doc of item.documents) {
        await s3.deleteObject({
          Bucket: process.env.S3_BUCKET,
          Key: doc.s3Key
        });
      }
    }
  }
}
```

---

## 6. MONITORING & LOGGING

### 6.1 CloudWatch Logs

**Structured Logging:**
```javascript
function log(level, message, metadata = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    requestId: process.env.AWS_REQUEST_ID,
    functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
    ...metadata
  };

  console.log(JSON.stringify(logEntry));
}

// Usage
log('INFO', 'User verification started', { userId, documentType });
log('ERROR', 'Verification failed', { userId, error: err.message });
```

**Log Retention:**
```yaml
functions:
  processDocument:
    handler: src/handlers/documents/process.handler
    logRetentionInDays: 30  # Compliance requirement
```

### 6.2 CloudWatch Alarms

**Critical Alarms:**
```yaml
resources:
  Resources:
    # High error rate alarm
    ErrorRateAlarm:
      Type: AWS::CloudWatch::Alarm
      Properties:
        AlarmName: authbridge-high-error-rate
        MetricName: Errors
        Namespace: AWS/Lambda
        Statistic: Sum
        Period: 300
        EvaluationPeriods: 1
        Threshold: 10
        ComparisonOperator: GreaterThanThreshold
        AlarmActions:
          - !Ref SNSTopic

    # High latency alarm
    LatencyAlarm:
      Type: AWS::CloudWatch::Alarm
      Properties:
        AlarmName: authbridge-high-latency
        MetricName: Duration
        Namespace: AWS/Lambda
        Statistic: Average
        Period: 300
        EvaluationPeriods: 2
        Threshold: 5000  # 5 seconds
        ComparisonOperator: GreaterThanThreshold
        AlarmActions:
          - !Ref SNSTopic

    # Throttling alarm
    ThrottleAlarm:
      Type: AWS::CloudWatch::Alarm
      Properties:
        AlarmName: authbridge-throttling
        MetricName: Throttles
        Namespace: AWS/Lambda
        Statistic: Sum
        Period: 60
        EvaluationPeriods: 1
        Threshold: 5
        ComparisonOperator: GreaterThanThreshold
        AlarmActions:
          - !Ref SNSTopic
```

### 6.3 AWS CloudTrail

**Audit Logging:**
```yaml
resources:
  Resources:
    CloudTrail:
      Type: AWS::CloudTrail::Trail
      Properties:
        TrailName: authbridge-audit-trail
        S3BucketName: !Ref AuditLogsBucket
        IncludeGlobalServiceEvents: true
        IsLogging: true
        IsMultiRegionTrail: false
        EventSelectors:
          - ReadWriteType: All
            IncludeManagementEvents: true
            DataResources:
              - Type: AWS::S3::Object
                Values:
                  - !Sub '${DocumentsBucket.Arn}/*'
              - Type: AWS::DynamoDB::Table
                Values:
                  - !GetAtt DynamoDBTable.Arn
```

### 6.4 Security Monitoring

**AWS GuardDuty (Optional - costs money):**
- Threat detection service
- Monitors for malicious activity
- $4.60 per million CloudTrail events

**Custom Security Metrics:**
```javascript
const cloudwatch = new AWS.CloudWatch();

async function recordSecurityEvent(eventType, metadata) {
  await cloudwatch.putMetricData({
    Namespace: 'AuthBridge/Security',
    MetricData: [{
      MetricName: eventType,
      Value: 1,
      Unit: 'Count',
      Timestamp: new Date(),
      Dimensions: [
        { Name: 'Environment', Value: process.env.STAGE },
        { Name: 'Severity', Value: metadata.severity }
      ]
    }]
  }).promise();
}

// Usage
await recordSecurityEvent('SuspiciousLogin', { severity: 'HIGH', userId });
await recordSecurityEvent('FailedAuthentication', { severity: 'MEDIUM', ip });
```

---

## 7. INCIDENT RESPONSE

### 7.1 Data Breach Response Plan

**72-Hour Timeline (Data Protection Act requirement):**

**Hour 0-2: Detection & Containment**
- Automated alerts trigger
- Assess scope of breach
- Contain the breach (revoke credentials, block IPs)
- Preserve evidence

**Hour 2-24: Investigation**
- Identify affected data subjects
- Determine root cause
- Document timeline
- Assess risk level

**Hour 24-72: Notification**
- Notify Data Protection Commissioner
- Prepare data subject notifications (if high risk)
- Internal stakeholder communication
- Public disclosure (if required)

**Post-72 Hours: Remediation**
- Implement fixes
- Update security controls
- Conduct post-mortem
- Update incident response plan

### 7.2 Automated Breach Detection

```javascript
// Lambda function triggered by CloudWatch Logs
exports.handler = async (event) => {
  const logEvents = event.awslogs.data;
  const decodedLogs = Buffer.from(logEvents, 'base64').toString('utf8');
  const logs = JSON.parse(decodedLogs);

  for (const logEvent of logs.logEvents) {
    const log = JSON.parse(logEvent.message);

    // Detect potential breach indicators
    if (log.level === 'ERROR' && log.message.includes('Unauthorized access')) {
      await triggerBreachAlert({
        timestamp: log.timestamp,
        userId: log.userId,
        ip: log.ip,
        resource: log.resource
      });
    }

    // Detect mass data export
    if (log.action === 'EXPORT' && log.recordCount > 1000) {
      await triggerBreachAlert({
        type: 'MASS_EXPORT',
        userId: log.userId,
        recordCount: log.recordCount
      });
    }
  }
};

async function triggerBreachAlert(details) {
  // Send SNS notification
  await sns.publish({
    TopicArn: process.env.SECURITY_ALERT_TOPIC,
    Subject: '🚨 SECURITY ALERT: Potential Data Breach',
    Message: JSON.stringify(details, null, 2)
  }).promise();

  // Create incident ticket
  await createIncidentTicket(details);

  // Log to security audit trail
  await logSecurityIncident(details);
}
```

---

## 8. COMPLIANCE CHECKLIST

### 8.1 Pre-Launch Security Audit

**Infrastructure:**
- [ ] All Lambda functions have dedicated IAM roles
- [ ] IAM policies follow least privilege
- [ ] S3 buckets have encryption enabled
- [ ] S3 buckets block public access
- [ ] DynamoDB has encryption at rest
- [ ] API Gateway has authentication
- [ ] API Gateway has rate limiting
- [ ] CloudWatch Logs retention set (30 days)
- [ ] CloudTrail enabled for audit logging

**Application:**
- [ ] Input validation on all endpoints
- [ ] Output encoding to prevent XSS
- [ ] SQL injection prevention (N/A for DynamoDB)
- [ ] CSRF protection
- [ ] Secrets stored in Secrets Manager
- [ ] No hardcoded credentials
- [ ] Dependency vulnerability scanning
- [ ] Error messages don't leak sensitive info

**Data Protection:**
- [ ] Sensitive data encrypted at rest
- [ ] Sensitive data encrypted in transit
- [ ] Data retention policy implemented
- [ ] Data deletion process defined
- [ ] Backup and recovery tested
- [ ] Cross-border data transfer controls

**Monitoring:**
- [ ] CloudWatch alarms configured
- [ ] Security event logging
- [ ] Breach detection automated
- [ ] Incident response plan documented
- [ ] 72-hour breach notification process

---

## 9. COST OPTIMIZATION (SECURITY)

### 9.1 Free Tier Security

**Included in AWS Free Tier:**
- ✅ CloudWatch Logs (5GB ingestion, 5GB storage)
- ✅ CloudWatch Alarms (10 alarms)
- ✅ CloudTrail (1 trail, management events)
- ✅ S3 encryption (no additional cost)
- ✅ DynamoDB encryption (no additional cost)
- ✅ IAM (completely free)
- ✅ Secrets Manager (30-day free trial, then $0.40/secret/month)

**Paid Security Services (Optional):**
- AWS WAF: $5/month + $1/rule + $0.60/million requests
- GuardDuty: $4.60/million CloudTrail events
- AWS Shield Advanced: $3,000/month (overkill for you)
- Security Hub: $0.0010 per check

**Recommendation:** Start with free tier, add WAF when revenue permits

---

## 10. KEY TAKEAWAYS

### ✅ Security Strengths

1. **AWS provides strong defaults** - Encryption, IAM, VPC
2. **Free tier covers essentials** - Logging, monitoring, encryption
3. **Serverless reduces attack surface** - No OS to patch
4. **Infrastructure as Code** - Auditable, repeatable
5. **Compliance-ready** - Meets Data Protection Act requirements

### ⚠️ Security Risks

1. **IAM misconfiguration** - #1 cause of breaches
2. **Insufficient monitoring** - Can't detect what you don't log
3. **Dependency vulnerabilities** - npm packages
4. **Insider threats** - Solo founder = all access
5. **DDoS attacks** - API Gateway throttling may not be enough

### 🎯 Critical Actions

**Week 1:**
1. Implement IAM least privilege for all functions
2. Enable S3 and DynamoDB encryption
3. Configure API Gateway authentication
4. Set up CloudWatch alarms

**Week 2:**
1. Implement input validation on all endpoints
2. Set up Secrets Manager for API keys
3. Configure CloudTrail audit logging
4. Test breach detection automation

**Week 3:**
1. Conduct security audit
2. Penetration testing (basic)
3. Document incident response plan
4. Train on 72-hour breach notification

**Ongoing:**
1. Weekly dependency scans
2. Monthly IAM policy audits
3. Quarterly security reviews
4. Annual penetration testing

---

## SOURCES

Content rephrased for compliance with licensing restrictions. Key sources:

1. [AWS Lambda Security Best Practices](https://cloudviz.io/blog/security-best-practices-for-aws-lambda)
2. [IAM Least Privilege Guide](https://masarbi.com/post/what-is-the-principle-of-least-privilege-for-lambda-functions)
3. [DynamoDB Encryption](https://dynobase.dev/dynamodb-encryption/)
4. [API Gateway Rate Limiting](https://aws.amazon.com/api-gateway/faqs/)
5. [S3 Security Features](https://aws.amazon.com/s3/security/)
6. [AWS WAF DDoS Protection](https://aws.amazon.com/blogs/security/protect-apis-with-amazon-api-gateway-and-perimeter-protection-services/)

---

**Research Completed:** January 13, 2026
**Analyst:** Mary (Business Analyst Agent)
**Confidence Level:** HIGH
**Next Action:** Implement security checklist before launch
