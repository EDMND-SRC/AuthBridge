/**
 * KYC Passport Flow - Modern Fixture Pattern
 *
 * This test demonstrates the migrated pattern with:
 * - Composable fixtures (openSDKModal, takePicture, confirmPicture)
 * - Explicit assertions in test body (not hidden in helpers)
 * - Network-first patterns (no hard waits)
 * - Clear step documentation
 */

import { test, expect } from '../support/fixtures';
import { EFlow } from '../support/enums';

test.describe('KYC Passport Flow', () => {
  test('completes passport verification successfully', async ({
    page,
    openSDKModal,
    takePicture,
    confirmPicture,
  }) => {
    // Setup: Open SDK modal for KYC flow
    await openSDKModal(EFlow.MY_KYC_FLOW);

    // Step 1: Choose document type
    const chooseDocButton = page.getByRole('button', { name: /choose\sdocument\stype/i }).first();
    await chooseDocButton.click();

    // Step 2: Select passport
    const passportOption = page.getByText(/^passport$/i).first();
    await passportOption.click();

    // Step 3: Take front picture of passport
    await takePicture();
    await confirmPicture();

    // Note: Passport has no back side, skip to selfie

    // Step 4: Take selfie
    const selfieButton = page.getByRole('button', { name: /take\sa\sselfie/i }).first();
    await selfieButton.click();
    await takePicture();
    await confirmPicture();

    // EXPLICIT ASSERTION: Verify success screen
    const successHeading = page.getByRole('heading', { name: /success/i }).first();
    await expect(successHeading).toBeVisible({ timeout: 15000 });
  });
});
