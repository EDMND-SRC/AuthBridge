# Load Testing Guide - AuthBridge

**Version:** 1.0
**Last Updated:** 2026-01-16
**Owner:** QA Engineering Team

---

## Overview

This guide covers load testing for AuthBridge APIs using k6, an open-source load testing tool. Load testing validates that the system can handle expected traffic volumes and identifies performance bottlenecks before production deployment.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Test Types](#test-types)
3. [Quick Start](#quick-start)
4. [Test Scenarios](#test-scenarios)
5. [Performance Targets](#performance-targets)
6. [Interpreting Results](#interpreting-results)
7. [Troubleshooting](#troubleshooting)
8. [CI/CD Integration](#cicd-integration)

---

## Prerequisites

### Install k6

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```powershell
choco install k6
```

**Verify Installation:**
```bash
k6 version
```

### Environment Setup

Ensure API endpoints are deployed and accessible:
- **Staging:** `https://zscpgvpyk9.execute-api.af-south-1.amazonaws.com/staging`
- **Production:** `https://api.authbridge.io`

---

## Test Types

### 1. Smoke Test
**Purpose:** Quick validation that the system works under minimal load.

**Configuration:**
- Virtual Users (VUs): 1
- Duration: 1 minute
- Use Case: Pre-deployment sanity check

**When to Run:**
- Before every deployment
- After infrastructure changes
- As part of CI/CD pipeline

**Command:**
```bash
./scripts/load-test.sh smoke staging
```

### 2. Load Test
**Purpose:** Validate system performance under expected normal load.

**Configuration:**
- Virtual Users (VUs): 10-50
- Duration: 5 minutes
- Ramp-up: Gradual increase from 10 to 50 VUs

**When to Run:**
- Weekly performance regression testing
- Before major releases
- After performance optimizations

**Command:**
```bash
./scripts/load-test.sh load staging
```

### 3. Stress Test
**Purpose:** Find the breaking point of the system.

**Configuration:**
- Virtual Users (VUs): 10-200
- Duration: 10 minutes
- Ramp-up: Aggressive increase to find limits

**When to Run:**
- Capacity planning
- Before scaling infrastructure
- Quarterly performance audits

**Command:**
```bash
./scripts/load-test.sh stress staging
```

### 4. Spike Test
**Purpose:** Validate system behavior under sudden traffic surges.

**Configuration:**
- Virtual Users (VUs): 0 → 100 → 0
- Duration: 5 minutes
- Pattern: Sudden spike and drop

**When to Run:**
- Before marketing campaigns
- Before product launches
- Testing auto-scaling behavior

**Command:**
```bash
./scripts/load-test.sh spike staging
```

### 5. Soak Test
**Purpose:** Identify memory leaks and performance degradation over time.

**Configuration:**
- Virtual Users (VUs): 50 (constant)
- Duration: 30 minutes
- Pattern: Sustained load

**When to Run:**
- Before production deployment
- After major code changes
- Monthly stability testing

**Command:**
```bash
./scripts/load-test.sh soak staging
```

---

## Quick Start

### Run All Tests

```bash
# Run complete test suite on staging
./scripts/load-test.sh all staging
```

### Run Individual Tests

```bash
# Smoke test (1 min)
./scripts/load-test.sh smoke staging

# Load test (5 min)
./scripts/load-test.sh load staging

# Stress test (10 min)
./scripts/load-test.sh stress staging

# Spike test (5 min)
./scripts/load-test.sh spike staging

# Soak test (30 min)
./scripts/load-test.sh soak staging
```

### Custom Virtual Users

```bash
# Run load test with 100 VUs
./scripts/load-test.sh load staging --vus 100

# Run stress test with custom duration
./scripts/load-test.sh stress staging --duration 15m
```

### Test Against Production

```bash
# WARNING: Only run smoke tests against production
./scripts/load-test.sh smoke production
```

---

## Test Scenarios

### Scenario 1: Auth Service Health Check

**Endpoint:** `GET /health`
**Expected Response:** 200 OK
**Target Latency:** < 500ms (p95)

**What It Tests:**
- API Gateway availability
- Lambda cold start performance
- Basic connectivity

### Scenario 2: Verification Service Health Check

**Endpoint:** `GET /health`
**Expected Response:** 200 OK
**Target Latency:** < 500ms (p95)

**What It Tests:**
- Verification service availability
- DynamoDB connectivity
- S3 bucket access

### Scenario 3: Case List Endpoint

**Endpoint:** `GET /api/v1/cases`
**Expected Response:** 401 Unauthorized (without auth) or 200 OK (with auth)
**Target Latency:** < 1000ms (p95)

**What It Tests:**
- Authentication middleware
- DynamoDB query performance
- Pagination logic

---

## Performance Targets

### Response Time Targets

| Endpoint | p50 | p95 | p99 | Max |
|----------|-----|-----|-----|-----|
| Health Check | < 200ms | < 500ms | < 1000ms | < 2000ms |
| Case List | < 500ms | < 1000ms | < 2000ms | < 5000ms |
| Case Detail | < 500ms | < 1000ms | < 2000ms | < 5000ms |
| Approve/Reject | < 1000ms | < 2000ms | < 5000ms | < 10000ms |

### Throughput Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Requests/second | 50 | API Gateway throttling limit |
| Concurrent VUs | 100 | Expected peak load |
| Error Rate | < 5% | Acceptable failure rate |
| Success Rate | > 95% | Minimum acceptable |

### AWS Service Quotas

| Service | Quota | Impact |
|---------|-------|--------|
| Textract (af-south-1) | 1 TPS | Limits OCR processing rate |
| Lambda Concurrent Executions | 1000 | Limits parallel requests |
| DynamoDB On-Demand | Unlimited | Auto-scales |
| API Gateway | 10,000 RPS | Regional limit |

---

## Interpreting Results

### Key Metrics

**1. HTTP Request Duration**
```
http_req_duration..............: avg=245ms min=120ms med=230ms max=1.2s p(90)=350ms p(95)=450ms
```
- **avg:** Average response time (target: < 500ms)
- **p(95):** 95th percentile (target: < 2000ms)
- **p(99):** 99th percentile (target: < 5000ms)

**2. Error Rate**
```
errors.........................: 2.34% ✓ 234 ✗ 9766
```
- **Target:** < 5%
- **Action if exceeded:** Investigate failed requests in logs

**3. Throughput**
```
http_reqs......................: 10000 166.67/s
```
- **Target:** 50 RPS sustained
- **Peak:** 100 RPS for short bursts

**4. Virtual Users**
```
vus............................: 50 min=1 max=50
```
- Shows concurrent load on the system

### Success Criteria

**Smoke Test:**
- ✅ All requests succeed (0% error rate)
- ✅ p95 latency < 2000ms
- ✅ No 5xx errors

**Load Test:**
- ✅ Error rate < 5%
- ✅ p95 latency < 2000ms
- ✅ p99 latency < 5000ms
- ✅ Throughput > 50 RPS

**Stress Test:**
- ✅ System remains stable up to 100 VUs
- ✅ Error rate < 10% at peak load
- ✅ No cascading failures
- ✅ Graceful degradation beyond capacity

**Spike Test:**
- ✅ System recovers after spike
- ✅ No permanent errors after load drops
- ✅ Auto-scaling triggers appropriately

**Soak Test:**
- ✅ No performance degradation over 30 minutes
- ✅ Memory usage remains stable
- ✅ Error rate stays < 5%
- ✅ No resource leaks

### Red Flags

🚨 **Immediate Action Required:**
- Error rate > 10%
- p95 latency > 5000ms
- 5xx errors > 1%
- Cascading failures
- Memory leaks (increasing latency over time)

⚠️ **Investigation Needed:**
- Error rate 5-10%
- p95 latency 2000-5000ms
- Throughput < 50 RPS
- Inconsistent response times

---

## Troubleshooting

### High Error Rate

**Symptoms:**
- Error rate > 5%
- Many 5xx responses

**Possible Causes:**
1. Lambda throttling (concurrent execution limit)
2. DynamoDB throttling (provisioned capacity exceeded)
3. API Gateway throttling (rate limit exceeded)
4. Textract quota exceeded (1 TPS in af-south-1)

**Solutions:**
```bash
# Check Lambda metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Throttles \
  --dimensions Name=FunctionName,Value=authbridge-verification-staging-createVerification \
  --start-time 2026-01-16T00:00:00Z \
  --end-time 2026-01-16T23:59:59Z \
  --period 300 \
  --statistics Sum \
  --region af-south-1

# Check DynamoDB metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name UserErrors \
  --dimensions Name=TableName,Value=AuthBridgeTable \
  --start-time 2026-01-16T00:00:00Z \
  --end-time 2026-01-16T23:59:59Z \
  --period 300 \
  --statistics Sum \
  --region af-south-1
```

### High Latency

**Symptoms:**
- p95 latency > 2000ms
- Increasing response times

**Possible Causes:**
1. Lambda cold starts
2. DynamoDB query inefficiency
3. S3 presigned URL generation
4. Network latency

**Solutions:**
```bash
# Enable Lambda provisioned concurrency
aws lambda put-provisioned-concurrency-config \
  --function-name authbridge-verification-staging-createVerification \
  --provisioned-concurrent-executions 5 \
  --region af-south-1

# Check DynamoDB query patterns
# Review CloudWatch Logs for slow queries
```

### Textract Throttling

**Symptoms:**
- Error: "Rate exceeded" from Textract
- OCR processing failures

**Solution:**
```bash
# Request quota increase
aws service-quotas request-service-quota-increase \
  --service-code textract \
  --quota-code L-D4F2D8D9 \
  --desired-value 10 \
  --region af-south-1
```

---

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/load-test.yml`:

```yaml
name: Load Test

on:
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run Load Test
        run: ./scripts/load-test.sh load staging

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: scripts/load-tests/results/
```

### Pre-Deployment Check

Add to deployment pipeline:

```bash
# Run smoke test before deployment
./scripts/load-test.sh smoke staging

# Check exit code
if [ $? -ne 0 ]; then
  echo "Smoke test failed - aborting deployment"
  exit 1
fi
```

---

## Best Practices

### 1. Test Staging First
Always run load tests against staging before production.

### 2. Gradual Ramp-Up
Use gradual ramp-up to avoid overwhelming the system.

### 3. Monitor During Tests
Watch CloudWatch metrics during load tests:
- Lambda invocations
- DynamoDB read/write capacity
- API Gateway 4xx/5xx errors

### 4. Test Realistic Scenarios
Use realistic user behavior patterns, not just health checks.

### 5. Document Baselines
Record baseline performance metrics for comparison.

### 6. Test After Changes
Run load tests after:
- Infrastructure changes
- Code deployments
- Dependency upgrades
- Configuration changes

---

## Results Archive

Load test results are saved to:
```
scripts/load-tests/results/
├── staging_smoke_20260116_143022/
│   ├── smoke-results.json
│   ├── smoke-summary.json
│   └── smoke-summary.html
├── staging_load_20260116_144530/
│   ├── load-results.json
│   ├── load-summary.json
│   └── load-summary.html
└── ...
```

**View HTML Report:**
```bash
open scripts/load-tests/results/staging_load_*/load-summary.html
```

**Query JSON Results:**
```bash
cat scripts/load-tests/results/staging_load_*/load-summary.json | jq '.metrics.http_req_duration'
```

---

## Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [AWS Lambda Performance](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [API Gateway Throttling](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html)

---

**Document Owner:** Dana (QA Engineer)
**Last Review:** 2026-01-16
**Next Review:** 2026-04-16
