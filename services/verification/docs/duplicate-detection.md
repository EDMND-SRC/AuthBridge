# Duplicate Omang Detection System

## Overview

The Duplicate Omang Detection system is a privacy-conscious fraud prevention mechanism that identifies when the same Omang (Botswana National ID) number has been used in previous verification attempts. This system balances fraud detection with legitimate re-verification use cases while maintaining strict data protection compliance.

## Business Context

### Legitimate Use Cases (Low Risk)
- **Annual KYC Refresh**: Same person, same client performing periodic verification
- **Account Recovery**: User re-verifying after losing access
- **Service Upgrade**: Existing customer upgrading to premium services

### Fraudulent Use Cases (High Risk)
- **Identity Theft**: Different person using stolen Omang number
- **Account Takeover**: Fraudster attempting to access existing account
- **Cross-Client Fraud**: Same Omang used across multiple financial institutions
- **Synthetic Identity**: Multiple fraudulent accounts using same identity document

## Architecture

### Privacy-Preserving Design

The system uses **SHA-256 hashing** to enable duplicate detection without storing plaintext Omang numbers in database indexes:

```
Omang Number (123456789)
    ↓ SHA-256 Hash
Hash (15e2b0d3c33891ebb0f1ef609ec419420c20e320ce94c65fbc8c3312448eb225)
    ↓ Store in GSI2PK
OMANG#15e2b0d3c33891ebb0f1ef609ec419420c20e320ce94c65fbc8c3312448eb225
```

**Benefits:**
- **One-way**: Cannot reverse hash to get original Omang number
- **Deterministic**: Same Omang always produces same hash
- **Fast**: O(1) lookup performance in DynamoDB GSI
- **Compliant**: Meets Data Protection Act 2024 requirements

### Data Flow

```
Document Upload (Story 1.5.3)
    ↓
OCR Extraction (Story 2.1)
    ↓ Extract Omang number
Omang Validation (Story 2.2)
    ↓ Validate format
Store Omang Hash in GSI2PK
    ↓
Biometric Matching (Story 2.3)
    ↓ Biometric passes
Duplicate Detection (Story 2.4) ← YOU ARE HERE
    ↓ Query GSI2 by Omang hash
Risk Assessment
    ↓ Calculate risk score
Manual Review Trigger (if needed)
    ↓
Case Status Update
```

## Duplicate Detection Algorithm

### Step 1: Query by Omang Hash

```typescript
// Generate hash from Omang number
const omangHash = hashOmangNumber(omangNumber); // SHA-256
const omangHashKey = `OMANG#${omangHash}`;

// Query GSI2 for all cases with same Omang
const duplicates = await dynamoDB.query({
  IndexName: 'GSI2',
  KeyConditionExpression: 'GSI2PK = :omangHash',
  ExpressionAttributeValues: {
    ':omangHash': omangHashKey
  }
});
```

### Step 2: Filter Current Verification

Exclude the current verification from duplicate results to avoid false positives:

```typescript
const duplicateCases = allCases.filter(
  c => c.verificationId !== currentVerificationId
);
```

### Step 3: Categorize Duplicates

Separate duplicates into same-client and cross-client categories:

```typescript
const sameClientDuplicates = duplicates.filter(
  d => d.clientId === currentClientId
);

const crossClientDuplicates = duplicates.filter(
  d => d.clientId !== currentClientId
);
```

### Step 4: Calculate Risk Factors

Analyze duplicate patterns to identify fraud indicators:

```typescript
const riskFactors = {
  // Cross-client duplicates (highest risk)
  crossClientCount: crossClientDuplicates.length,

  // Biometric mismatches (different person using same Omang)
  biometricMismatches: duplicates.filter(d => {
    const scoreDiff = Math.abs(d.biometricScore - currentBiometricScore);
    return scoreDiff > 20; // >20% difference
  }).length,

  // Recent duplicates (within 30 days)
  recentDuplicates: duplicates.filter(d => {
    const daysSince = differenceInDays(now, new Date(d.createdAt));
    return daysSince <= 30;
  }).length,

  // Multiple duplicates (>2 total)
  totalDuplicates: duplicates.length,

  // Status mismatches (previous rejected, current approved)
  statusMismatches: duplicates.filter(d =>
    d.status === 'rejected' && currentStatus === 'approved'
  ).length
};
```

### Step 5: Calculate Risk Score

Apply weighted scoring algorithm (0-100 scale):

```typescript
function calculateRiskScore(factors: RiskFactors): number {
  let score = 0;

  // Cross-client duplicates: 40 points (max)
  score += Math.min(factors.crossClientCount * 40, 40);

  // Biometric mismatches: 30 points (max)
  score += Math.min(factors.biometricMismatches * 30, 30);

  // Recent duplicates: 15 points (max)
  score += Math.min(factors.recentDuplicates * 15, 15);

  // Multiple duplicates: 10 points
  if (factors.totalDuplicates > 2) {
    score += 10;
  }

  // Status mismatches: 5 points (max)
  score += Math.min(factors.statusMismatches * 5, 5);

  return Math.min(score, 100); // Cap at 100
}
```

### Step 6: Determine Risk Level

Map risk score to risk level:

| Score Range | Risk Level | Action |
|-------------|------------|--------|
| 0-25 | Low | Auto-approve (legitimate re-verification) |
| 26-50 | Medium | Flag for review |
| 51-75 | High | Requires manual approval |
| 76-100 | Critical | Auto-reject or escalate to fraud team |

### Step 7: Store Results

Store duplicate detection results in verification entity:

```typescript
{
  PK: "CASE#ver_123",
  SK: "META",

  duplicateDetection: {
    checked: true,
    checkedAt: "2026-01-15T10:00:00Z",
    duplicatesFound: 2,
    sameClientDuplicates: 1,
    crossClientDuplicates: 1,
    riskLevel: "high",
    riskScore: 75,
    duplicateCases: [
      {
        verificationId: "ver_prev_1",
        clientId: "client_abc",
        status: "approved",
        biometricScore: 92.5,
        createdAt: "2025-12-01T10:00:00Z",
        daysSince: 45
      }
    ],
    requiresManualReview: true,
    flagReason: "1 cross-client duplicate(s)"
  }
}
```

## Risk Scoring Thresholds

### Detailed Scoring Matrix

| Risk Factor | Weight | Max Points | Rationale |
|-------------|--------|------------|-----------|
| **Cross-Client Duplicate** | 40 | 40 | Strongest fraud indicator - same ID used by different organizations |
| **Biometric Mismatch** | 30 | 30 | Different person using same Omang (identity theft) |
| **Recent Duplicate** | 15 | 15 | Suspicious if multiple verifications within short timeframe |
| **Multiple Duplicates** | 10 | 10 | Pattern of repeated use suggests fraud |
| **Status Mismatch** | 5 | 5 | Previously rejected but now approved (circumvention attempt) |

### Example Scenarios

#### Scenario 1: Annual KYC Refresh (Low Risk)
```
Same client, same person, 365 days since last verification
- Cross-client: 0 points
- Biometric mismatch: 0 points (scores match)
- Recent duplicate: 0 points (>30 days)
- Multiple duplicates: 0 points (only 1 previous)
- Status mismatch: 0 points
Total: 0 points → Low Risk ✅
```

#### Scenario 2: Different Person, Same Omang (Medium Risk)
```
Same client, different biometric score, 15 days ago
- Cross-client: 0 points
- Biometric mismatch: 30 points (score diff >20%)
- Recent duplicate: 15 points (<30 days)
- Multiple duplicates: 0 points
- Status mismatch: 0 points
Total: 45 points → Medium Risk ⚠️
```

#### Scenario 3: Cross-Client Fraud (High Risk)
```
Different client, same person, 10 days ago
- Cross-client: 40 points
- Biometric mismatch: 0 points (scores match)
- Recent duplicate: 15 points (<30 days)
- Multiple duplicates: 0 points
- Status mismatch: 0 points
Total: 55 points → High Risk 🚨
```

#### Scenario 4: Organized Fraud Ring (Critical Risk)
```
Multiple clients, different people, recent activity
- Cross-client: 40 points (2+ different clients)
- Biometric mismatch: 30 points (different faces)
- Recent duplicate: 15 points (<30 days)
- Multiple duplicates: 10 points (>2 total)
- Status mismatch: 5 points (previous rejected)
Total: 100 points → Critical Risk 🔴
```

## Privacy & Compliance

### Data Protection Act 2024 Compliance

#### 1. Cross-Client Data Sharing

**Challenge**: Duplicate detection reveals that an Omang was used by another client.

**Solution**:
- Store only **metadata** (verificationId, clientId, dates, scores)
- **Never store** customer names, addresses, or contact information
- Analyst sees "duplicate detected" but not customer details from other clients

**Example**:
```typescript
// ✅ ALLOWED: Metadata only
{
  verificationId: "ver_prev_123",
  clientId: "client_xyz",
  status: "approved",
  biometricScore: 92.5,
  createdAt: "2025-12-01T10:00:00Z",
  daysSince: 45
}

// ❌ NOT ALLOWED: Customer PII
{
  customerName: "John Doe",  // NEVER STORED
  address: "123 Main St",    // NEVER STORED
  phone: "+267 1234567"      // NEVER STORED
}
```

#### 2. Omang Number Encryption

**Storage Strategy**:
- **Primary Storage**: Omang encrypted with KMS in `customerData.omangNumber`
- **GSI Lookup**: SHA-256 hash in `GSI2PK` for duplicate queries
- **Audit Logs**: Only hash stored, never plaintext

**Encryption Flow**:
```
Plaintext Omang → KMS Encrypt → Store in customerData
Plaintext Omang → SHA-256 Hash → Store in GSI2PK
```

#### 3. Data Retention

**Retention Periods**:
- **Duplicate Records**: 5 years (FIA AML/KYC requirement)
- **Audit Logs**: 5 years (regulatory compliance)
- **Customer Data**: Until deletion request (GDPR/DPA 2024)

**Deletion Process**:
```
Customer requests deletion
    ↓
Delete customerData (including encrypted Omang)
    ↓
PRESERVE duplicate detection metadata (anonymized)
    ↓
PRESERVE audit logs (hash only, no plaintext)
```

#### 4. Audit Trail Requirements

Every duplicate check is logged:

```typescript
{
  PK: "AUDIT#2026-01-15",
  SK: "10:00:00.123#evt_duplicate_check",
  action: "DUPLICATE_CHECK",
  resourceId: "ver_abc123",
  userId: "system",
  metadata: {
    omangHash: "sha256_hash",  // Hash only, not plaintext
    duplicatesFound: 2,
    riskLevel: "high",
    riskScore: 75,
    sameClientCount: 1,
    crossClientCount: 1
  },
  ipAddress: "lambda",
  timestamp: "2026-01-15T10:00:00.123Z"
}
```

### FIA AML/KYC Requirements

**Regulatory Mandate**: Financial Intelligence Agency requires duplicate detection for:
- Anti-Money Laundering (AML) compliance
- Know Your Customer (KYC) verification
- Fraud prevention and detection

**Compliance Features**:
- ✅ Duplicate detection across all verifications
- ✅ Risk-based approach (low/medium/high/critical)
- ✅ Manual review triggers for suspicious patterns
- ✅ Complete audit trail (5-year retention)
- ✅ Cross-client fraud detection
- ✅ Biometric comparison for identity verification

## CloudWatch Monitoring

### Custom Metrics

All metrics published to namespace: `AuthBridge/Verification`

#### Duplicate Detection Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `Duplicate/ChecksPerformed` | Count | Total duplicate checks executed |
| `Duplicate/CheckSuccess` | Count | Successful duplicate checks |
| `Duplicate/CheckFailure` | Count | Failed duplicate checks (errors) |
| `Duplicate/CheckTime` | Milliseconds | Time to complete duplicate check |
| `Duplicate/DuplicatesFound` | Count | Number of duplicates detected |
| `Duplicate/SameClientDuplicates` | Count | Same-client duplicates |
| `Duplicate/CrossClientDuplicates` | Count | Cross-client duplicates |
| `Duplicate/RiskScore` | Count | Risk score (0-100) |
| `Duplicate/RiskLevel/{level}` | Count | Count by risk level (low/medium/high/critical) |
| `Duplicate/HighRiskCases` | Count | High or critical risk cases |
| `Duplicate/ManualReviewTriggered` | Count | Cases flagged for manual review |
| `Duplicate/CheckError` | Count | Errors by type (DynamoDB/Encryption/Unknown) |

### CloudWatch Alarms

#### High Cross-Client Duplicate Rate
```yaml
AlarmName: authbridge-duplicate-cross-client-rate-high
Description: Cross-client duplicate rate exceeds 5% over 1 hour
MetricName: Duplicate/CrossClientDuplicates
Statistic: Sum
Period: 3600
Threshold: 5
ComparisonOperator: GreaterThanThreshold
AlarmActions:
  - arn:aws:sns:af-south-1:*:fraud-team-alerts
```

#### High Risk Score Average
```yaml
AlarmName: authbridge-duplicate-risk-score-high
Description: Average risk score exceeds 50 over 1 hour
MetricName: Duplicate/RiskScore
Statistic: Average
Period: 3600
Threshold: 50
ComparisonOperator: GreaterThanThreshold
AlarmActions:
  - arn:aws:sns:af-south-1:*:operations-alerts
```

#### Duplicate Check Failures
```yaml
AlarmName: authbridge-duplicate-check-failures
Description: Duplicate check failure rate exceeds 10% over 5 minutes
MetricName: Duplicate/CheckFailure
Statistic: Sum
Period: 300
Threshold: 10
ComparisonOperator: GreaterThanThreshold
AlarmActions:
  - arn:aws:sns:af-south-1:*:engineering-alerts
```

#### GSI Throttling
```yaml
AlarmName: authbridge-gsi2-throttling
Description: GSI2 (OmangHashIndex) throttling detected
MetricName: UserErrors
Namespace: AWS/DynamoDB
Dimensions:
  - Name: TableName
    Value: AuthBridgeTable
  - Name: GlobalSecondaryIndexName
    Value: GSI2
Statistic: Sum
Period: 300
Threshold: 5
ComparisonOperator: GreaterThanThreshold
AlarmActions:
  - arn:aws:sns:af-south-1:*:engineering-alerts
```

## Error Handling

### Error Types and Recovery

#### 1. DynamoDB Query Errors

**Error**: `ProvisionedThroughputExceededException`
- **Cause**: GSI2 read capacity exceeded
- **Recovery**: Exponential backoff retry (3 attempts)
- **Fallback**: Return "unknown" risk level, log error

**Error**: `ResourceNotFoundException`
- **Cause**: GSI2 not ready or deleted
- **Recovery**: Skip duplicate check
- **Fallback**: Log critical error, continue verification

**Error**: `ValidationException`
- **Cause**: Invalid query parameters
- **Recovery**: Log error, skip duplicate check
- **Fallback**: Return "unknown" risk level

#### 2. Encryption/Decryption Errors

**Error**: `KMSKeyNotFoundException`
- **Cause**: KMS key deleted or inaccessible
- **Recovery**: Skip duplicate check
- **Fallback**: Log critical error, alert operations

**Error**: `DecryptionFailureException`
- **Cause**: Corrupted encrypted data
- **Recovery**: Skip duplicate check
- **Fallback**: Log error, continue verification

#### 3. Retry Logic

```typescript
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;

async function queryDuplicatesWithRetry(
  omangHash: string,
  retries = 0
): Promise<Case[]> {
  try {
    return await dynamoDBService.query({
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :omangHash',
      ExpressionAttributeValues: {
        ':omangHash': `OMANG#${omangHash}`
      }
    });
  } catch (error) {
    if (retries < MAX_RETRIES && isRetryable(error)) {
      const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, retries);
      await sleep(backoffMs);
      return queryDuplicatesWithRetry(omangHash, retries + 1);
    }
    throw error;
  }
}
```

### Graceful Degradation

**Critical Principle**: Duplicate detection failures NEVER block verification flow.

```typescript
try {
  const duplicateResult = await duplicateDetectionService.checkDuplicates(
    omangNumber,
    verificationId,
    clientId,
    biometricScore
  );

  await duplicateStorageService.storeDuplicateResults(
    verificationId,
    duplicateResult
  );
} catch (error) {
  // Log error but don't fail biometric processing
  logger.error('Duplicate detection failed', {
    verificationId,
    error: error.message
  });

  await recordDuplicateCheckError('UNKNOWN');

  // Continue verification flow
}
```

## Performance Requirements

### Latency Targets

| Operation | Target (p95) | Max Acceptable |
|-----------|--------------|----------------|
| Duplicate Check (total) | < 500ms | 1000ms |
| GSI Query | < 200ms | 500ms |
| Risk Calculation | < 50ms | 100ms |
| Storage Update | < 100ms | 300ms |

### Throughput

- **Concurrent Verifications**: 5/second (Rekognition quota limit)
- **GSI Read Capacity**: 5 RCU (on-demand billing)
- **GSI Write Capacity**: 5 WCU (on-demand billing)

### Optimization Strategies

1. **Projection Expression**: Only fetch needed fields from GSI
2. **Parallel Processing**: Query and risk calculation can run concurrently
3. **Caching**: Consider caching recent duplicate checks (future optimization)
4. **Batch Processing**: Not applicable (real-time fraud detection required)

## Integration Guide

### For Developers

#### Adding Duplicate Detection to New Document Types

```typescript
// 1. Update OCR storage to set GSI2PK
if (extractedFields.documentNumber) {
  const { createOmangHashKey } = await import('../utils/omang-hash.js');
  const hashKey = createOmangHashKey(extractedFields.documentNumber);

  updateExpression += ', #GSI2PK = :GSI2PK, #GSI2SK = :GSI2SK';
  expressionAttributeNames['#GSI2PK'] = 'GSI2PK';
  expressionAttributeNames['#GSI2SK'] = 'GSI2SK';
  expressionAttributeValues[':GSI2PK'] = hashKey;
  expressionAttributeValues[':GSI2SK'] = `CASE#${verificationId}`;
}

// 2. Trigger duplicate check after verification
const duplicateResult = await duplicateDetectionService.checkDuplicates(
  documentNumber,
  verificationId,
  clientId,
  verificationScore
);

// 3. Store results
await duplicateStorageService.storeDuplicateResults(
  verificationId,
  duplicateResult
);
```

### For Operations

#### Monitoring Dashboard

Create CloudWatch dashboard with:
1. **Duplicate Detection Rate** (line chart)
2. **Risk Level Distribution** (pie chart)
3. **Cross-Client Duplicates** (line chart)
4. **Manual Review Queue** (number widget)
5. **Check Latency** (line chart, p50/p95/p99)
6. **Error Rate** (line chart)

#### Alert Response Procedures

**High Cross-Client Duplicate Rate**:
1. Check for fraud campaign or data breach
2. Review recent high-risk cases
3. Escalate to fraud team if pattern detected
4. Consider temporary enhanced verification

**GSI Throttling**:
1. Check current read/write capacity
2. Review query patterns for optimization
3. Consider switching to on-demand billing
4. Scale up provisioned capacity if needed

## Testing

### Unit Tests

- ✅ Omang hash generation (deterministic, one-way)
- ✅ Risk score calculation (all scenarios)
- ✅ Duplicate detection logic (same-client, cross-client)
- ✅ Storage service (DynamoDB updates)

### Integration Tests

- ⚠️ End-to-end duplicate detection flow
- ⚠️ GSI query performance
- ⚠️ Error handling and retries

### Manual Testing Checklist

- [ ] Create verification with new Omang → No duplicates
- [ ] Create second verification with same Omang, same client → Low risk
- [ ] Create verification with same Omang, different client → High risk
- [ ] Verify manual review flag set correctly
- [ ] Check CloudWatch metrics published
- [ ] Verify audit logs created
- [ ] Test with DynamoDB error (throttling) → Graceful degradation
- [ ] Test with missing Omang → Skip duplicate check

## Future Enhancements

### Phase 2 (Post-MVP)

1. **Machine Learning Risk Model**
   - Train ML model on historical fraud patterns
   - Improve risk scoring accuracy
   - Detect synthetic identity fraud

2. **Real-Time Fraud Network Analysis**
   - Graph database for relationship mapping
   - Detect fraud rings and organized crime
   - Cross-reference with external fraud databases

3. **Biometric Clustering**
   - Group similar biometric profiles
   - Detect multiple Omangs with same face
   - Identify identity theft patterns

4. **Automated Response Actions**
   - Auto-reject critical risk cases
   - Temporary account suspension
   - Fraud team escalation workflow

## References

- [Story 2.4: Duplicate Omang Detection](../../_bmad-output/implementation-artifacts/2-4-duplicate-omang-detection.md)
- [Data Protection Act 2024](https://www.gov.bw/data-protection)
- [FIA AML/KYC Requirements](https://www.fia.org.bw/aml-kyc)
- [DynamoDB Global Secondary Indexes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)

---

**Last Updated**: 2026-01-15
**Version**: 1.0.0
**Author**: AuthBridge Engineering Team
