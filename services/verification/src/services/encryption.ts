import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { createHash } from 'crypto';
import { AuditService } from './audit';

interface CacheEntry {
  value: string;
  expiresAt: number;
  lastAccessed: number; // For LRU eviction
}

export class EncryptionService {
  private kmsClient: KMSClient;
  private cloudwatch: CloudWatchClient;
  private auditService: AuditService;
  private keyId: string;
  private cache: Map<string, CacheEntry>;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000; // Prevent unbounded growth

  constructor(keyId?: string, auditService?: AuditService) {
    this.kmsClient = new KMSClient({ region: process.env.AWS_REGION || 'af-south-1' });
    this.cloudwatch = new CloudWatchClient({ region: process.env.AWS_REGION || 'af-south-1' });
    this.auditService = auditService || new AuditService();
    this.keyId = keyId || process.env.DATA_ENCRYPTION_KEY_ID!;
    this.cache = new Map();
  }

  async encryptField(plaintext: string, retries = 3, resourceId?: string, fieldName?: string): Promise<string> {
    try {
      const command = new EncryptCommand({
        KeyId: this.keyId,
        Plaintext: Buffer.from(plaintext, 'utf-8'),
      });

      const response = await this.kmsClient.send(command);
      await this.emitMetric('EncryptionOperations');

      // Audit log successful encryption
      if (resourceId && fieldName) {
        await this.auditService.logEncryption(resourceId, fieldName, true);
      }

      return Buffer.from(response.CiphertextBlob!).toString('base64');
    } catch (error: any) {
      // Handle KMS throttling with exponential backoff
      if ((error.name === 'ThrottlingException' || error.name === 'LimitExceededException') && retries > 0) {
        const delay = Math.pow(2, 3 - retries) * 1000; // 1s, 2s, 4s
        await this.sleep(delay);
        return this.encryptField(plaintext, retries - 1, resourceId, fieldName);
      }

      await this.emitMetric('EncryptionErrors');

      // Audit log encryption error
      if (resourceId && fieldName) {
        await this.auditService.logEncryptionError(resourceId, fieldName, error.name, error.message);
      }

      throw error;
    }
  }

  async decryptField(ciphertext: string, retries = 3, resourceId?: string, fieldName?: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(ciphertext);
    if (cached && cached.expiresAt > Date.now()) {
      // Move to end for LRU (delete and re-insert)
      this.cache.delete(ciphertext);
      this.cache.set(ciphertext, {
        value: cached.value,
        expiresAt: cached.expiresAt,
        lastAccessed: Date.now(),
      });

      await this.emitMetric('CacheHits');

      // Audit log cache hit
      if (resourceId && fieldName) {
        await this.auditService.logDecryption(resourceId, fieldName, true, true);
      }

      return cached.value;
    }

    try {
      const command = new DecryptCommand({
        CiphertextBlob: Buffer.from(ciphertext, 'base64'),
      });

      const response = await this.kmsClient.send(command);
      const plaintext = Buffer.from(response.Plaintext!).toString('utf-8');

      // Cache with TTL (enforce max size)
      if (this.cache.size >= this.MAX_CACHE_SIZE) {
        this.evictOldestEntry();
      }
      this.cache.set(ciphertext, {
        value: plaintext,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
        lastAccessed: Date.now(),
      });

      await this.emitMetric('DecryptionOperations');

      // Audit log successful decryption
      if (resourceId && fieldName) {
        await this.auditService.logDecryption(resourceId, fieldName, true, false);
      }

      return plaintext;
    } catch (error: any) {
      // Handle KMS throttling with exponential backoff
      if ((error.name === 'ThrottlingException' || error.name === 'LimitExceededException') && retries > 0) {
        const delay = Math.pow(2, 3 - retries) * 1000;
        await this.sleep(delay);
        return this.decryptField(ciphertext, retries - 1, resourceId, fieldName);
      }

      await this.emitMetric('DecryptionErrors');

      // Audit log decryption error
      if (resourceId && fieldName) {
        await this.auditService.logDecryptionError(resourceId, fieldName, error.name, error.message);
      }

      throw error;
    }
  }

  hashField(plaintext: string): string {
    return createHash('sha256').update(plaintext).digest('hex');
  }

  clearCache(ciphertext?: string): void {
    if (ciphertext) {
      this.cache.delete(ciphertext);
      // Audit log cache clear for specific entry
      this.auditService.logCacheCleared(ciphertext).catch(() => {
        // Don't fail if audit logging fails
      });
    } else {
      this.cache.clear();
      // Audit log cache clear for all entries
      this.auditService.logCacheCleared().catch(() => {
        // Don't fail if audit logging fails
      });
    }
  }

  private evictOldestEntry(): void {
    // Use LRU eviction - evict first entry (oldest in insertion order)
    // Map maintains insertion order, and we update entries on access by delete + re-insert
    // This makes eviction O(1) instead of O(n)
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async emitMetric(metricName: string): Promise<void> {
    try {
      await this.cloudwatch.send(new PutMetricDataCommand({
        Namespace: 'AuthBridge/Encryption',
        MetricData: [{
          MetricName: metricName,
          Value: 1,
          Unit: 'Count',
          Dimensions: [{ Name: 'Service', Value: 'verification' }],
        }],
      }));
    } catch {
      // Don't fail encryption if metrics fail
    }
  }
}
