# Source Tree Analysis

**Generated:** 2026-01-13 | **Scan Level:** Exhaustive

---

## Repository Structure

```
authbridge/
├── apps/                          # End-user applications
│   ├── backoffice/               # React 18 Case Management Dashboard
│   │   ├── src/
│   │   │   ├── atoms/            # SVG icon components
│   │   │   ├── molecules/        # Composite components
│   │   │   ├── components/       # Feature components
│   │   │   │   ├── atoms/        # UI atoms
│   │   │   │   ├── molecules/    # UI molecules
│   │   │   │   ├── organisms/    # Complex components
│   │   │   │   ├── layout/       # Layout (Header, Sider, Title)
│   │   │   │   └── table/        # Table utilities
│   │   │   ├── pages/
│   │   │   │   ├── users/        # User CRUD pages
│   │   │   │   └── companies/    # Company pages (scaffold)
│   │   │   ├── hooks/            # Custom React hooks
│   │   │   ├── utils/            # Utility functions
│   │   │   ├── interfaces/       # TypeScript interfaces
│   │   │   └── mock-service-worker/  # MSW handlers
│   │   └── public/               # Static assets
│   ├── docs/                     # Documentation site (scaffold)
│   └── workflow-builder/         # Visual workflow editor (scaffold)
│
├── sdks/                          # Developer SDKs
│   ├── web-sdk/                  # Svelte 3 Embeddable SDK
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   ├── atoms/        # 19 atomic components
│   │   │   │   ├── molecules/    # 3 molecule components
│   │   │   │   ├── organisms/    # 1 organism component
│   │   │   │   ├── pages/        # 18 flow pages
│   │   │   │   ├── services/     # 7 service modules
│   │   │   │   ├── contexts/     # 5 Svelte stores
│   │   │   │   ├── hooks/        # Custom hooks
│   │   │   │   ├── ui-packs/     # Theme configurations
│   │   │   │   └── utils/        # Utility functions
│   │   │   └── types/            # TypeScript definitions
│   │   ├── e2e/                  # Playwright E2E tests
│   │   │   ├── kyc/              # KYC flow tests (4 specs)
│   │   │   ├── kyb/              # KYB flow tests (4 specs)
│   │   │   ├── api/              # API tests
│   │   │   └── support/          # Fixtures, helpers, factories
│   │   ├── examples/             # Integration examples
│   │   └── dist/                 # Build output
│   ├── android-sdk/              # Android SDK (scaffold)
│   └── ios-sdk/                  # iOS SDK (scaffold)
│
├── packages/                      # Shared packages
│   ├── common/                   # Shared types/utilities (scaffold)
│   ├── config/                   # ESLint + Prettier configs
│   │   ├── eslintrc.base.cjs
│   │   ├── eslintrc.svelte.cjs
│   │   ├── prettierrc.base.cjs
│   │   └── prettierrc.svelte.cjs
│   ├── ui-components/            # Shared UI components (scaffold)
│   └── cli/                      # CLI tools (scaffold)
│
├── services/                      # Backend services
│   └── backend/                  # AWS Lambda backend (scaffold)
│
├── docs/                          # Project documentation
│   ├── ci-pipeline.md            # CI/CD documentation
│   └── ci-secrets-checklist.md   # Secrets configuration
│
├── scripts/                       # Build/test scripts
│   ├── ci-local.sh               # Local CI runner
│   ├── test-changed.sh           # Run changed tests
│   └── burn-in.sh                # Flaky test detection
│
├── .github/                       # GitHub configuration
│   ├── workflows/
│   │   ├── quality-pipeline.yml  # Full CI/CD pipeline
│   │   └── e2e.yml               # E2E test workflow
│   └── actions/                  # Custom actions
│
├── _bmad/                         # BMAD workflow system
├── _bmad-output/                  # Generated artifacts
│   ├── planning-artifacts/       # PRD, architecture, epics, UX
│   └── research/                 # Market/competitive research
│
└── [Root Config Files]
    ├── package.json              # Root package manifest
    ├── pnpm-workspace.yaml       # Workspace configuration
    ├── nx.json                   # Nx configuration
    ├── .nvmrc                    # Node version (22)
    └── tsconfig.json             # TypeScript config
```

## Critical Directories

### Active Development

| Directory | Purpose | Files |
|-----------|---------|-------|
| `apps/backoffice/src/` | Case management dashboard | ~50 files |
| `sdks/web-sdk/src/` | Embeddable verification SDK | ~80 files |
| `sdks/web-sdk/e2e/` | E2E test suite | ~20 files |
| `packages/config/` | Shared linting configs | 4 files |

### Entry Points

| Part | Entry Point | Purpose |
|------|-------------|---------|
| Backoffice | `apps/backoffice/src/index.tsx` | React app bootstrap |
| Web SDK | `sdks/web-sdk/src/main.ts` | SDK exports |

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Root dependencies, scripts |
| `pnpm-workspace.yaml` | Workspace packages |
| `nx.json` | Build orchestration |
| `.nvmrc` | Node.js version |
| `apps/backoffice/craco.config.cjs` | Webpack customization |
| `sdks/web-sdk/vite.config.ts` | Vite build config |
| `sdks/web-sdk/playwright.config.ts` | E2E test config |

## Component Inventory

### Web SDK Atoms (19)

| Component | Purpose |
|-----------|---------|
| Button | Primary action button |
| ButtonWithIcon | Button with icon |
| CameraButton | Camera capture trigger |
| Container | Layout container |
| ErrorText | Error message display |
| FlyingText | Animated text |
| IconButton | Icon-only button |
| IconCloseButton | Close button |
| Icons | Icon library |
| Image | Image display |
| Input | Text input |
| ListItem | List item |
| Loader | Loading spinner |
| NextStepButton | Navigation button |
| Overlay | Camera overlay |
| Paragraph | Text paragraph |
| Photo | Photo display |
| Title | Heading text |
| VideoContainer | Camera video container |

### Web SDK Pages (18)

| Page | Flow Step |
|------|-----------|
| Welcome | Initial greeting |
| DocumentSelection | Choose document type |
| DocumentStart | Document capture intro |
| DocumentPhoto | Front capture |
| CheckDocument | Review front |
| DocumentPhotoBackStart | Back capture intro |
| DocumentPhotoBack | Back capture |
| CheckDocumentPhotoBack | Review back |
| SelfieStart | Selfie intro |
| Selfie | Selfie capture |
| CheckSelfie | Review selfie |
| Loading | Processing |
| Final | Success result |
| Decline | Rejection result |
| ErrorPage | Error display |
| Registration | User registration |
| Resubmission | Resubmit documents |

### Backoffice Pages

| Page | Purpose |
|------|---------|
| `users/list.tsx` | User list with filters |
| `users/show.tsx` | User detail view |
| `users/create.tsx` | Create user |
| `users/edit.tsx` | Edit user |
| `companies/list.tsx` | Company list (scaffold) |

## Integration Points

### SDK ↔ Backend

```
Web SDK → HTTP Service → Backend API
         ├── POST /v2/enduser/verify (start verification)
         ├── GET /v2/enduser/verify/status/{id} (check status)
         └── POST /v2/enduser/verify/partial (submit step data)
```

### Backoffice ↔ Backend

```
Backoffice → Refine Data Provider → Backend API
            ├── GET /users (list cases)
            ├── GET /users/:id (case detail)
            └── PATCH /users/:id (approve/reject)
```

## File Statistics

| Part | TypeScript | Svelte | React | Tests | Total |
|------|------------|--------|-------|-------|-------|
| Web SDK | 45 | 35 | - | 12 | ~92 |
| Backoffice | 40 | - | 25 | 5 | ~70 |
| Packages | 4 | - | - | - | 4 |
| **Total** | **89** | **35** | **25** | **17** | **~166** |
