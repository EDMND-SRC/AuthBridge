import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    hookTimeout: 10000,
    // globalSetup only needed for integration tests with DynamoDB Local
    // globalSetup: './tests/setup-dynamodb-local.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.test.ts', '**/types/**', 'dist/**', 'node_modules/**'],
    },
    // Don't auto-clear mocks - let tests manage their own mock state
    clearMocks: false,
    restoreMocks: false,
    mockReset: false,
  },
});
