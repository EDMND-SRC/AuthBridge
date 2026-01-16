# Component Library Standards

## Overview

Standards for building and maintaining UI components in the AuthBridge monorepo.

## Test ID Requirements

### data-testid Convention

All interactive and significant UI elements MUST have a `data-testid` attribute for E2E testing.

#### Naming Pattern
```
data-testid="[component]-[element]-[variant?]"
```

#### Examples
```tsx
// Buttons
<Button data-testid="case-approve-btn">Approve</Button>
<Button data-testid="case-reject-btn">Reject</Button>
<Button data-testid="bulk-approve-btn">Bulk Approve</Button>

// Forms
<TextInput data-testid="login-email-input" />
<PasswordInput data-testid="login-password-input" />
<Select data-testid="document-type-select" />

// Lists and Tables
<Table data-testid="cases-table" />
<TableRow data-testid="case-row-{id}" />
<Checkbox data-testid="case-select-{id}" />

// Modals and Dialogs
<Modal data-testid="confirm-reject-modal" />
<Dialog data-testid="bulk-action-dialog" />

// Navigation
<NavLink data-testid="nav-dashboard" />
<Tab data-testid="tab-pending" />
```

### Required Elements

These elements MUST always have data-testid:

1. **Buttons** - All clickable actions
2. **Form inputs** - Text, select, checkbox, radio
3. **Tables** - Table container and rows
4. **Modals/Dialogs** - Container and action buttons
5. **Navigation** - Links, tabs, breadcrumbs
6. **Status indicators** - Badges, alerts, toasts
7. **Loading states** - Spinners, skeletons

### Playwright Usage

```typescript
// Good - uses data-testid
await page.getByTestId('case-approve-btn').click();
await page.getByTestId('login-email-input').fill('user@example.com');

// Avoid - fragile selectors
await page.locator('.btn-primary').click();
await page.locator('input[type="email"]').fill('user@example.com');
```

## Component Structure

### File Organization
```
src/components/
├── atoms/           # Basic building blocks
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   ├── Button.stories.tsx
│   │   └── index.ts
├── molecules/       # Composed components
├── organisms/       # Complex components
└── templates/       # Page layouts
```

### Component Template
```tsx
import { forwardRef } from 'react';

export interface ButtonProps {
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'danger';
  /** Loading state */
  loading?: boolean;
  /** Test ID for E2E testing */
  testId?: string;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', loading, testId, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        data-testid={testId}
        disabled={loading}
        className={`btn btn-${variant}`}
        {...props}
      >
        {loading ? <Spinner /> : children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

## Accessibility Requirements

### WCAG 2.1 AA Compliance

1. **Color contrast** - 4.5:1 for normal text, 3:1 for large text
2. **Keyboard navigation** - All interactive elements focusable
3. **Screen reader support** - Proper ARIA labels
4. **Focus indicators** - Visible focus states

### Required ARIA Attributes
```tsx
// Buttons with icons only
<IconButton aria-label="Close dialog" data-testid="close-btn">
  <CloseIcon />
</IconButton>

// Form fields
<TextInput
  aria-label="Email address"
  aria-describedby="email-error"
  aria-invalid={hasError}
  data-testid="email-input"
/>

// Loading states
<Spinner aria-label="Loading cases" />
```

## TypeScript Standards

### Props Interface
- Export all prop interfaces
- Use JSDoc comments for documentation
- Provide sensible defaults

### Generic Components
```tsx
interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  testId?: string;
}

export function Table<T>({ data, columns, testId }: TableProps<T>) {
  return (
    <table data-testid={testId}>
      {/* ... */}
    </table>
  );
}
```

## Testing Standards

### Unit Tests (Vitest)
- Test all props and variants
- Test accessibility
- Test keyboard interactions

### E2E Tests (Playwright)
- Use data-testid selectors
- Test user flows, not implementation
- Include visual regression tests for critical components

## Review Checklist

Before merging component changes:

- [ ] data-testid on all interactive elements
- [ ] TypeScript types exported
- [ ] JSDoc comments on props
- [ ] Unit tests for all variants
- [ ] Accessibility audit passed
- [ ] Storybook story added/updated
