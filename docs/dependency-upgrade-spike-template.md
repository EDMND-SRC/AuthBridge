# Dependency Upgrade Spike Template

## Overview

Use this template when planning major dependency upgrades that may have breaking changes or require significant testing.

## Spike Information

| Field | Value |
|-------|-------|
| Spike ID | SPIKE-XXX |
| Created | YYYY-MM-DD |
| Author | [Name] |
| Time-box | [X hours/days] |
| Status | Draft / In Progress / Complete |

## Dependency Details

| Current Version | Target Version | Package |
|-----------------|----------------|---------|
| X.Y.Z | A.B.C | package-name |

### Why Upgrade?

- [ ] Security vulnerability (CVE-XXXX-XXXXX)
- [ ] New features required
- [ ] Performance improvements
- [ ] End of life / deprecation
- [ ] Transitive dependency conflict
- [ ] Other: _______________

### Risk Assessment

| Risk Factor | Level (Low/Med/High) | Notes |
|-------------|----------------------|-------|
| Breaking changes | | |
| API surface changes | | |
| Peer dependency conflicts | | |
| Build system impact | | |
| Runtime behavior changes | | |
| Test suite impact | | |

## Pre-Upgrade Checklist

- [ ] Read changelog for all versions between current and target
- [ ] Review migration guide (if available)
- [ ] Check GitHub issues for known upgrade problems
- [ ] Verify peer dependency compatibility
- [ ] Check if other packages in monorepo depend on this
- [ ] Identify affected code paths

## Affected Packages

List all packages in the monorepo that use this dependency:

```
packages/
├── package-a/        # Direct dependency
├── package-b/        # Transitive via package-a
└── package-c/        # Not affected
```

## Breaking Changes Analysis

### API Changes

| Old API | New API | Files Affected |
|---------|---------|----------------|
| `oldMethod()` | `newMethod()` | `src/file.ts` |

### Removed Features

| Feature | Replacement | Impact |
|---------|-------------|--------|
| | | |

### New Required Configuration

```typescript
// Example new config required
```

## Testing Strategy

### Unit Tests

- [ ] Run existing test suite
- [ ] Add tests for new API usage
- [ ] Verify mocks still work

### Integration Tests

- [ ] Test with DynamoDB Local
- [ ] Test with LocalStack (if AWS services)
- [ ] Verify API contracts unchanged

### E2E Tests

- [ ] Run full E2E suite
- [ ] Manual smoke test critical paths

### Performance Testing

- [ ] Benchmark before upgrade
- [ ] Benchmark after upgrade
- [ ] Compare cold start times (Lambda)

## Rollback Plan

1. Revert package.json changes
2. Run `pnpm install`
3. Verify tests pass
4. Deploy previous version

## Implementation Steps

1. [ ] Create feature branch: `chore/upgrade-{package}-{version}`
2. [ ] Update package.json
3. [ ] Run `pnpm install`
4. [ ] Fix TypeScript errors
5. [ ] Update deprecated API usage
6. [ ] Run unit tests
7. [ ] Run integration tests
8. [ ] Run E2E tests
9. [ ] Update documentation
10. [ ] Create PR with detailed notes

## Time Tracking

| Phase | Estimated | Actual |
|-------|-----------|--------|
| Research | | |
| Implementation | | |
| Testing | | |
| Documentation | | |
| **Total** | | |

## Findings & Recommendations

### Summary

[Write summary after spike completion]

### Recommendation

- [ ] Proceed with upgrade
- [ ] Defer upgrade (reason: ___)
- [ ] Partial upgrade (details: ___)
- [ ] Do not upgrade (reason: ___)

### Follow-up Tasks

- [ ] Task 1
- [ ] Task 2

## References

- [Package Changelog](URL)
- [Migration Guide](URL)
- [Related Issues](URL)

---

## Example: AWS SDK v3 Upgrade

```markdown
## Dependency Details

| Current Version | Target Version | Package |
|-----------------|----------------|---------|
| 3.450.0 | 3.500.0 | @aws-sdk/* |

### Breaking Changes Analysis

#### API Changes

| Old API | New API | Files Affected |
|---------|---------|----------------|
| `client.send(cmd)` | Same | N/A |
| Middleware stack v1 | Middleware stack v2 | `src/middleware/` |

### Testing Strategy

- Run with DynamoDB Local: `pnpm test:integration`
- Verify Lambda cold starts < 500ms
- Check bundle size delta
```
