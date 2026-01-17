# Encryption Service Usage Guide

## Overview

The `EncryptionService` provides field-level encryption for sensitive data using AWS KMS (Key Management Service). It includes built-in caching, retry logic, audit logging, and CloudWatch metrics.

## Features

- **AES-256 Encryption**: Uses AWS KMS for secure encryption
- **5-Minute Cache**: Reduces KMS API calls for frequently accessed data
- **Exponential Backoff**: Automatic retry with 1s, 2s, 4s delays for KMS throttling
- **Audit Logging**: All encryption/decryption operations logged to CloudWatch Logs
- **CloudWatch Metrics**: Real-time monitoring of encryption operations
- **Deterministic Hashing**: SHA-256 hashing for duplicate detection

## Installation

The service is already configured in the verification service. Ensure these environment variables are set:

```bash
DATA_ENCRYPTION_KEY_ID=<kms-key-id>
DATA_ENCRYPTION_KEY_ARN=<kms-key-arn>
AWS_REGION=af-south-1
```

## Basic Usage

### Initialize the Service

```typescript
import { EncryptionService } from './services/encryption';

const encryptionService = new EncryptionService();
```

### Encrypt a Field

```typescript
const plaintext = '123456789';
const encrypted = await encryptionService.encryptField(
  plaintext,
  3,  // retries (optional, default: 3)
  'CASE#123',  // resourceId (optional, for audit logging)
  'omangNumber'  // fieldName (optional, for audit logging)
);

// encrypted = "base64-encoded-ciphertext"
```

### Decrypt a Field

```typescript
const ciphertext = 'base64-encoded-ciphertext';
const decrypted = await encryptionService.decryptField(
  ciphertext,
  3,  // retries (optional, default: 3)
  'CASE#123',  // resourceId (optional, for audit logging)
  'omangNumber'  // fieldName (optional, for audit logging)
);

// decrypted = "123456789"
```

### Hash a Field (for Duplicate Detection)

```typescript
const plaintext = '123456789';
const hash = encryptionService.hashField(plaintext);

// hash = "64-character-hex-string" (SHA-256)
```

### Clear Cache

```typescript
// Clear specific entry
encryptionService.clearCache('specific-ciphertext');

// Clear entire cache
encryptionService.clearCache();
```

## Integration Example: DynamoDB Service

```typescript
import { EncryptionService } from './encryption';
import { AuditService } from './audit';

export class DynamoDBService {
  private encryptionService: EncryptionService;

  constructor() {
    this.encryptionService = new EncryptionService();
  }

  async createCase(caseData: VerificationCase): Promise<void> {
    if (caseData.omangNumber) {
      // CRITICAL: Hash plaintext FIRST for duplicate detection (GSI2PK)
      caseData.GSI2PK = `OMANG#${this.encryptionService.hashField(caseData.omangNumber)}`;

      // Then encrypt for storage
      caseData.omangNumber = await this.encryptionService.encryptField(
        caseData.omangNumber,
        3,
        caseData.verificationId,
        'omangNumber'
      );
    }

    if (caseData.extractedData?.address) {
      caseData.extractedData.address = await this.encryptionService.encryptField(
        caseData.extractedData.address,
        3,
        caseData.verificationId,
        'address'
      );
    }

    // Write to DynamoDB
    await this.client.send(new PutItemCommand({ ... }));
  }

  async getCase(verificationId: string): Promise<VerificationCase> {
    const response = await this.client.send(new GetItemCommand({ ... }));
    const caseData = unmarshall(response.Item!);

    // Decrypt sensitive fields
    if (caseData.omangNumber) {
      caseData.omangNumber = await this.encryptionService.decryptField(
        caseData.omangNumber,
        3,
        verificationId,
        'omangNumber'
      );
    }

    if (caseData.extractedData?.address) {
      caseData.extractedData.address = await this.encryptionService.decryptField(
        caseData.extractedData.address,
        3,
        verificationId,
        'address'
      );
    }

    return caseData;
  }
}
```

## Performance Considerations

### Cache Behavior

- **Cache TTL**: 5 minutes
- **Max Cache Size**: 1000 entries
- **Eviction Policy**: Oldest entry evicted when cache is full
- **Cache Hit Latency**: <1ms
- **KMS Call Latency**: ~10-20ms

### Recommendations

1. **Use caching for read-heavy operations**: The cache significantly reduces KMS API calls
2. **Batch encrypt during bulk imports**: Minimize KMS throttling
3. **Monitor CloudWatch metrics**: Track encryption operations and errors
4. **Clear cache on updates**: Invalidate cached entries when data changes

## Monitoring

### CloudWatch Metrics

The service emits the following metrics to `AuthBridge/Encryption` namespace:

| Metric | Description |
|--------|-------------|
| `EncryptionOperations` | Count of successful encryption operations |
| `DecryptionOperations` | Count of successful decryption operations |
| `CacheHits` | Count of cache hits (decryption) |
| `EncryptionErrors` | Count of encryption failures |
| `DecryptionErrors` | Count of decryption failures |

### Audit Logs

All encryption/decryption operations are logged to CloudWatch Logs:

```json
{
  "eventId": "uuid",
  "timestamp": "2026-01-17T00:00:00.000Z",
  "action": "DATA_ENCRYPTED",
  "resourceId": "CASE#123",
  "fieldName": "omangNumber",
  "status": "success"
}
```

## Error Handling

### KMS Throttling

The service automatically retries with exponential backoff:

- **Retry 1**: 1 second delay
- **Retry 2**: 2 seconds delay
- **Retry 3**: 4 seconds delay
- **After 3 retries**: Throws error

### Error Types

| Error | Description | Retry? |
|-------|-------------|--------|
| `ThrottlingException` | KMS rate limit exceeded | ✅ Yes |
| `LimitExceededException` | KMS quota exceeded | ✅ Yes |
| `InvalidKeyId` | Invalid KMS key | ❌ No |
| `AccessDeniedException` | Missing KMS permissions | ❌ No |

## Cost Estimation

| Item | Cost | Notes |
|------|------|-------|
| KMS Key | $1/month | Per key |
| KMS Requests | $0.03/10K | Encrypt + Decrypt |
| 10K verifications | ~$5-10/month | With 80% cache hit rate |
| 100K verifications | ~$30-50/month | With 80% cache hit rate |

## Security Best Practices

1. **Never log plaintext**: Always log encrypted or hashed values
2. **Use audit logging**: Track all encryption operations for compliance
3. **Rotate KMS keys**: Enable automatic key rotation (already configured)
4. **Monitor metrics**: Set up CloudWatch alarms for encryption errors
5. **Test in staging**: Verify KMS access before production deployment

## Testing

### Unit Tests (Local)

```bash
pnpm test src/services/encryption.test.ts
```

### Integration Tests (Staging)

```bash
AWS_REGION=af-south-1 DATA_ENCRYPTION_KEY_ID=<key-id> pnpm test:integration
```

## Troubleshooting

### Issue: KMS Throttling

**Symptoms**: `ThrottlingException` errors in logs

**Solutions**:
- Increase cache TTL
- Batch operations
- Request KMS quota increase

### Issue: Cache Not Working

**Symptoms**: High KMS API call count

**Solutions**:
- Verify cache is not being cleared unnecessarily
- Check cache size limits
- Monitor `CacheHits` metric

### Issue: Audit Logs Missing

**Symptoms**: No audit logs in CloudWatch

**Solutions**:
- Verify CloudWatch Logs permissions
- Check log group exists: `/aws/lambda/authbridge-verification-{stage}`
- Audit logging failures don't block encryption operations

## References

- [AWS KMS Documentation](https://docs.aws.amazon.com/kms/)
- [KMS Key Configuration](../../services/shared/cloudformation/kms-keys.yml)
- [Deployment Runbook](../../docs/deployment-runbook.md)
