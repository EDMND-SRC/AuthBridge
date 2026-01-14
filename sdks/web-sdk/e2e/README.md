# AuthBridge Web SDK - E2E Tests

Production-ready Playwright test suite for the AuthBridge Web SDK.

## Migration Status

✅ **Complete**: Migration finished. Legacy files removed.

**Modern pattern benefits:**
- ✅ No hard waits (deterministic)
- ✅ Explicit assertions in test body
- ✅ Composable fixtures via `mergeTests`
- ✅ Network-first patterns
- ✅ Data factories for parallel safety

## Quick Start

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
npx playwright install --with-deps

# Run all tests
pnpm test:e2e

# Run with UI mode (interactive)
pnpm test:e2e:ui
```

## Test Commands

| Command | Description |
|---------|-------------|
| `pnpm test:e2e` | Run all tests (headless) |
| `pnpm test:e2e:ui` | Interactive UI mode |
| `pnpm test:e2e:headed` | Run with visible browser |
| `pnpm test:e2e:debug` | Debug mode with inspector |
| `pnpm test:e2e:chromium` | Chromium only |
| `pnpm test:e2e:firefox` | Firefox only |
| `pnpm test:e2e:mobile` | Mobile Chrome (Pixel 5) |
| `pnpm test:e2e:report` | View HTML report |

## Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Test environment: local | staging | production
TEST_ENV=local
```

## Directory Structure

```
e2e/
├── api/                  # API tests (no browser)
│   └── example.api.spec.ts
├── assets/               # Test assets
│   └── selfie.mjpeg      # Fake video for camera tests
├── support/              # Test infrastructure
│   ├── enums.ts          # Flow type enums
│   ├── fixtures/         # Playwright fixtures (composable)
│   │   ├── index.ts      # Merged UI fixtures
│   │   └── api-fixtures.ts # API testing fixtures
│   ├── factories/        # Data factories
│   │   ├── index.ts
│   │   └── verification-factory.ts
│   └── helpers/          # Pure helper functions
│       └── flow-helpers.ts
├── kyc/                  # KYC flow tests
│   ├── passport.spec.ts
│   ├── id-card.spec.ts
│   ├── drivers-license.spec.ts
│   └── voter-id.spec.ts
├── kyb/                  # KYB flow tests
│   ├── passport.spec.ts
│   ├── id-card.spec.ts
│   ├── drivers-license.spec.ts
│   └── voter-id.spec.ts
└── README.md
```

## Fixture Architecture

Tests use composable fixtures via `mergeTests`:

```typescript
import { test, expect } from '../support/fixtures';
import { EFlow } from '../fixtures/enums.mjs';

test('KYC passport flow completes', async ({ page, openSDKModal, runKYCFlow }) => {
  await openSDKModal(EFlow.MY_KYC_FLOW);
  await runKYCFlow('passport');
});
```

### Available UI Fixtures

| Fixture | Description |
|---------|-------------|
| `openSDKModal(flow)` | Opens SDK modal for KYC/KYB flow |
| `waitForSDKReady()` | Waits for SDK to be fully loaded |
| `takePicture()` | Captures photo with fake camera |
| `confirmPicture()` | Confirms captured photo |
| `runKYCFlow(docType)` | Runs complete KYC flow |
| `runKYBFlow(docType)` | Runs complete KYB flow |

### API Testing Fixtures

For backend/API testing without browser overhead:

```typescript
import { apiTest as test, expect } from '../support/fixtures/api-fixtures';

test('should create verification', async ({ apiRequest }) => {
  const { status, body } = await apiRequest({
    method: 'POST',
    path: '/api/verifications',
    data: { type: 'kyc' },
  });

  expect(status).toBe(201);
});
```

| Fixture | Description |
|---------|-------------|
| `apiRequest(options)` | Enhanced HTTP client with error handling |
| `recurse(fn, condition)` | Poll until condition met (async ops) |
| `getAuthToken(email, pw)` | Get auth token for authenticated requests |

## Timeout Standards

| Type | Duration | Usage |
|------|----------|-------|
| Action | 15s | click, fill, etc. |
| Navigation | 30s | page.goto, reload |
| Assertion | 10s | expect() |
| Test | 60s | Full test timeout |

## Camera Mocking

Tests use fake video streams for camera capture:

- **Chromium**: `--use-fake-device-for-media-stream` flag
- **Firefox**: `media.navigator.streams.fake` preference
- **Video file**: `fixtures/selfie.mjpeg`

## CI Integration

Tests run in CI with:
- Single worker (stability)
- 2 retries on failure
- Artifact capture on failure (screenshots, videos, traces)
- JUnit XML output for CI integration

See `.github/workflows/e2e.yml` for the full CI configuration.

```yaml
# GitHub Actions example
- name: Run E2E Tests
  run: pnpm test:e2e
  env:
    TEST_ENV: staging
    CI: true

- name: Upload Test Results
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: sdks/web-sdk/playwright-report/
```

## Best Practices

1. **No hard waits** - Use `waitForResponse`, `waitForSelector`, or element state
2. **Explicit assertions** - Keep `expect()` in test bodies, not helpers
3. **Unique data** - Use faker for dynamic test data
4. **Self-cleaning** - Fixtures auto-cleanup after tests
5. **Network-first** - Intercept before navigate
6. **API-first setup** - Use API calls for test data, not UI

## Debugging

```bash
# Debug mode with Playwright Inspector
pnpm test:e2e:debug

# Run specific test file
npx playwright test kyc/passport.test.ts

# Run with trace viewer
npx playwright test --trace on
npx playwright show-trace test-results/trace.zip
```

## Data Factories

Use factories for dynamic, parallel-safe test data:

```typescript
import { createVerification, createUser } from '../support/factories';

// Default verification
const verification = createVerification();

// KYB verification with specific document
const kybVerification = createVerification({
  type: 'kyb',
  documentType: 'passport',
});

// User with specific email
const user = createUser({ email: 'admin@example.com' });

// Multiple verifications
const verifications = createVerifications(5, { type: 'kyc' });
```

## Artifacts

On failure, tests capture:
- Screenshots (`test-results/*.png`)
- Videos (`test-results/*.webm`)
- Traces (`test-results/*.zip`)
- HTML report (`playwright-report/`)

View report: `pnpm test:e2e:report`

## Knowledge Base References

This test framework follows patterns from:
- Fixture architecture (pure functions + mergeTests)
- Data factories with auto-cleanup
- Network-first testing safeguards
- Failure-only artifact capture
- Standardized timeout configuration
