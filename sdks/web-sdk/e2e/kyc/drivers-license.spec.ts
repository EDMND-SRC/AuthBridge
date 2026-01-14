/**
 * KYC Drivers License Flow - Modern Fixture Pattern
 *
 * Drivers License requires front + back capture, then selfie.
 */

import { test, expect } from '../support/fixtures';
import { EFlow } from '../support/enums';

test.describe('KYC Drivers License Flow', () => {
  test('completes drivers license verification successfully', async ({
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

    // Step 2: Select drivers license
    const driversLicenseOption = page.getByText(/^drivers\slicense$/i).first();
    await driversLicenseOption.click();

    // Step 3: Take front picture of drivers license
    await takePicture();
    await confirmPicture();

    // Step 4: Take back picture of drivers license
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
