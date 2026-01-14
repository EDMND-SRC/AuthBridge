# Story 1.2: Document Type Selection

Status: ready-for-dev

---

## Story

As an **end-user**,
I want to select my document type (Omang, Passport, Driver's License),
So that the system knows what to expect for verification.

---

## Acceptance Criteria

### AC1: Document Selection Screen Display
**Given** the user has clicked "Start Verification" on the welcome screen
**When** the document selection screen loads
**Then** the screen displays within 500ms
**And** a progress indicator shows "Step 1/5"
**And** a back button is visible in the top-left corner

### AC2: Omang as Primary Option
**Given** the user is on the document selection screen
**When** they view the available options
**Then** Omang is displayed first as the primary option for Botswana
**And** Omang shows a document icon (🪪 or ID card icon)
**And** Omang description reads "Botswana National ID"

### AC3: All Document Types Displayed
**Given** the user is on the document selection screen
**When** they view the available options
**Then** the following document types are shown in order:
  1. Omang (Botswana National ID)
  2. Passport (International travel)
  3. Driver's Licence (Botswana or foreign)
**And** each document type shows an icon and description

### AC4: Document Selection Interaction
**Given** the user is viewing document options
**When** they click on a document type
**Then** the selection is highlighted with Botswana Blue Light background (#E9F5F9)
**And** a checkmark (✓) appears on the selected option
**And** the "Continue" button becomes enabled

### AC5: Continue to Document Capture
**Given** the user has selected a document type
**When** they click the "Continue" button
**Then** they navigate to the document capture screen
**And** a `document.selected` event is emitted with the document type
**And** the capture screen is configured for the selected document type

### AC6: Back Navigation
**Given** the user is on the document selection screen
**When** they click the back button
**Then** they return to the welcome screen
**And** any previous selection is cleared

### AC7: Mobile Responsive Layout
**Given** the user is on a mobile device (< 576px width)
**When** the document selection screen renders
**Then** all document options are stacked vertically
**And** each option is full-width with at least 56px height
**And** touch targets are at least 44x44px
**And** no horizontal scrolling is required

---

## Tasks / Subtasks

- [ ] **Task 1: Create DocumentSelect.svelte Component** (AC: 1, 2, 3, 7)
  - [ ] 1.1 Create new DocumentSelect.svelte page component
  - [ ] 1.2 Add document type options with icons and descriptions
  - [ ] 1.3 Implement Omang as first option
  - [ ] 1.4 Add mobile-responsive styling
  - [ ] 1.5 Add progress indicator (Step 1/5)
  - [ ] 1.6 Add back button navigation

- [ ] **Task 2: Implement Selection State Management** (AC: 4)
  - [ ] 2.1 Create selectedDocument store in verification.svelte.ts
  - [ ] 2.2 Handle document selection click events
  - [ ] 2.3 Apply visual selection state (highlight + checkmark)
  - [ ] 2.4 Enable/disable Continue button based on selection

- [ ] **Task 3: Add Navigation Logic** (AC: 5, 6)
  - [ ] 3.1 Implement Continue button navigation to document capture
  - [ ] 3.2 Implement back button navigation to welcome screen
  - [ ] 3.3 Clear selection state on back navigation
  - [ ] 3.4 Pass selected document type to next screen

- [ ] **Task 4: Event Emission** (AC: 5)
  - [ ] 4.1 Create `document.selected` event type
  - [ ] 4.2 Emit event with document type on Continue click
  - [ ] 4.3 Include session metadata in event

- [ ] **Task 5: Update UI Pack Configurations** (AC: All)
  - [ ] 5.1 Add DocumentSelect step to default theme.ts
  - [ ] 5.2 Add DocumentSelect step to future theme.ts
  - [ ] 5.3 Configure step order and navigation

- [ ] **Task 6: Translation Keys** (AC: 2, 3)
  - [ ] 6.1 Add document selection translation keys
  - [ ] 6.2 Add document type names and descriptions
  - [ ] 6.3 Verify English (UK) translations

- [ ] **Task 7: Unit Tests** (AC: All)
  - [ ] 7.1 Test document selection screen renders correctly
  - [ ] 7.2 Test Omang appears first
  - [ ] 7.3 Test selection state management
  - [ ] 7.4 Test Continue button enabled/disabled logic
  - [ ] 7.5 Test navigation to document capture
  - [ ] 7.6 Test back navigation
  - [ ] 7.7 Test mobile responsive behavior
  - [ ] 7.8 Test event emission

---

## Dev Notes

### Previous Story Intelligence (Story 1.1)

**Key Learnings from Story 1.1:**
1. **Configuration-Driven Approach:** The SDK uses UI pack configurations (default/future themes) to define step elements and flow
2. **Element-Based Rendering:** Pages are composed of reusable elements (Title, Paragraph, List, Button, etc.) defined in configuration
3. **Translation Context:** All text uses the `T` component with translation keys from `translation.json`
4. **Event Service:** Events are emitted via `sendButtonClickEvent` and custom event functions
5. **Session Validation:** Session tokens are validated on SDK initialization in `App.svelte`
6. **Atom Components:** Small reusable components (like PrivacyLink) are created in `lib/atoms/`
7. **Test Coverage:** Comprehensive unit tests with Vitest, co-located with source files

**Files Modified in Story 1.1:**
- `lib/ui-packs/default/theme.ts` - Enhanced Welcome step configuration
- `lib/ui-packs/future/theme.ts` - Enhanced Welcome step configuration
- `lib/configuration/translation.json` - Added welcome screen keys
- `lib/utils/event-service/types.ts` - Added verification event types
- `lib/utils/event-service/utils.ts` - Added event emission functions
- `lib/pages/Welcome.svelte` - Integrated events and PrivacyLink
- `App.svelte` - Integrated session validation

**Patterns to Follow:**
- Use configuration-driven element rendering (don't hardcode UI in components)
- Create atom components for reusable UI elements
- Emit events for tracking user actions
- Use Svelte stores for state management (not props drilling)
- Co-locate tests with source files
- Follow existing naming conventions (PascalCase for components)

### Architecture Compliance

| Requirement | Implementation |
|-------------|----------------|
| **Framework** | Svelte 5.46 (upgrade from 3.39.x - use Svelte 5 runes for state) |
| **State Management** | Svelte stores (ADR-004) - use `$state()` runes in Svelte 5 |
| **Bundle Size** | Must stay under 200KB total SDK |
| **Accessibility** | WCAG 2.1 AA compliance required |
| **Error Handling** | Emit error events, don't throw (ADR-003) |
| **Event Tracking** | Emit `document.selected` event for analytics |

### File Structure

```
sdks/web-sdk/src/
├── lib/
│   ├── pages/
│   │   ├── Welcome.svelte                    # EXISTING - Story 1.1
│   │   └── DocumentSelect.svelte             # CREATE - This story
│   ├── atoms/
│   │   ├── DocumentOption/
│   │   │   ├── DocumentOption.svelte         # CREATE - Selectable document card
│   │   │   └── index.ts                      # CREATE - Export
│   │   └── index.ts                          # MODIFY - Export DocumentOption
│   ├── stores/
│   │   └── verification.svelte.ts            # MODIFY - Add selectedDocument state
│   ├── contexts/
│   │   └── configuration/
│   │       └── types.ts                      # MODIFY - Add DocumentSelect to Elements enum
│   ├── configuration/
│   │   └── translation.json                  # MODIFY - Add document selection keys
│   ├── ui-packs/
│   │   ├── default/
│   │   │   └── theme.ts                      # MODIFY - Add DocumentSelect step
│   │   └── future/
│   │       └── theme.ts                      # MODIFY - Add DocumentSelect step
│   └── utils/
│       └── event-service/
│           ├── types.ts                      # MODIFY - Add document.selected event
│           ├── utils.ts                      # MODIFY - Add sendDocumentSelectedEvent
│           └── index.ts                      # MODIFY - Export new function
```

### Design System Tokens (from UX Spec)

| Token | Value | Usage |
|-------|-------|-------|
| Primary Color | `#75AADB` (Botswana Blue) | Selected state border |
| Primary Light | `#E9F5F9` (Botswana Blue Light) | Selected state background |
| Success Icon | `#10B981` | Checkmark on selected option |
| Font | Inter | All text |
| Card Height | 72px (minimum) | Document option cards |
| Border Radius | 8px | Document option cards |
| Padding | 16px | Card padding |
| Touch Target | 44x44px minimum | Mobile accessibility |

### Translation Keys to Add

```json
{
  "documentSelect": {
    "title": "Select Your Document",
    "description": "Choose the document you'll use to verify your identity.",
    "continue": "Continue",
    "back": "Back",
    "step": "Step 1/5",
    "documents": {
      "omang": {
        "name": "Omang",
        "description": "Botswana National ID",
        "icon": "🪪"
      },
      "passport": {
        "name": "Passport",
        "description": "International travel",
        "icon": "🛂"
      },
      "driversLicense": {
        "name": "Driver's Licence",
        "description": "Botswana or foreign",
        "icon": "🚗"
      }
    }
  }
}
```

### Event Schema

```typescript
// document.selected event
{
  type: 'document.selected',
  timestamp: string,  // ISO 8601
  sessionId: string,
  data: {
    documentType: 'omang' | 'passport' | 'driversLicense'
  },
  metadata: {
    clientId: string,
    sdkVersion: string,
    userAgent: string
  }
}
```

### Svelte 5 State Management Pattern

```typescript
// verification.svelte.ts (Svelte 5 runes)
import { writable } from 'svelte/store';

export type DocumentType = 'omang' | 'passport' | 'driversLicense' | null;

// Create writable store for selected document
export const selectedDocument = writable<DocumentType>(null);

// Helper functions
export function selectDocument(type: DocumentType) {
  selectedDocument.set(type);
}

export function clearDocumentSelection() {
  selectedDocument.set(null);
}
```

### Component Structure (DocumentSelect.svelte)

```svelte
<script lang="ts">
  import { selectedDocument, selectDocument } from '$lib/stores/verification.svelte';
  import { sendDocumentSelectedEvent } from '$lib/utils/event-service';
  import { T } from '$lib/contexts/translation';
  import DocumentOption from '$lib/atoms/DocumentOption';

  let selected = $selectedDocument;

  function handleSelect(type: DocumentType) {
    selectDocument(type);
    selected = type;
  }

  function handleContinue() {
    if (selected) {
      sendDocumentSelectedEvent(selected);
      // Navigate to document capture
    }
  }

  function handleBack() {
    clearDocumentSelection();
    // Navigate to welcome screen
  }
</script>

<div class="document-select">
  <header>
    <button on:click={handleBack}>← <T key="documentSelect.back" /></button>
    <span><T key="documentSelect.step" /></span>
  </header>

  <h1><T key="documentSelect.title" /></h1>
  <p><T key="documentSelect.description" /></p>

  <div class="options">
    <DocumentOption
      type="omang"
      icon="🪪"
      name={$t('documentSelect.documents.omang.name')}
      description={$t('documentSelect.documents.omang.description')}
      selected={selected === 'omang'}
      on:select={() => handleSelect('omang')}
    />

    <DocumentOption
      type="passport"
      icon="🛂"
      name={$t('documentSelect.documents.passport.name')}
      description={$t('documentSelect.documents.passport.description')}
      selected={selected === 'passport'}
      on:select={() => handleSelect('passport')}
    />

    <DocumentOption
      type="driversLicense"
      icon="🚗"
      name={$t('documentSelect.documents.driversLicense.name')}
      description={$t('documentSelect.documents.driversLicense.description')}
      selected={selected === 'driversLicense'}
      on:select={() => handleSelect('driversLicense')}
    />
  </div>

  <button
    class="continue"
    disabled={!selected}
    on:click={handleContinue}
  >
    <T key="documentSelect.continue" />
  </button>
</div>
```

### Testing Standards

- **Unit Tests:** Vitest, co-located with source (`DocumentSelect.test.ts`)
- **Test Pattern:** `describe('DocumentSelect', () => { it('should...') })`
- **Coverage:** All acceptance criteria must have corresponding tests
- **Mocking:** Mock configuration context, translation context, event service

**Test Cases to Cover:**
1. Document selection screen renders with all options
2. Omang appears first in the list
3. Clicking a document option selects it (visual state change)
4. Continue button is disabled when no selection
5. Continue button is enabled when document selected
6. Clicking Continue emits `document.selected` event
7. Clicking Continue navigates to document capture
8. Clicking Back navigates to welcome screen
9. Back navigation clears selection state
10. Mobile responsive layout (< 576px)

### Project Structure Notes

- This story extends the existing Ballerine SDK - follow existing patterns
- Use configuration-driven approach from Story 1.1
- Create reusable DocumentOption atom component
- Maintain SDK bundle size under 200KB
- Do not break existing SDK functionality

### Git Intelligence from Recent Commits

**Recent Work Patterns:**
- Translation fixes and additions (Swahili added in commit 23a8119)
- Dark theme support added (commit 612a4b9)
- Camera loader improvements (commit 9af0941)
- TypeScript error fixes (commit ec0b014)

**Insights:**
- Translation system is actively being enhanced - follow existing patterns
- Dark theme support exists - ensure new components support it
- Camera-related features are being improved - document capture is next logical step
- TypeScript strict mode is enforced - no `any` types

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.2] - Original story definition
- [Source: _bmad-output/planning-artifacts/ux-design-spec.md#2.1.2] - Document selection wireframe
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-009] - Svelte 5 upgrade
- [Source: _bmad-output/project-context.md#Testing-Rules] - Test framework assignment
- [Source: _bmad-output/implementation-artifacts/1-1-sdk-initialization-welcome-screen.md] - Previous story patterns
- [Source: sdks/web-sdk/src/lib/pages/Welcome.svelte] - Existing page component pattern

---

## Dev Agent Guardrails

### CRITICAL: What NOT to Do

1. **DO NOT hardcode UI elements in components** - Use configuration-driven approach from UI packs
2. **DO NOT use Svelte 3 stores syntax** - Use Svelte 5 runes (`$state()`, `$derived()`)
3. **DO NOT skip event emission** - Analytics tracking is critical for product insights
4. **DO NOT ignore mobile responsiveness** - Mobile-first design is mandatory
5. **DO NOT break existing SDK flows** - Welcome screen must still work
6. **DO NOT exceed bundle size** - Keep SDK under 200KB total
7. **DO NOT use `any` types** - TypeScript strict mode is enforced

### CRITICAL: What TO Do

1. **DO follow Story 1.1 patterns** - Configuration-driven, element-based rendering
2. **DO create reusable atom components** - DocumentOption should be reusable
3. **DO emit tracking events** - `document.selected` event is required
4. **DO write comprehensive tests** - All ACs must have test coverage
5. **DO use Svelte 5 runes** - Modern reactive state management
6. **DO support dark theme** - Recent commit shows dark theme is active
7. **DO validate accessibility** - WCAG 2.1 AA compliance required

### Technical Requirements Summary

**Framework & Versions:**
- Svelte 5.46 (use runes, not legacy stores)
- TypeScript 5.8.x (strict mode)
- Vite 7.2 (Rolldown bundler)
- Vitest 4.x (unit tests)

**State Management:**
- Use Svelte 5 `$state()` runes for reactive state
- Use writable stores for cross-component state
- No props drilling - use stores for shared state

**Styling:**
- Use Botswana Blue (#75AADB) for primary actions
- Use Botswana Blue Light (#E9F5F9) for selected state
- Follow 4px spacing scale
- Use Inter font family
- Support dark theme (check existing theme implementation)

**Event Tracking:**
- Emit `document.selected` event on Continue click
- Include document type in event data
- Include session metadata (clientId, sdkVersion, userAgent)

**Navigation:**
- Back button returns to Welcome screen
- Continue button navigates to DocumentCapture screen
- Clear selection state on back navigation
- Pass selected document type to next screen

**Accessibility:**
- Minimum 44x44px touch targets on mobile
- Keyboard navigation support
- Screen reader support (ARIA labels)
- Focus management (visible focus indicators)

**Performance:**
- Screen loads in < 500ms
- No layout shifts during render
- Lazy load images if needed
- Optimize bundle size

---

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_
