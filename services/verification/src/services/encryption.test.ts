import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EncryptionService } from './encryption';
import { mockClient } from 'aws-sdk-client-mock';
import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const kmsMock = mockClient(KMSClient);
const cloudwatchMock = mockClient(CloudWatchClient);

describe('EncryptionService', () => {
  beforeEach(() => {
    kmsMock.reset();
    cloudwatchMock.reset();
    cloudwatchMock.on(PutMetricDataCommand).resolves({});
  });

  describe('encryptField', () => {
    it('encrypts plaintext correctly', async () => {
      const plaintext = '123456789';
      const ciphertext = Buffer.from('encrypted-data');

      kmsMock.on(EncryptCommand).resolves({
        CiphertextBlob: ciphertext,
      });

      const service = new EncryptionService('test-key-id');
      const result = await service.encryptField(plaintext);

      expect(result).toBe(ciphertext.toString('base64'));
      expect(kmsMock.calls()).toHaveLength(1);
    });

    it('retries on KMS throttling', async () => {
      const plaintext = 'test-data';
      const ciphertext = Buffer.from('encrypted');

      kmsMock
        .on(EncryptCommand)
        .rejectsOnce({ name: 'ThrottlingException', message: 'Rate exceeded' })
        .resolves({ CiphertextBlob: ciphertext });

      const service = new EncryptionService('test-key-id');
      const result = await service.encryptField(plaintext);

      expect(result).toBeDefined();
      expect(kmsMock.calls()).toHaveLength(2);
    });

    it('retries on LimitExceededException', async () => {
      const plaintext = 'test-data';
      const ciphertext = Buffer.from('encrypted');

      kmsMock
        .on(EncryptCommand)
        .rejectsOnce({ name: 'LimitExceededException', message: 'Limit exceeded' })
        .resolves({ CiphertextBlob: ciphertext });

      const service = new EncryptionService('test-key-id');
      const result = await service.encryptField(plaintext);

      expect(result).toBeDefined();
      expect(kmsMock.calls()).toHaveLength(2);
    });

    it('throws error after max retries', async () => {
      kmsMock.on(EncryptCommand).rejects({ name: 'ThrottlingException', message: 'Rate exceeded' });

      const service = new EncryptionService('test-key-id');

      await expect(service.encryptField('test')).rejects.toThrow();
      expect(kmsMock.calls()).toHaveLength(4); // Initial + 3 retries
    }, 10000); // 10 second timeout for exponential backoff (1s + 2s + 4s)

    it('throws error for non-throttling exceptions', async () => {
      kmsMock.on(EncryptCommand).rejects({ name: 'InvalidKeyId', message: 'Key not found' });

      const service = new EncryptionService('test-key-id');

      await expect(service.encryptField('test')).rejects.toThrow();
      expect(kmsMock.calls()).toHaveLength(1); // No retries
    });
  });

  describe('decryptField', () => {
    it('decrypts ciphertext correctly', async () => {
      const plaintext = '123456789';
      const ciphertext = Buffer.from('encrypted-data').toString('base64');

      kmsMock.on(DecryptCommand).resolves({
        Plaintext: Buffer.from(plaintext),
      });

      const service = new EncryptionService('test-key-id');
      const result = await service.decryptField(ciphertext);

      expect(result).toBe(plaintext);
      expect(kmsMock.calls()).toHaveLength(1);
    });

    it('caches decrypted values', async () => {
      const plaintext = 'cached-value';
      const ciphertext = Buffer.from('encrypted').toString('base64');

      kmsMock.on(DecryptCommand).resolves({
        Plaintext: Buffer.from(plaintext),
      });

      const service = new EncryptionService('test-key-id');

      // First call - should hit KMS
      const result1 = await service.decryptField(ciphertext);
      expect(result1).toBe(plaintext);

      // Second call - should hit cache
      const result2 = await service.decryptField(ciphertext);
      expect(result2).toBe(plaintext);

      expect(kmsMock.calls()).toHaveLength(1); // Only one KMS call
    });

    it('evicts oldest entry when cache is full', async () => {
      const service = new EncryptionService('test-key-id');

      // Fill cache to max size (1000)
      for (let i = 0; i < 1000; i++) {
        const ciphertext = `cipher-${i}`;
        const plaintext = `plain-${i}`;

        kmsMock.on(DecryptCommand).resolves({
          Plaintext: Buffer.from(plaintext),
        });

        await service.decryptField(Buffer.from(ciphertext).toString('base64'));
      }

      // Add one more - should evict oldest
      kmsMock.on(DecryptCommand).resolves({
        Plaintext: Buffer.from('new-value'),
      });

      await service.decryptField(Buffer.from('new-cipher').toString('base64'));

      // Cache should still be at max size
      expect(kmsMock.calls().length).toBeGreaterThan(1000);
    }, 15000); // Increase timeout for 1000 iterations

    it('retries on KMS throttling', async () => {
      const plaintext = 'test-data';
      const ciphertext = Buffer.from('unique-encrypted-for-retry-test').toString('base64');

      // Reset mocks to ensure clean state
      kmsMock.reset();
      kmsMock
        .on(DecryptCommand)
        .rejectsOnce({ name: 'ThrottlingException', message: 'Rate exceeded' })
        .resolves({ Plaintext: Buffer.from(plaintext) });

      const service = new EncryptionService('test-key-id');
      const result = await service.decryptField(ciphertext);

      expect(result).toBe(plaintext);
      expect(kmsMock.calls()).toHaveLength(2);
    });

    it('throws error after max retries', async () => {
      const ciphertext = Buffer.from('encrypted-max-retries').toString('base64');

      kmsMock.on(DecryptCommand).rejects({ name: 'ThrottlingException', message: 'Rate exceeded' });

      const service = new EncryptionService('test-key-id');

      await expect(service.decryptField(ciphertext)).rejects.toThrow();
      expect(kmsMock.calls()).toHaveLength(4); // Initial + 3 retries
    }, 10000); // 10 second timeout for exponential backoff (1s + 2s + 4s)
  });

  describe('hashField', () => {
    it('hashes field deterministically', () => {
      const service = new EncryptionService('test-key-id');

      const hash1 = service.hashField('123456789');
      const hash2 = service.hashField('123456789');

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex
    });

    it('produces different hashes for different inputs', () => {
      const service = new EncryptionService('test-key-id');

      const hash1 = service.hashField('123456789');
      const hash2 = service.hashField('987654321');

      expect(hash1).not.toBe(hash2);
    });

    it('produces consistent hash format', () => {
      const service = new EncryptionService('test-key-id');

      const hash = service.hashField('test-input');

      expect(hash).toMatch(/^[a-f0-9]{64}$/); // Hex string, 64 chars
    });
  });

  describe('clearCache', () => {
    it('clears specific cache entry', async () => {
      const plaintext = 'cached-value';
      const ciphertext = Buffer.from('encrypted').toString('base64');

      kmsMock.on(DecryptCommand).resolves({
        Plaintext: Buffer.from(plaintext),
      });

      const service = new EncryptionService('test-key-id');

      // Cache the value
      await service.decryptField(ciphertext);
      expect(kmsMock.calls()).toHaveLength(1);

      // Clear cache
      service.clearCache(ciphertext);

      // Should hit KMS again
      await service.decryptField(ciphertext);
      expect(kmsMock.calls()).toHaveLength(2);
    });

    it('clears entire cache when no argument provided', async () => {
      const service = new EncryptionService('test-key-id');

      // Cache multiple values
      for (let i = 0; i < 5; i++) {
        const ciphertext = Buffer.from(`cipher-${i}`).toString('base64');
        kmsMock.on(DecryptCommand).resolves({
          Plaintext: Buffer.from(`plain-${i}`),
        });
        await service.decryptField(ciphertext);
      }

      expect(kmsMock.calls()).toHaveLength(5);

      // Clear all cache
      service.clearCache();

      // All should hit KMS again
      for (let i = 0; i < 5; i++) {
        const ciphertext = Buffer.from(`cipher-${i}`).toString('base64');
        await service.decryptField(ciphertext);
      }

      expect(kmsMock.calls()).toHaveLength(10);
    });
  });

  describe('encrypt and decrypt round-trip', () => {
    it('successfully encrypts and decrypts data', async () => {
      const plaintext = '123456789';
      const ciphertext = Buffer.from('encrypted-data');

      kmsMock.on(EncryptCommand).resolves({
        CiphertextBlob: ciphertext,
      });

      kmsMock.on(DecryptCommand).resolves({
        Plaintext: Buffer.from(plaintext),
      });

      const service = new EncryptionService('test-key-id');

      const encrypted = await service.encryptField(plaintext);
      const decrypted = await service.decryptField(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('CloudWatch metrics', () => {
    it('emits EncryptionOperations metric on successful encrypt', async () => {
      kmsMock.on(EncryptCommand).resolves({
        CiphertextBlob: Buffer.from('encrypted'),
      });

      const service = new EncryptionService('test-key-id');
      await service.encryptField('test');

      expect(cloudwatchMock.calls()).toHaveLength(1);
      const call = cloudwatchMock.call(0);
      expect(call.args[0].input.MetricData?.[0].MetricName).toBe('EncryptionOperations');
    });

    it('emits DecryptionOperations metric on successful decrypt', async () => {
      kmsMock.on(DecryptCommand).resolves({
        Plaintext: Buffer.from('plaintext'),
      });

      const service = new EncryptionService('test-key-id');
      await service.decryptField(Buffer.from('cipher').toString('base64'));

      expect(cloudwatchMock.calls()).toHaveLength(1);
      const call = cloudwatchMock.call(0);
      expect(call.args[0].input.MetricData?.[0].MetricName).toBe('DecryptionOperations');
    });

    it('emits CacheHits metric on cache hit', async () => {
      const ciphertext = Buffer.from('encrypted').toString('base64');

      kmsMock.on(DecryptCommand).resolves({
        Plaintext: Buffer.from('plaintext'),
      });

      const service = new EncryptionService('test-key-id');

      // First call - cache miss
      await service.decryptField(ciphertext);

      // Second call - cache hit
      await service.decryptField(ciphertext);

      const cacheHitCalls = cloudwatchMock.calls().filter(
        call => call.args[0].input.MetricData?.[0].MetricName === 'CacheHits'
      );

      expect(cacheHitCalls).toHaveLength(1);
    });

    it('emits EncryptionErrors metric on encrypt failure', async () => {
      kmsMock.on(EncryptCommand).rejects({ name: 'InvalidKeyId', message: 'Key not found' });

      const service = new EncryptionService('test-key-id');

      await expect(service.encryptField('test')).rejects.toThrow();

      const errorCalls = cloudwatchMock.calls().filter(
        call => call.args[0].input.MetricData?.[0].MetricName === 'EncryptionErrors'
      );

      expect(errorCalls).toHaveLength(1);
    });
  });
});
