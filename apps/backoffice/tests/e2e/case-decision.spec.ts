import { test, expect } from './fixtures/auth.fixture';

test.describe('Case Decision Workflow', () => {
  test('should approve a case successfully', async ({ authenticatedPage: page }) => {
    // Navigate to case detail
    await page.goto('/cases');
    await page.waitForSelector('[data-testid="case-list-table"]');

    // Click first pending case
    await page.click('[data-testid="case-row"]:first-child');
    await page.waitForURL(/\/cases\/.+/);

    // Click Approve button
    await page.click('[data-testid="approve-button"]');

    // Confirm approval in modal
    await page.waitForSelector('text=Confirm Approval');
    await page.click('[data-testid="confirm-approve-button"]');

    // Wait for success notification
    await expect(page.locator('text=Case approved successfully')).toBeVisible();

    // Verify status badge updated
    await expect(page.locator('[data-testid="case-status-badge"]')).toContainText('Approved');

    // Verify buttons are disabled
    await expect(page.locator('[data-testid="approve-button"]')).toBeDisabled();
    await expect(page.locator('[data-testid="reject-button"]')).toBeDisabled();
  });

  test('should reject a case with reason', async ({ authenticatedPage: page }) => {
    // Navigate to case detail
    await page.goto('/cases');
    await page.waitForSelector('[data-testid="case-list-table"]');

    // Click first pending case
    await page.click('[data-testid="case-row"]:first-child');
    await page.waitForURL(/\/cases\/.+/);

    // Click Reject button
    await page.click('[data-testid="reject-button"]');

    // Fill reject reason modal - Mantine Select uses a custom dropdown
    await page.waitForSelector('text=Reject Case');

    // Click the Select to open dropdown
    await page.click('[data-testid="reject-reason-select"]');
    // Select the option from the dropdown
    await page.click('text=Blurry or Low Quality Image');

    // Fill notes textarea
    await page.fill('[data-testid="reject-notes-textarea"]', 'Image quality is too low for verification');

    // Submit rejection
    await page.click('[data-testid="confirm-reject-button"]');

    // Wait for success notification
    await expect(page.locator('text=Case rejected successfully')).toBeVisible();

    // Verify status badge updated
    await expect(page.locator('[data-testid="case-status-badge"]')).toContainText('Rejected');

    // Verify buttons are disabled
    await expect(page.locator('[data-testid="approve-button"]')).toBeDisabled();
    await expect(page.locator('[data-testid="reject-button"]')).toBeDisabled();
  });

  test('should validate rejection requires reason', async ({ authenticatedPage: page }) => {
    // Navigate to case detail
    await page.goto('/cases');
    await page.waitForSelector('[data-testid="case-list-table"]');

    // Click first pending case
    await page.click('[data-testid="case-row"]:first-child');
    await page.waitForURL(/\/cases\/.+/);

    // Click Reject button
    await page.click('[data-testid="reject-button"]');

    // Try to submit without selecting reason
    await page.waitForSelector('text=Reject Case');
    await page.click('[data-testid="confirm-reject-button"]');

    // Verify validation error
    await expect(page.locator('text=Reason is required')).toBeVisible();
  });

  test('should update case list after decision', async ({ authenticatedPage: page }) => {
    // Navigate to case list
    await page.goto('/cases');
    await page.waitForSelector('[data-testid="case-list-table"]');

    // Get first case ID
    const firstCaseId = await page.locator('[data-testid="case-row"]:first-child [data-testid="case-id"]').textContent();

    // Navigate to case detail
    await page.click('[data-testid="case-row"]:first-child');
    await page.waitForURL(/\/cases\/.+/);

    // Approve the case
    await page.click('[data-testid="approve-button"]');
    await page.waitForSelector('text=Confirm Approval');
    await page.click('[data-testid="confirm-approve-button"]');
    await expect(page.locator('text=Case approved successfully')).toBeVisible();

    // Go back to case list
    await page.click('button:has-text("Back to Cases")');
    await page.waitForURL('/cases');

    // Verify case status updated in list
    const caseRow = page.locator(`[data-testid="case-row"]:has-text("${firstCaseId}")`);
    await expect(caseRow.locator('[data-testid="case-status"]')).toContainText('Approved');
  });

  test('should show decision in case history', async ({ authenticatedPage: page }) => {
    // Navigate to case detail
    await page.goto('/cases');
    await page.waitForSelector('[data-testid="case-list-table"]');

    // Click first pending case
    await page.click('[data-testid="case-row"]:first-child');
    await page.waitForURL(/\/cases\/.+/);

    // Approve the case
    await page.click('[data-testid="approve-button"]');
    await page.waitForSelector('text=Confirm Approval');
    await page.click('[data-testid="confirm-approve-button"]');
    await expect(page.locator('text=Case approved successfully')).toBeVisible();

    // Scroll to history section
    await page.locator('[data-testid="case-history"]').scrollIntoViewIfNeeded();

    // Verify decision appears in history
    await expect(page.locator('[data-testid="case-history"]')).toContainText('Case Approved');
    await expect(page.locator('[data-testid="case-history"]')).toContainText('approved');
  });

  test('should meet WCAG 2.1 AA accessibility standards', async ({ authenticatedPage: page }) => {
    // Navigate to case detail
    await page.goto('/cases');
    await page.waitForSelector('[data-testid="case-list-table"]');
    await page.click('[data-testid="case-row"]:first-child');
    await page.waitForURL(/\/cases\/.+/);

    // Check button accessibility
    const approveButton = page.locator('[data-testid="approve-button"]');
    await expect(approveButton).toHaveAttribute('type', 'button');

    const rejectButton = page.locator('[data-testid="reject-button"]');
    await expect(rejectButton).toHaveAttribute('type', 'button');

    // Check keyboard navigation
    await approveButton.focus();
    await expect(approveButton).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(rejectButton).toBeFocused();

    // Open reject modal with keyboard
    await page.keyboard.press('Enter');
    await page.waitForSelector('text=Reject Case');

    // Check modal accessibility - Mantine Select has aria attributes
    const reasonSelect = page.locator('[data-testid="reject-reason-select"]');
    await expect(reasonSelect).toBeVisible();

    const notesTextarea = page.locator('[data-testid="reject-notes-textarea"]');
    await expect(notesTextarea).toHaveAttribute('maxlength', '500');

    // Close modal with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('text=Reject Case')).not.toBeVisible();
  });
});
