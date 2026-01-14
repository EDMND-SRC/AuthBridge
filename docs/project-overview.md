# AuthBridge Project Overview

**Generated:** 2026-01-13 | **Scan Level:** Exhaustive | **Workflow:** document-project v1.2.0

---

## Executive Summary

AuthBridge is Botswana's first locally-focused identity verification platform, purpose-built to serve enterprises and mid-market businesses with compliant KYC/KYB verification. Built on the open-source Ballerine platform, it delivers Botswana-specific capabilities including Omang verification, CIPA/BURS integration, and Data Protection Act 2024 compliance.

**#PushaBW** — AuthBridge proudly supports the national Buy Botswana initiative.

## Repository Structure

| Type | Description |
|------|-------------|
| **Repository Type** | Monorepo (pnpm + Nx) |
| **Package Manager** | pnpm 10.x |
| **Build Orchestration** | Nx 15.0.2 |
| **Primary Language** | TypeScript 4.x-5.x |
| **Node.js Version** | 22.x LTS |

## Project Parts

| Part | Type | Technology | Status | Path |
|------|------|------------|--------|------|
| **Backoffice** | Web App | React 18 + Mantine + Refine | Active | `apps/backoffice/` |
| **Web SDK** | Library | Svelte 3 + Vite | Active | `sdks/web-sdk/` |
| **Mobile SDKs** | Mobile | Android + iOS | Scaffold | `sdks/android-sdk/`, `sdks/ios-sdk/` |
| **Backend** | Backend | AWS Lambda | Scaffold | `services/backend/` |
| **Packages** | Library | Shared configs | Active | `packages/` |

## Key Features

| Feature | Description |
|---------|-------------|
| **Omang Verification** | OCR extraction, format validation, biometric matching for Botswana National ID |
| **KYB Verification** | CIPA registration and BURS TIN validation for business verification |
| **Embeddable Web SDK** | Svelte SDK with document capture, selfie, and liveness detection |
| **Case Management** | React dashboard for compliance officers to review and approve cases |
| **REST API** | Complete API with webhooks for custom integrations |
| **Data Residency** | AWS Cape Town (af-south-1) for African data sovereignty |

## Document Types Supported

### KYC (Know Your Customer)
- Passport
- Driver's License
- ID Card (Omang)
- Voter ID

### KYB (Know Your Business)
- Business Registration Documents
- Operating License
- Tax ID (BURS TIN)

## Compliance

- **Data Protection Act 2024** — 72-hour breach notification, DPO support
- **FIA AML/KYC** — 5-year data retention, audit trails
- **Bank of Botswana** — Fintech Sandbox participant
- **NBFIRA** — Non-bank financial institution compliance

## Quick Start

```bash
# Clone and install
git clone https://github.com/emoaborern/authbridge.git
cd authbridge
pnpm install

# Development
pnpm backoffice:dev    # Start Backoffice dashboard
pnpm web-sdk:dev       # Start Web SDK dev server

# Testing
pnpm test              # Run unit tests
pnpm test:e2e          # Run E2E tests
```

## Related Documentation

- [Architecture - Backoffice](./architecture-backoffice.md)
- [Architecture - Web SDK](./architecture-web-sdk.md)
- [Source Tree Analysis](./source-tree-analysis.md)
- [Development Guide](./development-guide.md)
- [CI/CD Pipeline](./ci-pipeline.md)
