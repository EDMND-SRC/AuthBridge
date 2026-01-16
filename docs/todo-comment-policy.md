# TODO Comment Policy

## Overview

All TODO, FIXME, and HACK comments in the codebase must be tracked with a GitHub issue reference.

## Format

### Standard TODO
```typescript
// TODO: [AB-123] Brief description of what needs to be done
```

### FIXME (Higher Priority)
```typescript
// FIXME: [AB-456] Brief description of the bug or issue
```

### HACK (Technical Debt)
```typescript
// HACK: [AB-789] Explanation of why this workaround exists
```

## Rules

1. **Every TODO must have a ticket** - No orphan TODOs allowed
2. **Use project prefix** - `AB-` for AuthBridge issues
3. **Keep descriptions brief** - Details go in the ticket
4. **Include context** - Why is this needed?

## Examples

### Good
```typescript
// TODO: [AB-001] Replace placeholder JWT with auth service integration
// Current implementation uses predictable session tokens for MVP
function generateSessionToken(verificationId: string): string {
  return `session_${verificationId}`;
}

// FIXME: [AB-042] Handle race condition in concurrent uploads
// See ticket for reproduction steps
async function uploadDocument() { ... }

// HACK: [AB-099] Workaround for Mantine v7 breaking change
// Remove after upgrading to v8 which fixes this
const styles = { ...legacyStyles };
```

### Bad
```typescript
// TODO: fix this later
// FIXME: doesn't work sometimes
// HACK: idk why this works
```

## Creating Issues

When adding a TODO, create a GitHub issue with:

1. **Title**: Same as TODO comment
2. **Labels**: `technical-debt`, `todo-comment`
3. **Description**:
   - File and line number
   - Why this TODO exists
   - Proposed solution
   - Acceptance criteria

### Issue Template
```markdown
## TODO Comment Tracking

**File**: `services/verification/src/handlers/create-verification.ts`
**Line**: 18-23

## Description
[Detailed explanation of what needs to be done]

## Current Behavior
[What the code does now]

## Expected Behavior
[What the code should do]

## Proposed Solution
[How to fix it]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] TODO comment removed after fix
```

## Enforcement

### Pre-commit Hook
The pre-commit hook will fail if:
- TODO/FIXME/HACK without ticket reference
- Invalid ticket format

### CI Check
```yaml
# .github/workflows/lint.yml
- name: Check TODO comments
  run: |
    # Find TODOs without ticket references
    grep -rn "TODO:" --include="*.ts" --include="*.tsx" | grep -v "\[AB-" && exit 1 || true
```

## Cleanup Process

1. **Sprint Planning**: Review open TODO tickets
2. **Quarterly**: Audit all TODO comments
3. **Before Release**: No critical TODOs in release branch

## Existing TODOs

Current tracked TODOs in the codebase:

| Ticket | File | Description |
|--------|------|-------------|
| AB-001 | create-verification.ts | Replace placeholder JWT tokens |
| AB-002 | verification.ts | Remove mock implementation |
| AB-003 | get-config-from-query-params.ts | Add proper type guards |
| AB-004 | utils.ts | Fix IAppState page typing |
| AB-005 | preload-service/utils.ts | Implement element merging |
