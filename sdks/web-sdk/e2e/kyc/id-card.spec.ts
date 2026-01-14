/**
 * KYC ID Card Flow - Modern Fixture Pattern
 *
 * ID Card requires front + back capture, then selfie.
 */

import { test, expect } from '../support/fixtures';
import { EFlow } from '../support/enums';

test.describe('KYC ID Card Flow', () => {
  test('completes ID card verification successfully', async ({
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

    // Step 2: Select ID card
    const idCardOption = page.getByText(/^id\scard$/i).first();
    await idCardOption.click();

    // Step 3: Take front picture of ID card
    await takePicture();
    await confirmPicture();

    // Step 4: Take back picture of ID card
    const backSideButton = page.getByRole('button', { name: /take\sphoto/i }).first();
    await backSideButton.click();
    await takePicture();
    await confirmPicture();

    // Step 5: Take selfie
    const selfieButton = page.getByRole('button', { name: /take\sa\sselfie/i }).first();
    await selfieButton.click();
    await takePicture();
    await confirmPicture();

    // EXPLICIT ASSERTION: Verify success screen
    const successHeading = page.getByRole('heading', { name: /success/i }).first();
    await expect(successHeading).toBeVisible({ timeout: 15000 });
  });
});
