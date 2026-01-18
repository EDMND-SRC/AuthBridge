# Security Testing Checklist

**Document Version:** 1.0
**Created:** 2026-01-18
**Owner:** Dana (QA Engineer)
**Purpose:** Security validation checklist for each deployment

---

## Pre-Deployment Security Checklist

Use this checklist before every staging and production deployment to ensure security controls are in place.

---

## 1. Authentication & Authorization

### API Authentication
- [ ] API keys follow format: `ab_(live|test)_[a-f0-9]{32}`
- [ ] API keys are SHA-256 hashed in DynamoDB
- [ ] Invalid API keys return 401 Unauthorized
- [ ] Expired JWT tokens return 401 Unauthorized
- [ ] Missing authentication returns 401 Unauthorized

**Test Commands:**
```bash
# Test invalid API key
curl -X GET https://api-staging.authbridge.io/api/v1/cases \
  -H "X-API-Key: invalid_key_format"
# Expected: 401 Unauthorized

# Test expired JWT
curl -X GET https://api-staging.authbridge.io/api/v1/cases \
  -H "Authorization: Bearer EXPIRED_TOKEN"
# Expected: 401 Unauthorized
```

### RBAC Authorization
- [ ] Admin can approve/reject cases
- [ ] Analyst can view and approve cases
- [ ] Reviewer can only view cases
- [ ] API users cannot access backoffice endpoints
- [ ] Unauthorized actions return 403 Forbidden

**Test Commands:**
```bash
# Test reviewer trying to approve (should fail)
curl -X POST https://api-staging.authbridge.io/api/v1/cases/CASE_ID/approve \
  -H "Authorization: Bearer REVIEWER_TOKEN"
# Expected: 403 Forbidden

# Test API user trying to access audit logs (should fail)
curl -X GET https://api-staging.authbridge.io/api/v1/audit \
  -H "X-API-Key: API_USER_KEY"
# Expected: 403 Forbidden
```

---

## 2. Data Encryption

### Encryption at Rest
- [ ] DynamoDB table has encryption enabled
- [ ] S3 buckets have KMS encryption enabled
- [ ] KMS keys have rotation enabled (365 days)
- [ ] PII fields are encrypted: `omangNumber`, `address`, `dateOfBirth`, `phoneNumber`
- [ ] Encrypted fields are base64-encoded in DynamoDB

**Verification:**
```bash
# Check DynamoDB encryption
aws dynamodb describe-table \
  --table-name AuthBridgeTable \
  --region af-south-1 \
  --query 'Table.SSEDescription'
# Expected: { "Status": "ENABLED", "SSEType": "KMS" }

# Check S3 encryption
aws s3api get-bucket-encryption \
  --bucket authbridge-documents-staging \
  --region af-south-1
# Expected: ServerSideEncryptionConfiguration with KMS
```

### Encryption in Transit
- [ ] TLS 1.2+ enforced on API Gateway
- [ ] HTTPS required for all endpoints
- [ ] HTTP requests redirect to HTTPS
- [ ] Certificate is valid and not expired

**Test Commands:**
```bash
# Test TLS version
openssl s_client -connect api-staging.authbridge.io:443 -tls1_1
# Expected: Connection refused (TLS 1.1 not supported)

openssl s_client -connect api-staging.authbridge.io:443 -tls1_2
# Expected: Connection successful

# Test HTTPS enforcement
curl -I http://api-staging.authbridge.io/api/v1/health
# Expected: 301 Redirect to HTTPS
```

---

## 3. Security Headers

### Required Headers
- [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `Content-Security-Policy: default-src 'self'`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`

**Test Command:**
```bash
curl -I https://api-staging.authbridge.io/api/v1/health
# Verify all headers are present
```

**Expected Output:**
```
HTTP/2 200
strict-transport-security: max-age=31536000; includeSubDomains; preload
x-content-type-options: nosniff
x-frame-options: DENY
content-security-policy: default-src 'self'
referrer-policy: strict-origin-when-cross-origin
```

---

## 4. Input Validation

### SQL Injection Prevention
- [ ] Query parameters are sanitized
- [ ] No raw SQL queries (using DynamoDB SDK)
- [ ] SQL injection attempts return 400 Bad Request

**Test Commands:**
```bash
# Test SQL injection in query params
curl -X GET "https://api-staging.authbridge.io/api/v1/cases?status=pending' OR '1'='1"
# Expected: 400 Bad Request (not SQL error)
```

### XSS Prevention
- [ ] User input is sanitized before storage
- [ ] HTML entities are escaped in responses
- [ ] Script tags in notes are rejected or sanitized

**Test Commands:**
```bash
# Test XSS in case note
curl -X POST https://api-staging.authbridge.io/api/v1/cases/CASE_ID/notes \
  -H "Authorization: Bearer TOKEN" \
  -d '{"content": "<script>alert(1)</script>"}'
# Expected: Content sanitized or rejected
```

### Path Traversal Prevention
- [ ] File paths are validated
- [ ] Directory traversal attempts return 404

**Test Commands:**
```bash
# Test path traversal
curl -X GET "https://api-staging.authbridge.io/api/v1/documents/../../../etc/passwd"
# Expected: 404 Not Found (not file contents)
```

### Oversized Payload Protection
- [ ] Requests >10MB are rejected
- [ ] Response is 413 Payload Too Large

**Test Commands:**
```bash
# Test oversized payload
curl -X POST https://api-staging.authbridge.io/api/v1/verifications \
  -H "Authorization: Bearer TOKEN" \
  -d "$(python3 -c 'print("{\"data\":\"" + "A"*10000000 + "\"}")')"
# Expected: 413 Payload Too Large
```

---

## 5. Rate Limiting

### API Gateway Throttling
- [ ] Rate limit: 50 requests/second per client
- [ ] Burst limit: 100 requests
- [ ] Exceeded limits return 429 Too Many Requests
- [ ] Rate limit headers present: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

**Test Commands:**
```bash
# Test rate limiting
for i in {1..200}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X GET https://api-staging.authbridge.io/api/v1/health \
    -H "X-API-Key: YOUR_KEY"
done | sort | uniq -c
# Expected: 429 responses after limit exceeded
```

---

## 6. Audit Logging

### Audit Trail Completeness
- [ ] All case actions are logged (approve, reject, view, note)
- [ ] All user actions are logged (login, logout, role change)
- [ ] All document actions are logged (upload, view, download)
- [ ] All webhook actions are logged (configure, send, retry)
- [ ] All API key actions are logged (create, rotate, revoke)

**Verification:**
```bash
# Query audit logs for recent actions
curl -X GET "https://api-staging.authbridge.io/api/v1/audit?startDate=2026-01-18&endDate=2026-01-18" \
  -H "Authorization: Bearer ADMIN_TOKEN"
# Verify all expected actions are present
```

### Audit Log Immutability
- [ ] Audit logs cannot be updated
- [ ] Audit logs cannot be deleted
- [ ] Attempts to modify audit logs are logged

**Test Commands:**
```bash
# Attempt to delete audit log (should fail)
aws dynamodb delete-item \
  --table-name AuthBridgeTable \
  --key '{"PK": {"S": "AUDIT#2026-01-18"}, "SK": {"S": "timestamp#eventId"}}' \
  --region af-south-1
# Expected: Access Denied (IAM policy prevents deletion)
```

---

## 7. Data Protection

### PII Handling
- [ ] PII is never logged in plaintext
- [ ] Omang numbers are masked in logs: `***1234` (last 4 only)
- [ ] Email addresses are not logged in CloudWatch
- [ ] S3 presigned URLs expire in 15 minutes max

**Verification:**
```bash
# Check CloudWatch logs for PII leakage
aws logs filter-log-events \
  --log-group-name /aws/lambda/authbridge-verification-staging \
  --filter-pattern "[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]" \
  --region af-south-1
# Expected: No 9-digit Omang numbers in logs
```

### Data Retention
- [ ] Audit logs retained for 5 years (1825 days)
- [ ] Verification cases retained per client configuration
- [ ] Deleted data is anonymized, not purged

**Verification:**
```bash
# Check CloudWatch Logs retention
aws logs describe-log-groups \
  --log-group-name-prefix /aws/lambda/authbridge-verification \
  --region af-south-1 \
  --query 'logGroups[*].[logGroupName,retentionInDays]'
# Expected: 1825 days for audit logs
```

---

## 8. Dependency Security

### Vulnerability Scanning
- [ ] No critical or high severity vulnerabilities in dependencies
- [ ] `npm audit` passes with 0 vulnerabilities
- [ ] Outdated dependencies are documented with upgrade plan

**Test Commands:**
```bash
# Run npm audit
cd services/verification
npm audit --audit-level=high
# Expected: 0 vulnerabilities

# Check for outdated packages
npm outdated
# Document any outdated packages with security implications
```

---

## 9. Infrastructure Security

### IAM Least Privilege
- [ ] Lambda execution roles have minimal permissions
- [ ] No wildcard (`*`) permissions in IAM policies
- [ ] Cross-service access uses resource-based policies

**Verification:**
```bash
# Review Lambda execution role
aws iam get-role-policy \
  --role-name authbridge-verification-staging-lambda-role \
  --policy-name lambda-policy \
  --region af-south-1
# Verify no wildcard permissions
```

### Network Security
- [ ] API Gateway has resource policies (if applicable)
- [ ] S3 buckets are not publicly accessible
- [ ] DynamoDB tables are not publicly accessible

**Test Commands:**
```bash
# Test S3 bucket public access
aws s3api get-bucket-acl \
  --bucket authbridge-documents-staging \
  --region af-south-1
# Expected: No public grants

# Test S3 object public access
curl -I https://authbridge-documents-staging.s3.af-south-1.amazonaws.com/test.jpg
# Expected: 403 Forbidden (not 200 OK)
```

---

## 10. Secrets Management

### Environment Variables
- [ ] No secrets hardcoded in code
- [ ] Secrets stored in AWS Secrets Manager or SSM Parameter Store
- [ ] Environment variables are encrypted at rest
- [ ] Production secrets are different from staging

**Verification:**
```bash
# Check for hardcoded secrets in code
grep -r "ab_live_" services/verification/src/
# Expected: No matches

# Verify secrets are in Secrets Manager
aws secretsmanager list-secrets \
  --region af-south-1 \
  --query 'SecretList[?contains(Name, `authbridge`)].Name'
# Expected: List of secrets
```

---

## 11. Compliance

### Data Protection Act 2024
- [ ] Data residency: All data in af-south-1 region
- [ ] Data encryption: At rest and in transit
- [ ] Data export: Available within 5 minutes
- [ ] Data deletion: Completed within 24 hours
- [ ] Audit trail: 5-year retention

### FIA AML/KYC Requirements
- [ ] Identity verification: Omang, Passport, Driver's License supported
- [ ] Biometric matching: Face comparison with 80% threshold
- [ ] Duplicate detection: Omang hash-based lookup
- [ ] Audit logging: All verification actions logged
- [ ] Data retention: 5 years minimum

---

## 12. Incident Response

### Monitoring & Alerting
- [ ] CloudWatch alarms configured for errors
- [ ] SNS topic for security alerts
- [ ] Runbook for security incidents

**Verification:**
```bash
# List CloudWatch alarms
aws cloudwatch describe-alarms \
  --alarm-name-prefix authbridge \
  --region af-south-1 \
  --query 'MetricAlarms[*].[AlarmName,StateValue]'
# Verify alarms are in OK state
```

---

## Deployment Sign-Off

**Deployment Date:** _______________
**Environment:** [ ] Staging [ ] Production
**Tested By:** _______________
**Approved By:** _______________

**Checklist Completion:**
- [ ] All items checked and passing
- [ ] Any failures documented with remediation plan
- [ ] Security scan reports attached
- [ ] Deployment approved by security team (production only)

---

## References

- [DIY Security Testing Guide](diy-security-testing-guide.md)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [AWS Security Best Practices](https://docs.aws.amazon.com/security/)
- [Data Protection Act 2024 (Botswana)](https://www.gov.bw/)

---

_Last Updated: 2026-01-18_
_Next Review: Before each production deployment_
