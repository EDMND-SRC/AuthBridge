import { describe, it, expect } from 'vitest';
import { EncryptionService } from '../../src/services/encryption';

/**
 * Integration test for KMS key access from Lambda
 *
 * IMPORTANT: This test requires:
 * 1. KMS keys deployed to staging (authbridge-kms-staging stack)
 * 2. Environment variables set: DATA_ENCRYPTION_KEY_ID, AWS_REGION
 * 3. Lambda IAM role with KMS permissions
 *
 * Run in staging environment only:
 * AWS_REGION=af-south-1 DATA_ENCRYPTION_KEY_ID=<key-id> pnpm test:integration
 */
describe('KMS Access Integration Test', () => {
  it('should encrypt and decrypt using real KMS key', async () => {
    // Skip if not in staging environment
    if (!process.env.DATA_ENCRYPTION_KEY_ID) {
      console.log('⚠️  Skipping KMS integration test - DATA_ENCRYPTION_KEY_ID not set');
      return;
    }

    const service = new EncryptionService();
    const plaintext = 'TEST-OMANG-123456789';

    // Test encryption
    const encrypted = await service.encryptField(plaintext);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.length).toBeGreaterThan(0);

    // Test decryption
    const decrypted = await service.decryptField(encrypted);
    expect(decrypted).toBe(plaintext);

    console.log('✅ KMS encryption/decryption successful');
  }, 30000); // 30 second timeout for real KMS calls

  it('should hash field deterministically', () => {
    const service = new EncryptionService();
    const omangNumber = '123456789';

    const hash1 = service.hashField(omangNumber);
    const hash2 = service.hashField(omangNumber);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex

    console.log('✅ Deterministic hashing verified');
  });

  it('should use cache for repeated decryption', async () => {
    if (!process.env.DATA_ENCRYPTION_KEY_ID) {
      console.log('⚠️  Skipping cache test - DATA_ENCRYPTION_KEY_ID not set');
      return;
    }

    const service = new EncryptionService();
    const plaintext = 'CACHED-TEST-DATA';

    // Encrypt once
    const encrypted = await service.encryptField(plaintext);

    // First decrypt - should hit KMS
    const startTime1 = Date.now();
    const decrypted1 = await service.decryptField(encrypted);
    const duration1 = Date.now() - startTime1;

    // Second decrypt - should hit cache (much faster)
    const startTime2 = Date.now();
    const decrypted2 = await service.decryptField(encrypted);
    const duration2 = Date.now() - startTime2;

    expect(decrypted1).toBe(plaintext);
    expect(decrypted2).toBe(plaintext);
    expect(duration2).toBeLessThan(duration1); // Cache should be faster

    console.log(`✅ Cache working - First: ${duration1}ms, Cached: ${duration2}ms`);
  }, 30000);

  it('should handle KMS throttling gracefully', async () => {
    if (!process.env.DATA_ENCRYPTION_KEY_ID) {
      console.log('⚠️  Skipping throttling test - DATA_ENCRYPTION_KEY_ID not set');
      return;
    }

    const service = new EncryptionService();
    const promises = [];

    // Send multiple concurrent requests to potentially trigger throttling
    for (let i = 0; i < 10; i++) {
      promises.push(service.encryptField(`test-data-${i}`));
    }

    const results = await Promise.all(promises);

    expect(results).toHaveLength(10);
    results.forEach(result => {
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    console.log('✅ Throttling handling verified');
  }, 60000); // 60 second timeout for multiple KMS calls
});
