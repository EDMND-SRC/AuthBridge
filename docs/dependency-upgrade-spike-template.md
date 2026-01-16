# Dependency Upgrade Spike Template

## Overview

Use this template when planning major dependency upgrades. Complete all sections before starting implementation.

## Spike Information

| Field | Value |
|-------|-------|
| Dependency | [Package name and current version] |
| Target Version | [Target version] |
| Spike Duration | [Recommended: 2-4 hours] |
| Owner | [Developer name] |
| Date | [YYYY-MM-DD] |

## Pre-Upgrade Checklist

- [ ] Read changelog for all versions between current and target
- [ ] Review breaking changes documentation
- [ ] Check GitHub issues for known migration problems
- [ ] Verify peer dependency compatibility
- [ ] Check if codemod/migration tools are available

## Impact Assessment

### Files Affected
```
[List files that import/use this dependency]
```

### Breaking Changes
| Change | Impact | Migration Path |
|--------|--------|----------------|
| [API change] | [High/Medium/Low] | [How to migrate] |

### Peer Dependencies
| Dependency | Current | Required | Action |
|------------|---------|----------|--------|
| [dep name] | [version] | [version] | [upgrade/none] |

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Build failures | [H/M/L] | [H/M/L] | [Strategy] |
| Runtime errors | [H/M/L] | [H/M/L] | [Strategy] |
| Test failures | [H/M/L] | [H/M/L] | [Strategy] |

## Test Plan

### Automated Tests
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass

### Manual Testing
- [ ] [Critical flow 1]
- [ ] [Critical flow 2]
- [ ] [Critical flow 3]

## Rollback Plan

1. Revert package.json changes
2. Run `pnpm install`
3. Verify build succeeds
4. Deploy previous version

## Spike Findings

### Estimated Effort
- [ ] Trivial (< 1 hour)
- [ ] Small (1-4 hours)
- [ ] Medium (1-2 days)
- [ ] Large (3-5 days)
- [ ] Epic (> 1 week)

### Recommendation
- [ ] Proceed with upgrade
- [ ] Defer upgrade (reason: ___)
- [ ] Skip upgrade (reason: ___)

### Notes
```
[Additional findings, gotchas, or recommendations]
```

## Approval

| Role | Name | Date | Approved |
|------|------|------|----------|
| Tech Lead | | | [ ] |
| QA | | | [ ] |

---

## Example: React 18 → 19 Upgrade

| Field | Value |
|-------|-------|
| Dependency | react@18.2.0 |
| Target Version | 19.2.0 |
| Spike Duration | 4 hours |
| Owner | Charlie |
| Date | 2026-01-20 |

### Breaking Changes
| Change | Impact | Migration Path |
|--------|--------|----------------|
| Concurrent features default | Medium | Test async boundaries |
| Strict mode double-render | Low | Already enabled |
| New JSX transform | Low | Already using |

### Peer Dependencies
| Dependency | Current | Required | Action |
|------------|---------|----------|--------|
| react-dom | 18.2.0 | 19.2.0 | Upgrade together |
| @types/react | 18.x | 19.x | Upgrade |
