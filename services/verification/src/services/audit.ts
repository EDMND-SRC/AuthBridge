/**
 * Audit Logging Service for Verification Service
 * DPA 2024 Compliance: 5-year retention, immutable audit trail for encryption operations
 */

import { randomUUID } from 'crypto';
import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogStreamCommand } from '@aws-sdk/client-cloudwatch-logs';
import type { AuditLogEntry, AuditAction, CreateAuditEntryInput } from '../types/audit';

export class AuditService {
  private cloudwatchLogs: CloudWatchLogsClient;
  private logGroupName: string;
  private logStreamName: string;

  constructor() {
    this.cloudwatchLogs = new CloudWatchLogsClient({ region: process.env.AWS_REGION || 'af-south-1' });
    this.logGroupName = `/aws/lambda/authbridge-verification-${process.env.STAGE || 'staging'}`;
    this.logStreamName = `audit-${new Date().toISOString().split('T')[0]}`;
  }

  async logEvent(input: CreateAuditEntryInput): Promise<AuditLogEntry> {
    const now = new Date();
    const eventId = randomUUID();

    const entry: AuditLogEntry = {
      eventId,
      timestamp: now.toISOString(),
      date: now.toISOString().split('T')[0],
      action: input.action,
      resourceId: input.resourceId || null,
      resourceType: input.resourceType || null,
      fieldName: input.fieldName || null,
      status: input.status,
      errorCode: input.errorCode || null,
      metadata: input.metadata || {},
    };

    // Log to CloudWatch Logs for audit trail
    await this.logToCloudWatch(entry);

    return entry;
  }

  private async logToCloudWatch(entry: AuditLogEntry): Promise<void> {
    try {
      // Ensure log stream exists (idempotent)
      try {
        await this.cloudwatchLogs.send(
          new CreateLogStreamCommand({
            logGroupName: this.logGroupName,
            logStreamName: this.logStreamName,
          })
        );
      } catch (error: any) {
        // Ignore if stream already exists
        if (error.name !== 'ResourceAlreadyExistsException') {
          throw error;
        }
      }

      // Write audit log entry
      await this.cloudwatchLogs.send(
        new PutLogEventsCommand({
          logGroupName: this.logGroupName,
          logStreamName: this.logStreamName,
          logEvents: [
            {
              timestamp: Date.now(),
              message: JSON.stringify(entry),
            },
          ],
        })
      );
    } catch (error) {
      // Don't fail encryption operations if audit logging fails
      console.error('Failed to write audit log:', error);
    }
  }

  // Encryption events
  async logEncryption(
    resourceId: string,
    fieldName: string,
    success: boolean,
    errorCode?: string
  ): Promise<void> {
    await this.logEvent({
      action: 'DATA_ENCRYPTED',
      resourceId,
      resourceType: 'field',
      fieldName,
      status: success ? 'success' : 'failure',
      errorCode,
    });
  }

  async logDecryption(
    resourceId: string,
    fieldName: string,
    success: boolean,
    cacheHit: boolean = false,
    errorCode?: string
  ): Promise<void> {
    await this.logEvent({
      action: 'DATA_DECRYPTED',
      resourceId,
      resourceType: 'field',
      fieldName,
      status: success ? 'success' : 'failure',
      errorCode,
      metadata: { cacheHit },
    });
  }

  async logEncryptionError(
    resourceId: string,
    fieldName: string,
    errorCode: string,
    errorMessage: string
  ): Promise<void> {
    await this.logEvent({
      action: 'ENCRYPTION_ERROR',
      resourceId,
      resourceType: 'field',
      fieldName,
      status: 'failure',
      errorCode,
      metadata: { errorMessage },
    });
  }

  async logDecryptionError(
    resourceId: string,
    fieldName: string,
    errorCode: string,
    errorMessage: string
  ): Promise<void> {
    await this.logEvent({
      action: 'DECRYPTION_ERROR',
      resourceId,
      resourceType: 'field',
      fieldName,
      status: 'failure',
      errorCode,
      metadata: { errorMessage },
    });
  }

  async logCacheCleared(resourceId?: string): Promise<void> {
    await this.logEvent({
      action: 'CACHE_CLEARED',
      resourceId,
      resourceType: resourceId ? 'field' : 'all',
      status: 'success',
    });
  }

  async logKmsKeyAccess(keyId: string, operation: 'encrypt' | 'decrypt', success: boolean): Promise<void> {
    await this.logEvent({
      action: 'KMS_KEY_ACCESSED',
      resourceId: keyId,
      resourceType: 'kms_key',
      status: success ? 'success' : 'failure',
      metadata: { operation },
    });
  }
}

// Re-export types for convenience
export type { AuditLogEntry, AuditAction, CreateAuditEntryInput } from '../types/audit';
