/**
 * Authentication Fixture for Playwright E2E Tests
 * TD-007, TD-008: Provides authenticated state for tests requiring login
 *
 * Usage:
 *   import { test } from './fixtures/auth.fixture';
 *   test('authenticated test', async ({ authenticatedPage }) => { ... });
 */
import { test as base, Page, BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Storage state file path
const AUTH_STATE_PATH = path.join(__dirname, '../.auth/user.json');

/**
 * Mock user credentials for testing
 * In CI, these would come from environment variables
 */
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@authbridge.io',
  // OTP is mocked in test environment
};

/**
 * Extended test fixtures with authentication
 */
export const test = base.extend<{
  authenticatedPage: Page;
  authenticatedContext: BrowserContext;
}>({
  /**
   * Provides a page with authenticated session
   */
  authenticatedPage: async ({ browser }, use) => {
    // Check if we have stored auth state
    let context: BrowserContext;

    if (fs.existsSync(AUTH_STATE_PATH)) {
      // Reuse existing auth state
      context = await browser.newContext({
        storageState: AUTH_STATE_PATH,
      });
    } else {
      // Create new context and authenticate
      context = await browser.newContext();
      const page = await context.newPage();

      // Perform login flow
      await authenticateUser(page);

      // Save auth state for reuse
      await fs.promises.mkdir(path.dirname(AUTH_STATE_PATH), { recursive: true });
      await context.storageState({ path: AUTH_STATE_PATH });
    }

    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  /**
   * Provides an authenticated browser context
   */
  authenticatedContext: async ({ browser }, use) => {
    let context: BrowserContext;

    if (fs.existsSync(AUTH_STATE_PATH)) {
      context = await browser.newContext({
        storageState: AUTH_STATE_PATH,
      });
    } else {
      context = await browser.newContext();
      const page = await context.newPage();
      await authenticateUser(page);
      await fs.promises.mkdir(path.dirname(AUTH_STATE_PATH), { recursive: true });
      await context.storageState({ path: AUTH_STATE_PATH });
    }

    await use(context);
    await context.close();
  },
});

/**
 * Perform authentication flow
 * In test environment, OTP verification is mocked
 */
async function authenticateUser(page: Page): Promise<void> {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  // Navigate to login
  await page.goto(`${baseUrl}/login`);

  // Enter email
  await page.getByLabel(/email/i).fill(TEST_USER.email);
  await page.getByRole('button', { name: /continue/i }).click();

  // Wait for OTP screen
  await page.waitForSelector('[data-testid="otp-input"], input[aria-label*="code"]', {
    timeout: 5000,
  });

  // In test environment, use mock OTP (configured in test setup)
  // The test environment should accept '123456' as valid OTP
  const mockOtp = process.env.TEST_OTP || '123456';
  await page.getByLabel(/code/i).fill(mockOtp);
  await page.getByRole('button', { name: /verify/i }).click();

  // Wait for successful authentication (redirect to dashboard)
  await page.waitForURL(/\/(dashboard|cases)/, { timeout: 10000 });
}

/**
 * Re-export expect for convenience
 */
export { expect } from '@playwright/test';

/**
 * Setup function to run before all tests
 * Creates initial auth state if needed
 */
export async function globalSetup(): Promise<void> {
  // Auth state is created lazily on first test run
  // This function can be extended for additional setup
}

/**
 * Teardown function to run after all tests
 * Cleans up auth state
 */
export async function globalTeardown(): Promise<void> {
  // Optionally clean up auth state after test run
  // Keeping it allows faster subsequent runs
  if (process.env.CLEAN_AUTH_STATE === 'true' && fs.existsSync(AUTH_STATE_PATH)) {
    await fs.promises.unlink(AUTH_STATE_PATH);
  }
}
