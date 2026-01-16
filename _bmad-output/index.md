# AuthBridge Project Documentation Index

## Project Overview

- **Type:** Monorepo with 4 main parts
- **Primary Language:** TypeScript
- **Architecture:** Multi-part microservices with shared libraries
- **Base Platform:** AuthBridge (proprietary)

## Quick Reference

### Backoffice (Web Application)
- **Type:** React-based admin dashboard
- **Tech Stack:** React 18, TypeScript, Mantine UI, Refine
- **Root:** `apps/backoffice/`
- **URL:** http://localhost:3001

### Web SDK (Library)
- **Type:** Embeddable JavaScript SDK
- **Tech Stack:** Svelte, TypeScript, Vite
- **Root:** `sdks/web-sdk/`
- **URL:** http://localhost:3000

### Mobile SDKs (Libraries)
- **Type:** Native mobile SDK packages
- **Tech Stack:** Android (Java/Kotlin), iOS (Swift)
- **Root:** `sdks/android-sdk/`, `sdks/ios-sdk/`
- **Status:** Git submodules, not initialized

### Backend Services
- **Type:** API services
- **Tech Stack:** To be analyzed (git submodule)
- **Root:** `services/backend/`
- **Status:** Git submodule, not initialized

## Generated Documentation

- [Project Overview](./project-overview.md)
- [Architecture - Backoffice](./architecture-backoffice.md)
- [Architecture - Web SDK](./architecture-web-sdk.md)
- [Source Tree Analysis](./source-tree-analysis.md)
- [Development Guide](./development-guide.md)
- [API Contracts](./api-contracts.md) _(To be generated)_
- [Data Models](./data-models.md) _(To be generated)_
- [Component Inventory](./component-inventory.md) _(To be generated)_
- [Integration Architecture](./integration-architecture.md) _(To be generated)_
- [Deployment Guide](./deployment-guide.md) _(To be generated)_

## Existing Documentation

- [Main README](../README.md) - Project introduction and features
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute to the project
- [Style Guide](../STYLE_GUIDE.md) - Code style and conventions
- [Quick Start Guide](../QUICK_START.md) - Getting started with development
- [Setup Guide](../BOTSWANA_SETUP_GUIDE.md) - Setup and customization guide
- [Code of Conduct](../CODE_OF_CONDUCT.md) - Community guidelines
- [License](../LICENSE) - MIT license terms

## Getting Started

### For New Developers
1. **Read the [Project Overview](./project-overview.md)** to understand the system
2. **Follow the [Development Guide](./development-guide.md)** to set up your environment
3. **Review the [Source Tree Analysis](./source-tree-analysis.md)** to navigate the codebase
4. **Check the [Contributing Guide](../CONTRIBUTING.md)** for workflow guidelines

### For Architecture Review
1. **Start with [Architecture - Backoffice](./architecture-backoffice.md)** for the admin dashboard
2. **Review [Architecture - Web SDK](./architecture-web-sdk.md)** for the client SDK
3. **Examine [Integration Architecture](./integration-architecture.md)** for system interactions _(To be generated)_

### For Feature Development
1. **Understand the component structure** from architecture documents
2. **Review [Component Inventory](./component-inventory.md)** for reusable components _(To be generated)_
3. **Check [API Contracts](./api-contracts.md)** for backend integration _(To be generated)_
4. **Follow the [Development Guide](./development-guide.md)** for implementation

### For Deployment
1. **Review [Deployment Guide](./deployment-guide.md)** for infrastructure setup _(To be generated)_
2. **Check [Data Models](./data-models.md)** for database requirements _(To be generated)_
3. **Follow environment setup in [Development Guide](./development-guide.md)**

## Key Commands

```bash
# Setup
pnpm install                    # Install all dependencies
pnpm dev                       # Start all development servers

# Development
pnpm backoffice:dev            # Start backoffice at :3001
pnpm web-sdk:dev               # Start web SDK at :3000
pnpm test                      # Run all tests
pnpm lint                      # Lint all code
pnpm format                    # Format all code

# Build
pnpm build                     # Build all packages
pnpm web-sdk:build             # Build web SDK library
pnpm backoffice:build          # Build backoffice app
```

## Project Structure Summary

```
authbridge/
├── apps/                      # End-user applications
│   ├── backoffice/           # React admin dashboard
│   ├── docs/                 # Documentation site
│   └── workflow-builder/     # Workflow UI
├── packages/                 # Shared libraries
│   ├── cli/                  # Command-line tools
│   ├── common/               # Shared utilities
│   ├── config/               # Shared configurations
│   └── ui-components/        # Shared UI components
├── sdks/                     # Developer SDKs
│   ├── web-sdk/             # JavaScript/TypeScript SDK
│   ├── android-sdk/         # Android native SDK
│   └── ios-sdk/             # iOS native SDK
├── services/                # Backend services
│   └── backend/             # Main API service
└── _bmad-output/            # Generated documentation and artifacts
```

## Technology Stack Overview

| Component | Framework | Language | Purpose |
|-----------|-----------|----------|---------|
| **Backoffice** | React + Refine | TypeScript | Case management dashboard |
| **Web SDK** | Svelte | TypeScript | Embeddable KYC flows |
| **Mobile SDKs** | Native | Java/Kotlin, Swift | Native mobile integration |
| **Backend** | TBD | TBD | API services |
| **Build System** | Nx + pnpm | - | Monorepo orchestration |

## Current Document Types

The platform currently supports these document types:
- Passport
- Driver's License
- ID Card
- Residence Permit
- Voter ID
- Work Permit
- Visa
- Bank Statement
- Proof of Business Tax ID
- Operating License
- Business Registration
- Selfie (biometric verification)

## Support and Community

- **GitHub Issues:** [Report bugs and request features](https://github.com/authbridge/authbridge/issues)
- **Email:** [support@authbridge.io](mailto:support@authbridge.io)

## Documentation Status

✅ **Complete:** Project overview, architecture docs, development guide, source tree analysis
⏳ **In Progress:** API contracts, data models, component inventory
📋 **Planned:** Integration architecture, deployment guide, testing guide

---

**Last Updated:** January 12, 2026
**Documentation Version:** 1.0.0
**Project Version:** 0.1.0
**Based on:** Ballerine Open Source Platform
