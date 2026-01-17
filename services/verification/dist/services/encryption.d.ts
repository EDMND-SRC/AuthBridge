import { AuditService } from './audit';
export declare class EncryptionService {
    private kmsClient;
    private cloudwatch;
    private auditService;
    private keyId;
    private cache;
    private readonly CACHE_TTL_MS;
    private readonly MAX_CACHE_SIZE;
    constructor(keyId?: string, auditService?: AuditService);
    encryptField(plaintext: string, retries?: number, resourceId?: string, fieldName?: string): Promise<string>;
    decryptField(ciphertext: string, retries?: number, resourceId?: string, fieldName?: string): Promise<string>;
    hashField(plaintext: string): string;
    clearCache(ciphertext?: string): void;
    private evictOldestEntry;
    private sleep;
    private emitMetric;
}
//# sourceMappingURL=encryption.d.ts.map