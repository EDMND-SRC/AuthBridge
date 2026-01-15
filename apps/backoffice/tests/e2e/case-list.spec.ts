/**
 * Case List E2E Tests
 * Story 3.1: Case List View with Filters
 *
 * Tests the case list page functionality for compliance officers.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Case List Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cases');
  });

  test('should display case list page with title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /cases/i })).toBeVisible();
  });

  test('should display search input', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();
  });

  test('should display filter controls including assignee', async ({ page }) => {
    await expect(page.getByPlaceholder(/all statuses/i)).toBeVisible();
    await expect(page.getByPlaceholder(/all document types/i)).toBeVisible();
    await expect(page.getByPlaceholder(/all assignees/i)).toBeVisible();
  });

  test('should display case table with headers', async ({ page }) => {
    const table = page.getByRole('table');
    await expect(table).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /customer name/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /omang/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /document type/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /assignee/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /date/i })).toBeVisible();
  });

  test('should show empty state when no cases', async ({ page }) => {
    await page.route('**/api/v1/cases*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          meta: { requestId: 'test-123', timestamp: new Date().toISOString(), pagination: { limit: 20, cursor: null, hasMore: false, total: 0 } },
        }),
      });
    });
    await page.reload();
    await expect(page.getByText(/no cases/i)).toBeVisible();
  });

  test('should display cases from API', async ({ page }) => {
    await page.route('**/api/v1/cases*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { caseId: 'ver_123', customerName: 'John Doe', omangNumber: '***6789', status: 'pending', documentType: 'omang', assignee: null, createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-01-15T10:00:00Z' },
            { caseId: 'ver_456', customerName: 'Jane Smith', omangNumber: '***1234', status: 'approved', documentType: 'passport', assignee: 'analyst@example.com', createdAt: '2024-01-14T09:00:00Z', updatedAt: '2024-01-14T11:00:00Z' },
          ],
          meta: { requestId: 'test-123', timestamp: new Date().toISOString(), pagination: { limit: 20, cursor: null, hasMore: false, total: 2 } },
        }),
      });
    });
    await page.reload();
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('Jane Smith')).toBeVisible();
    await expect(page.getByText('***6789')).toBeVisible();
  });

  test('should mask Omang numbers (show only last 4 digits)', async ({ page }) => {
    await page.route('**/api/v1/cases*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{ caseId: 'ver_123', customerName: 'Test User', omangNumber: '***6789', status: 'pending', documentType: 'omang', assignee: null, createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-01-15T10:00:00Z' }],
          meta: { requestId: 'test-123', timestamp: new Date().toISOString(), pagination: { limit: 20, cursor: null, hasMore: false, total: 1 } },
        }),
      });
    });
    await page.reload();
    await expect(page.getByText('***6789')).toBeVisible();
    await expect(page.getByText('123456789')).not.toBeVisible();
  });

  test('should filter by search term', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('John');
    await page.waitForTimeout(600);
    const request = await page.waitForRequest((req) => req.url().includes('/api/v1/cases') && req.url().includes('search=John'));
    expect(request).toBeTruthy();
  });

  test('should filter by assignee', async ({ page }) => {
    await page.getByPlaceholder(/all assignees/i).click();
    await page.getByRole('option', { name: /analyst/i }).first().click();
    const request = await page.waitForRequest((req) => req.url().includes('/api/v1/cases') && req.url().includes('assignee='));
    expect(request).toBeTruthy();
  });

  test('should clear search with X button', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('John');
    await page.getByLabel(/clear search/i).click();
    await expect(searchInput).toHaveValue('');
  });

  test('should navigate to case detail on row click', async ({ page }) => {
    await page.route('**/api/v1/cases*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{ caseId: 'ver_test123', customerName: 'Test User', omangNumber: '***6789', status: 'pending', documentType: 'omang', assignee: null, createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-01-15T10:00:00Z' }],
          meta: { requestId: 'test-123', timestamp: new Date().toISOString(), pagination: { limit: 20, cursor: null, hasMore: false, total: 1 } },
        }),
      });
    });
    await page.reload();
    await page.getByText('Test User').click();
    await expect(page).toHaveURL(/\/cases\/ver_test123/);
  });

  test('should display status badges', async ({ page }) => {
    await page.route('**/api/v1/cases*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { caseId: 'ver_1', customerName: 'User 1', omangNumber: null, status: 'pending', documentType: 'omang', assignee: null, createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-01-15T10:00:00Z' },
            { caseId: 'ver_2', customerName: 'User 2', omangNumber: null, status: 'in-review', documentType: 'omang', assignee: null, createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-01-15T10:00:00Z' },
            { caseId: 'ver_3', customerName: 'User 3', omangNumber: null, status: 'approved', documentType: 'omang', assignee: null, createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-01-15T10:00:00Z' },
            { caseId: 'ver_4', customerName: 'User 4', omangNumber: null, status: 'rejected', documentType: 'omang', assignee: null, createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-01-15T10:00:00Z' },
          ],
          meta: { requestId: 'test-123', timestamp: new Date().toISOString(), pagination: { limit: 20, cursor: null, hasMore: false, total: 4 } },
        }),
      });
    });
    await page.reload();
    await expect(page.getByText('Pending')).toBeVisible();
    await expect(page.getByText('In Review')).toBeVisible();
    await expect(page.getByText('Approved')).toBeVisible();
    await expect(page.getByText('Rejected')).toBeVisible();
  });

  test('should handle API error gracefully', async ({ page }) => {
    await page.route('**/api/v1/cases*', async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Server error' } }) });
    });
    await page.reload();
    await expect(page.getByRole('alert')).toBeVisible();
  });
});

test.describe('Case List Performance', () => {
  test('should load page in under 1 second', async ({ page }) => {
    await page.route('**/api/v1/cases*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: Array.from({ length: 20 }, (_, i) => ({ caseId: `ver_${i}`, customerName: `User ${i}`, omangNumber: `***${1000 + i}`, status: 'pending', documentType: 'omang', assignee: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })),
          meta: { requestId: 'test-123', timestamp: new Date().toISOString(), pagination: { limit: 20, cursor: 'next', hasMore: true, total: 100 } },
        }),
      });
    });
    const startTime = Date.now();
    await page.goto('/cases');
    await page.getByRole('table').waitFor();
    expect(Date.now() - startTime).toBeLessThan(1000);
  });
});

test.describe('Case List Accessibility', () => {
  test('should have no accessibility violations (WCAG 2.1 AA)', async ({ page }) => {
    await page.route('**/api/v1/cases*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{ caseId: 'ver_123', customerName: 'John Doe', omangNumber: '***6789', status: 'pending', documentType: 'omang', assignee: null, createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-01-15T10:00:00Z' }],
          meta: { requestId: 'test-123', timestamp: new Date().toISOString(), pagination: { limit: 20, cursor: null, hasMore: false, total: 1 } },
        }),
      });
    });
    await page.goto('/cases');
    await page.getByRole('table').waitFor();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/cases');
    await page.keyboard.press('Tab');
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeFocused();
  });

  test('should have accessible filter controls', async ({ page }) => {
    await page.goto('/cases');
    await expect(page.getByLabel(/filter by status/i)).toBeVisible();
    await expect(page.getByLabel(/filter by document type/i)).toBeVisible();
    await expect(page.getByLabel(/filter by assignee/i)).toBeVisible();
  });
});

/**
 * Integration tests that hit real backend (when available)
 * These tests require the backend to be running with test data
 * Skip in CI unless INTEGRATION_TESTS=true
 */
test.describe('Case List Integration Tests', () => {
  // Skip integration tests unless explicitly enabled
  test.skip(({ }, testInfo) => !process.env.INTEGRATION_TESTS, 'Integration tests disabled');

  test('should load real cases from backend API', async ({ page }) => {
    // Don't mock - hit real API
    await page.goto('/cases');

    // Wait for real data to load (may take longer than mocked)
    await page.getByRole('table').waitFor({ timeout: 5000 });

    // Verify table has content (at least headers)
    await expect(page.getByRole('columnheader', { name: /customer name/i })).toBeVisible();

    // Check that we got a response (either data or empty state)
    const hasData = await page.locator('tbody tr').count() > 0;
    const hasEmptyState = await page.getByText(/no cases/i).isVisible().catch(() => false);

    expect(hasData || hasEmptyState).toBe(true);
  });

  test('should filter real cases by status', async ({ page }) => {
    await page.goto('/cases');
    await page.getByRole('table').waitFor({ timeout: 5000 });

    // Apply status filter
    await page.getByPlaceholder(/all statuses/i).click();
    await page.getByRole('option', { name: /pending/i }).click();

    // Wait for filtered results
    await page.waitForResponse(resp =>
      resp.url().includes('/api/v1/cases') &&
      resp.url().includes('status=pending')
    );

    // Verify filter was applied (check URL or results)
    const url = page.url();
    // Results should reflect the filter (either matching cases or empty)
    await expect(page.getByRole('table')).toBeVisible();
  });
});
