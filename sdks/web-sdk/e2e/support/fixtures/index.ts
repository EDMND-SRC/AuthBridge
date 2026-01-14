/**
 * AuthBridge Web SDK - Test Fixtures
 *
 * Composable fixture architecture using mergeTests pattern.
 * Each fixture provides one isolated concern with auto-cleanup.
 */

import { test as base, expect, mergeTests } from '@playwright/test';
import { EFlow } from '../enums';

// ============================================================================
// Global Type Augmentation
// ============================================================================

declare global {
  interface Window {
    BallerineSDK: {
      flows: {
        openModal: (flow: string, config: Record<PropertyKey, unknown>) => void;
      };
    };
  }
}

// ============================================================================
// Types
// ============================================================================

type SDKFixtures = {
  /** Opens the SDK modal for a specific flow */
  openSDKModal: (flow: EFlow) => Promise<void>;
  /** Waits for SDK to be fully loaded and interactive */
  waitForSDKReady: () => Promise<void>;
};

type CameraFixtures = {
  /** Takes a picture using the fake camera stream */
  takePicture: () => Promise<void>;
  /** Confirms the captured picture (clicks "Looks Good") */
  confirmPicture: () => Promise<void>;
};

type FlowFixtures = {
  /** Runs the complete KYC flow for a document type */
  runKYCFlow: (documentType: 'idCard' | 'driversLicense' | 'passport' | 'voterId') => Promise<void>;
  /** Runs the complete KYB flow for a document type */
  runKYBFlow: (documentType: 'idCard' | 'driversLicense' | 'passport' | 'voterId') => Promise<void>;
};

// ============================================================================
// SDK Fixtures
// ============================================================================

const sdkFixture = base.extend<SDKFixtures>({
  openSDKModal: async ({ page }, use) => {
    const openModal = async (flow: EFlow) => {
      // Network-first: Set up SDK ready promise BEFORE navigation
      const sdkReadyPromise = page.waitForFunction(
        () => typeof window.BallerineSDK !== 'undefined',
        { timeout: 10000 }
      );

      await page.goto('/');

      // Wait for SDK to be ready (deterministic, no hard wait)
      await sdkReadyPromise;

      // Open the modal
      await page.evaluate((flowName) => {
        window.BallerineSDK.flows.openModal(flowName, {});
      }, flow);

      // Wait for modal to be interactive (first button visible)
      await page.waitForSelector('button', {
        state: 'visible',
        timeout: 5000,
      });
    };

    await use(openModal);
  },

  waitForSDKReady: async ({ page }, use) => {
    const waitForReady = async () => {
      await page.waitForFunction(
        () => typeof window.BallerineSDK !== 'undefined',
        { timeout: 10000 }
      );
    };

    await use(waitForReady);
  },
});

// ============================================================================
// Camera Fixtures
// ============================================================================

const cameraFixture = base.extend<CameraFixtures>({
  takePicture: async ({ page }, use) => {
    const take = async () => {
      const button = page.locator('button[aria-label="take picture"]').first();
      await button.waitFor({ state: 'visible', timeout: 10000 });
      await button.click();
    };

    await use(take);
  },

  confirmPicture: async ({ page }, use) => {
    const confirm = async () => {
      const button = page.getByRole('button', { name: /looks\sgood/i }).first();
      await button.waitFor({ state: 'visible', timeout: 5000 });
      await button.click();
    };

    await use(confirm);
  },
});

// ============================================================================
// Flow Fixtures
// ============================================================================

const flowFixture = base.extend<FlowFixtures>({
  runKYCFlow: async ({ page }, use) => {
    const runFlow = async (documentType: 'idCard' | 'driversLicense' | 'passport' | 'voterId') => {
      const documentRegex = getDocumentRegex(documentType);
      const skipBackSide = documentType === 'passport';

      // Step 1: Choose document type
      const chooseButton = page.getByRole('button', { name: /choose\sdocument\stype/i }).first();
      await chooseButton.click();

      // Step 2: Select document
      const documentOption = page.getByText(documentRegex).first();
      await documentOption.click();

      // Step 3: Take front picture
      const takePicture = page.locator('button[aria-label="take picture"]').first();
      await takePicture.click();

      const confirmPicture = page.getByRole('button', { name: /looks\sgood/i }).first();
      await confirmPicture.click();

      // Step 4: Take back picture (if not passport)
      if (!skipBackSide) {
        const backSideButton = page.getByRole('button', { name: /take\sphoto/i }).first();
        await backSideButton.click();
        await takePicture.click();
        await confirmPicture.click();
      }

      // Step 5: Take selfie
      const selfieButton = page.getByRole('button', { name: /take\sa\sselfie/i }).first();
      await selfieButton.click();
      await takePicture.click();
      await confirmPicture.click();

      // Step 6: Verify success
      const success = page.getByRole('heading', { name: /success/i }).first();
      await expect(success).toBeVisible({ timeout: 15000 });
    };

    await use(runFlow);
  },

  runKYBFlow: async ({ page }, use) => {
    const runFlow = async (documentType: 'idCard' | 'driversLicense' | 'passport' | 'voterId') => {
      const documentRegex = getDocumentRegex(documentType);

      // Step 1: Choose document type
      const chooseButton = page.getByRole('button', { name: /choose\sdocument\stype/i }).first();
      await chooseButton.click();

      // Step 2: Business registration (3 documents)
      const title = page.getByRole('heading', { name: /business\sregistration/i }).first();
      await expect(title).toBeVisible();

      const takePicture = page.locator('button[aria-label="take picture"]').first();

      for (let i = 0; i < 3; i++) {
        const openCamera = page.getByRole('button', { name: /take\sa\spicture/i }).first();
        await openCamera.click();
        await takePicture.click();
      }

      // Step 3: Upload ID
      const uploadTitle = page.getByRole('heading', { name: /upload\sid/i }).first();
      await expect(uploadTitle).toBeVisible();

      const documentOption = page.getByText(documentRegex).first();
      await documentOption.click();

      await takePicture.click();

      // Step 4: Verify success
      const success = page.getByRole('heading', { name: /success/i }).first();
      await expect(success).toBeVisible({ timeout: 15000 });
    };

    await use(runFlow);
  },
});

// ============================================================================
// Helpers
// ============================================================================

function getDocumentRegex(documentType: string): RegExp {
  switch (documentType) {
    case 'idCard':
      return /^id\scard$/i;
    case 'driversLicense':
      return /^drivers\slicense$/i;
    case 'passport':
      return /^passport$/i;
    case 'voterId':
      return /^voter\sid$/i;
    default:
      throw new Error(`Unknown document type: ${documentType}`);
  }
}

// ============================================================================
// Merged Test Export
// ============================================================================

/**
 * Use this test export in all e2e tests for access to all fixtures.
 *
 * @example
 * import { test, expect } from '../support/fixtures';
 *
 * test('KYC flow completes', async ({ page, openSDKModal, runKYCFlow }) => {
 *   await openSDKModal(EFlow.MY_KYC_FLOW);
 *   await runKYCFlow('passport');
 * });
 */
export const test = mergeTests(base, sdkFixture, cameraFixture, flowFixture);

export { expect } from '@playwright/test';

// Re-export types for consumers
export type { SDKFixtures, CameraFixtures, FlowFixtures };
