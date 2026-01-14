#!/bin/bash
# ============================================================================
# Selective Test Runner
# ============================================================================
# Runs only tests affected by changed files for faster feedback.
#
# Usage:
#   ./scripts/test-changed.sh [base-branch]
#
# Examples:
#   ./scripts/test-changed.sh          # Compare to main
#   ./scripts/test-changed.sh develop  # Compare to develop
#
# ============================================================================

set -e

BASE_BRANCH=${1:-main}

echo "🎯 Selective Test Runner"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Base branch: $BASE_BRANCH"
echo ""

# Detect changed files
CHANGED_FILES=$(git diff --name-only $BASE_BRANCH...HEAD 2>/dev/null || git diff --name-only HEAD~1)

if [ -z "$CHANGED_FILES" ]; then
  echo "✅ No files changed. Nothing to test."
  exit 0
fi

echo "Changed files:"
echo "$CHANGED_FILES" | sed 's/^/  - /'
echo ""

# Determine test strategy based on changes
run_all=false
run_e2e=false
run_unit=false
affected_areas=""

# Check for critical changes that require full test suite
if echo "$CHANGED_FILES" | grep -qE '(package\.json|pnpm-lock\.yaml|playwright\.config|\.github/workflows)'; then
  echo "⚠️  Critical configuration files changed."
  echo "   Running FULL test suite."
  run_all=true
fi

# Check for SDK changes
if echo "$CHANGED_FILES" | grep -qE '^sdks/web-sdk/'; then
  echo "📦 Web SDK files changed."
  run_e2e=true
  affected_areas="$affected_areas web-sdk"
fi

# Check for test file changes
if echo "$CHANGED_FILES" | grep -qE '\.(spec|test)\.(ts|js)$'; then
  echo "🧪 Test files changed."
  run_e2e=true
fi

# Check for source file changes
if echo "$CHANGED_FILES" | grep -qE '\.(ts|tsx|js|jsx|svelte)$' | grep -vE '\.(spec|test)\.'; then
  echo "📝 Source files changed."
  run_unit=true
fi

echo ""
echo "Test strategy:"
echo "  Run all:  $run_all"
echo "  Run E2E:  $run_e2e"
echo "  Run unit: $run_unit"
echo ""

# Execute tests
if [ "$run_all" == true ]; then
  echo "Running full test suite..."
  pnpm test
  cd sdks/web-sdk && pnpm test:e2e && cd ../..

elif [ "$run_e2e" == true ]; then
  echo "Running E2E tests..."
  cd sdks/web-sdk

  # Find changed test files
  CHANGED_SPECS=$(echo "$CHANGED_FILES" | grep -E '^sdks/web-sdk/e2e/.*\.(spec|test)\.(ts|js)$' | sed 's|sdks/web-sdk/||g' || echo "")

  if [ -n "$CHANGED_SPECS" ]; then
    echo "Running changed specs only:"
    echo "$CHANGED_SPECS" | sed 's/^/  - /'
    pnpm test:e2e --project=chromium $CHANGED_SPECS
  else
    echo "Running smoke tests..."
    pnpm test:e2e --project=chromium --grep="@smoke" || pnpm test:e2e --project=chromium
  fi

  cd ../..

elif [ "$run_unit" == true ]; then
  echo "Running unit tests..."
  pnpm test

else
  echo "No tests to run for these changes."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Selective tests completed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
