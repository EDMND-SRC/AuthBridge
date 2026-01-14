# Source Tree Analysis

## Complete Directory Structure

```
authbridge/                          # Root monorepo
├── _bmad/                          # BMad workflow automation system
│   ├── _config/                    # BMad configuration files
│   ├── _memory/                    # BMad memory and state files
│   ├── bmb/                        # BMad Builder module
│   ├── bmm/                        # BMad Manager module
│   ├── cis/                        # BMad CIS module
│   └── core/                       # BMad core functionality
├── _bmad-output/                   # BMad generated outputs and documentation
│   ├── implementation-artifacts/   # Generated implementation files
│   └── project-documentation/      # This documentation set
├── apps/                           # End-user applications
│   ├── backoffice/                # React admin dashboard
│   │   ├── public/                # Static assets
│   │   ├── src/                   # Source code
│   │   │   ├── components/        # Reusable React components
│   │   │   ├── pages/            # Route-based page components
│   │   │   ├── providers/        # Refine data providers
│   │   │   ├── hooks/            # Custom React hooks
│   │   │   ├── utils/            # Utility functions
│   │   │   ├── types/            # TypeScript definitions
│   │   │   └── i18n/             # Internationalization
│   │   ├── package.json          # Dependencies and scripts
│   │   ├── tsconfig.json         # TypeScript configuration
│   │   ├── craco.config.cjs      # Webpack overrides
│   │   └── .env                  # Environment variables
│   ├── docs/                     # Documentation website (empty)
│   └── workflow-builder/         # Workflow configuration UI (empty)
├── packages/                      # Shared libraries
│   ├── cli/                      # Command-line tools (empty)
│   ├── common/                   # Shared utilities (empty)
│   ├── config/                   # Shared configurations
│   │   ├── eslintrc.base.cjs    # Base ESLint configuration
│   │   ├── eslintrc.svelte.cjs  # Svelte-specific ESLint rules
│   │   ├── prettierrc.base.cjs  # Base Prettier configuration
│   │   └── prettierrc.svelte.cjs # Svelte-specific Prettier rules
│   └── ui-components/            # Shared UI components (empty)
├── sdks/                         # Developer SDKs
│   ├── web-sdk/                  # JavaScript/TypeScript SDK
│   │   ├── .storybook/          # Storybook configuration
│   │   ├── docs/                # SDK documentation
│   │   ├── e2e/                 # End-to-end tests
│   │   ├── examples/            # Usage examples
│   │   │   ├── sdk/            # Embedded SDK examples
│   │   │   └── standalone/     # Standalone flow examples
│   │   ├── public/             # Static assets
│   │   ├── src/                # Source code
│   │   │   ├── lib/           # Core SDK library
│   │   │   │   ├── components/ # Svelte UI components
│   │   │   │   ├── contexts/   # State management
│   │   │   │   ├── flows/      # Flow definitions
│   │   │   │   ├── services/   # API integrations
│   │   │   │   ├── utils/      # Utility functions
│   │   │   │   └── types/      # TypeScript definitions
│   │   │   └── main.ts         # SDK entry point
│   │   ├── package.json        # Dependencies and scripts
│   │   ├── vite.config.ts      # Build configuration
│   │   ├── svelte.config.js    # Svelte configuration
│   │   └── playwright.config.ts # E2E test configuration
│   ├── android-sdk/            # Android native SDK (git submodule, empty)
│   └── ios-sdk/                # iOS native SDK (git submodule, empty)
├── services/                    # Backend services
│   └── backend/                # Main API service (git submodule, empty)
├── examples/                    # Usage examples
│   └── botswana-customization.md # Customization guide
├── docs/                       # Project documentation
│   └── optimized_gif.gif       # Demo GIF for README
├── .changeset/                 # Changeset configuration
│   ├── config.json            # Changeset settings
│   └── README.md              # Changeset usage guide
├── .github/                    # GitHub configuration
│   ├── actions/               # Custom GitHub Actions
│   ├── ISSUE_TEMPLATE/        # Issue templates
│   ├── workflows/             # CI/CD workflows
│   ├── dependabot.yml         # Dependency updates
│   └── pull_request_template.md # PR template
├── .husky/                     # Git hooks
│   ├── _/                     # Husky internal files
│   └── commit-msg             # Commit message validation
├── .kiro/                      # Kiro AI assistant configuration
│   └── agents/                # AI agent prompts and configurations
├── node_modules/               # Dependencies (managed by pnpm)
├── package.json                # Root package configuration
├── pnpm-workspace.yaml         # pnpm workspace configuration
├── nx.json                     # Nx build system configuration
├── README.md                   # Main project documentation
├── CONTRIBUTING.md             # Contribution guidelines
├── STYLE_GUIDE.md             # Code style guidelines
├── QUICK_START.md             # Quick start guide
├── BOTSWANA_SETUP_GUIDE.md    # Setup and customization guide
├── CODE_OF_CONDUCT.md         # Community guidelines
├── LICENSE                     # MIT license
└── .gitmodules                # Git submodule configuration
```

## Critical Directories Explained

### Applications (`apps/`)
**Purpose:** End-user facing applications

- **`apps/backoffice/`** - React-based case management dashboard
  - **Entry Point:** `src/App.tsx`
  - **Key Directories:**
    - `src/components/` - Reusable UI components
    - `src/pages/` - Route-based page components
    - `src/providers/` - Refine data providers for API integration
  - **Configuration:** `craco.config.cjs` for Webpack customization

- **`apps/docs/`** - Documentation website (currently empty)
- **`apps/workflow-builder/`** - Workflow configuration UI (currently empty)

### Shared Packages (`packages/`)
**Purpose:** Shared logic between apps, SDKs, and services

- **`packages/config/`** - Shared ESLint and Prettier configurations
  - Used across all TypeScript and Svelte projects
  - Ensures consistent code style and quality

- **`packages/cli/`** - Command-line tools (empty)
- **`packages/common/`** - Shared utilities (empty)
- **`packages/ui-components/`** - Shared UI components (empty)

### Developer SDKs (`sdks/`)
**Purpose:** Developer kits for creating experiences and applications

- **`sdks/web-sdk/`** - JavaScript/TypeScript SDK for web integration
  - **Entry Point:** `src/main.ts`
  - **Key Directories:**
    - `src/lib/components/` - Svelte UI components for KYC flows
    - `src/lib/flows/` - Flow definitions and orchestration
    - `src/lib/services/` - API integration services
    - `examples/` - Integration examples for different use cases
  - **Build:** Vite configuration for UMD/ES module distribution

- **`sdks/android-sdk/`** - Android native SDK (git submodule, not initialized)
- **`sdks/ios-sdk/`** - iOS native SDK (git submodule, not initialized)

### Backend Services (`services/`)
**Purpose:** Backend microservices with database and API functionality

- **`services/backend/`** - Main API service (git submodule, not initialized)
  - Handles document processing, verification workflows
  - Provides REST API for both backoffice and SDK integration

## Entry Points by Component

### Backoffice Application
- **Main Entry:** `apps/backoffice/src/App.tsx`
- **Development:** `pnpm backoffice:dev` → http://localhost:3001
- **Build:** `pnpm build` → `apps/backoffice/build/`

### Web SDK
- **Library Entry:** `sdks/web-sdk/src/main.ts`
- **Development:** `pnpm web-sdk:dev` → http://localhost:3000
- **Examples:** `sdks/web-sdk/examples/`
- **Build:** `pnpm web-sdk:build` → `sdks/web-sdk/dist/`

### Mobile SDKs
- **Android:** Native Android project (git submodule, not initialized)
- **iOS:** Native iOS project (git submodule, not initialized)

## Integration Architecture

### Data Flow Between Parts
```
Web SDK (Client) ←→ Backend Services (API) ←→ Backoffice (Admin)
     ↓                       ↓                      ↓
Mobile SDKs (Native) ←→ Shared Packages ←→ Configuration
```

### Shared Dependencies
- **TypeScript:** Common language across web components
- **ESLint/Prettier:** Shared code quality tools from `packages/config/`
- **pnpm Workspace:** Dependency management and monorepo coordination
- **Nx:** Build system orchestration and caching

## Build System Architecture

### Nx Workspace
- **Task Runner:** Coordinates builds across all packages
- **Caching:** Speeds up repeated builds
- **Dependency Graph:** Understands inter-package relationships

### Package-Specific Build Tools
- **Backoffice:** Craco (Webpack) for React application
- **Web SDK:** Vite for library bundling with UMD/ES formats
- **Shared Config:** ESLint and Prettier configurations

## Development Workflow

### Local Development
1. **Install:** `pnpm install` (installs all workspace dependencies)
2. **Start All:** `pnpm dev` (starts backoffice + web SDK)
3. **Individual:** `pnpm backoffice:dev` or `pnpm web-sdk:dev`

### Code Quality
- **Pre-commit:** Husky hooks run linting and formatting
- **Commit Messages:** Conventional commits with commitizen
- **Branch Names:** Branchlint ensures consistent naming

### Testing
- **Unit Tests:** Each package has its own test suite
- **E2E Tests:** Playwright for web SDK integration testing
- **CI/CD:** GitHub Actions for automated testing

## Key Configuration Files

### Root Level
- **`package.json`** - Monorepo scripts and dev dependencies
- **`pnpm-workspace.yaml`** - Workspace package definitions
- **`nx.json`** - Build system configuration
- **`.gitmodules`** - Git submodule configuration for backend

### Package Level
- **`apps/backoffice/craco.config.cjs`** - Webpack customization
- **`sdks/web-sdk/vite.config.ts`** - Library build configuration
- **`packages/config/*.cjs`** - Shared linting and formatting rules

## Empty Directories

Several directories are currently empty but represent planned functionality:
- **`apps/docs/`** - Documentation website
- **`apps/workflow-builder/`** - Visual workflow editor
- **`packages/cli/`** - Command-line tools
- **`packages/common/`** - Shared utilities
- **`packages/ui-components/`** - Shared component library
- **`services/backend/`** - Backend API (git submodule not initialized)
- **`sdks/android-sdk/`** - Android SDK (git submodule not initialized)
- **`sdks/ios-sdk/`** - iOS SDK (git submodule not initialized)

## Next Steps for Development

1. **Initialize git submodules** to access backend and mobile SDKs (if needed)
2. **Set up backend services** for full API functionality
3. **Implement shared packages** for better code reuse
4. **Complete mobile SDK integration** for native capabilities
5. **Plan and implement custom features** as needed
