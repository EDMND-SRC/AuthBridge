#!/bin/bash

# AuthBridge Load Testing Script
# Uses k6 for load testing API endpoints
#
# Prerequisites:
#   - k6 installed: brew install k6
#   - API endpoints deployed to staging
#
# Usage:
#   ./scripts/load-test.sh [test-name] [options]
#
# Examples:
#   ./scripts/load-test.sh auth          # Run auth endpoint tests
#   ./scripts/load-test.sh verification  # Run verification endpoint tests
#   ./scripts/load-test.sh all           # Run all tests
#   ./scripts/load-test.sh auth --vus 50 # Run with 50 virtual users

set -e

# Configuration
STAGE="${STAGE:-staging}"
AUTH_API_URL="${AUTH_API_URL:-https://zscpgvpyk9.execute-api.af-south-1.amazonaws.com/staging}"
VERIFICATION_API_URL="${VERIFICATION_API_URL:-https://maybpud8y5.execute-api.af-south-1.amazonaws.com/staging}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}Error: k6 is not installed${NC}"
    echo "Install with: brew install k6"
    exit 1
fi

# Create k6 test scripts directory
mkdir -p scripts/load-tests

# Generate auth load test script
cat > scripts/load-tests/auth-load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const sessionCreationTime = new Trend('session_creation_time');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    errors: ['rate<0.1'],              // Error rate under 10%
  },
};

const BASE_URL = __ENV.AUTH_API_URL || 'https://zscpgvpyk9.execute-api.af-south-1.amazonaws.com/staging';

export default function () {
  // Test: Create Session
  const sessionPayload = JSON.stringify({
    clientId: `load-test-${__VU}-${__ITER}`,
  });

  const sessionRes = http.post(`${BASE_URL}/sessions`, sessionPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  const sessionSuccess = check(sessionRes, {
    'session created': (r) => r.status === 200 || r.status === 201,
    'has session token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.sessionToken;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!sessionSuccess);
  sessionCreationTime.add(sessionRes.timings.duration);

  sleep(1);

  // Test: Health Check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check ok': (r) => r.status === 200,
  });

  sleep(1);
}
EOF

# Generate verification load test script
cat > scripts/load-tests/verification-load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const verificationTime = new Trend('verification_creation_time');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Ramp up to 5 users (respect Textract 1 TPS)
    { duration: '2m', target: 5 },    // Stay at 5 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% of requests under 5s
    errors: ['rate<0.15'],             // Error rate under 15%
  },
};

const BASE_URL = __ENV.VERIFICATION_API_URL || 'https://maybpud8y5.execute-api.af-south-1.amazonaws.com/staging';

export default function () {
  // Test: Health Check
  const healthRes = http.get(`${BASE_URL}/health`);
  const healthOk = check(healthRes, {
    'health check ok': (r) => r.status === 200,
  });

  errorRate.add(!healthOk);

  sleep(2); // Respect rate limits

  // Note: Full verification tests require valid session tokens
  // and document uploads, which are complex to simulate in load tests.
  // For production load testing, use a dedicated test environment
  // with pre-created test data.
}
EOF

# Generate combined load test script
cat > scripts/load-tests/combined-load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const authLatency = new Trend('auth_latency');
const verificationLatency = new Trend('verification_latency');
const totalRequests = new Counter('total_requests');

// Test configuration
export const options = {
  scenarios: {
    auth_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 10 },
        { duration: '30s', target: 0 },
      ],
      exec: 'authTest',
    },
    verification_load: {
      executor: 'constant-vus',
      vus: 3, // Low VUs to respect Textract quotas
      duration: '2m',
      exec: 'verificationTest',
      startTime: '30s', // Start after auth ramp-up
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    errors: ['rate<0.1'],
  },
};

const AUTH_URL = __ENV.AUTH_API_URL || 'https://zscpgvpyk9.execute-api.af-south-1.amazonaws.com/staging';
const VERIFICATION_URL = __ENV.VERIFICATION_API_URL || 'https://maybpud8y5.execute-api.af-south-1.amazonaws.com/staging';

export function authTest() {
  group('Auth Service', () => {
    const res = http.get(`${AUTH_URL}/health`);
    const success = check(res, {
      'auth health ok': (r) => r.status === 200,
    });
    errorRate.add(!success);
    authLatency.add(res.timings.duration);
    totalRequests.add(1);
  });
  sleep(1);
}

export function verificationTest() {
  group('Verification Service', () => {
    const res = http.get(`${VERIFICATION_URL}/health`);
    const success = check(res, {
      'verification health ok': (r) => r.status === 200,
    });
    errorRate.add(!success);
    verificationLatency.add(res.timings.duration);
    totalRequests.add(1);
  });
  sleep(2); // Respect rate limits
}
EOF

echo -e "${GREEN}Load test scripts generated in scripts/load-tests/${NC}"

# Parse arguments
TEST_NAME="${1:-all}"
shift || true

case "$TEST_NAME" in
  auth)
    echo -e "${YELLOW}Running auth load test...${NC}"
    k6 run scripts/load-tests/auth-load-test.js -e AUTH_API_URL="$AUTH_API_URL" "$@"
    ;;
  verification)
    echo -e "${YELLOW}Running verification load test...${NC}"
    k6 run scripts/load-tests/verification-load-test.js -e VERIFICATION_API_URL="$VERIFICATION_API_URL" "$@"
    ;;
  all)
    echo -e "${YELLOW}Running combined load test...${NC}"
    k6 run scripts/load-tests/combined-load-test.js \
      -e AUTH_API_URL="$AUTH_API_URL" \
      -e VERIFICATION_API_URL="$VERIFICATION_API_URL" \
      "$@"
    ;;
  *)
    echo -e "${RED}Unknown test: $TEST_NAME${NC}"
    echo "Usage: $0 [auth|verification|all] [k6 options]"
    exit 1
    ;;
esac

echo -e "${GREEN}Load test complete!${NC}"
