# Accessibility Acceptance Criteria Template

**Owner:** Alice (Product Owner)
**Last Updated:** 2026-01-15
**Standard:** WCAG 2.1 Level AA

---

## Overview

This template provides accessibility acceptance criteria for all UI stories in AuthBridge. All frontend stories (Epic 3+) must include these criteria in their acceptance criteria section.

**Compliance Target:** WCAG 2.1 Level AA

---

## Required Acceptance Criteria

### 1. Keyboard Navigation

```markdown
**Given** a user navigates using only keyboard
**When** they interact with the component
**Then** all interactive elements are focusable via Tab key
**And** focus order follows logical reading order
**And** focus indicator is visible (minimum 2px outline)
**And** no keyboard traps exist
**And** Escape key closes modals/dropdowns
```

### 2. Screen Reader Support

```markdown
**Given** a user uses a screen reader (NVDA, VoiceOver, JAWS)
**When** they navigate the component
**Then** all content is announced correctly
**And** form inputs have associated labels
**And** buttons have descriptive text or aria-label
**And** images have alt text (or aria-hidden if decorative)
**And** dynamic content changes are announced via aria-live
```

### 3. Color and Contrast

```markdown
**Given** a user views the component
**When** they examine text and interactive elements
**Then** text has minimum 4.5:1 contrast ratio (normal text)
**And** large text (18px+) has minimum 3:1 contrast ratio
**And** interactive elements have minimum 3:1 contrast ratio
**And** information is not conveyed by color alone
**And** focus indicators have minimum 3:1 contrast ratio
```

### 4. Text and Typography

```markdown
**Given** a user adjusts browser text size
**When** text is scaled to 200%
**Then** content remains readable without horizontal scrolling
**And** no content is clipped or overlapped
**And** line height is at least 1.5x font size
**And** paragraph spacing is at least 2x font size
```

### 5. Forms and Inputs

```markdown
**Given** a user interacts with form elements
**When** they complete the form
**Then** all inputs have visible labels
**And** required fields are indicated (not by color alone)
**And** error messages are descriptive and associated with inputs
**And** autocomplete attributes are used where appropriate
**And** input purpose is programmatically determinable
```

### 6. Motion and Animation

```markdown
**Given** a user has motion sensitivity
**When** they view animated content
**Then** animations respect prefers-reduced-motion
**And** no content flashes more than 3 times per second
**And** auto-playing content can be paused/stopped
**And** animations are not essential for understanding
```

### 7. Touch Targets

```markdown
**Given** a user interacts via touch device
**When** they tap interactive elements
**Then** touch targets are at least 44x44 pixels
**And** adequate spacing exists between targets
**And** gestures have single-pointer alternatives
```

---

## Story Template Addition

Add this section to all UI story acceptance criteria:

```markdown
## Accessibility Criteria (WCAG 2.1 AA)

- [ ] All interactive elements are keyboard accessible
- [ ] Focus order is logical and visible
- [ ] Screen reader announces content correctly
- [ ] Color contrast meets minimum ratios (4.5:1 text, 3:1 UI)
- [ ] Text scales to 200% without loss of functionality
- [ ] Form inputs have associated labels and error messages
- [ ] Animations respect prefers-reduced-motion
- [ ] Touch targets are at least 44x44 pixels
```

---

## Testing Checklist

### Automated Testing

- [ ] Run axe-core accessibility scanner
- [ ] Run Lighthouse accessibility audit
- [ ] Validate HTML with W3C validator
- [ ] Check color contrast with WebAIM contrast checker

### Manual Testing

- [ ] Navigate entire component using only keyboard
- [ ] Test with screen reader (VoiceOver on Mac, NVDA on Windows)
- [ ] Test with browser zoom at 200%
- [ ] Test with high contrast mode
- [ ] Test with prefers-reduced-motion enabled

### Tools

| Tool | Purpose | Link |
|------|---------|------|
| axe DevTools | Automated accessibility testing | [axe](https://www.deque.com/axe/) |
| Lighthouse | Performance and accessibility audit | Built into Chrome |
| WAVE | Web accessibility evaluation | [wave.webaim.org](https://wave.webaim.org/) |
| WebAIM Contrast Checker | Color contrast validation | [webaim.org/resources/contrastchecker](https://webaim.org/resources/contrastchecker/) |
| NVDA | Screen reader (Windows) | [nvaccess.org](https://www.nvaccess.org/) |
| VoiceOver | Screen reader (Mac) | Built into macOS |

---

## Component-Specific Criteria

### Buttons

```markdown
- Has descriptive text or aria-label
- Disabled state is visually distinct and announced
- Loading state is announced via aria-busy
- Icon-only buttons have aria-label
```

### Forms

```markdown
- Labels are associated with inputs (for/id or aria-labelledby)
- Required fields have aria-required="true"
- Error messages have aria-describedby linking to input
- Success/error states are announced via aria-live
```

### Modals

```markdown
- Focus is trapped within modal when open
- Escape key closes modal
- Focus returns to trigger element on close
- Modal has aria-modal="true" and role="dialog"
- Modal has accessible name (aria-labelledby)
```

### Tables

```markdown
- Has caption or aria-label describing content
- Header cells use <th> with scope attribute
- Complex tables have aria-describedby for instructions
- Sortable columns announce sort state
```

### Navigation

```markdown
- Has role="navigation" or <nav> element
- Current page is indicated (aria-current="page")
- Skip link available to bypass navigation
- Dropdown menus are keyboard accessible
```

### Alerts/Notifications

```markdown
- Uses role="alert" or aria-live="polite"
- Dismissible alerts have accessible close button
- Error alerts use aria-live="assertive"
- Success alerts use aria-live="polite"
```

---

## Mantine 8 Accessibility

AuthBridge uses Mantine 8.3 for UI components. Mantine provides built-in accessibility features:

### Built-in Features

- Focus management for modals and drawers
- Keyboard navigation for menus and selects
- ARIA attributes for form components
- Color contrast validation in theme

### Configuration

```typescript
// theme.ts
import { createTheme } from '@mantine/core';

export const theme = createTheme({
  // Ensure focus ring is always visible
  focusRing: 'always',

  // Use accessible color scheme
  primaryColor: 'blue',

  // Ensure adequate contrast
  colors: {
    // Custom colors with accessible contrast
  },
});
```

### Testing Mantine Components

```typescript
// Example accessibility test
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('Button is accessible', async () => {
  const { container } = render(<Button>Click me</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## References

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Mantine Accessibility](https://mantine.dev/guides/accessibility/)
- [React Accessibility](https://reactjs.org/docs/accessibility.html)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [WebAIM Resources](https://webaim.org/resources/)

