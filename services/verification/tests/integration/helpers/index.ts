/**
 * Integration Test Helpers
 *
 * Export all test utilities for easy importing in test files.
 */

export { TestClient, testClient, type TestClientConfig, type TestResponse } from './test-client.js';
export { DynamoDBTestUtils, dynamoDBTestUtils, type DynamoDBTestConfig } from './dynamodb-test-utils.js';

/**
 * Check if integration tests are enabled
 */
export const isIntegrationEnabled = (): boolean => {
  return process.env.TEST_INTEGRATION === 'true';
};

/**
 * Skip test if integration is not enabled
 */
export const skipIfNoIntegration = (testFn: () => void | Promise<void>) => {
  if (!isIntegrationEnabled()) {
    return () => {
      console.log('Skipping integration test (TEST_INTEGRATION not set)');
    };
  }
  return testFn;
};

/**
 * Generate a unique test ID
 */
export const generateTestId = (prefix: string = 'test'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
};

/**
 * Wait for a condition to be true
 */
export const waitFor = async (
  condition: () => Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> => {
  const { timeout = 10000, interval = 500 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
};

/**
 * Retry a function until it succeeds or max retries reached
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; delay?: number } = {}
): Promise<T> => {
  const { maxRetries = 3, delay = 1000 } = options;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};
