#!/bin/bash

# AuthBridge Load Testing Script
# Uses k6 for comprehensive load testing of API endpoints
#
# Prerequisites:
#   - k6 installed: brew install k6
#   - API endpoints deployed to staging/production
#   - Valid API credentials in .env.local
#
# Usage:
#   ./scripts/load-test.sh [test-name] [environment] [options]
#
# Examples:
#   ./scripts/load-test.sh smoke staging           # Quick smoke test
#   ./scripts/load-test.sh load staging            # Standard load test
#   ./scripts/load-test.sh stress staging          # Stress test
#   ./scripts/load-test.sh spike staging           # Spike test
#   ./scripts/load-test.sh soak staging            # Soak test (30 min)
#   ./scripts/load-test.sh all staging             # Run all test types
#   ./scripts/load-test.sh load staging --vus 100  # Custom VUs
#
# Test Types:
#   smoke   - Quick validation (1 VU, 1 min)
#   load    - Standard load (10-50 VUs, 5 min)
#   stress  - Find breaking point (10-200 VUs, 10 min)
#   spike   - Sudden traffic surge (0-100-0 VUs, 5 min)
#   soak    - Sustained load (50 VUs, 30 min)
#   all     - Run all test types sequentially

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
TEST_TYPE="${1:-load}"
ENVIRONMENT="${2:-staging}"
shift 2 || true

# Configuration based on environment
case "$ENVIRONMENT" in
  staging)
    AUTH_API_URL="${AUTH_API_URL:-https://zscpgvpyk9.execute-api.af-south-1.amazonaws.com/staging}"
    VERIFICATION_API_URL="${VERIFICATION_API_URL:-https://maybpud8y5.execute-api.af-south-1.amazonaws.com/staging}"
    ;;
  production)
    echo -e "${RED}WARNING: Running load tests against PRODUCTION${NC}"
    echo -e "${YELLOW}Press Ctrl+C within 5 seconds to cancel...${NC}"
    sleep 5
    AUTH_API_URL="${AUTH_API_URL:-https://api.authbridge.io}"
    VERIFICATION_API_URL="${VERIFICATION_API_URL:-https://api.authbridge.io}"
    ;;
  local)
    AUTH_API_URL="${AUTH_API_URL:-http://localhost:3001}"
    VERIFICATION_API_URL="${VERIFICATION_API_URL:-http://localhost:3002}"
    ;;
  *)
    echo -e "${RED}Unknown environment: $ENVIRONMENT${NC}"
    echo "Valid environments: staging, production, local"
    exit 1
    ;;
esac

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         AuthBridge Load Testing Suite                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Environment:${NC} $ENVIRONMENT"
echo -e "${GREEN}Test Type:${NC} $TEST_TYPE"
echo -e "${GREEN}Auth API:${NC} $AUTH_API_URL"
echo -e "${GREEN}Verification API:${NC} $VERIFICATION_API_URL"
echo ""

# Check k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}Error: k6 is not installed${NC}"
    echo "Install with: brew install k6"
    echo "Or visit: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

echo -e "${GREEN}✓ k6 installed: $(k6 version | head -n 1)${NC}"
echo ""

# Create k6 test scripts directory
mkdir -p scripts/load-tests
mkdir -p scripts/load-tests/results

# Generate timestamp for results
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="scripts/load-tests/results/${ENVIRONMENT}_${TEST_TYPE}_${TIMESTAMP}"
mkdir -p "$RESULTS_DIR"

# Generate comprehensive k6 test script
cat > scripts/load-tests/authbridge-load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM METRICS
// ═══════════════════════════════════════════════════════════════════════════

const errorRate = new Rate('errors');
const authLatency = new Trend('auth_latency');
const verificationLatency = new Trend('verification_latency');
const caseListLatency = new Trend('case_list_latency');
const totalRequests = new Counter('total_requests');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');
const activeVUs = new Gauge('active_vus');

// ═══════════════════════════════════════════════════════════════════════════
// TEST CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const TEST_TYPE = __ENV.TEST_TYPE || 'load';

// Test configurations for different scenarios
const testConfigs = {
  smoke: {
    stages: [
      { duration: '30s', target: 1 },
      { duration: '30s', target: 1 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<2000'],
      errors: ['rate<0.01'],
    },
  },
  load: {
    stages: [
      { duration: '1m', target: 10 },
      { duration: '3m', target: 10 },
      { duration: '1m', target: 50 },
      { duration: '3m', target: 50 },
      { duration: '1m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<2000', 'p(99)<5000'],
      errors: ['rate<0.05'],
      http_req_failed: ['rate<0.05'],
    },
  },
  stress: {
    stages: [
      { duration: '2m', target: 10 },
      { duration: '2m', target: 50 },
      { duration: '2m', target: 100 },
      { duration: '2m', target: 200 },
      { duration: '2m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<5000'],
      errors: ['rate<0.1'],
    },
  },
  spike: {
    stages: [
      { duration: '30s', target: 10 },
      { duration: '30s', target: 100 },
      { duration: '1m', target: 100 },
      { duration: '30s', target: 10 },
      { duration: '1m', target: 10 },
      { duration: '30s', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<5000'],
      errors: ['rate<0.15'],
    },
  },
  soak: {
    stages: [
      { duration: '2m', target: 50 },
      { duration: '26m', target: 50 },
      { duration: '2m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<2000'],
      errors: ['rate<0.05'],
    },
  },
};

export const options = testConfigs[TEST_TYPE] || testConfigs.load;

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const AUTH_URL = __ENV.AUTH_API_URL || 'https://zscpgvpyk9.execute-api.af-south-1.amazonaws.com/staging';
const VERIFICATION_URL = __ENV.VERIFICATION_API_URL || 'https://maybpud8y5.execute-api.af-south-1.amazonaws.com/staging';

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function logRequest(name, response, success) {
  totalRequests.add(1);
  if (success) {
    successfulRequests.add(1);
  } else {
    failedRequests.add(1);
    console.error(`❌ ${name} failed: ${response.status} - ${response.body.substring(0, 200)}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════

export default function () {
  activeVUs.add(1);

  // Test 1: Auth Service Health Check
  group('Auth Service', () => {
    const res = http.get(`${AUTH_URL}/health`, {
      tags: { name: 'AuthHealth' },
    });

    const success = check(res, {
      'auth health status 200': (r) => r.status === 200,
      'auth health response time < 500ms': (r) => r.timings.duration < 500,
    });

    authLatency.add(res.timings.duration);
    errorRate.add(!success);
    logRequest('Auth Health', res, success);
  });

  sleep(1);

  // Test 2: Verification Service Health Check
  group('Verification Service', () => {
    const res = http.get(`${VERIFICATION_URL}/health`, {
      tags: { name: 'VerificationHealth' },
    });

    const success = check(res, {
      'verification health status 200': (r) => r.status === 200,
      'verification health response time < 500ms': (r) => r.timings.duration < 500,
    });

    verificationLatency.add(res.timings.duration);
    errorRate.add(!success);
    logRequest('Verification Health', res, success);
  });

  sleep(1);

  // Test 3: Case List Endpoint (if authenticated)
  // Note: This requires valid authentication tokens
  // For now, we test the endpoint availability
  group('Case Management', () => {
    const res = http.get(`${VERIFICATION_URL}/api/v1/cases`, {
      tags: { name: 'CaseList' },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // We expect 401 without auth, which is correct behavior
    const success = check(res, {
      'case list responds': (r) => r.status === 401 || r.status === 200,
      'case list response time < 1000ms': (r) => r.timings.duration < 1000,
    });

    caseListLatency.add(res.timings.duration);
    errorRate.add(!success);
    logRequest('Case List', res, success);
  });

  sleep(2);

  activeVUs.add(-1);
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

export function handleSummary(data) {
  const timestamp = new Date().toISOString();

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.html': htmlReport(data),
    'summary.json': JSON.stringify({
      ...data,
      test_type: TEST_TYPE,
      timestamp: timestamp,
      environment: __ENV.ENVIRONMENT || 'staging',
    }, null, 2),
  };
}
EOF

echo -e "${GREEN}✓ Load test script generated${NC}"
echo ""

# Run the appropriate test
run_test() {
  local test_type=$1
  echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${YELLOW}Running ${test_type} test...${NC}"
  echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
  echo ""

  k6 run scripts/load-tests/authbridge-load-test.js \
    -e TEST_TYPE="$test_type" \
    -e ENVIRONMENT="$ENVIRONMENT" \
    -e AUTH_API_URL="$AUTH_API_URL" \
    -e VERIFICATION_API_URL="$VERIFICATION_API_URL" \
    --out json="$RESULTS_DIR/${test_type}-results.json" \
    --summary-export="$RESULTS_DIR/${test_type}-summary.json" \
    "$@"

  # Move generated reports to results directory
  if [ -f "summary.html" ]; then
    mv summary.html "$RESULTS_DIR/${test_type}-summary.html"
    echo -e "${GREEN}✓ HTML report: $RESULTS_DIR/${test_type}-summary.html${NC}"
  fi

  if [ -f "summary.json" ]; then
    mv summary.json "$RESULTS_DIR/${test_type}-summary-detailed.json"
  fi

  echo ""
}

case "$TEST_TYPE" in
  smoke)
    run_test "smoke" "$@"
    ;;
  load)
    run_test "load" "$@"
    ;;
  stress)
    run_test "stress" "$@"
    ;;
  spike)
    run_test "spike" "$@"
    ;;
  soak)
    echo -e "${YELLOW}⚠️  Soak test will run for 30 minutes${NC}"
    echo -e "${YELLOW}Press Ctrl+C within 5 seconds to cancel...${NC}"
    sleep 5
    run_test "soak" "$@"
    ;;
  all)
    echo -e "${BLUE}Running complete test suite...${NC}"
    echo ""
    run_test "smoke" "$@"
    echo ""
    run_test "load" "$@"
    echo ""
    run_test "stress" "$@"
    echo ""
    run_test "spike" "$@"
    echo ""
    echo -e "${GREEN}✓ All tests complete!${NC}"
    ;;
  *)
    echo -e "${RED}Unknown test type: $TEST_TYPE${NC}"
    echo "Valid test types: smoke, load, stress, spike, soak, all"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Load Test Complete!                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Results saved to:${NC} $RESULTS_DIR"
echo ""
echo -e "${BLUE}View HTML report:${NC}"
echo -e "  open $RESULTS_DIR/*-summary.html"
echo ""
echo -e "${BLUE}View JSON results:${NC}"
echo -e "  cat $RESULTS_DIR/*-summary.json | jq"
echo ""
