#!/bin/bash
# ============================================================================
# Burn-In Test Runner
# ============================================================================
# Runs tests multiple times to detect flaky tests before merge.
#
# Usage:
#   ./scripts/burn-in.sh [iterations] [base-branch]
#
# Examples:
#   ./scripts/burn-in.sh              # 10 iterations, compare to main
#   ./scripts/burn-in.sh 20           # 20 iterations
#   ./scripts/burn-in.sh 10 develop   # Compare to develop branch
#
# ============================================================================

set -e

# Configuration
ITERATIONS=${1:-10}
BASE_BRANCH=${2:-main}
SPEC_PATTERN='\.(spec|test)\.(ts|js)$'
TEST_DIR="sdks/web-sdk"

echo "🔥 Burn-In Test Runner"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Iterations:  $ITERATIONS"
echo "Base branch: $BASE_BRANCH"
echo "Test dir:    $TEST_DIR"
echo ""

# Detect changed test files
echo "📋 Detecting changed test files..."
CHANGED_SPECS=$(git diff --name-only $BASE_BRANCH...HEAD 2>/dev/null | grep -E "$SPEC_PATTERN" | grep -E "^$TEST_DIR/e2e/" || echo "")

if [ -z "$CHANGED_SPECS" ]; then
  echo "ℹ️  No test files changed. Running full suite."
  TEST_CMD="pnpm test:e2e --project=chromium"
else
  echo "Changed test files:"
  echo "$CHANGED_SPECS" | sed 's/^/  - /'
  echo ""

  # Convert to relative paths for Playwright
  RELATIVE_SPECS=$(echo "$CHANGED_SPECS" | sed "s|$TEST_DIR/||g" | tr '\n' ' ')
  TEST_CMD="pnpm test:e2e --project=chromium $RELATIVE_SPECS"
fi

echo ""
echo "Test command: $TEST_CMD"
echo ""

# Change to test directory
cd "$TEST_DIR"

# Burn-in loop
FAILURES=()
for i in $(seq 1 $ITERATIONS); do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔄 Iteration $i/$ITERATIONS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if $TEST_CMD 2>&1 | tee "../burn-in-log-$i.txt"; then
    echo "✅ Iteration $i passed"
  else
    echo "❌ Iteration $i failed"
    FAILURES+=($i)

    # Save failure artifacts
    mkdir -p ../burn-in-failures/iteration-$i
    cp -r test-results/ ../burn-in-failures/iteration-$i/ 2>/dev/null || true
    cp -r playwright-report/ ../burn-in-failures/iteration-$i/ 2>/dev/null || true

    echo ""
    echo "🛑 BURN-IN FAILED on iteration $i"
    echo "Failure artifacts saved to: burn-in-failures/iteration-$i/"
    echo "Logs saved to: burn-in-log-$i.txt"
    echo ""
    exit 1
  fi

  echo ""
done

# Success summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 BURN-IN PASSED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "All $ITERATIONS iterations passed"
echo "Tests are stable and ready to merge."
echo ""

# Cleanup logs
rm -f ../burn-in-log-*.txt

exit 0
