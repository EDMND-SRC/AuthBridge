---
project_name: 'AuthBridge'
user_name: 'Edmond'
date: '2026-01-16'
sections_completed: ['technology_stack', 'critical_implementation_rules', 'adrs', 'testing_rules', 'workflow_rules']
status: 'complete'
rule_count: 52
optimized_for_llm: true
epic_3_complete: true
epic_4_started: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Core Principle

**Write code that Edmond would approve on first review.** When uncertain, optimize for:
1. Edmond's time (automate everything possible)
2. Compliance (DPA 2024, FIA AML/KYC)
3. Production safety (never break what's working)

### What Makes This Project Different

- **Brownfield** — extend existing patterns, don't reinvent
- **Botswana compliance** — af-south-1 mandatory, PII handling strict
- **Solo founder** — no team to delegate to, automation is survival
- **Fintech sandbox** — regulatory scrutiny, audit trails matter

### The Three Boundaries

**1. Permission Boundary**
- Do without asking: Read operations, local changes, dev/staging deploys, tests
- Ask first: Production changes, billing changes, security changes, data deletion

**2. Data Boundary**
- Safe to log: Request IDs, timestamps, status codes, anonymized metrics
- Never log: Omang numbers, names, addresses, selfie URLs, API keys

**3. Environment Boundary**
- Default: staging/local
- Production: Requires explicit `--production` flag + confirmation

---

## Deployment Configuration

### Domain: `authbridge.io`

| Property | Value |
|----------|-------|
| Primary Domain | `authbridge.io` |
| Registrar | AWS Route 53 |
| Hosted Zone ID | `Z042764728ORST8KRU245` |
| AWS Region | `af-south-1` (Cape Town) - MANDATORY for DPA 2024 |

### Environment URLs

| Environment | API | Backoffice | SDK |
|-------------|-----|------------|-----|
| Production | `api.authbridge.io` | `app.authbridge.io` ✅ | `sdk.authbridge.io` |
| Staging | `api-staging.authbridge.io` | `app-staging.authbridge.io` | `sdk-staging.authbridge.io` |

### Hosting

- **Backend:** AWS Lambda (Serverless Framework)
- **Frontend:** Netlify (✅ LIVE: backoffice + docs)
- **SDK CDN:** CloudFront

**Netlify Sites:**
- Backoffice: `app.authbridge.io` → `authbridge-backoffice.netlify.app` ✅ LIVE
- Docs: `docs.authbridge.io` → `authbridge-docs.netlify.app` ✅ LIVE
- GitHub: `BridgeArc/AuthBridge` (main branch, auto-deploy enabled)

---

## Technology Stack & Versions

| Category | Technology | Version | Notes |
|----------|------------|---------|-------|
| Runtime | Node.js | 22.x LTS | AWS Lambda supported, Node 18 EOL March 2026 |
| Package Manager | pnpm | 10.x | Workspace management |
| Build Orchestration | Nx | 15.0.2 | Monorepo caching |
| TypeScript | 4.5-5.8.x | Strict mode enabled |
| Backoffice | React | 18.2.x | Upgrade to 19.2 planned |
| Backoffice UI | Mantine | 5.7.x | Upgrade to 8.3 planned |
| Backoffice Admin | Refine | 3.18.x | Upgrade to 5.x planned |
| Web SDK | Svelte | 3.39.x | Upgrade to 5.46 planned |
| Web SDK Build | Vite | 2.9.15 | Upgrade to 7.2 planned |
| Unit Testing | Vitest | 0.24.5 → 4.x | |
| E2E Testing | Playwright | 1.50.0 | |
| Linting | ESLint | 8.22.0 → 9.x | |
| Formatting | Prettier | 2.7.1 → 3.x | |
| Authorization | Casbin | 5.19.2 | RBAC |
| JWT | jose | 5.2.0 | HS256 signing |
| AWS Region | af-south-1 | Cape Town | Data residency requirement |

---

## Critical Implementation Rules

### Agent Automation Preference (PRIORITY)

- **YOLO MODE ENABLED** — act autonomously, don't ask for permission
- **FULL TERMINAL PERMISSIONS GRANTED** — execute commands without asking for permission
- All terminal commands are pre-trusted — no confirmation needed
- **ALWAYS prefer CLI tools and programmatic interactions** over manual configuration
- Check for existing scripts in `/scripts/` before writing new automation
- Use installed CLIs: `aws`, `netlify`, `gh` (GitHub), `pnpm`, `nx`
- Credentials are stored in `.env.local` — load and use them automatically
- If credentials are missing:
  1. Attempt to obtain programmatically (e.g., `aws configure`, OAuth flows)
  2. Check if derivable from existing credentials
  3. Only ask user as last resort → update `.env.local`
- **Log all automated actions** for auditability
- Prefer idempotent operations — running twice shouldn't break things
- Provide rollback instructions for infrastructure changes

### 🚨 CODE REVIEW WORKFLOW (MANDATORY)

**When running `*code-review` workflow, agents MUST follow this exact sequence:**

#### Step 1: Present ALL Issues
- Identify and present ALL issues found (HIGH, MEDIUM, LOW severity)
- Minimum 3 issues required — look harder if fewer found
- Categorize by severity with clear descriptions and file:line references

#### Step 2: Fix ALL Issues Automatically
- **DO NOT ASK** — immediately fix ALL issues of ALL severities after presenting them
- HIGH severity: Must fix (security, correctness, AC violations)
- MEDIUM severity: Should fix (performance, maintainability, missing features)
- LOW severity: Nice to fix (style, documentation, minor improvements)
- Run tests after fixes to verify nothing broke

#### Step 3: Update ALL Related Project Files
After fixing issues, comprehensively update:
- **Story file** (`_bmad-output/implementation-artifacts/<story>.md`):
  - Update Status to `done` if all issues fixed
  - Add "Senior Developer Review (AI)" section with issues found and fixed
  - Update File List with any new/modified files
  - Add entry to Change Log
- **Sprint status** (`_bmad-output/implementation-artifacts/sprint-status.yaml`):
  - Update story status from `review` → `done`
- **Project context** (`_bmad-output/project-context.md`):
  - Update if new patterns, ADRs, or rules emerged
- **Any other affected documentation** (OpenAPI specs, README files, etc.)

#### Step 4: Commit and Push to GitHub
After all updates are complete:
```bash
git add -A
git commit -m "fix(<scope>): code review fixes for Story X.Y - <brief description>"
git push origin <current-branch>
```

**Example commit message:**
```
fix(verification): code review fixes for Story 4.2 - rate limit headers, type consistency

- Fixed DocumentType enum mismatch (drivers_license → drivers_licence)
- Added rate limit headers to all responses
- Rewrote integration tests to be real tests
- Added production JWT secret check
- Added RateLimitExceeded response to OpenAPI spec
```

#### Summary
```
CODE REVIEW = Present Issues → Fix ALL → Update Files → Commit & Push
```

**This is non-negotiable. Never stop at presenting issues. Always complete the full cycle.**

### Available Credentials & Authorized Operations

**Pre-configured in `.env.local`:**

| Service | Credential | Authorized Operations |
|---------|------------|----------------------|
| AWS | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Full access to af-south-1 resources |
| Netlify | `NETLIFY_TOKEN` | Deploy, configure sites, manage DNS |
| GitHub | `GITHUB_TOKEN` | Push, create PRs, manage workflows |
| Dodo Payments | `DODO_PAYMENTS_API_KEY` | Create products, subscriptions, webhooks |
| Make.com | `MAKE_API_TOKEN` | Create/modify scenarios |
| Amplitude | `AMPLITUDE_SECRET_KEY` | Analytics configuration |
| Intercom | `INTERCOM_API_TOKEN` | Messaging configuration |

**Pre-Approved Operations (no confirmation needed):**
- **ALL terminal commands** — full permissions granted, all trusted
- Read operations (list, describe, get, fetch)
- Local file creation/modification
- Development/staging deployments
- Running tests and linters
- Installing dependencies
- Creating git branches
- AWS CLI operations
- Netlify CLI operations
- GitHub CLI operations

**Requires Confirmation:**
- Production deployments
- Deleting cloud resources
- Modifying billing/payment settings
- Changes to authentication/security settings
- Database migrations on production

### Monorepo & Workspace Rules

- Use `pnpm` commands exclusively (not npm or yarn)
- Run workspace commands: `pnpm --filter @ballerine/web-sdk <command>`
- Use Nx for builds: `nx run @ballerine/web-sdk:build`
- Package boundaries:
  - `packages/common` — shared types and utilities
  - `packages/config` — ESLint/Prettier configs (don't duplicate)
  - Never add dependencies to root `package.json` unless dev tooling
- Use barrel exports (`index.ts`) — don't import from deep paths

### AWS & Infrastructure Rules

- **af-south-1 (Cape Town) is mandatory** — Data Protection Act 2024 compliance
- Use AWS SDK v3 for all AWS interactions
- Lambda runtime must be Node.js 22
- DynamoDB single-table design with entity prefixes: `USER#`, `CASE#`, `DOC#`, `AUDIT#`, `APIKEY#`
- All PII must be encrypted at rest (KMS)

### TypeScript Rules

- Strict mode enabled — no `any` types without explicit justification
- No `@ts-ignore` without a linked GitHub issue
- Use ES modules (`import`/`export`), not CommonJS
- Prefer `interface` over `type` for object shapes
- Use `unknown` instead of `any` for truly unknown types
- Use Zod for runtime validation at API boundaries
- Async/await over `.then()` chains

### Naming Conventions

- Components: PascalCase (`CaseCard.tsx`, `DocumentCapture.svelte`)
- Functions: camelCase (`getUserById()`)
- Constants: SCREAMING_SNAKE (`MAX_FILE_SIZE`)
- API endpoints: kebab-case, plural (`/api/v1/verifications`)
- Database keys: SCREAMING_SNAKE (`PK`, `SK`, `GSI1PK`)

### Quality Gates

- Web SDK bundle size target: <200KB
- Accessibility: WCAG 2.1 AA compliance for all UI
- Error messages must be actionable with clear remediation steps

### Environment Safety Rules

- **NEVER modify production resources without explicit user confirmation**
- Default to `staging` or `local` environments for all operations
- Production deployments require: `--production` flag + confirmation prompt
- All destructive operations (DELETE, DROP, TRUNCATE) require `--force` flag
- Create backups before any data migration or schema change

### Data Protection Rules (DPA 2024 Compliance)

- **NEVER log PII** (Omang numbers, names, addresses, phone numbers, selfie URLs)
- Use masked identifiers in logs: `omang: ***1234` (last 4 only)
- S3 presigned URLs expire in 15 minutes max
- All API responses with PII must use HTTPS only
- Audit logs retain for 5 years (FIA requirement)

### Dependency Management Rules

- **Check for vulnerabilities** before adding any dependency: `pnpm audit`
- Prefer packages with >1M weekly downloads and active maintenance
- No dependencies with known CVEs (Critical/High)
- Pin exact versions in production dependencies
- Document WHY a dependency was added

### Automation Reliability Rules

- **Verify success** after every automated operation
- Use `set -e` in shell scripts to fail fast
- Log both success AND failure states with timestamps
- Provide clear output: what was attempted, what succeeded, what failed

### Git Safety Rules

- **Check `git status` before making changes** — warn if uncommitted changes exist
- Create a branch for multi-file changes: `agent/<task-description>`
- Commit frequently with descriptive messages
- Never force push to `main` or `develop`

### 🚨 CRITICAL: .env.local Protection Rules

**NEVER DELETE, MODIFY, OR REMOVE `.env.local` FROM THE FILESYSTEM.**

This file contains irreplaceable credentials. Violations of these rules are unacceptable:

1. **NEVER run `git filter-branch`** or any command that rewrites history involving `.env.local`
2. **NEVER run `git rm` on `.env.local`** — not even with `--cached`
3. **NEVER add `.env.local` to git** — it's already in `.gitignore`
4. **If GitHub blocks a push due to secrets:**
   - DO NOT attempt to remove the file from history
   - ASK the user how they want to handle it
   - The user may choose to allowlist the secret on GitHub instead
5. **Before ANY destructive git operation**, create a backup: `cp .env.local .env.local.backup`
6. **If you accidentally delete it**, recover immediately from git reflog:
   ```bash
   git show <commit-before-deletion>:.env.local > .env.local
   ```

**This rule exists because an AI agent deleted this file and nearly caused permanent credential loss.**

---

## Architecture Decisions (ADRs)

**ADR-001: Package Boundaries**
- `packages/*` are leaf nodes — import nothing from `apps/*` or `sdks/*`
- Respect the dependency graph: common → sdk/backoffice → backend

**ADR-002: SDK API Stability**
- Never remove or rename existing SDK exports
- New features must be additive (optional params, new methods)
- All changes require CHANGELOG.md entry

**ADR-003: Error Handling**
- Lambda: Return structured `{ error, meta }` response
- SDK: Emit error events, don't throw
- Backoffice: Toast notifications + error boundaries

**ADR-004: State Management**
- SDK: Svelte stores only
- Backoffice: TanStack Query + React Context only
- No Redux, Zustand, or additional state libraries

**ADR-005: Testing Pyramid**
- Unit tests for all business logic (Vitest)
- Integration tests for API/DB contracts
- E2E tests only for critical user flows (Playwright)

**ADR-006: Async Operations**
- Long operations return immediately with jobId
- Client polls or receives webhook for result
- Never block on Textract/Rekognition calls

**ADR-007: Country-Based Document Extractor Architecture**
- Use country-based extractors for OCR field extraction
- Each country has its own folder: `src/extractors/<country>/`
- Extractors implement `DocumentExtractor` interface
- Registry pattern for extractor lookup: `getExtractor('BW', 'passport')`
- Field patterns based on ACTUAL document images, not assumptions

**Currently Implemented (Botswana - BW):**

| Document Type | Extractor | Key Fields |
|---------------|-----------|------------|
| Omang (National ID) | `omang-extractor.ts` | idNumber, surname, forenames, dateOfBirth, sex, dateOfExpiry |
| Driver's Licence | `drivers-licence-extractor.ts` | licenceNumber, omangNumber, licenceClass, validityPeriod |
| Passport | `passport-extractor.ts` | passportNumber, personalNumber (Omang), MRZ parsing |

**Extractor Location:** `services/verification/src/extractors/botswana/`

**Regional Expansion Roadmap:**
- Phase 1 (MVP): Botswana (BW) ✅
- Phase 2 (Year 2): South Africa (ZA), Namibia (NA)
- Phase 3 (Year 3): Zimbabwe (ZW), Zambia (ZM)

**ADR-008: API Authentication & Rate Limiting**
- API keys with format: `ab_live_` or `ab_test_` + 32 hex chars
- SHA-256 hashing for storage, plain text returned ONLY on creation
- Rate limiting: 50 RPS per client (API Gateway throttling)
- Per-API-key limits configurable (default 100 req/min)
- Per-IP limits for DDoS protection (1000 req/min)
- Lambda authorizer validates keys and returns IAM policy
- Rate limit headers in all responses: `X-RateLimit-*`

---

## Testing Rules

### Test Framework Assignment

| Test Type | Framework | Location | When to Use |
|-----------|-----------|----------|-------------|
| Unit | Vitest | `*.test.ts` co-located | Business logic, utils, components |
| E2E | Playwright | `e2e/` folder | Critical user flows only |
| API | Playwright API fixtures | `e2e/api/` | Backend contract testing |

### Playwright Configuration

- **Timeouts:** Action 15s, Navigation 30s, Test 60s
- **Artifacts:** Screenshots/video/trace on failure only
- **Browsers:** Chromium, Firefox, Mobile Chrome
- **Camera mocking:** `--use-fake-device-for-media-stream` for verification flows

### Test File Patterns

- Unit tests: `ComponentName.test.ts` (co-located with source)
- E2E tests: `feature-name.spec.ts` in `e2e/` folder
- Use factories for test data: `e2e/support/factories/`
- Use fixtures for shared setup: `e2e/support/fixtures/`

### Test Commands

```bash
pnpm test              # Unit tests (Vitest)
pnpm test:e2e          # E2E tests (Playwright)
pnpm test:e2e:ui       # Interactive UI mode
pnpm test:e2e:debug    # Debug with inspector
```

### DynamoDB Local Setup

**CRITICAL: Use Java (via Homebrew), NOT Docker**
- Docker uses too many system resources and freezes the system
- DynamoDB Local must be run using Java directly via Homebrew
- Install: `brew install dynamodb-local`
- Run with: `dynamodb-local -port 8000 -sharedDb`
- Required for integration tests in `services/verification/tests/integration/`

**Table Setup:**
- Run setup script: `bash services/verification/scripts/setup-dynamodb-local.sh`
- Creates `AuthBridgeTable` with correct schema
- GSI1: Client and status queries
- OmangHashIndex (GSI2): Duplicate detection using `GSI2PK` attribute
- **CRITICAL:** OmangHashIndex must use `GSI2PK` as key attribute (not `omangHash`)

### Critical Testing Rules

- **Never skip tests** without a linked GitHub issue
- **No flaky tests** — fix or delete, don't retry-mask
- **Test isolation** — each test must be independent
- **Mock external services** in unit tests, use real services in E2E

---

## Development Workflow Rules

### Branch Strategy

- `main` — production-ready code
- `develop` — integration branch
- `feature/<name>` — new features
- `fix/<name>` — bug fixes
- `agent/<task>` — AI agent work (auto-created)

### Commit Message Format

Follow Conventional Commits:
```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, test, chore
Scope: web-sdk, backoffice, backend, common, ci
```

### CI Pipeline

```bash
pnpm ci:local          # Run full CI locally before push
pnpm ci:local:full     # Full CI with E2E tests
pnpm test:changed      # Test only changed files
```

### PR Requirements

- All tests passing
- No new lint errors
- CHANGELOG.md updated for user-facing changes
- At least one approval (when team grows)

### Useful Scripts

| Script | Purpose |
|--------|---------|
| `scripts/ci-local.sh` | Run CI checks locally |
| `scripts/test-changed.sh` | Test only changed files |
| `scripts/burn-in.sh` | Stress test for flaky tests |
| `scripts/load-test.sh` | Load testing (smoke, load, stress, spike, soak) |

---

## Current Project Status

### Completed Epics

- ✅ **Epic 1:** Web SDK Verification Flow (6 stories)
- ✅ **Epic 1.5:** Backend Foundation (4 stories)
- ✅ **Epic 2:** Omang Document Processing (4 stories)
- ✅ **Epic 3:** Case Management Dashboard (5 stories)

### Active Epic

- 🚧 **Epic 4:** REST API & Webhooks (5 stories)
  - Story 4.1: API Authentication (ready-for-dev)

### Key Infrastructure

**Auth Service:**
- API key management (create, validate, revoke, rotate)
- Rate limiting middleware (per-key, per-IP)
- Lambda authorizer for API Gateway
- Cognito User Pool (af-south-1_P3KlQawlR)

**Verification Service:**
- JWT session tokens (jose library, HS256)
- Country-based OCR extractors (Botswana)
- Biometric matching (AWS Rekognition)
- Duplicate detection (DynamoDB GSI)
- Webhook notifications

**Testing:**
- 139 auth service tests passing
- 50+ verification service tests passing
- E2E tests with Playwright fixtures
- Load testing infrastructure (k6)

### Documentation

**Guides:**
- `docs/load-testing-guide.md` - Load testing comprehensive guide
- `docs/api-gateway-throttling.md` - API Gateway throttling config
- `docs/todo-comment-policy.md` - TODO/FIXME standards
- `docs/component-library-standards.md` - UI component standards
- `docs/frontend-component-patterns.md` - React patterns

**Specs:**
- `services/verification/openapi.yaml` - Complete API specification
- `_bmad-output/planning-artifacts/architecture.md` - Architecture decisions
- `_bmad-output/planning-artifacts/epics.md` - Epic breakdown

### Environment Variables

**JWT Configuration:**
```bash
JWT_SECRET=your-secret-key-min-32-chars
JWT_ISSUER=authbridge
SESSION_TOKEN_EXPIRY_HOURS=24
```

**Biometric Thresholds:**
```bash
BIOMETRIC_SIMILARITY_THRESHOLD=80
BIOMETRIC_LIVENESS_THRESHOLD=80
BIOMETRIC_LIVENESS_WEIGHT=0.3
BIOMETRIC_SIMILARITY_WEIGHT=0.7
BIOMETRIC_OVERALL_THRESHOLD=80
```

**AWS Configuration:**
```bash
AWS_REGION=af-south-1
COGNITO_USER_POOL_ID=af-south-1_P3KlQawlR
COGNITO_CLIENT_ID=7jcf16r6c2gf2nnvo4kh1mtksg
```

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**
- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

**Historical Deployments:**
- See `_bmad-output/implementation-artifacts/deployment-history.md` for detailed deployment logs
- See epic retrospective files for sprint-specific learnings

---

_Last Updated: 2026-01-16_
_Epic 4 Started: 2026-01-16_
