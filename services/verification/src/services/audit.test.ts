import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditService } from './audit';
import { mockClient } from 'aws-sdk-client-mock';
import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogStreamCommand } from '@aws-sdk/client-cloudwatch-logs';

const cloudwatchLogsMock = mockClient(CloudWatchLogsClient);

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(() => {
    cloudwatchLogsMock.reset();
    service = new AuditService();
  });

  describe('logEvent', () => {
    it('creates audit log entry with all fields', async () => {
      cloudwatchLogsMock.on(CreateLogStreamCommand).resolves({});
      cloudwatchLogsMock.on(PutLogEventsCommand).resolves({});

      const entry = await service.logEvent({
        action: 'DATA_ENCRYPTED',
        resourceId: 'CASE#123',
        resourceType: 'field',
        fieldName: 'omangNumber',
        status: 'success',
        metadata: { test: 'value' },
      });

      expect(entry.eventId).toBeDefined();
      expect(entry.timestamp).toBeDefined();
      expect(entry.action).toBe('DATA_ENCRYPTED');
      expect(entry.resourceId).toBe('CASE#123');
      expect(entry.fieldName).toBe('omangNumber');
      expect(entry.status).toBe('success');
      expect(entry.metadata).toEqual({ test: 'value' });
    });

    it('logs to CloudWatch Logs', async () => {
      cloudwatchLogsMock.on(CreateLogStreamCommand).resolves({});
      cloudwatchLogsMock.on(PutLogEventsCommand).resolves({});

      await service.logEvent({
        action: 'DATA_ENCRYPTED',
        resourceId: 'CASE#123',
        status: 'success',
      });

      expect(cloudwatchLogsMock.calls()).toHaveLength(2); // CreateLogStream + PutLogEvents
    });

    it('handles CloudWatch errors gracefully', async () => {
      cloudwatchLogsMock.on(CreateLogStreamCommand).rejects(new Error('CloudWatch error'));

      // Should not throw
      const entry = await service.logEvent({
        action: 'DATA_ENCRYPTED',
        resourceId: 'CASE#123',
        status: 'success',
      });

      expect(entry).toBeDefined();
    });
  });

  describe('logEncryption', () => {
    it('logs successful encryption', async () => {
      cloudwatchLogsMock.on(CreateLogStreamCommand).resolves({});
      cloudwatchLogsMock.on(PutLogEventsCommand).resolves({});

      await service.logEncryption('CASE#123', 'omangNumber', true);

      const calls = cloudwatchLogsMock.calls();
      const putLogCall = calls.find(call => call.args[0].input.logEvents);
      expect(putLogCall).toBeDefined();

      const logMessage = JSON.parse(putLogCall!.args[0].input.logEvents[0].message);
      expect(logMessage.action).toBe('DATA_ENCRYPTED');
      expect(logMessage.status).toBe('success');
    });

    it('logs failed encryption', async () => {
      cloudwatchLogsMock.on(CreateLogStreamCommand).resolves({});
      cloudwatchLogsMock.on(PutLogEventsCommand).resolves({});

      await service.logEncryption('CASE#123', 'omangNumber', false, 'KMS_ERROR');

      const calls = cloudwatchLogsMock.calls();
      const putLogCall = calls.find(call => call.args[0].input.logEvents);

      const logMessage = JSON.parse(putLogCall!.args[0].input.logEvents[0].message);
      expect(logMessage.status).toBe('failure');
      expect(logMessage.errorCode).toBe('KMS_ERROR');
    });
  });

  describe('logDecryption', () => {
    it('logs successful decryption with cache hit', async () => {
      cloudwatchLogsMock.on(CreateLogStreamCommand).resolves({});
      cloudwatchLogsMock.on(PutLogEventsCommand).resolves({});

      await service.logDecryption('CASE#123', 'omangNumber', true, true);

      const calls = cloudwatchLogsMock.calls();
      const putLogCall = calls.find(call => call.args[0].input.logEvents);

      const logMessage = JSON.parse(putLogCall!.args[0].input.logEvents[0].message);
      expect(logMessage.action).toBe('DATA_DECRYPTED');
      expect(logMessage.metadata.cacheHit).toBe(true);
    });

    it('logs successful decryption without cache hit', async () => {
      cloudwatchLogsMock.on(CreateLogStreamCommand).resolves({});
      cloudwatchLogsMock.on(PutLogEventsCommand).resolves({});

      await service.logDecryption('CASE#123', 'omangNumber', true, false);

      const calls = cloudwatchLogsMock.calls();
      const putLogCall = calls.find(call => call.args[0].input.logEvents);

      const logMessage = JSON.parse(putLogCall!.args[0].input.logEvents[0].message);
      expect(logMessage.metadata.cacheHit).toBe(false);
    });
  });

  describe('logEncryptionError', () => {
    it('logs encryption error with details', async () => {
      cloudwatchLogsMock.on(CreateLogStreamCommand).resolves({});
      cloudwatchLogsMock.on(PutLogEventsCommand).resolves({});

      await service.logEncryptionError('CASE#123', 'omangNumber', 'ThrottlingException', 'Rate exceeded');

      const calls = cloudwatchLogsMock.calls();
      const putLogCall = calls.find(call => call.args[0].input.logEvents);

      const logMessage = JSON.parse(putLogCall!.args[0].input.logEvents[0].message);
      expect(logMessage.action).toBe('ENCRYPTION_ERROR');
      expect(logMessage.errorCode).toBe('ThrottlingException');
      expect(logMessage.metadata.errorMessage).toBe('Rate exceeded');
    });
  });

  describe('logDecryptionError', () => {
    it('logs decryption error with details', async () => {
      cloudwatchLogsMock.on(CreateLogStreamCommand).resolves({});
      cloudwatchLogsMock.on(PutLogEventsCommand).resolves({});

      await service.logDecryptionError('CASE#123', 'omangNumber', 'InvalidCiphertext', 'Decryption failed');

      const calls = cloudwatchLogsMock.calls();
      const putLogCall = calls.find(call => call.args[0].input.logEvents);

      const logMessage = JSON.parse(putLogCall!.args[0].input.logEvents[0].message);
      expect(logMessage.action).toBe('DECRYPTION_ERROR');
      expect(logMessage.errorCode).toBe('InvalidCiphertext');
    });
  });

  describe('logCacheCleared', () => {
    it('logs cache clear for specific entry', async () => {
      cloudwatchLogsMock.on(CreateLogStreamCommand).resolves({});
      cloudwatchLogsMock.on(PutLogEventsCommand).resolves({});

      await service.logCacheCleared('cipher123');

      const calls = cloudwatchLogsMock.calls();
      const putLogCall = calls.find(call => call.args[0].input.logEvents);

      const logMessage = JSON.parse(putLogCall!.args[0].input.logEvents[0].message);
      expect(logMessage.action).toBe('CACHE_CLEARED');
      expect(logMessage.resourceType).toBe('field');
    });

    it('logs cache clear for all entries', async () => {
      cloudwatchLogsMock.on(CreateLogStreamCommand).resolves({});
      cloudwatchLogsMock.on(PutLogEventsCommand).resolves({});

      await service.logCacheCleared();

      const calls = cloudwatchLogsMock.calls();
      const putLogCall = calls.find(call => call.args[0].input.logEvents);

      const logMessage = JSON.parse(putLogCall!.args[0].input.logEvents[0].message);
      expect(logMessage.resourceType).toBe('all');
    });
  });

  describe('logKmsKeyAccess', () => {
    it('logs successful KMS key access', async () => {
      cloudwatchLogsMock.on(CreateLogStreamCommand).resolves({});
      cloudwatchLogsMock.on(PutLogEventsCommand).resolves({});

      await service.logKmsKeyAccess('key-123', 'encrypt', true);

      const calls = cloudwatchLogsMock.calls();
      const putLogCall = calls.find(call => call.args[0].input.logEvents);

      const logMessage = JSON.parse(putLogCall!.args[0].input.logEvents[0].message);
      expect(logMessage.action).toBe('KMS_KEY_ACCESSED');
      expect(logMessage.resourceId).toBe('key-123');
      expect(logMessage.metadata.operation).toBe('encrypt');
    });
  });
});
