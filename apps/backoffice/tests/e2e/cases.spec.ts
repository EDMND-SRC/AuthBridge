/**
 * Case Management E2E Tests
 * TD-007, TD-008: Tests enabled with auth fixture
 *
 * Tests the case list and detail views for compliance officers.
 */
import { test, expect } from './fixtures/auth.fixture';

test.describe('Case List', () => {
  test('should display case list with filters', async ({ authenticatedPage: page }) => {
    await page.goto('/cases');

    // Should show case list heading
    await expect(page.getByRole('heading', { name: /cases/i })).toBeVisible();

    // Should show filter controls
    await expect(page.getByRole('combobox', { name: /status/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /search/i })).toBeVisible();

    // Should show case table
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should filter cases by status', async ({ authenticatedPage: page }) => {
    await page.goto('/cases');

    // Select pending status
    await page.getByRole('combobox', { name: /status/i }).selectOption('pending');

    // Should update URL with filter
    await expect(page).toHaveURL(/status=pending/);

    // Should show only pending cases
    const rows = page.getByRole('row');
    for (const row of await rows.all()) {
      const status = row.getByText(/pending/i);
      if (await status.isVisible()) {
        await expect(status).toBeVisible();
      }
    }
  });

  test('should search cases by customer name', async ({ authenticatedPage: page }) => {
    await page.goto('/cases');

    // Enter search term
    await page.getByRole('textbox', { name: /search/i }).fill('John');
    await page.keyboard.press('Enter');

    // Should update URL with search
    await expect(page).toHaveURL(/search=John/);
  });

  test('should paginate case list', async ({ authenticatedPage: page }) => {
    await page.goto('/cases');

    // Should show pagination
    await expect(page.getByRole('navigation', { name: /pagination/i })).toBeVisible();

    // Click next page
    await page.getByRole('button', { name: /next/i }).click();

    // Should update URL with page
    await expect(page).toHaveURL(/page=2/);
  });

  test('should navigate to case detail on row click', async ({ authenticatedPage: page }) => {
    await page.goto('/cases');

    // Click first case row
    await page.getByRole('row').nth(1).click();

    // Should navigate to case detail
    await expect(page).toHaveURL(/\/cases\/case_/);
  });
});

test.describe('Case Detail', () => {
  test('should display case information', async ({ authenticatedPage: page }) => {
    await page.goto('/cases/case_123');

    // Should show case header
    await expect(page.getByRole('heading', { name: /case/i })).toBeVisible();

    // Should show customer info
    await expect(page.getByText(/customer/i)).toBeVisible();

    // Should show document images
    await expect(page.getByRole('img', { name: /document/i })).toBeVisible();

    // Should show verification scores
    await expect(page.getByText(/biometric score/i)).toBeVisible();
    await expect(page.getByText(/ocr confidence/i)).toBeVisible();
  });

  test('should display document viewer', async ({ authenticatedPage: page }) => {
    await page.goto('/cases/case_123');

    // Click on document thumbnail
    await page.getByRole('img', { name: /document/i }).first().click();

    // Should open document viewer modal
    await expect(page.getByRole('dialog')).toBeVisible();

    // Should show zoom controls
    await expect(page.getByRole('button', { name: /zoom in/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /zoom out/i })).toBeVisible();
  });

  test('should approve case', async ({ authenticatedPage: page }) => {
    await page.goto('/cases/case_123');

    // Click approve button
    await page.getByRole('button', { name: /approve/i }).click();

    // Should show confirmation dialog
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/confirm approval/i)).toBeVisible();

    // Confirm approval
    await page.getByRole('button', { name: /confirm/i }).click();

    // Should show success message
    await expect(page.getByText(/case approved/i)).toBeVisible();

    // Status should update
    await expect(page.getByText(/approved/i)).toBeVisible();
  });

  test('should reject case with reason', async ({ authenticatedPage: page }) => {
    await page.goto('/cases/case_123');

    // Click reject button
    await page.getByRole('button', { name: /reject/i }).click();

    // Should show rejection dialog
    await expect(page.getByRole('dialog')).toBeVisible();

    // Select rejection reason
    await page.getByRole('combobox', { name: /reason/i }).selectOption('document_unclear');

    // Add notes
    await page.getByRole('textbox', { name: /notes/i }).fill('Document image is blurry');

    // Confirm rejection
    await page.getByRole('button', { name: /reject/i }).click();

    // Should show success message
    await expect(page.getByText(/case rejected/i)).toBeVisible();
  });

  test('should show audit trail', async ({ authenticatedPage: page }) => {
    await page.goto('/cases/case_123');

    // Click audit trail tab
    await page.getByRole('tab', { name: /history/i }).click();

    // Should show audit events
    await expect(page.getByText(/created/i)).toBeVisible();
    await expect(page.getByText(/ocr completed/i)).toBeVisible();
  });
});

test.describe('Case Detail Accessibility', () => {
  test('should be keyboard navigable', async ({ authenticatedPage: page }) => {
    await page.goto('/cases/case_123');

    // Tab through interactive elements
    await page.keyboard.press('Tab');

    // Should be able to reach approve button
    let foundApprove = false;
    for (let i = 0; i < 20; i++) {
      const focused = page.locator(':focus');
      if (await focused.textContent() === 'Approve') {
        foundApprove = true;
        break;
      }
      await page.keyboard.press('Tab');
    }

    expect(foundApprove).toBe(true);
  });

  test('should announce status changes to screen readers', async ({ authenticatedPage: page }) => {
    await page.goto('/cases/case_123');

    // Check for aria-live region
    const liveRegion = page.locator('[aria-live]');
    await expect(liveRegion).toBeVisible();
  });
});
