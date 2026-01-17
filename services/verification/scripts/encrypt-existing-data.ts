/**
 * Migration Script: Encrypt Existing Unencrypted Data
 *
 * This script scans all verification cases in DynamoDB and encrypts
 * any unencrypted sensitive fields (address, idNumber, dateOfBirth, phoneNumber).
 *
 * Usage:
 *   AWS_REGION=af-south-1 DATA_ENCRYPTION_KEY_ID=<key-id> ts-node scripts/encrypt-existing-data.ts
 *
 * Safety:
 *   - Detects already encrypted data (base64 format)
 *   - Dry-run mode available
 *   - Batch processing with progress tracking
 */

/**
 * Migration Script: Encrypt Existing Data
 *
 * Encrypts unencrypted PII fields in existing DynamoDB records.
 *
 * Usage:
 *   # Dry-run mode (preview changes without modifying data)
 *   DRY_RUN=true npm run migrate:encrypt
 *
 *   # Production mode (actually encrypt data)
 *   npm run migrate:encrypt
 *
 * Environment Variables:
 *   - DRY_RUN: Set to 'true' to preview changes without modifying data
 *   - AWS_REGION: AWS region (default: af-south-1)
 *   - TABLE_NAME: DynamoDB table name (default: AuthBridgeTable)
 *   - DATA_ENCRYPTION_KEY_ID: KMS key ID for encryption
 */

import { DynamoDBClient, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { EncryptionService } from '../src/services/encryption';

const DRY_RUN = process.env.DRY_RUN === 'true';
const TABLE_NAME = process.env.TABLE_NAME || 'AuthBridgeTable';
const AWS_REGION = process.env.AWS_REGION || 'af-south-1';

interface MigrationStats {
  scanned: number;
  encrypted: number;
  skipped: number;
  errors: number;
}

async function migrateExistingData() {
  const client = new DynamoDBClient({ region: AWS_REGION });
  const encryption = new EncryptionService();

  const stats: MigrationStats = {
    scanned: 0,
    encrypted: 0,
    skipped: 0,
    errors: 0,
  };

  console.log(`Starting migration (DRY_RUN: ${DRY_RUN})...`);
  console.log(`Table: ${TABLE_NAME}, Region: ${AWS_REGION}\n`);

  let lastKey: any = undefined;

  do {
    const response = await client.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk',
      ExpressionAttributeValues: {
        ':prefix': { S: 'CASE#' },
        ':sk': { S: 'META' },
      },
      ExclusiveStartKey: lastKey,
    }));

    for (const item of response.Items || []) {
      stats.scanned++;

      const verificationId = item.PK?.S?.replace('CASE#', '') || 'unknown';
      const extractedData = item.extractedData?.M;

      if (!extractedData) {
        stats.skipped++;
        continue;
      }

      let needsUpdate = false;
      const updates: Record<string, any> = {};

      // Check and encrypt address
      const address = extractedData.address?.S;
      if (address && !isBase64(address)) {
        needsUpdate = true;
        updates.address = await encryption.encryptField(address, 3, verificationId, 'address');
        console.log(`  [${verificationId}] Encrypting address`);
      }

      // Check and encrypt idNumber
      const idNumber = extractedData.idNumber?.S;
      if (idNumber && !isBase64(idNumber)) {
        needsUpdate = true;

        // Hash for GSI2PK (duplicate detection)
        const hash = encryption.hashField(idNumber);
        updates.GSI2PK = `OMANG#${hash}`;

        // Encrypt for storage
        updates.idNumber = await encryption.encryptField(idNumber, 3, verificationId, 'idNumber');
        console.log(`  [${verificationId}] Encrypting idNumber and updating GSI2PK`);
      }

      // Check and encrypt dateOfBirth
      const dateOfBirth = extractedData.dateOfBirth?.S;
      if (dateOfBirth && !isBase64(dateOfBirth)) {
        needsUpdate = true;
        updates.dateOfBirth = await encryption.encryptField(dateOfBirth, 3, verificationId, 'dateOfBirth');
        console.log(`  [${verificationId}] Encrypting dateOfBirth`);
      }

      // Check and encrypt phoneNumber
      const phoneNumber = extractedData.phoneNumber?.S;
      if (phoneNumber && !isBase64(phoneNumber)) {
        needsUpdate = true;
        updates.phoneNumber = await encryption.encryptField(phoneNumber, 3, verificationId, 'phoneNumber');
        console.log(`  [${verificationId}] Encrypting phoneNumber`);
      }

      if (needsUpdate) {
        if (!DRY_RUN) {
          try {
            // Build update expression
            const updateExpressions: string[] = [];
            const expressionAttributeValues: Record<string, any> = {};
            const expressionAttributeNames: Record<string, string> = {};

            if (updates.address) {
              updateExpressions.push('extractedData.#address = :address');
              expressionAttributeNames['#address'] = 'address';
              expressionAttributeValues[':address'] = { S: updates.address };
            }

            if (updates.idNumber) {
              updateExpressions.push('extractedData.#idNumber = :idNumber');
              expressionAttributeNames['#idNumber'] = 'idNumber';
              expressionAttributeValues[':idNumber'] = { S: updates.idNumber };
            }

            if (updates.dateOfBirth) {
              updateExpressions.push('extractedData.#dateOfBirth = :dateOfBirth');
              expressionAttributeNames['#dateOfBirth'] = 'dateOfBirth';
              expressionAttributeValues[':dateOfBirth'] = { S: updates.dateOfBirth };
            }

            if (updates.phoneNumber) {
              updateExpressions.push('extractedData.#phoneNumber = :phoneNumber');
              expressionAttributeNames['#phoneNumber'] = 'phoneNumber';
              expressionAttributeValues[':phoneNumber'] = { S: updates.phoneNumber };
            }

            if (updates.GSI2PK) {
              updateExpressions.push('GSI2PK = :gsi2pk');
              expressionAttributeValues[':gsi2pk'] = { S: updates.GSI2PK };
            }

            await client.send(new UpdateItemCommand({
              TableName: TABLE_NAME,
              Key: { PK: item.PK, SK: item.SK },
              UpdateExpression: `SET ${updateExpressions.join(', ')}`,
              ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
              ExpressionAttributeValues: expressionAttributeValues,
            }));

            stats.encrypted++;
          } catch (error) {
            console.error(`  [${verificationId}] ERROR:`, error);
            stats.errors++;
          }
        } else {
          stats.encrypted++;
        }
      } else {
        stats.skipped++;
      }

      // Progress update every 100 items
      if (stats.scanned % 100 === 0) {
        console.log(`\nProgress: ${stats.scanned} scanned, ${stats.encrypted} encrypted, ${stats.skipped} skipped, ${stats.errors} errors\n`);
      }
    }

    lastKey = response.LastEvaluatedKey;
  } while (lastKey);

  console.log('\n=== Migration Complete ===');
  console.log(`Total scanned: ${stats.scanned}`);
  console.log(`Encrypted: ${stats.encrypted}`);
  console.log(`Skipped (already encrypted): ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No changes were made');
    console.log('Run with DRY_RUN=false to apply changes');
  }
}

/**
 * Check if string is base64 encoded (heuristic)
 */
function isBase64(str: string): boolean {
  if (!str || str.length === 0) return false;

  // Base64 strings are typically longer and contain only valid base64 chars
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;

  // Must be valid base64 format
  if (!base64Regex.test(str)) return false;

  // Must be at least 20 chars (encrypted data is typically longer)
  if (str.length < 20) return false;

  try {
    // Try to decode - if it fails, not base64
    Buffer.from(str, 'base64').toString('base64');
    return true;
  } catch {
    return false;
  }
}

// Run migration
migrateExistingData().catch(console.error);
