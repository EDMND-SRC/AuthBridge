import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 *
 * Tests the passwordless authentication flow for Backoffice users.
 */

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page for unauthenticated users', async ({ page }) => {
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);

    // Should show login form
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /continue/i })).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/login');

    // Enter invalid email
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByRole('button', { name: /continue/i }).click();

    // Should show validation error
    await expect(page.getByText(/invalid email/i)).toBeVisible();
  });

  test('should reject free email domains', async ({ page }) => {
    await page.goto('/login');

    // Enter Gmail address
    await page.getByLabel(/email/i).fill('test@gmail.com');
    await page.getByRole('button', { name: /continue/i }).click();

    // Should show work email required message
    await expect(page.getByText(/work email/i)).toBeVisible();
  });

  test('should initiate OTP flow for valid work email', async ({ page }) => {
    await page.goto('/login');

    // Enter valid work email
    await page.getByLabel(/email/i).fill('test@authbridge.io');
    await page.getByRole('button', { name: /continue/i }).click();

    // Should show OTP input
    await expect(page.getByText(/verification code/i)).toBeVisible();
    await expect(page.getByLabel(/code/i)).toBeVisible();
  });

  test('should handle invalid OTP', async ({ page }) => {
    await page.goto('/login');

    // Enter valid work email
    await page.getByLabel(/email/i).fill('test@authbridge.io');
    await page.getByRole('button', { name: /continue/i }).click();

    // Wait for OTP screen
    await expect(page.getByLabel(/code/i)).toBeVisible();

    // Enter invalid OTP
    await page.getByLabel(/code/i).fill('000000');
    await page.getByRole('button', { name: /verify/i }).click();

    // Should show error
    await expect(page.getByText(/invalid.*code/i)).toBeVisible();
  });

  test('should allow resending OTP', async ({ page }) => {
    await page.goto('/login');

    // Enter valid work email
    await page.getByLabel(/email/i).fill('test@authbridge.io');
    await page.getByRole('button', { name: /continue/i }).click();

    // Wait for OTP screen
    await expect(page.getByLabel(/code/i)).toBeVisible();

    // Click resend
    await page.getByRole('button', { name: /resend/i }).click();

    // Should show confirmation
    await expect(page.getByText(/code sent/i)).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to login when accessing cases without auth', async ({ page }) => {
    await page.goto('/cases');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to login when accessing settings without auth', async ({ page }) => {
    await page.goto('/settings');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Logout', () => {
  // Logout test requires authenticated state - covered by auth.fixture.ts
  test.skip('should log out user and redirect to login', async ({ page }) => {
    // See apps/backoffice/tests/e2e/fixtures/auth.fixture.ts for authenticated tests
  });
});

test.describe('Accessibility', () => {
  test('login page should be keyboard navigable', async ({ page }) => {
    await page.goto('/login');

    // Tab to email input
    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/email/i)).toBeFocused();

    // Tab to submit button
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /continue/i })).toBeFocused();
  });

  test('login page should have proper ARIA labels', async ({ page }) => {
    await page.goto('/login');

    // Check form has accessible name
    const form = page.getByRole('form');
    await expect(form).toBeVisible();

    // Check input has label
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toHaveAttribute('type', 'email');
  });
});
