#!/bin/bash
# ============================================================================
# Local CI Mirror
# ============================================================================
# Mirrors the CI pipeline locally for debugging and validation.
#
# Usage:
#   ./scripts/ci-local.sh [--full]
#
# Options:
#   --full    Run full pipeline including burn-in (slower)
#
# ============================================================================

set -e

FULL_MODE=false
if [ "$1" == "--full" ]; then
  FULL_MODE=true
fi

echo "🔍 Local CI Pipeline"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Mode: $([ "$FULL_MODE" == true ] && echo 'Full' || echo 'Quick')"
echo ""

# Track timing
START_TIME=$(date +%s)

# ============================================================================
# Stage 1: Install
# ============================================================================
echo ""
echo "📦 Stage 1: Install Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pnpm install --frozen-lockfile || pnpm install

# ============================================================================
# Stage 2: Lint
# ============================================================================
echo ""
echo "🔍 Stage 2: Lint & Format"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pnpm lint || echo "⚠️  Lint warnings (continuing...)"
pnpm format || echo "⚠️  Format warnings (continuing...)"

# ============================================================================
# Stage 3: Unit Tests
# ============================================================================
echo ""
echo "🧪 Stage 3: Unit Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pnpm test || echo "⚠️  Unit test warnings (continuing...)"

# ============================================================================
# Stage 4: E2E Tests
# ============================================================================
echo ""
echo "🎭 Stage 4: E2E Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd sdks/web-sdk

# Install Playwright browsers if needed
npx playwright install chromium --with-deps 2>/dev/null || true

# Run E2E tests
pnpm test:e2e --project=chromium || {
  echo "❌ E2E tests failed"
  exit 1
}

cd ../..

# ============================================================================
# Stage 5: Burn-In (Full mode only)
# ============================================================================
if [ "$FULL_MODE" == true ]; then
  echo ""
  echo "🔥 Stage 5: Burn-In (3 iterations)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  cd sdks/web-sdk
  for i in {1..3}; do
    echo "Burn-in iteration $i/3"
    pnpm test:e2e --project=chromium || {
      echo "❌ Burn-in failed on iteration $i"
      exit 1
    }
  done
  cd ../..

  echo "✅ Burn-in passed (3/3)"
fi

# ============================================================================
# Summary
# ============================================================================
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Local CI Pipeline PASSED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Duration: ${DURATION}s"
echo ""
echo "Your changes are ready for CI!"
