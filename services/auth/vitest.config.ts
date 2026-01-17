import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      DYNAMODB_ENDPOINT: 'http://localhost:8000',
      AWS_REGION: 'af-south-1',
      TABLE_NAME: 'AuthBridgeTable',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.test.ts', '**/types/**', 'dist/**', 'node_modules/**'],
    },
  },
});
