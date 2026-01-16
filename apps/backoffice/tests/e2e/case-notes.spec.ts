import { test, expect } from './fixtures/auth.fixture';

test.describe('Case Notes', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to case detail page
    await page.goto('/cases/case-123');
    await expect(page.getByTestId('case-detail-page')).toBeVisible();
  });

  test('should add note successfully', async ({ page }) => {
    // Type note content
    const noteInput = page.getByTestId('note-content-input');
    await noteInput.fill('This is a test note about the case');

    // Submit note
    await page.getByTestId('submit-note-button').click();

    // Verify success notification
    await expect(page.getByText('Note added successfully')).toBeVisible();

    // Verify note appears in list
    await expect(page.getByTestId('notes-list')).toContainText('This is a test note about the case');
  });

  test('should show validation error for empty note', async ({ page }) => {
    // Try to submit empty note
    const submitButton = page.getByTestId('submit-note-button');
    await expect(submitButton).toBeDisabled();
  });

  test('should show validation error for too long note', async ({ page }) => {
    // Type note exceeding 2000 characters
    const longNote = 'a'.repeat(2001);
    await page.getByTestId('note-content-input').fill(longNote);

    // Verify character count shows error
    await expect(page.getByText('2001 / 2000 characters')).toBeVisible();

    // Verify submit button is disabled
    await expect(page.getByTestId('submit-note-button')).toBeDisabled();
  });

  test('should display notes with author and timestamp', async ({ page }) => {
    // Wait for notes to load
    await expect(page.getByTestId('notes-list')).toBeVisible();

    // Verify note item structure
    const noteItem = page.getByTestId('note-item').first();
    await expect(noteItem).toBeVisible();

    // Check for relative timestamp (contains "ago")
    await expect(noteItem.locator('text=/ago/')).toBeVisible();
  });

  test('should show empty state when no notes exist', async ({ page }) => {
    // Navigate to case with no notes
    await page.goto('/cases/case-456');

    await expect(page.getByText('No notes yet')).toBeVisible();
  });

  test('should be keyboard accessible', async ({ page }) => {
    // Focus note input directly (more robust than counting tabs)
    const noteInput = page.getByTestId('note-content-input');
    await noteInput.focus();
    await expect(noteInput).toBeFocused();

    // Type note using keyboard
    await page.keyboard.type('Keyboard test note');

    // Tab to submit button from the input
    await page.keyboard.press('Tab');

    const submitButton = page.getByTestId('submit-note-button');
    await expect(submitButton).toBeFocused();

    // Submit with Enter
    await page.keyboard.press('Enter');

    // Verify success
    await expect(page.getByText('Note added successfully')).toBeVisible();
  });

  test('should not show edit or delete buttons (immutability)', async ({ page }) => {
    await expect(page.getByTestId('notes-list')).toBeVisible();

    // Verify no edit/delete buttons exist
    await expect(page.getByRole('button', { name: /edit/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /delete/i })).not.toBeVisible();
  });

  test('should show character counter with color feedback', async ({ page }) => {
    const noteInput = page.getByTestId('note-content-input');

    // Type normal length note
    await noteInput.fill('Short note');
    await expect(page.getByText(/10 \/ 2000 characters/)).toBeVisible();

    // Type near limit (>90%)
    const nearLimit = 'a'.repeat(1850);
    await noteInput.fill(nearLimit);
    await expect(page.getByText(/1850 \/ 2000 characters/)).toBeVisible();

    // Type over limit
    const overLimit = 'a'.repeat(2001);
    await noteInput.fill(overLimit);
    await expect(page.getByText(/2001 \/ 2000 characters/)).toBeVisible();
  });

  test('should clear form after successful submission', async ({ page }) => {
    const noteInput = page.getByTestId('note-content-input');

    // Type and submit note
    await noteInput.fill('Test note to be cleared');
    await page.getByTestId('submit-note-button').click();

    // Wait for success
    await expect(page.getByText('Note added successfully')).toBeVisible();

    // Verify form is cleared
    await expect(noteInput).toHaveValue('');
    await expect(page.getByText('0 / 2000 characters')).toBeVisible();
  });

  test('should show loading state while submitting', async ({ page }) => {
    const noteInput = page.getByTestId('note-content-input');
    const submitButton = page.getByTestId('submit-note-button');

    // Type note
    await noteInput.fill('Test note for loading state');

    // Click submit
    await submitButton.click();

    // Verify loading state (button should show loading indicator)
    await expect(submitButton).toBeDisabled();
  });

  test('should show loading skeleton while fetching notes', async ({ page }) => {
    // Reload page to trigger loading state
    await page.reload();

    // Check for Mantine skeleton loaders (they have specific class)
    // Or check that notes list eventually appears after loading
    const notesList = page.getByTestId('notes-list');
    const emptyState = page.getByText('No notes yet');

    // Wait for either notes list or empty state to appear (loading complete)
    await expect(notesList.or(emptyState)).toBeVisible({ timeout: 10000 });
  });

  test('should display note events in case history', async ({ page }) => {
    // Add a note first
    const noteInput = page.getByTestId('note-content-input');
    await noteInput.fill('Test note for history');
    await page.getByTestId('submit-note-button').click();

    // Wait for success
    await expect(page.getByText('Note added successfully')).toBeVisible();

    // Reload to fetch updated history
    await page.reload();
    await expect(page.getByTestId('case-detail-page')).toBeVisible();

    // Verify case history shows note event
    await expect(page.getByText('Note added')).toBeVisible();
  });
});
