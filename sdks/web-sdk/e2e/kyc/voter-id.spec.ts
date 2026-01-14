/**
 * KYC Voter ID Flow - Modern Fixture Pattern
 *
 * Voter ID requires front + back capture, then selfie.
 */

import { test, expect } from '../support/fixtures';
import { EFlow } from '../support/enums';

test.describe('KYC Voter ID Flow', () => {
  test('completes voter ID verification successfully', async ({
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

    // Step 2: Select voter ID
    const voterIdOption = page.getByText(/^voter\sid$/i).first();
    await voterIdOption.click();

    // Step 3: Take front picture of voter ID
    await takePicture();
    await confirmPicture();

    // Step 4: Take back picture of voter ID
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
