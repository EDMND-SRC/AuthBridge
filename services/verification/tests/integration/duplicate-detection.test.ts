/**
 * Integration tests for duplicate detection with real DynamoDB
 *
 * These tests verify the complete duplicate detection flow using DynamoDB Local.
 * Tests cover same-client duplicates, cross-client duplicates, risk scoring,
 * and manual review triggers.
 *
 * Prerequisites:
 * - DynamoDB Local running on http://localhost:8000
 * - AuthBridgeTable created with GSI2 (OmangHashIndex)
 *
 * Run with: pnpm test duplicate-detection.test.ts
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DynamoDBTestUtils } from './helpers/dynamodb-test-utils';
import { DuplicateDetectionService } from '../../src/services/duplicate-detection';
import { DuplicateStorageService } from '../../src/services/duplicate-storage';
import { DynamoDBService } from '../../src/services/dynamodb';
import { createOmangHashKey } from '../../src/utils/omang-hash';

describe('Duplicate Detection Integration Tests', () => {
  let testUtils: DynamoDBTestUtils;
  let dynamoDBService: DynamoDBService;
  let duplicateDetectionService: DuplicateDetectionService;
  let duplicateStorageService: DuplicateStorageService;

  beforeEach(() => {
    // Initialize test utilities with DynamoDB Local
    testUtils = new DynamoDBTestUtils({
      endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
      region: 'af-south-1',
      tableName: 'AuthBridgeTable',
    });

    // Initialize services with test configuration (including endpoint for DynamoDB Local)
    dynamoDBService = new DynamoDBService(
      'AuthBridgeTable',
      'af-south-1',
      process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000'
    );
    duplicateDetectionService = new DuplicateDetectionService(dynamoDBService);
    duplicateStorageService = new DuplicateStorageService(dynamoDBService);
  });

  afterEach(async () => {
    // Clean up all test data
    await testUtils.cleanup();
  });

  describe('First-time Omang (No Duplicates)', () => {
    it('should return no duplicates for first-time Omang', async () => {
      const omangNumber = '123456789';
      const verificationId = 'ver_first_time';
      const clientId = 'client_abc';
      const biometricScore = 92.5;

      // No previous verifications exist

      // Check for duplicates
      const result = await duplicateDetectionService.checkDuplicates(
        omangNumber,
        verificationId,
        clientId,
        biometricScore
      );

      expect(result.checked).toBe(true);
      expect(result.duplicatesFound).toBe(0);
      expect(result.sameClientDuplicates).toBe(0);
      expect(result.crossClientDuplicates).toBe(0);
      expect(result.riskLevel).toBe('low');
      expect(result.riskScore).toBe(0);
      expect(result.requiresManualReview).toBe(false);
      expect(result.duplicateCases).toHaveLength(0);
    });
  });

  describe('Same-Client Duplicate (Low Risk)', () => {
    it('should detect same-client duplicate with low risk', async () => {
      const omangNumber = '987654321';
      const clientId = 'client_abc';
      const omangHashKey = createOmangHashKey(omangNumber);

      // Create first verification (365 days ago)
      const firstVerificationDate = new Date();
      firstVerificationDate.setDate(firstVerificationDate.getDate() - 365);

      await testUtils.createTestVerification({
        verificationId: 'ver_previous_1',
        clientId,
        status: 'approved',
        createdAt: firstVerificationDate.toISOString(),
        GSI2PK: omangHashKey,
        GSI2SK: 'CASE#ver_previous_1',
        customerData: {
          omangNumber: 'encrypted_value',
        },
        biometricSummary: {
          overallScore: 91.0,
          livenessScore: 95.0,
          similarityScore: 89.0,
          passed: true,
          requiresManualReview: false,
          processedAt: firstVerificationDate.toISOString(),
        },
      });

      // Check for duplicates with new verification
      const result = await duplicateDetectionService.checkDuplicates(
        omangNumber,
        'ver_new',
        clientId,
        92.5
      );

      expect(result.checked).toBe(true);
      expect(result.duplicatesFound).toBe(1);
      expect(result.sameClientDuplicates).toBe(1);
      expect(result.crossClientDuplicates).toBe(0);
      expect(result.riskLevel).toBe('low');
      expect(result.riskScore).toBe(0); // No risk factors triggered
      expect(result.requiresManualReview).toBe(false);
      expect(result.duplicateCases).toHaveLength(1);
      expect(result.duplicateCases[0].verificationId).toBe('ver_previous_1');
      expect(result.duplicateCases[0].clientId).toBe(clientId);
    });

    it('should store duplicate results in DynamoDB', async () => {
      const omangNumber = '111222333';
      const clientId = 'client_xyz';
      const verificationId = 'ver_storage_test';
      const omangHashKey = createOmangHashKey(omangNumber);

      // Create previous verification
      await testUtils.createTestVerification({
        verificationId: 'ver_prev_storage',
        clientId,
        status: 'approved',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        GSI2PK: omangHashKey,
        GSI2SK: 'CASE#ver_prev_storage',
        biometricSummary: {
          overallScore: 90.0,
          livenessScore: 95.0,
          similarityScore: 88.0,
          passed: true,
          requiresManualReview: false,
          processedAt: new Date().toISOString(),
        },
      });

      // Create current verification
      await testUtils.createTestVerification({
        verificationId,
        clientId,
        status: 'processing',
        GSI2PK: omangHashKey,
        GSI2SK: `CASE#${verificationId}`,
      });

      // Check duplicates
      const duplicateResult = await duplicateDetectionService.checkDuplicates(
        omangNumber,
        verificationId,
        clientId,
        92.5
      );

      // Store results
      await duplicateStorageService.storeDuplicateResults(
        verificationId,
        duplicateResult
      );

      // Verify stored in DynamoDB
      const items = await testUtils.queryByPK(`CASE#${verificationId}`);
      const verification = items.find((item) => item.SK === 'META');

      expect(verification).toBeDefined();
      expect(verification?.duplicateDetection).toBeDefined();
      expect(verification?.duplicateDetection.checked).toBe(true);
      expect(verification?.duplicateDetection.duplicatesFound).toBe(1);
    });
  });

  describe('Cross-Client Duplicate (High Risk)', () => {
    it('should detect cross-client duplicate with high risk', async () => {
      const omangNumber = '555666777';
      const omangHashKey = createOmangHashKey(omangNumber);

      // Create verification from different client (10 days ago)
      const previousDate = new Date();
      previousDate.setDate(previousDate.getDate() - 10);

      await testUtils.createTestVerification({
        verificationId: 'ver_other_client',
        clientId: 'client_other',
        status: 'approved',
        createdAt: previousDate.toISOString(),
        GSI2PK: omangHashKey,
        GSI2SK: 'CASE#ver_other_client',
        biometricSummary: {
          overallScore: 91.0,
          livenessScore: 95.0,
          similarityScore: 89.0,
          passed: true,
          requiresManualReview: false,
          processedAt: previousDate.toISOString(),
        },
      });

      // Check for duplicates with new verification from different client
      const result = await duplicateDetectionService.checkDuplicates(
        omangNumber,
        'ver_new_client',
        'client_abc',
        92.5
      );

      expect(result.checked).toBe(true);
      expect(result.duplicatesFound).toBe(1);
      expect(result.sameClientDuplicates).toBe(0);
      expect(result.crossClientDuplicates).toBe(1);
      expect(result.riskLevel).toBe('high'); // 40 (cross-client) + 15 (recent) = 55
      expect(result.riskScore).toBeGreaterThanOrEqual(51);
      expect(result.requiresManualReview).toBe(true);
      expect(result.flagReason).toContain('cross-client');
      expect(result.duplicateCases).toHaveLength(1);
      expect(result.duplicateCases[0].clientId).toBe('client_other');
    });

    it('should flag manual review for cross-client duplicates', async () => {
      const omangNumber = '888999000';
      const verificationId = 'ver_manual_review';
      const omangHashKey = createOmangHashKey(omangNumber);

      // Create previous verification from different client
      await testUtils.createTestVerification({
        verificationId: 'ver_prev_cross',
        clientId: 'client_other',
        status: 'approved',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        GSI2PK: omangHashKey,
        GSI2SK: 'CASE#ver_prev_cross',
        biometricSummary: {
          overallScore: 90.0,
          livenessScore: 95.0,
          similarityScore: 88.0,
          passed: true,
          requiresManualReview: false,
          processedAt: new Date().toISOString(),
        },
      });

      // Create current verification
      await testUtils.createTestVerification({
        verificationId,
        clientId: 'client_abc',
        status: 'processing',
        GSI2PK: omangHashKey,
        GSI2SK: `CASE#${verificationId}`,
      });

      // Check and store duplicates
      const duplicateResult = await duplicateDetectionService.checkDuplicates(
        omangNumber,
        verificationId,
        'client_abc',
        92.5
      );

      await duplicateStorageService.storeDuplicateResults(
        verificationId,
        duplicateResult
      );

      // Verify manual review flag set
      const items = await testUtils.queryByPK(`CASE#${verificationId}`);
      const verification = items.find((item) => item.SK === 'META');

      expect(verification?.requiresManualReview).toBe(true);
      expect(verification?.flagReason).toContain('cross-client');
    });
  });

  describe('Biometric Mismatch (Medium Risk)', () => {
    it('should detect biometric mismatch with medium risk', async () => {
      const omangNumber = '444555666';
      const clientId = 'client_abc';
      const omangHashKey = createOmangHashKey(omangNumber);

      // Create previous verification with very different biometric score
      await testUtils.createTestVerification({
        verificationId: 'ver_prev_bio',
        clientId,
        status: 'approved',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        GSI2PK: omangHashKey,
        GSI2SK: 'CASE#ver_prev_bio',
        biometricSummary: {
          overallScore: 50.0, // Very different from current 92.5
          livenessScore: 60.0,
          similarityScore: 45.0,
          passed: false,
          requiresManualReview: true,
          processedAt: new Date().toISOString(),
        },
      });

      // Check for duplicates with high biometric score
      const result = await duplicateDetectionService.checkDuplicates(
        omangNumber,
        'ver_new_bio',
        clientId,
        92.5
      );

      expect(result.checked).toBe(true);
      expect(result.duplicatesFound).toBe(1);
      expect(result.riskLevel).toBe('medium'); // 30 (biometric) + 15 (recent) = 45
      expect(result.riskScore).toBeGreaterThanOrEqual(26);
      expect(result.requiresManualReview).toBe(true);
      expect(result.flagReason).toContain('biometric mismatch');
    });
  });

  describe('Multiple Duplicates (Critical Risk)', () => {
    it('should detect multiple cross-client duplicates with critical risk', async () => {
      const omangNumber = '777888999';
      const omangHashKey = createOmangHashKey(omangNumber);

      // Create 3 previous verifications from different clients
      const clients = ['client_a', 'client_b', 'client_c'];
      for (let i = 0; i < 3; i++) {
        await testUtils.createTestVerification({
          verificationId: `ver_multi_${i}`,
          clientId: clients[i],
          status: 'approved',
          createdAt: new Date(Date.now() - (i + 1) * 10 * 24 * 60 * 60 * 1000).toISOString(),
          GSI2PK: omangHashKey,
          GSI2SK: `CASE#ver_multi_${i}`,
          biometricSummary: {
            overallScore: 90.0 + i,
            livenessScore: 95.0,
            similarityScore: 88.0 + i,
            passed: true,
            requiresManualReview: false,
            processedAt: new Date().toISOString(),
          },
        });
      }

      // Check for duplicates with new verification
      const result = await duplicateDetectionService.checkDuplicates(
        omangNumber,
        'ver_new_multi',
        'client_new',
        92.5
      );

      expect(result.checked).toBe(true);
      expect(result.duplicatesFound).toBe(3);
      expect(result.sameClientDuplicates).toBe(0);
      expect(result.crossClientDuplicates).toBe(3);
      expect(result.riskLevel).toBe('high'); // 40 (cross-client) + 15 (recent) + 10 (multiple) = 65
      expect(result.riskScore).toBeGreaterThanOrEqual(50);
      expect(result.requiresManualReview).toBe(true);
      expect(result.duplicateCases).toHaveLength(3);
    });

    it('should calculate correct risk score for complex scenario', async () => {
      const omangNumber = '111333555';
      const omangHashKey = createOmangHashKey(omangNumber);

      // Scenario: Cross-client + biometric mismatch + recent + multiple
      // Expected: 40 + 30 + 15 + 10 = 95 (critical)

      // Create 3 previous verifications
      await testUtils.createTestVerification({
        verificationId: 'ver_complex_1',
        clientId: 'client_other_1',
        status: 'approved',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        GSI2PK: omangHashKey,
        GSI2SK: 'CASE#ver_complex_1',
        biometricSummary: {
          overallScore: 50.0, // Different person
          livenessScore: 60.0,
          similarityScore: 45.0,
          passed: false,
          requiresManualReview: true,
          processedAt: new Date().toISOString(),
        },
      });

      await testUtils.createTestVerification({
        verificationId: 'ver_complex_2',
        clientId: 'client_other_2',
        status: 'approved',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        GSI2PK: omangHashKey,
        GSI2SK: 'CASE#ver_complex_2',
        biometricSummary: {
          overallScore: 55.0, // Different person
          livenessScore: 65.0,
          similarityScore: 50.0,
          passed: false,
          requiresManualReview: true,
          processedAt: new Date().toISOString(),
        },
      });

      await testUtils.createTestVerification({
        verificationId: 'ver_complex_3',
        clientId: 'client_other_3',
        status: 'approved',
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        GSI2PK: omangHashKey,
        GSI2SK: 'CASE#ver_complex_3',
        biometricSummary: {
          overallScore: 60.0, // Different person
          livenessScore: 70.0,
          similarityScore: 55.0,
          passed: false,
          requiresManualReview: true,
          processedAt: new Date().toISOString(),
        },
      });

      // Check for duplicates
      const result = await duplicateDetectionService.checkDuplicates(
        omangNumber,
        'ver_new_complex',
        'client_abc',
        92.5
      );

      expect(result.checked).toBe(true);
      expect(result.duplicatesFound).toBe(3);
      expect(result.crossClientDuplicates).toBe(3);
      expect(result.riskLevel).toBe('critical'); // Should be 95 points
      expect(result.riskScore).toBeGreaterThanOrEqual(76);
      expect(result.requiresManualReview).toBe(true);
    });
  });

  describe('Exclude Current Verification', () => {
    it('should exclude current verification from duplicate results', async () => {
      const omangNumber = '222444666';
      const verificationId = 'ver_current';
      const clientId = 'client_abc';
      const omangHashKey = createOmangHashKey(omangNumber);

      // Create current verification
      await testUtils.createTestVerification({
        verificationId,
        clientId,
        status: 'processing',
        GSI2PK: omangHashKey,
        GSI2SK: `CASE#${verificationId}`,
        biometricSummary: {
          overallScore: 92.5,
          livenessScore: 95.0,
          similarityScore: 90.0,
          passed: true,
          requiresManualReview: false,
          processedAt: new Date().toISOString(),
        },
      });

      // Check for duplicates (should not find itself)
      const result = await duplicateDetectionService.checkDuplicates(
        omangNumber,
        verificationId,
        clientId,
        92.5
      );

      expect(result.checked).toBe(true);
      expect(result.duplicatesFound).toBe(0);
      expect(result.riskLevel).toBe('low');
    });
  });

  describe('Error Handling', () => {
    it('should handle DynamoDB errors gracefully', async () => {
      // Use invalid configuration to trigger error
      const badDynamoDBService = new DynamoDBService('NonExistentTable', 'af-south-1');
      const badDuplicateService = new DuplicateDetectionService(badDynamoDBService);

      const result = await badDuplicateService.checkDuplicates(
        '999888777',
        'ver_error',
        'client_abc',
        92.5
      );

      // Should return safe default
      expect(result.checked).toBe(false);
      expect(result.duplicatesFound).toBe(0);
      expect(result.riskLevel).toBe('unknown');
      expect(result.riskScore).toBe(0);
      expect(result.error).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete duplicate check within 500ms', async () => {
      const omangNumber = '123123123';
      const omangHashKey = createOmangHashKey(omangNumber);

      // Create 5 previous verifications
      for (let i = 0; i < 5; i++) {
        await testUtils.createTestVerification({
          verificationId: `ver_perf_${i}`,
          clientId: `client_${i}`,
          status: 'approved',
          createdAt: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toISOString(),
          GSI2PK: omangHashKey,
          GSI2SK: `CASE#ver_perf_${i}`,
          biometricSummary: {
            overallScore: 90.0,
            livenessScore: 95.0,
            similarityScore: 88.0,
            passed: true,
            requiresManualReview: false,
            processedAt: new Date().toISOString(),
          },
        });
      }

      const startTime = Date.now();
      const result = await duplicateDetectionService.checkDuplicates(
        omangNumber,
        'ver_new_perf',
        'client_new',
        92.5
      );
      const duration = Date.now() - startTime;

      expect(result.checked).toBe(true);
      expect(result.duplicatesFound).toBe(5);
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });
  });
});
