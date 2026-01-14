/**
 * KYB Drivers License Flow - Modern Fixture Pattern
 *
 * KYB flow differs from KYC:
 * 1. Upload 3 business registration documents
 * 2. Upload ID (drivers license) - no confirm step
 * 3. No selfie required
 */

import { test, expect } from '../support/fixtures';
import { EFlow } from '../support/enums';

test.describe('KYB Drivers License Flow', () => {
  test('completes business verification with drivers license', async ({
    page,
    openSDKModal,
    takePicture,
  }) => {
    // Setup: Open SDK modal for KYB flow
    await openSDKModal(EFlow.MY_KYB_FLOW);

    // Step 1: Choose document type
    const chooseDocButton = page.getByRole('button', { name: /choose\sdocument\stype/i }).first();
    await chooseDocButton.click();

    // Step 2: Business Registration - Upload 3 documents
    const businessRegHeading = page.getByRole('heading', { name: /business\sregistration/i }).first();
    await expect(businessRegHeading).toBeVisible();

    // Take 3 business registration photos
    for (let i = 0; i < 3; i++) {
      const openCameraButton = page.getByRole('button', { name: /take\sa\spicture/i }).first();
      await openCameraButton.click();
      await takePicture();
    }

    // Step 3: Upload ID section
    const uploadIdHeading = page.getByRole('heading', { name: /upload\sid/i }).first();
    await expect(uploadIdHeading).toBeVisible();

    // Step 4: Select drivers license
    const driversLicenseOption = page.getByText(/^drivers\slicense$/i).first();
    await driversLicenseOption.click();

    // Step 5: Take drivers license photo (no confirm in KYB)
    await takePicture();

    // EXPLICIT ASSERTION: Verify success screen
    const successHeading = page.getByRole('heading', { name: /success/i }).first();
    await expect(successHeading).toBeVisible({ timeout: 15000 });
  });
});
