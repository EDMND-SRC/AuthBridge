/**
 * AuthBridge Web SDK - Flow Helpers
 *
 * Pure functions for SDK flow operations.
 * These can be unit tested without Playwright.
 */

import type { Page } from '@playwright/test';

export type DocumentType = 'idCard' | 'driversLicense' | 'passport' | 'voterId';

export type FlowType = 'kyc' | 'kyb';

export interface FlowConfig {
  documentType: DocumentType;
  flowType: FlowType;
  skipSelfie?: boolean;
  skipBackSide?: boolean;
}

/**
 * Get the regex pattern for a document type selector
 */
export function getDocumentPattern(documentType: DocumentType): RegExp {
  const patterns: Record<DocumentType, RegExp> = {
    idCard: /^id\scard$/i,
    driversLicense: /^drivers\slicense$/i,
    passport: /^passport$/i,
    voterId: /^voter\sid$/i,
  };

  const pattern = patterns[documentType];
  if (!pattern) {
    throw new Error(`Unknown document type: ${documentType}`);
  }

  return pattern;
}

/**
 * Determine if back side capture should be skipped
 */
export function shouldSkipBackSide(config: FlowConfig): boolean {
  // Passports don't have a back side in KYC flows
  if (config.flowType === 'kyc' && config.documentType === 'passport') {
    return true;
  }

  return config.skipBackSide ?? false;
}

/**
 * Determine if selfie capture should be skipped
 */
export function shouldSkipSelfie(config: FlowConfig): boolean {
  // KYB flows don't require selfie
  if (config.flowType === 'kyb') {
    return true;
  }

  return config.skipSelfie ?? false;
}

/**
 * Get the number of business documents required for KYB
 */
export function getKYBDocumentCount(): number {
  return 3; // Business registration requires 3 documents
}

/**
 * Validate flow configuration
 */
export function validateFlowConfig(config: FlowConfig): void {
  const validDocuments: DocumentType[] = ['idCard', 'driversLicense', 'passport', 'voterId'];
  const validFlows: FlowType[] = ['kyc', 'kyb'];

  if (!validDocuments.includes(config.documentType)) {
    throw new Error(`Invalid document type: ${config.documentType}. Valid: ${validDocuments.join(', ')}`);
  }

  if (!validFlows.includes(config.flowType)) {
    throw new Error(`Invalid flow type: ${config.flowType}. Valid: ${validFlows.join(', ')}`);
  }
}

/**
 * Wait for SDK to be loaded on the page
 */
export async function waitForSDKLoad(page: Page, timeoutMs = 10000): Promise<void> {
  await page.waitForFunction(() => typeof window.BallerineSDK !== 'undefined', {
    timeout: timeoutMs,
  });
}

/**
 * Open SDK modal for a specific flow
 */
export async function openSDKModal(page: Page, flowName: string): Promise<void> {
  await page.evaluate((flow) => {
    window.BallerineSDK.flows.openModal(flow, {});
  }, flowName);
}
