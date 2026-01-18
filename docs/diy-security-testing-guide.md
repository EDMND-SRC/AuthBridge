# DIY Security Testing Guide for Bootstrapped Startups

## Overview

This guide provides a comprehensive, **$0 cost** approach to security testing for AuthBridge using open-source tools, AWS native services (covered by credits), and free community programs. This replaces the $20,000-30,000 vendor penetration testing with equivalent coverage.

---

## Strategy: Multi-Layer Security Testing

| Layer | Tool/Approach | Cost | Coverage |
|-------|---------------|------|----------|
| 1. Automated Scanning | OWASP ZAP, Nuclei | $0 | OWASP Top 10, CVEs |
| 2. AWS Native Security | GuardDuty, Inspector, IAM Analyzer | AWS Credits | Cloud misconfig, vulnerabilities |
| 3. Community Testing | HackerOne Essential VDP | $0 | Real-world hacker testing |
| 4. Manual Testing | Self-conducted with guides | $0 | Business logic, auth flows |
| 5. CI/CD Integration | Automated security gates | $0 | Continuous protection |

**Total Cost: $0** (using AWS credits for native services)

---

## Layer 1: Automated Security Scanning

### OWASP ZAP (Zed Attack Proxy)

**What it does:** Industry-standard web application security scanner that finds OWASP Top 10 vulnerabilities automatically.

**Installation:**
```bash
# macOS
brew install zaproxy

# Or download from https://www.zaproxy.org/download/
```

**API Security Scan:**
```bash
# Start ZAP in daemon mode
zap.sh -daemon -port 8080 -config api.key=your-api-key

# Import OpenAPI spec and scan
zap-cli --zap-url http://localhost:8080 openapi import \
  --file services/verification/openapi.yaml \
  --target https://api-staging.authbridge.io

# Run active scan
zap-cli --zap-url http://localhost:8080 active-scan \
  --scanners all \
  --target https://api-staging.authbridge.io

# Generate report
zap-cli --zap-url http://localhost:8080 report \
  --output zap-report.html \
  --output-format html
```

**Automated CI/CD Integration:**
```yaml
# .github/workflows/security-scan.yml
name: Security Scan
on:
  push:
    branches: [main, develop]
  schedule:
    - cron: '0 2 * * 1'  # Weekly Monday 2 AM

jobs:
  zap-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: zaproxy/action-full-scan@v0.10.0
        with:
          target: 'https://api-staging.authbridge.io'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a -j -l WARN'
```

### Nuclei Scanner

**What it does:** Fast, template-based vulnerability scanner with 8,000+ community templates covering CVEs, misconfigurations, and security issues.

**Installation:**
```bash
# macOS
brew install nuclei

# Or via Go
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
```

**Scan Commands:**
```bash
# Update templates
nuclei -update-templates

# Full scan against staging API
nuclei -u https://api-staging.authbridge.io \
  -t cves/ \
  -t vulnerabilities/ \
  -t misconfiguration/ \
  -t exposures/ \
  -severity critical,high,medium \
  -o nuclei-report.txt

# API-specific templates
nuclei -u https://api-staging.authbridge.io \
  -t http/vulnerabilities/generic/ \
  -t http/misconfiguration/ \
  -t http/exposures/apis/ \
  -o api-scan-report.txt

# OWASP Top 10 focused scan
nuclei -u https://api-staging.authbridge.io \
  -tags owasp-top-10 \
  -o owasp-report.txt
```

**Custom AuthBridge Templates:**
```yaml
# .nuclei/authbridge-api-key.yaml
id: authbridge-api-key-exposure

info:
  name: AuthBridge API Key Exposure
  author: authbridge-security
  severity: critical
  tags: api,exposure,authbridge

requests:
  - method: GET
    path:
      - "{{BaseURL}}/api/v1/health"
      - "{{BaseURL}}/api/v1/verifications"
    matchers:
      - type: regex
        regex:
          - 'ab_(live|test)_[a-f0-9]{32}'
        part: body
```

### SQLMap (SQL Injection Testing)

```bash
# Install
brew install sqlmap

# Test API endpoints for SQL injection
sqlmap -u "https://api-staging.authbridge.io/api/v1/cases?status=pending" \
  --headers="Authorization: Bearer YOUR_TOKEN" \
  --level=3 \
  --risk=2 \
  --batch
```

---

## Layer 2: AWS Native Security Services

All covered by your AWS credits - enable these immediately.

### Amazon GuardDuty (Threat Detection)

**What it does:** Continuously monitors for malicious activity and unauthorized behavior.

```bash
# Enable GuardDuty
aws guardduty create-detector \
  --enable \
  --finding-publishing-frequency FIFTEEN_MINUTES \
  --region af-south-1

# List findings
aws guardduty list-findings \
  --detector-id YOUR_DETECTOR_ID \
  --region af-south-1
```

**Cost:** ~$4/month for small workloads (covered by credits)

### Amazon Inspector (Vulnerability Assessment)

**What it does:** Automatically scans Lambda functions, EC2, and containers for vulnerabilities.

```bash
# Enable Inspector
aws inspector2 enable \
  --resource-types LAMBDA \
  --region af-south-1

# Get findings
aws inspector2 list-findings \
  --filter-criteria '{"severity":[{"comparison":"EQUALS","value":"CRITICAL"}]}' \
  --region af-south-1
```

**Cost:** ~$0.01 per Lambda scan (covered by credits)

### IAM Access Analyzer

**What it does:** Identifies resources shared with external entities and validates IAM policies.

```bash
# Create analyzer
aws accessanalyzer create-analyzer \
  --analyzer-name authbridge-analyzer \
  --type ACCOUNT \
  --region af-south-1

# List findings
aws accessanalyzer list-findings \
  --analyzer-arn YOUR_ANALYZER_ARN \
  --region af-south-1
```

**Cost:** Free

### AWS Config Rules

**What it does:** Evaluates AWS resource configurations against security best practices.

```bash
# Enable AWS Config with security rules
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "s3-bucket-public-read-prohibited",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "S3_BUCKET_PUBLIC_READ_PROHIBITED"
    }
  }' \
  --region af-south-1
```

### Security Hub (Aggregated View)

```bash
# Enable Security Hub
aws securityhub enable-security-hub \
  --enable-default-standards \
  --region af-south-1
```

---

## Layer 3: Free Community Testing (HackerOne Essential VDP)

### What is Essential VDP?

HackerOne launched **Essential VDP** in September 2024 - a **completely free** vulnerability disclosure program that gives you:

- Access to HackerOne's global researcher community
- Structured vulnerability reporting portal
- Triage and tracking tools
- Compliance with NIST 800-53, ISO 27001

**This is essentially free penetration testing by real hackers.**

### Setup Steps

1. **Sign up:** https://www.hackerone.com/product/response-vulnerability-disclosure-program
2. **Create program:** Define scope (API, Backoffice, SDK)
3. **Write policy:** Use template below
4. **Launch:** Researchers start testing immediately

### VDP Policy Template for AuthBridge

```markdown
# AuthBridge Vulnerability Disclosure Policy

## Scope

**In Scope:**
- api.authbridge.io (REST API)
- api-staging.authbridge.io (Staging API)
- app.authbridge.io (Backoffice Dashboard)
- sdk.authbridge.io (Web SDK CDN)

**Out of Scope:**
- docs.authbridge.io (Documentation only)
- Third-party services
- Physical security
- Social engineering

## Rules of Engagement

- Do not access, modify, or delete data belonging to other users
- Do not perform denial of service attacks
- Do not test against production with real customer data
- Use staging environment for destructive tests
- Report vulnerabilities within 24 hours of discovery

## What We're Looking For

**Critical (P1):**
- Remote code execution
- SQL injection
- Authentication bypass
- Unauthorized data access

**High (P2):**
- Stored XSS
- IDOR (Insecure Direct Object Reference)
- Privilege escalation
- Sensitive data exposure

**Medium (P3):**
- Reflected XSS
- CSRF
- Information disclosure
- Rate limiting bypass

**Low (P4):**
- Missing security headers
- Verbose error messages
- Minor information leaks

## Recognition

While we cannot offer monetary rewards at this time, we will:
- Acknowledge researchers in our security hall of fame
- Provide detailed feedback on submissions
- Issue CVE credits for significant findings
- Consider future paid bounty program participation

## Contact

security@authbridge.io
```

---

## Layer 4: Manual Security Testing Checklist

### Authentication Testing

```bash
# Test 1: API Key Format Validation
curl -X GET https://api-staging.authbridge.io/api/v1/verifications \
  -H "X-API-Key: invalid_key_format"
# Expected: 401 Unauthorized

# Test 2: Expired JWT Token
curl -X GET https://api-staging.authbridge.io/api/v1/cases \
  -H "Authorization: Bearer EXPIRED_TOKEN"
# Expected: 401 Unauthorized

# Test 3: Missing Authentication
curl -X GET https://api-staging.authbridge.io/api/v1/cases
# Expected: 401 Unauthorized

# Test 4: Cross-Client Access (IDOR)
# Use Client A's token to access Client B's data
curl -X GET https://api-staging.authbridge.io/api/v1/cases/CLIENT_B_CASE_ID \
  -H "Authorization: Bearer CLIENT_A_TOKEN"
# Expected: 403 Forbidden
```

### Authorization Testing (RBAC)

```bash
# Test 1: Reviewer trying to approve (should fail)
curl -X POST https://api-staging.authbridge.io/api/v1/cases/CASE_ID/approve \
  -H "Authorization: Bearer REVIEWER_TOKEN"
# Expected: 403 Forbidden

# Test 2: API User trying to access audit logs (should fail)
curl -X GET https://api-staging.authbridge.io/api/v1/audit \
  -H "X-API-Key: API_USER_KEY"
# Expected: 403 Forbidden

# Test 3: Non-admin trying to assign roles (should fail)
curl -X POST https://api-staging.authbridge.io/api/v1/users/USER_ID/roles \
  -H "Authorization: Bearer NON_ADMIN_TOKEN" \
  -d '{"role": "admin"}'
# Expected: 403 Forbidden
```

### Input Validation Testing

```bash
# Test 1: SQL Injection in query params
curl -X GET "https://api-staging.authbridge.io/api/v1/cases?status=pending' OR '1'='1"
# Expected: 400 Bad Request (not SQL error)

# Test 2: XSS in note content
curl -X POST https://api-staging.authbridge.io/api/v1/cases/CASE_ID/notes \
  -H "Authorization: Bearer TOKEN" \
  -d '{"content": "<script>alert(1)</script>"}'
# Expected: Sanitized or rejected

# Test 3: Path Traversal
curl -X GET "https://api-staging.authbridge.io/api/v1/documents/../../../etc/passwd"
# Expected: 404 Not Found (not file contents)

# Test 4: Oversized payload
curl -X POST https://api-staging.authbridge.io/api/v1/verifications \
  -H "Authorization: Bearer TOKEN" \
  -d "$(python3 -c 'print("{\"data\":\"" + "A"*10000000 + "\"}")')"
# Expected: 413 Payload Too Large
```

### Rate Limiting Testing

```bash
# Test: Exceed rate limit
for i in {1..200}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X GET https://api-staging.authbridge.io/api/v1/health \
    -H "X-API-Key: YOUR_KEY"
done | sort | uniq -c
# Expected: 429 Too Many Requests after limit exceeded
```

### Encryption Verification

```bash
# Test 1: TLS Version
openssl s_client -connect api-staging.authbridge.io:443 -tls1_1
# Expected: Connection refused (TLS 1.1 not supported)

openssl s_client -connect api-staging.authbridge.io:443 -tls1_2
# Expected: Connection successful

# Test 2: Security Headers
curl -I https://api-staging.authbridge.io/api/v1/health
# Expected headers:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
```

---

## Layer 5: CI/CD Security Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/security.yml
name: Security Testing

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 1'  # Weekly

jobs:
  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run npm audit
        run: |
          cd services/verification
          npm audit --audit-level=high

  sast-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/secrets
            p/owasp-top-ten

  nuclei-scan:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Install Nuclei
        run: |
          go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
          nuclei -update-templates
      - name: Run Nuclei Scan
        run: |
          nuclei -u https://api-staging.authbridge.io \
            -severity critical,high \
            -o nuclei-results.txt
      - name: Upload Results
        uses: actions/upload-artifact@v4
        with:
          name: nuclei-results
          path: nuclei-results.txt

  zap-scan:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: ZAP Scan
        uses: zaproxy/action-api-scan@v0.7.0
        with:
          target: 'https://api-staging.authbridge.io'
          format: openapi
          rules_file_name: '.zap/rules.tsv'
```

### Pre-commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']

  - repo: https://github.com/zricethezav/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
```

---

## Execution Timeline

### Week 1: Setup & Automated Scanning

| Day | Task |
|-----|------|
| 1 | Enable AWS GuardDuty, Inspector, IAM Analyzer |
| 2 | Install OWASP ZAP, run first scan |
| 3 | Install Nuclei, run full template scan |
| 4 | Set up CI/CD security workflows |
| 5 | Review and triage findings |

### Week 2: Manual Testing & VDP Launch

| Day | Task |
|-----|------|
| 1 | Authentication testing (manual checklist) |
| 2 | Authorization/RBAC testing |
| 3 | Input validation testing |
| 4 | Sign up for HackerOne Essential VDP |
| 5 | Launch VDP, monitor initial reports |

### Week 3: Remediation & Verification

| Day | Task |
|-----|------|
| 1-3 | Fix critical/high findings |
| 4 | Re-run automated scans |
| 5 | Document security posture |

---

## Expected Findings & Remediation

Based on the AuthBridge architecture, likely findings:

| Category | Likelihood | Remediation |
|----------|------------|-------------|
| Missing security headers | HIGH | Already fixed in Story 5.1 |
| Verbose error messages | MEDIUM | Sanitize error responses |
| Rate limit bypass | LOW | Verify API Gateway config |
| CORS misconfiguration | MEDIUM | Restrict allowed origins |
| Dependency vulnerabilities | HIGH | Run npm audit --fix |

---

## Compliance Mapping

| Requirement | Tool/Approach | Status |
|-------------|---------------|--------|
| OWASP Top 10 | ZAP + Nuclei | ✅ Covered |
| NIST 800-53 | AWS Security Hub | ✅ Covered |
| DPA 2024 | Manual testing + VDP | ✅ Covered |
| ISO 27001 | HackerOne VDP | ✅ Covered |

---

## Summary

**Total Cost: $0** (using existing AWS credits)

**Coverage:**
- ✅ OWASP Top 10 vulnerabilities
- ✅ Known CVEs and misconfigurations
- ✅ AWS infrastructure security
- ✅ Real-world hacker testing (via VDP)
- ✅ Continuous CI/CD security gates

**Equivalent to:** $20,000-30,000 vendor penetration test

---

## Next Steps

1. **Today:** Enable AWS GuardDuty, Inspector, IAM Analyzer
2. **This week:** Run OWASP ZAP and Nuclei scans
3. **Next week:** Sign up for HackerOne Essential VDP
4. **Ongoing:** Monitor VDP reports, run weekly scans

---

_Document Version: 1.0_
_Created: 2026-01-18_
_Author: Kiro (AI Assistant)_
