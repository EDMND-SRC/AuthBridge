# Web SDK Architecture

**Part:** `sdks/web-sdk/` | **Type:** Library | **Framework:** Svelte 3

---

## Overview

The Web SDK is an embeddable identity verification flow that can be integrated via CDN or NPM. It provides document capture, selfie capture, and liveness detection capabilities.

## Technology Stack

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Framework** | Svelte | 3.39.0 | Reactive UI components |
| **Build Tool** | Vite | 2.9.15 | Bundling, dev server |
| **Output Formats** | UMD + ES | - | CDN + NPM distribution |
| **Testing** | Vitest | 0.24.5 | Unit tests |
| **E2E Testing** | Playwright | 1.50.0 | Browser automation |
| **Camera** | jslib-html5-camera-photo | 3.3.3 | Document/selfie capture |
| **Image Processing** | CompressorJS | 1.1.1 | Image compression |

## Architecture Pattern

**Atomic Design** with service layer:

```
src/
├── lib/
│   ├── atoms/           # Basic UI components (Button, Input, Image, etc.)
│   ├── molecules/       # Composite components (DocumentOption, NavigationButtons)
│   ├── organisms/       # Complex components (DocumentOptions)
│   ├── pages/           # Flow pages (Welcome, DocumentSelection, Selfie, etc.)
│   ├── services/        # Business logic (camera-manager, http, theme-manager)
│   ├── contexts/        # Svelte stores (app-state, configuration, flows, navigation)
│   ├── hooks/           # Reusable hooks (createToggle)
│   ├── ui-packs/        # Theme configurations (default, future)
│   └── utils/           # Utility functions
├── types/               # TypeScript definitions
└── main.ts              # SDK entry point
```

## Entry Point

**`src/main.ts`** exports the `BallerineSDK.flows` API:

```typescript
export const flows: BallerineSDKFlows = {
  init(config: FlowsInitOptions): Promise<void>;
  mount(flowName: string, elementId: string, config: FlowsMountOptions): Promise<void>;
  openModal(flowName: string, config: FlowsMountOptions): void;
  setConfig(config: FlowsInitOptions): Promise<void>;
};
```

## Verification Flow

```
Welcome → DocumentSelection → DocumentPhoto → CheckDocument
        → DocumentPhotoBack → CheckDocumentPhotoBack
        → SelfieStart → Selfie → CheckSelfie → Loading → Final
```

## Key Components

### Pages (Flow Steps)

| Page | Purpose |
|------|---------|
| `Welcome.svelte` | Initial greeting, start verification |
| `DocumentSelection.svelte` | Choose document type (passport, ID, license) |
| `DocumentPhoto.svelte` | Capture front of document |
| `DocumentPhotoBack.svelte` | Capture back of document |
| `CheckDocument.svelte` | Review captured document |
| `Selfie.svelte` | Capture selfie for biometric matching |
| `CheckSelfie.svelte` | Review captured selfie |
| `Loading.svelte` | Processing verification |
| `Final.svelte` | Success/failure result |

### Services

| Service | Purpose |
|---------|---------|
| `camera-manager/` | Camera initialization, photo capture |
| `http/` | API communication (verification endpoints) |
| `flow-event-bus/` | Event handling (complete, exit, error, navigation) |
| `theme-manager/` | UI theming and customization |
| `preload-service/` | Asset preloading for performance |

### Contexts (State Management)

| Context | Purpose |
|---------|---------|
| `app-state/` | Application state, documents, selfie |
| `configuration/` | SDK configuration, backend config |
| `flows/` | Flow definitions, step order |
| `navigation/` | Current step, navigation history |
| `translation/` | i18n translations |

## API Integration

### Backend Configuration

```typescript
backendConfig: {
  baseUrl: 'https://api.authbridge.io',
  auth: {
    method: 'jwt',
    authorizationHeader: 'Bearer <token>',
  },
  endpoints: {
    startVerification: '/v2/enduser/verify',
    getVerificationStatus: '/v2/enduser/verify/status/{verificationId}',
    processStepData: '/v2/enduser/verify/partial',
    getConfig: '/v2/clients/{clientId}/config',
  },
}
```

### Event Callbacks

```typescript
callbacks: {
  onFlowComplete: (payload: IFlowCompletePayload) => void;
  onFlowExit: (payload: IFlowExitPayload) => void;
  onFlowError: (payload: IFlowErrorPayload) => void;
  onFlowNavigationUpdate: (payload: IFlowNavigationUpdatePayload) => void;
}
```

## Build Output

| Format | File | Usage |
|--------|------|-------|
| UMD | `dist/ballerine-sdk.umd.js` | CDN, script tag |
| ES Module | `dist/ballerine-sdk.es.js` | NPM, bundlers |
| Types | `dist/index.d.ts` | TypeScript support |

## Integration Examples

### CDN

```html
<script src="https://sdk.authbridge.io/v1/authbridge.umd.js"></script>
<script>
  BallerineSDK.flows.init({
    endUserInfo: { id: 'user-123' },
  }).then(() => {
    BallerineSDK.flows.openModal('my-kyc-flow', {
      callbacks: {
        onFlowComplete: (result) => console.log('Complete:', result),
      },
    });
  });
</script>
```

### NPM

```typescript
import { flows } from '@ballerine/web-sdk';

await flows.init({
  endUserInfo: { id: 'user-123' },
  backendConfig: { baseUrl: 'https://api.authbridge.io' },
});

flows.mount('my-kyc-flow', 'sdk-container', {
  callbacks: {
    onFlowComplete: (result) => console.log('Complete:', result),
  },
});
```

## Testing

### Unit Tests (Vitest)

```bash
pnpm test           # Run once
pnpm test:watch     # Watch mode
```

### E2E Tests (Playwright)

```bash
pnpm test:e2e           # All browsers
pnpm test:e2e:chromium  # Chromium only
pnpm test:e2e:mobile    # Mobile viewport
pnpm test:e2e:ui        # Interactive UI mode
```

### Test Structure

```
e2e/
├── kyc/                 # KYC flow tests
│   ├── passport.spec.ts
│   ├── drivers-license.spec.ts
│   ├── id-card.spec.ts
│   └── voter-id.spec.ts
├── kyb/                 # KYB flow tests
├── api/                 # API tests
├── support/
│   ├── fixtures/        # Playwright fixtures
│   ├── helpers/         # Pure helper functions
│   └── factories/       # Test data factories
└── assets/              # Test assets (fake camera feed)
```
