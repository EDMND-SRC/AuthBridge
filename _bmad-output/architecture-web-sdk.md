# Web SDK Architecture

## Executive Summary

The AuthBridge Web SDK is a lightweight, embeddable JavaScript library built with Svelte that provides customizable KYC/KYB flows for document collection and identity verification. Designed for maximum flexibility and minimal bundle size, it can be integrated into any web application or used as a standalone solution.

## Technology Stack

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Framework** | Svelte | 3.39.0 | Reactive UI framework |
| **Language** | TypeScript | 4.5.4 | Type safety |
| **Build Tool** | Vite | 2.9.15 | Fast build system |
| **Testing** | Vitest | 0.24.5 | Unit testing |
| **E2E Testing** | Playwright | 1.27.1 | End-to-end testing |
| **Documentation** | Storybook | Latest | Component documentation |
| **Bundling** | Rollup | Via Vite | Library bundling |

## Architecture Pattern

**Pattern:** Component-based library with plugin architecture
- **Core Engine:** Flow orchestration and state management
- **Component Library:** Reusable UI components for verification steps
- **Plugin System:** Extensible integrations for different verification providers
- **Configuration Layer:** Declarative flow and UI customization

## Project Structure

```
sdks/web-sdk/
├── src/
│   ├── lib/
│   │   ├── components/        # Svelte UI components
│   │   ├── contexts/          # Application state management
│   │   ├── flows/             # Flow definitions and logic
│   │   ├── services/          # API and external integrations
│   │   ├── utils/             # Utility functions
│   │   └── types/             # TypeScript definitions
│   ├── main.ts                # SDK entry point
│   └── app.html               # Development template
├── examples/                  # Usage examples
├── e2e/                      # End-to-end tests
├── docs/                     # Documentation
├── public/                   # Static assets
├── package.json              # Dependencies and scripts
├── vite.config.ts            # Build configuration
├── svelte.config.js          # Svelte configuration
└── playwright.config.ts      # E2E test configuration
```

## Core Architecture

### 1. Flow Engine
```typescript
interface FlowConfig {
  steps: FlowStep[];
  ui: UIConfig;
  backend: BackendConfig;
  callbacks: CallbackConfig;
}

interface FlowStep {
  name: string;
  id: string;
  component: string;
  validation?: ValidationRule[];
  next?: string | ConditionalNext;
}
```

### 2. State Management
- **Context-based state** using Svelte stores
- **Flow state:** Current step, collected data, validation status
- **UI state:** Theme, language, loading states
- **Configuration state:** Flow definition, backend settings

### 3. Component System
```
Components/
├── atoms/              # Basic UI elements
│   ├── Button/
│   ├── Input/
│   └── Icon/
├── molecules/          # Composite components
│   ├── DocumentUpload/
│   ├── CameraCapture/
│   └── ProgressBar/
└── organisms/          # Complete flow steps
    ├── Welcome/
    ├── DocumentSelection/
    ├── DocumentPhoto/
    ├── Selfie/
    └── Review/
```

## Supported Document Types

The SDK currently supports these document types (defined in `src/lib/contexts/app-state/types.ts`):

```typescript
export enum DocumentType {
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'drivers_license',
  ID_CARD = 'id_card',
  RESIDENCE_PERMIT = 'residence_permit',
  VOTER_ID = 'voter_id',
  WORK_PERMIT = 'work_permit',
  VISA = 'visa',
  BANK_STATEMENT = 'bank_statement',
  PROOF_OF_BUSINESS_TAX_ID = 'proof_of_business_tax_id',
  OPERATING_LICENSE = 'operating_license',
  BUSINESS_REGISTRATION = 'business_registration',
  SELFIE = 'selfie',
}
```

## Key Features

### 1. Document Collection
- **Multiple document types:** Passport, ID card, driver's license, and more
- **Camera integration:** Native camera access with fallback to file upload
- **Image processing:** Client-side compression and validation
- **Document detection:** Automatic document type recognition

### 2. Biometric Verification
- **Selfie capture:** Face photo collection
- **Face matching:** Client-side face comparison (optional)

### 3. Flow Customization
- **Step configuration:** Add, remove, or reorder verification steps
- **Conditional logic:** Dynamic flow based on user input or document type
- **Custom validation:** Business-specific validation rules
- **Branding:** Complete UI customization and white-labeling

### 4. Integration Options
- **Embedded mode:** Integrate into existing applications
- **Standalone mode:** Full-page verification flows
- **Modal mode:** Overlay verification process
- **iFrame mode:** Sandboxed integration

## Data Flow

```
User Input → Component → Flow State → Validation → API Call → Backend
                                                                  ↓
UI Update ← Component ← Flow State ← Response Processing ← API Response
```

## API Integration

### Backend Configuration
```typescript
interface BackendConfig {
  baseUrl: string;
  auth: AuthConfig;
  endpoints: {
    upload: string;
    verify: string;
    complete: string;
  };
}
```

### Request Flow
1. **Document upload:** Multipart form data to backend
2. **Verification request:** Document analysis and validation
3. **Result polling:** Status updates and completion notification
4. **Callback execution:** Success/failure handling

## State Management

### Svelte Stores
```typescript
// Flow state store
export const flowState = writable<FlowState>({
  currentStep: 'welcome',
  collectedData: {},
  isLoading: false,
  errors: []
});

// Configuration store
export const config = writable<FlowConfig>(defaultConfig);

// UI state store
export const uiState = writable<UIState>({
  theme: 'light',
  language: 'en',
  isModalOpen: false
});
```

### State Persistence
- **Session storage:** Temporary flow state persistence
- **Local storage:** User preferences and settings
- **Memory only:** Sensitive data handling

## Build System

### Vite Configuration
```typescript
export default defineConfig({
  build: {
    lib: {
      entry: 'src/main.ts',
      name: 'BallerineSDK',
      formats: ['es', 'umd'],
      fileName: 'ballerine-sdk'
    },
    rollupOptions: {
      output: {
        format: 'umd',
        inlineDynamicImports: true
      }
    }
  },
  plugins: [
    svelte({ emitCss: false }),
    dts({ insertTypesEntry: true })
  ]
});
```

### Bundle Optimization
- **Tree shaking:** Eliminate unused code
- **Code splitting:** Lazy load non-critical components
- **CSS inlining:** Embed styles to avoid FOUC
- **Asset optimization:** Compress images and fonts

## Testing Strategy

### Unit Testing (Vitest)
```typescript
import { render, fireEvent } from '@testing-library/svelte';
import DocumentUpload from './DocumentUpload.svelte';

test('should upload document on file selection', async () => {
  const { getByTestId } = render(DocumentUpload);
  const input = getByTestId('file-input');

  await fireEvent.change(input, {
    target: { files: [new File([''], 'test.jpg')] }
  });

  expect(mockUploadFn).toHaveBeenCalled();
});
```

### E2E Testing (Playwright)
```typescript
test('complete KYC flow', async ({ page }) => {
  await page.goto('/examples/standalone');

  // Welcome step
  await page.click('[data-testid="start-button"]');

  // Document selection
  await page.click('[data-testid="passport-option"]');

  // Document upload
  await page.setInputFiles('[data-testid="file-input"]', 'test-passport.jpg');

  // Verify completion
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});
```

## Deployment & Distribution

### NPM Package
- **Package name:** `@authbridge/web-sdk`
- **Formats:** ES modules, UMD
- **TypeScript definitions:** Included
- **Size:** <50kb gzipped

### CDN Distribution
```html
<script src="https://cdn.ballerine.io/js/1.2.0/ballerine-sdk.umd.js"></script>
<script>
  BallerineSDK.flows.init(config).then(() => {
    BallerineSDK.flows.mount('kyc-flow', 'container');
  });
</script>
```

## Security Considerations

### Client-Side Security
- **Input validation:** Sanitize all user inputs
- **File validation:** Check file types and sizes
- **XSS prevention:** Escape dynamic content
- **CSP compliance:** Content Security Policy headers

### Data Handling
- **Sensitive data:** Never store sensitive data in localStorage
- **Encryption:** Client-side encryption for temporary storage
- **Cleanup:** Clear sensitive data on completion or error

## Performance Optimization

### Bundle Size
- **Current size:** ~45kb gzipped
- **Tree shaking:** Remove unused components
- **Dynamic imports:** Lazy load heavy components
- **Asset optimization:** Compress images and fonts

### Runtime Performance
- **Virtual DOM:** Svelte's compile-time optimization
- **Reactive updates:** Minimal re-renders
- **Memory management:** Cleanup event listeners and timers
- **Image processing:** Web Workers for heavy operations

## Customization & Theming

### UI Customization
```typescript
const uiConfig = {
  theme: {
    colors: {
      primary: '#007bff',
      secondary: '#6c757d',
      success: '#28a745'
    },
    fonts: {
      family: 'Inter, sans-serif',
      sizes: { sm: '14px', md: '16px', lg: '18px' }
    }
  }
};
```

### Flow Customization
```typescript
const flowConfig = {
  steps: [
    { name: 'welcome', id: 'welcome' },
    { name: 'document-selection', id: 'doc-select' },
    { name: 'document-photo', id: 'doc-photo' },
    { name: 'selfie', id: 'selfie' },
    { name: 'review', id: 'review' }
  ]
};
```

## Integration Examples

### React Integration
```jsx
import { useEffect, useRef } from 'react';
import { flows } from '@authbridge/web-sdk';

function KYCFlow() {
  const containerRef = useRef(null);

  useEffect(() => {
    flows.init(config).then(() => {
      flows.mount('kyc-flow', containerRef.current);
    });
  }, []);

  return <div ref={containerRef} />;
}
```

### Vue Integration
```vue
<template>
  <div ref="container"></div>
</template>

<script>
import { flows } from '@authbridge/web-sdk';

export default {
  mounted() {
    flows.init(this.config).then(() => {
      flows.mount('kyc-flow', this.$refs.container);
    });
  }
};
</script>
```

## Known Issues

### Backend Connection
- **Issue:** "Error sending documents" when no backend is running
- **Workaround:** Use mock data mode or set up backend service

## Troubleshooting

### Common Issues
1. **Bundle size:** Check for duplicate dependencies
2. **Browser compatibility:** Verify polyfills for older browsers
3. **Camera access:** Handle permission denials gracefully
4. **Network errors:** Implement retry logic and offline handling

### Debug Mode
```typescript
BallerineSDK.flows.init({
  debug: true,
  logLevel: 'verbose'
});
```
