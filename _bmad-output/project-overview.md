# AuthBridge Project Overview

## Executive Summary

AuthBridge is an identity and risk management platform based on the open-source Ballerine infrastructure. The project provides KYC/KYB verification workflows through a case management dashboard and embeddable SDK components. The codebase is currently in the process of being customized and rebranded from Ballerine to AuthBridge.

## Project Classification

- **Repository Type:** Monorepo
- **Primary Language:** TypeScript
- **Architecture:** Multi-part microservices with shared libraries
- **Build System:** Nx workspace with pnpm
- **Parts:** 4 main components

## Quick Reference

### Backoffice (Web Application)
- **Type:** React-based admin dashboard
- **Tech Stack:** React 18, TypeScript, Mantine UI, Refine framework
- **Root:** `apps/backoffice/`
- **Purpose:** Case management dashboard for operators to review and approve KYC submissions

### Web SDK (Library)
- **Type:** Embeddable JavaScript SDK
- **Tech Stack:** Svelte, TypeScript, Vite
- **Root:** `sdks/web-sdk/`
- **Purpose:** Client-side KYC/KYB flows for document collection and verification

### Mobile SDKs (Libraries)
- **Type:** Native mobile SDK packages
- **Tech Stack:** Android (Java/Kotlin), iOS (Swift/Objective-C)
- **Root:** `sdks/android-sdk/`, `sdks/ios-sdk/`
- **Purpose:** Native mobile KYC capabilities with camera integration
- **Status:** Git submodules, not currently initialized

### Backend Services
- **Type:** API services
- **Tech Stack:** To be analyzed (git submodule)
- **Root:** `services/backend/`
- **Purpose:** REST API backend for processing verification workflows
- **Status:** Git submodule, not currently initialized

## Technology Stack Summary

| Component | Framework | Language | Build Tool | UI Library |
|-----------|-----------|----------|------------|------------|
| Backoffice | React 18 | TypeScript | Craco/Webpack | Mantine |
| Web SDK | Svelte | TypeScript | Vite | Custom Components |
| Mobile SDKs | Native | Java/Kotlin, Swift | Gradle, Xcode | Native UI |
| Backend | TBD | TBD | TBD | N/A |

## Architecture Patterns

- **Backoffice:** Component-based React architecture with Refine framework
- **Web SDK:** Component-based Svelte library with UMD/ES module distribution
- **Mobile SDKs:** Native wrapper pattern with web view integration
- **Overall:** Microservices architecture with shared component libraries

## Repository Structure

```
authbridge/
├── apps/                    # End-user applications
│   ├── backoffice/         # React admin dashboard
│   ├── docs/               # Documentation site (empty)
│   └── workflow-builder/   # Workflow configuration UI (empty)
├── packages/               # Shared libraries
│   ├── cli/               # Command-line tools (empty)
│   ├── common/            # Shared utilities (empty)
│   ├── config/            # Shared configurations
│   └── ui-components/     # Shared UI components (empty)
├── sdks/                  # Developer SDKs
│   ├── web-sdk/          # JavaScript/TypeScript SDK
│   ├── android-sdk/      # Android native SDK (git submodule)
│   └── ios-sdk/          # iOS native SDK (git submodule)
├── services/             # Backend services
│   └── backend/          # Main API service (git submodule)
└── examples/             # Usage examples and demos
```

## Current Document Types

The platform currently supports these document types (defined in `sdks/web-sdk/src/lib/contexts/app-state/types.ts`):

- **Passport**
- **Driver's License**
- **ID Card**
- **Residence Permit**
- **Voter ID**
- **Work Permit**
- **Visa**
- **Bank Statement**
- **Proof of Business Tax ID**
- **Operating License**
- **Business Registration**
- **Selfie** (for biometric verification)

## Integration Points

1. **Web SDK → Backend Services:** REST API calls for document processing
2. **Backoffice → Backend Services:** Admin API for case management
3. **Mobile SDKs → Web SDK:** Native camera integration with web flows
4. **Shared Packages:** Common utilities and configurations across all parts

## Development Workflow

- **Package Manager:** pnpm with workspace configuration
- **Build System:** Nx for task orchestration
- **Code Quality:** ESLint, Prettier, TypeScript
- **Version Control:** Git with conventional commits
- **CI/CD:** GitHub Actions workflows

## Getting Started

1. **Prerequisites:** Node.js >=16.15.1, pnpm >=7.11.0
2. **Installation:** `pnpm install`
3. **Development:** `pnpm dev` (starts backoffice and web SDK)
4. **Build:** `pnpm build`

## Key Features

- **KYC/KYB Flows:** Customizable identity verification workflows
- **Case Management:** Admin dashboard for manual review and approval
- **Multi-platform:** Web, mobile, and API integrations
- **Vendor Agnostic:** Pluggable architecture for different verification providers
- **White Label:** Customizable UI and branding
- **Open Source:** Based on MIT licensed Ballerine platform

## Current Status

- **Backoffice:** Operational with mock data
- **Web SDK:** Operational, requires backend for full functionality
- **Backend:** Git submodule not initialized
- **Mobile SDKs:** Git submodules not initialized
- **Branding:** In process of transitioning from Ballerine to AuthBridge

## Next Steps

- Review individual component documentation
- Set up development environment
- Explore the Web SDK examples
- Initialize git submodules for backend and mobile SDKs if needed
- Plan customization and feature additions
