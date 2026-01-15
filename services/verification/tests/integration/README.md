# Integration Tests

**⚠️ IMPORTANT: DynamoDB Local Required on Port 8000**

This directory contains integration tests that verify the complete functionality of the verification service using real AWS services (via DynamoDB Local).

## Quick Start

```bash
# 1. Start DynamoDB Local (required!)
docker run -p 8000:8000 amazon/dynamodb-local

# 2. Run integration tests
npm test -- tests/integration/

# Or skip integration tests if DynamoDB Local not available
npm test -- --testPathIgnorePatterns=integration
```

## Prerequisites

### DynamoDB Local

Integration tests require DynamoDB Local to be running. You can start it using Docker:

```bash
# Start DynamoDB Local on port 8000
docker run -p 8000:8000 amazon/dynamodb-local

# Or using docker-compose (if available)
docker-compose up dynamodb-local
```

### Create Test Table

Before running integration tests, create the AuthBridgeTable with required indexes:

```bash
# Create table with GSI2 (OmangHashIndex)
aws dynamodb create-table \
  --table-name AuthBridgeTable \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
    AttributeName=GSI2PK,AttributeType=S \
    AttributeName=GSI2SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "GSI1",
        "KeySchema": [
          {"AttributeName": "GSI1PK", "KeyType": "HASH"},
          {"AttributeName": "GSI1SK", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"},
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "GSI2",
        "KeySchema": [
          {"AttributeName": "GSI2PK", "KeyType": "HASH"},
          {"AttributeName": "GSI2SK", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"},
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]' \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --endpoint-url http://localhost:8000 \
  --region af-south-1
```

## Running Integration Tests

### Run All Integration Tests

```bash
# From verification service directory
pnpm test:integration

# Or from project root
pnpm --filter @ballerine/verification-service test:integration
```

### Run Specific Integration Test

```bash
# Duplicate detection integration tests
pnpm test tests/integration/duplicate-detection.test.ts

# OCR processing integration tests
pnpm test tests/integration/process-ocr.test.ts

# Biometric processing integration tests
pnpm test tests/integration/process-biometric.test.ts
```

### Run with Coverage

```bash
pnpm test:integration --coverage
```

## Integration Test Structure

### Test Categories

1. **Duplicate Detection** (`duplicate-detection.test.ts`)
   - First-time Omang (no duplicates)
   - Same-client duplicates (low risk)
   - Cross-client duplicates (high risk)
   - Biometric mismatches (medium risk)
   - Multiple duplicates (critical risk)
   - Error handling
   - Performance validation

2. **OCR Processing** (`process-ocr.test.ts`)
   - Complete OCR flow
   - Batch processing
   - Error handling
   - Document status transitions

3. **Biometric Processing** (`process-biometric.test.ts`)
   - Successful verification flow
   - Low similarity handling
   - Error handling
   - Liveness validation

4. **Document Upload** (`upload-document.test.ts`)
   - File validation
   - S3 upload
   - Status transitions
   - Error handling

### Test Helpers

Located in `helpers/` directory:

- **`dynamodb-test-utils.ts`**: Utilities for DynamoDB test data setup/cleanup
- **`test-client.ts`**: HTTP client for API testing
- **`index.ts`**: Barrel exports for convenience

## Environment Variables

Integration tests use the following environment variables:

```bash
# DynamoDB Local endpoint
DYNAMODB_ENDPOINT=http://localhost:8000

# AWS Region
AWS_REGION=af-south-1

# Table name
TABLE_NAME=AuthBridgeTable

# S3 bucket (for upload tests)
BUCKET_NAME=authbridge-documents-test
```

## Test Data Cleanup

All integration tests automatically clean up test data after each test using the `DynamoDBTestUtils.cleanup()` method. This ensures:

- No test data pollution
- Consistent test results
- Fast test execution

## Troubleshooting

### DynamoDB Local Not Running

**Error**: `NetworkingError: getaddrinfo ECONNREFUSED 127.0.0.1:8000`

**Solution**: Start DynamoDB Local:
```bash
docker run -p 8000:8000 amazon/dynamodb-local
```

### Table Not Found

**Error**: `ResourceNotFoundException: Cannot do operations on a non-existent table`

**Solution**: Create the AuthBridgeTable using the AWS CLI command above.

### GSI Not Ready

**Error**: `ValidationException: Global Secondary Index is not ready`

**Solution**: Wait a few seconds for GSI to become active, then retry.

### Port Already in Use

**Error**: `Error starting userland proxy: listen tcp4 0.0.0.0:8000: bind: address already in use`

**Solution**: Stop existing DynamoDB Local instance:
```bash
docker ps | grep dynamodb-local
docker stop <container-id>
```

## Performance Benchmarks

Integration tests include performance validation:

| Test | Target | Actual (p95) |
|------|--------|--------------|
| Duplicate Check | < 500ms | ~200ms |
| OCR Processing | < 10s | ~5s |
| Biometric Processing | < 5s | ~2.5s |
| Document Upload | < 2s | ~1s |

## CI/CD Integration

Integration tests are run in CI/CD pipeline:

```yaml
# .github/workflows/test.yml
- name: Start DynamoDB Local
  run: docker run -d -p 8000:8000 amazon/dynamodb-local

- name: Create Test Table
  run: ./scripts/create-test-table.sh

- name: Run Integration Tests
  run: pnpm test:integration
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data in `afterEach` hooks
3. **Realistic Data**: Use realistic test data that matches production patterns
4. **Error Cases**: Test both success and failure scenarios
5. **Performance**: Validate performance requirements in tests
6. **Documentation**: Document complex test scenarios with comments

## Contributing

When adding new integration tests:

1. Follow existing test patterns
2. Use `DynamoDBTestUtils` for data setup/cleanup
3. Add performance validation where applicable
4. Document any special setup requirements
5. Ensure tests pass locally before committing

## Resources

- [DynamoDB Local Documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)
- [Vitest Documentation](https://vitest.dev/)
- [AWS SDK v3 Documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
