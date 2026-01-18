# Vitest Upgrade from 1.6.0 to 4.0.17

## Summary

Successfully upgraded vitest from v1.6.0 to v4.0.17 and updated all test files to be compatible with the new version.

## Changes Made

### 1. Package Updates

**File:** `services/verification/package.json`
- Updated `vitest` from `^1.6.0` to `^4.0.17`

### 2. Vitest Configuration

**File:** `services/verification/vitest.config.ts`

Changed mock clearing behavior to prevent automatic clearing of mock implementations:

```typescript
// Don't auto-clear mocks - let tests manage their own mock state
clearMocks: false,
restoreMocks: false,
mockReset: false,
```

**Reason:** Vitest 4.x's `clearMocks: true` was clearing mock implementations set with `mockResolvedValueOnce`, causing tests to fail.

### 3. Test File Updates

All test files were updated to use Vitest 4.x compatible patterns:

#### Updated Files:
- `src/types/data-request.test.ts`
- `src/handlers/create-data-request.test.ts`
- `src/handlers/get-data-request-status.test.ts`
- `src/handlers/process-export.test.ts`
- `src/handlers/process-deletion.test.ts`
- `src/handlers/scheduled-hard-delete.test.ts`
- `src/middleware/rate-limit.test.ts`

#### Key Changes:

**a) Mock Factory Functions**

Changed from arrow functions to regular functions (required for constructors in Vitest 4.x):

```typescript
// Before (Vitest 1.x)
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({ send: mockDynamoDBSend })),
}));

// After (Vitest 4.x)
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(function() { return { send: mockDynamoDBSend }; }),
}));
```

**b) Using `vi.hoisted()`**

Used `vi.hoisted()` to define mock functions that are referenced in `vi.mock` factories:

```typescript
// Vitest 4.x pattern
const { mockDynamoDBSend, mockUpdateRequestStatus } = vi.hoisted(() => ({
  mockDynamoDBSend: vi.fn(),
  mockUpdateRequestStatus: vi.fn(),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(function() { return { send: mockDynamoDBSend }; }),
}));
```

**Reason:** `vi.mock` is hoisted to the top of the file, so it runs before regular variable declarations. `vi.hoisted()` ensures mock functions are available when `vi.mock` runs.

**c) Import Pattern**

Changed from dynamic imports in each test to importing once after mocks are set up:

```typescript
// Before
it('should work', async () => {
  const { handler } = await import('./my-handler');
  // test code
});

// After
import { handler } from './my-handler';

it('should work', async () => {
  // test code using handler
});
```

**d) Mock Reset in beforeEach**

Updated `beforeEach` to use `mockReset()` instead of `vi.clearAllMocks()`:

```typescript
beforeEach(() => {
  mockDynamoDBSend.mockReset();
  mockUpdateRequestStatus.mockReset();
  mockUpdateRequestStatus.mockResolvedValue({});
});
```

## Test Results

All 54 tests pass:
- `src/types/data-request.test.ts` - 14 tests ✓
- `src/handlers/create-data-request.test.ts` - 6 tests ✓
- `src/handlers/get-data-request-status.test.ts` - 7 tests ✓
- `src/handlers/process-export.test.ts` - 7 tests ✓
- `src/handlers/process-deletion.test.ts` - 6 tests ✓
- `src/handlers/scheduled-hard-delete.test.ts` - 6 tests ✓
- `src/middleware/rate-limit.test.ts` - 8 tests ✓

## Running Tests

```bash
# Run all data-request related tests
npx vitest run src/types/data-request.test.ts src/handlers/create-data-request.test.ts src/handlers/get-data-request-status.test.ts src/handlers/process-export.test.ts src/handlers/process-deletion.test.ts src/handlers/scheduled-hard-delete.test.ts src/middleware/rate-limit.test.ts

# Run all tests
pnpm test
```

## Breaking Changes in Vitest 4.x

1. **Constructor Mocks:** Arrow functions can't be used as constructors. Use regular functions instead.
2. **Mock Hoisting:** Mock functions used in `vi.mock` factories must be defined with `vi.hoisted()`.
3. **Mock Clearing:** `clearMocks: true` now clears mock implementations, not just call history.

## Migration Tips

When upgrading other test files to Vitest 4.x:

1. Replace arrow functions with regular functions in `vi.mock` factories
2. Use `vi.hoisted()` for mock functions referenced in `vi.mock`
3. Import modules once after mocks are set up (avoid `await import()` in tests)
4. Use `mockReset()` in `beforeEach` instead of relying on `clearMocks: true`
5. Test with `npx vitest run` to ensure tests pass in isolation

## References

- [Vitest 4.0 Release Notes](https://github.com/vitest-dev/vitest/releases/tag/v4.0.0)
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking.html)
- [vi.hoisted() Documentation](https://vitest.dev/api/vi.html#vi-hoisted)
