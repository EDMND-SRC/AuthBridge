# CI/CD Quality Pipeline

Production-ready CI/CD pipeline for AuthBridge with test execution, burn-in detection, and quality gates.

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Quality Pipeline                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │ Install  │───▶│   Lint   │───▶│   Unit   │───▶│   E2E    │          │
│  │  Cache   │    │  Format  │    │  Tests   │    │  Tests   │          │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘          │
│       │                                               │                  │
│       │                                               ▼                  │
│       │                                         ┌──────────┐            │
│       │                                         │ Burn-In  │ (optional) │
│       │                                         │  Tests   │            │
│       │                                         └──────────┘            │
│       │                                               │                  │
│       ▼                                               ▼                  │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │                    Quality Gate                           │          │
│  │  ✓ Lint passed  ✓ Unit passed  ✓ E2E passed              │          │
│  └──────────────────────────────────────────────────────────┘          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Workflows

### 1. Quality Pipeline (`.github/workflows/quality-pipeline.yml`)

Full quality pipeline with all stages:

| Stage | Purpose | Timeout |
|-------|---------|---------|
| Install | Cache dependencies & browsers | 10 min |
| Lint | Code quality checks | 10 min |
| Unit Tests | Fast feedback on logic | 15 min |
| E2E Tests | 4 parallel shards | 30 min |
| Burn-In | Flaky test detection | 60 min |
| Report | Merge results | 10 min |
| Quality Gate | Pass/fail decision | 5 min |

**Triggers:**
- Push to `main` or `dev`
- Pull requests to `main` or `dev`
- Weekly schedule (Sundays 2 AM UTC)
- Manual dispatch

### 2. E2E Tests (`.github/workflows/e2e.yml`)

Focused E2E testing for SDK changes:

| Job | Browser | Purpose |
|-----|---------|---------|
| e2e-tests | Chromium, Firefox | Desktop browsers |
| e2e-mobile | Mobile Chrome | Mobile viewport |

**Triggers:**
- Changes to `sdks/web-sdk/**`
- Changes to workflow file

## Running Locally

### Quick CI Check

```bash
./scripts/ci-local.sh
```

Runs: Install → Lint → Unit → E2E (single run)

### Full CI Check (with Burn-In)

```bash
./scripts/ci-local.sh --full
```

Runs: Install → Lint → Unit → E2E → Burn-In (3 iterations)

### Selective Testing

```bash
./scripts/test-changed.sh
```

Runs only tests affected by your changes.

### Burn-In Testing

```bash
./scripts/burn-in.sh 10 main
```

Runs changed tests 10 times to detect flakiness.

## Burn-In Strategy

Burn-in testing runs tests multiple times to catch non-deterministic failures.

### When Burn-In Runs

- ✅ Weekly scheduled runs (Sundays)
- ✅ Manual trigger with `run_burn_in: true`
- ✅ PRs with `burn-in` label
- ❌ Not on every commit (too slow)

### Iterations

| Scenario | Iterations | Purpose |
|----------|------------|---------|
| Quick check | 3 | Fast feedback |
| Standard | 10 | Thorough detection |
| High confidence | 20+ | Critical paths |

### Failure Handling

- **Any failure** = tests are flaky
- Must fix before merging
- Artifacts saved for debugging

## Sharding Strategy

E2E tests run in 4 parallel shards:

```yaml
strategy:
  fail-fast: false  # Run all shards even if one fails
  matrix:
    shard: [1, 2, 3, 4]
```

**Benefits:**
- ~75% faster execution
- Full evidence on failures
- Independent shard results

## Caching

### Dependencies Cache

```yaml
key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
```

Caches:
- `node_modules/`
- `**/node_modules/`

### Playwright Cache

```yaml
key: ${{ runner.os }}-playwright-${{ hashFiles('**/pnpm-lock.yaml') }}
```

Caches:
- `~/.cache/ms-playwright/`

**Savings:** 2-5 minutes per run

## Artifacts

### On Failure

| Artifact | Retention | Contents |
|----------|-----------|----------|
| test-results-shard-N | 30 days | Screenshots, videos, traces |
| playwright-report-N | 30 days | HTML report |
| burn-in-failures | 30 days | Failure evidence |

### Always

| Artifact | Retention | Contents |
|----------|-----------|----------|
| merged-test-results | 30 days | Combined shard results |

## Quality Gate

The pipeline passes only if:

- ✅ E2E tests pass (all shards)
- ⚠️ Lint warnings allowed (non-blocking)
- ⚠️ Unit test warnings allowed (non-blocking)

## Manual Triggers

### Run with Burn-In

```yaml
workflow_dispatch:
  inputs:
    run_burn_in: true
    burn_in_iterations: '20'
```

### Run Against Staging

```yaml
workflow_dispatch:
  inputs:
    environment: staging
```

## Secrets Required

| Secret | Purpose | Required |
|--------|---------|----------|
| `GITHUB_TOKEN` | Artifact upload | Auto-provided |
| `SLACK_WEBHOOK` | Notifications | Optional |

## Performance Targets

| Stage | Target | Actual |
|-------|--------|--------|
| Install | <5 min | ~2 min (cached) |
| Lint | <2 min | ~1 min |
| Unit Tests | <5 min | ~2 min |
| E2E (per shard) | <10 min | ~8 min |
| Total Pipeline | <30 min | ~15 min |

## Troubleshooting

### Tests Pass Locally, Fail in CI

1. Check environment differences (Node version, OS)
2. Look for timing-dependent tests
3. Check for hardcoded URLs/ports
4. Review artifact traces

### Flaky Tests Detected

1. Run burn-in locally: `./scripts/burn-in.sh 20`
2. Check for race conditions
3. Add explicit waits (not `waitForTimeout`)
4. Review network interception order

### Cache Issues

Clear caches by changing the cache key:

```yaml
key: ${{ runner.os }}-pnpm-v2-${{ hashFiles('**/pnpm-lock.yaml') }}
```

## Badge

Add to README:

```markdown
[![Quality Pipeline](https://github.com/YOUR_ORG/authbridge/actions/workflows/quality-pipeline.yml/badge.svg)](https://github.com/YOUR_ORG/authbridge/actions/workflows/quality-pipeline.yml)
```
