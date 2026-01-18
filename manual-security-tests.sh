#!/bin/bash
# Manual Security Testing Script
# AuthBridge Staging Environment

API_BASE="https://maybpud8y5.execute-api.af-south-1.amazonaws.com/staging"

echo "=== AuthBridge Manual Security Tests ==="
echo "Target: $API_BASE"
echo "Date: $(date)"
echo ""

# Test 1: Missing Authentication
echo "Test 1: Missing Authentication (should return 401 or 403)"
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -X GET "$API_BASE/api/v1/cases"
echo ""

# Test 2: Invalid API Key
echo "Test 2: Invalid API Key (should return 401)"
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -X GET "$API_BASE/api/v1/cases" \
  -H "Authorization: Bearer invalid_token_12345"
echo ""

# Test 3: Malformed Authorization Header
echo "Test 3: Malformed Authorization Header (should return 401)"
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -X GET "$API_BASE/api/v1/cases" \
  -H "Authorization: InvalidFormat"
echo ""

# Test 4: SQL Injection Attempt
echo "Test 4: SQL Injection in Query Parameter (should be sanitized)"
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -X GET "$API_BASE/api/v1/cases?id=' OR '1'='1"
echo ""

# Test 5: XSS Attempt
echo "Test 5: XSS in Query Parameter (should be sanitized)"
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -X GET "$API_BASE/api/v1/cases?search=<script>alert('xss')</script>"
echo ""

# Test 6: Path Traversal Attempt
echo "Test 6: Path Traversal (should return 404 or 403)"
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -X GET "$API_BASE/api/v1/../../etc/passwd"
echo ""

# Test 7: Excessive Request Size
echo "Test 7: Large Payload (should be rate limited or rejected)"
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -X POST "$API_BASE/api/v1/verifications" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c 'print("{\"data\":\"" + "A"*1000000 + "\"}")')"
echo ""

# Test 8: CORS Headers
echo "Test 8: CORS Preflight Request"
curl -s -i -X OPTIONS "$API_BASE/api/v1/verifications" \
  -H "Origin: https://malicious-site.com" \
  -H "Access-Control-Request-Method: POST" | grep -i "access-control"
echo ""

# Test 9: HTTP Methods
echo "Test 9: Unsupported HTTP Method (should return 405)"
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -X TRACE "$API_BASE/api/v1/cases"
echo ""

# Test 10: Rate Limiting
echo "Test 10: Rate Limiting (10 rapid requests)"
for i in {1..10}; do
  curl -s -o /dev/null -w "Request $i: HTTP %{http_code}\n" \
    -X GET "$API_BASE/api/v1/cases"
  sleep 0.1
done
echo ""

echo "=== Security Tests Complete ==="
