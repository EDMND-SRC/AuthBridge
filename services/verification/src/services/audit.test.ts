import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditService } from './audit';
import { mockClient } from 'aws-sdk-client-mock';
import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogStreamCommand } from '@aws-sdk/client-cloudwatch-logs';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const cloudwatchLogsMock = mockClient(CloudWatchLogsClient);
const dynamodbMock = mockClient(DynamoDBClient);

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(() => {
    cloudwatchLogsMock.reset();
    dynamodbMock.reset();
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

  describe('Case Management Actions', () => {
    beforeEach(() => {
      cloudwatchLogsMock.on(CreateLogStreamCommand).resolves({});
      cloudwatchLogsMock.on(PutLogEventsCommand).resolves({});
      dynamodbMock.on(PutItemCommand).resolves({});
    });

    describe('logCaseCreated', () => {
      it('logs case creation with user and IP', async () => {
        await service.logCaseCreated('CASE#123', 'USER#analyst', '41.190.1.1', { documentType: 'omang' });

        expect(dynamodbMock.calls()).toHaveLength(1);
        const call = dynamodbMock.calls()[0];
        const item = unmarshall(call.args[0].input.Item);

        expect(item.action).toBe('CASE_CREATED');
        expect(item.userId).toBe('USER#analyst');
        expect(item.resourceId).toBe('CASE#123');
        expect(item.resourceType).toBe('case');
        expect(item.ipAddress).toBe('41.190.1.1');
        expect(item.status).toBe('success');
        expect(item.metadata.documentType).toBe('omang');
      });
    });

    describe('logCaseApproved', () => {
      it('logs case approval with reason', async () => {
        await service.logCaseApproved('CASE#123', 'USER#analyst', '41.190.1.1', 'All documents verified');

        const call = dynamodbMock.calls()[0];
        const item = unmarshall(call.args[0].input.Item);

        expect(item.action).toBe('CASE_APPROVED');
        expect(item.userId).toBe('USER#analyst');
        expect(item.resourceId).toBe('CASE#123');
        expect(item.ipAddress).toBe('41.190.1.1');
        expect(item.metadata.reason).toBe('All documents verified');
      });
    });

    describe('logCaseRejected', () => {
      it('logs case rejection with reason', async () => {
        await service.logCaseRejected('CASE#123', 'USER#analyst', '41.190.1.1', 'Blurry document image');

        const call = dynamodbMock.calls()[0];
        const item = unmarshall(call.args[0].input.Item);

        expect(item.action).toBe('CASE_REJECTED');
        expect(item.metadata.reason).toBe('Blurry document image');
      });
    });

    describe('logCaseAssigned', () => {
      it('logs case assignment to analyst', async () => {
        await service.logCaseAssigned('CASE#123', 'USER#admin', '41.190.1.1', 'USER#analyst');

        const call = dynamodbMock.calls()[0];
        const item = unmarshall(call.args[0].input.Item);

        expect(item.action).toBe('CASE_ASSIGNED');
        expect(item.userId).toBe('USER#admin');
        expect(item.metadata.assignedTo).toBe('USER#analyst');
      });
    });

    describe('logCaseNoteAdded', () => {
      it('logs note addition to case', async () => {
        await service.logCaseNoteAdded('CASE#123', 'USER#analyst', '41.190.1.1', 'NOTE#456');

        const call = dynamodbMock.calls()[0];
        const item = unmarshall(call.args[0].input.Item);

        expect(item.action).toBe('CASE_NOTE_ADDED');
        expect(item.metadata.noteId).toBe('NOTE#456');
      });
    });
  });

  describe('User Management Actions', () => {
    beforeEach(() => {
      cloudwatchLogsMock.on(CreateLogStreamCommand).resolves({});
      cloudwatchLogsMock.on(PutLogEventsCommand).resolves({});
      dynamodbMock.on(PutItemCommand).resolves({});
    });

    describe('logUserLogin', () => {
      it('logs user login with IP and user agent', async () => {
        await service.logUserLogin('USER#123', '41.190.1.1', 'Mozilla/5.0');

        const call = dynamodbMock.calls()[0];
        const item = unmarshall(call.args[0].input.Item);

        expect(item.action).toBe('USER_LOGIN');
        expect(item.userId).toBe('USER#123');
        expect(item.ipAddress).toBe('41.190.1.1');
        expect(item.userAgent).toBe('Mozilla/5.0');
      });
    });

    describe('logUserLogout', () => {
      it('logs user logout', async () => {
        await service.logUserLogout('USER#123', '41.190.1.1');

        const call = dynamodbMock.calls()[0];
        const item = unmarshall(call.args[0].input.Item);

        expect(item.action).toBe('USER_LOGOUT');
        expect(item.userId).toBe('USER#123');
      });
    });

    describe('logUserRoleChanged', () => {
      it('logs role change with old and new roles', async () => {
        await service.logUserRoleChanged('USER#target', 'USER#admin', '41.190.1.1', 'analyst', 'admin');

        const call = dynamodbMock.calls()[0];
        const item = unmarshall(call.args[0].input.Item);

        expect(item.action).toBe('USER_ROLE_CHANGED');
        expect(item.userId).toBe('USER#admin');
        expect(item.resourceId).toBe('USER#target');
        expect(item.metadata.oldRole).toBe('analyst');
        expect(item.metadata.newRole).toBe('admin');
      });
    });
  });

  describe('Document Management Actions', () => {
    beforeEach(() => {
      cloudwatchLogsMock.on(CreateLogStreamCommand).resolves({});
      cloudwatchLogsMock.on(PutLogEventsCommand).resolves({});
      dynamodbMock.on(PutItemCommand).resolves({});
    });

    describe('logDocumentUploaded', () => {
      it('logs document upload', async () => {
        await service.logDocumentUploaded('DOC#123', 'CASE#456', 'USER#analyst', '41.190.1.1');

        const call = dynamodbMock.calls()[0];
        const item = unmarshall(call.args[0].input.Item);

        expect(item.action).toBe('DOCUMENT_UPLOADED');
        expect(item.resourceId).toBe('DOC#123');
        expect(item.resourceType).toBe('document');
        expect(item.metadata.caseId).toBe('CASE#456');
      });
    });

    describe('logDocumentViewed', () => {
      it('logs document view', async () => {
        await service.logDocumentViewed('DOC#123', 'USER#analyst', '41.190.1.1');

        const call = dynamodbMock.calls()[0];
        const item = unmarshall(call.args[0].input.Item);

        expect(item.action).toBe('DOCUMENT_VIEWED');
        expect(item.resourceId).toBe('DOC#123');
      });
    });

    describe('logOcrCompleted', () => {
      it('logs successful OCR extraction', async () => {
        await service.logOcrCompleted('DOC#123', 'CASE#456', { fieldsExtracted: 10 });

        const call = dynamodbMock.calls()[0];
        const item = unmarshall(call.args[0].input.Item);

        expect(item.action).toBe('OCR_COMPLETED');
        expect(item.status).toBe('success');
        expect(item.metadata.fieldsExtracted).toBe(10);
      });
    });

    describe('logOcrFailed', () => {
      it('logs failed OCR extraction', async () => {
        await service.logOcrFailed('DOC#123', 'CASE#456', 'TEXTRACT_ERROR', 'Textract throttled');

        const call = dynamodbMock.calls()[0];
        const item = unmarshall(call.args[0].input.Item);

        expect(item.action).toBe('OCR_FAILED');
        expect(item.status).toBe('failure');
        expect(item.errorCode).toBe('TEXTRACT_ERROR');
      });
    });

    describe('logBiometricMatchRun', () => {
      it('logs biometric face matching', async () => {
        await service.logBiometricMatchRun('CASE#123', 'DOC#selfie', 'DOC#omang', true, 95.5);

        const call = dynamodbMock.calls()[0];
        const item = unmarshall(call.args[0].input.Item);

        expect(item.action).toBe('BIOMETRIC_MATCH_RUN');
        expect(item.metadata.similarity).toBe(95.5);
        expect(item.metadata.matched).toBe(true);
      });
    });
  });

  describe('Webhook Management Actions', () => {
    beforeEach(() => {
      cloudwatchLogsMock.on(CreateLogStreamCommand).resolves({});
      cloudwatchLogsMock.on(PutLogEventsCommand).resolves({});
      dynamodbMock.on(PutItemCommand).resolves({});
    });

    describe('logWebhookConfigured', () => {
      it('logs webhook configuration', async () => {
        await service.logWebhookConfigured('WEBHOOK#123', 'USER#admin', '41.190.1.1', 'https://example.com/webhook');

        const call = dynamodbMock.calls()[0];
        const item = unmarshall(call.args[0].input.Item);

        expect(item.action).toBe('WEBHOOK_CONFIGURED');
        expect(item.metadata.url).toBe('https://example.com/webhook');
      });
    });

    describe('logWebhookSent', () => {
      it('logs successful webhook delivery', async () => {
        await service.logWebhookSent('WEBHOOK#123', 'CASE#456', 'success', 200);

        const call = dynamodbMock.calls()[0];
        const item = unmarshall(call.args[0].input.Item);

        expect(item.action).toBe('WEBHOOK_SENT');
        expect(item.status).toBe('success');
        expect(item.metadata.statusCode).toBe(200);
      });

      it('logs failed webhook delivery', async () => {
        await service.logWebhookSent('WEBHOOK#123', 'CASE#456', 'failure', 500);

        const call = dynamodbMock.calls()[0];
        const item = unmarshall(call.args[0].input.Item);

        expect(item.status).toBe('failure');
        expect(item.metadata.statusCode).toBe(500);
      });
    });
  });

  describe('API Key Management Actions', () => {
    beforeEach(() => {
      cloudwatchLogsMock.on(CreateLogStreamCommand).resolves({});
      cloudwatchLogsMock.on(PutLogEventsCommand).resolves({});
      dynamodbMock.on(PutItemCommand).resolves({});
    });

    describe('logApiKeyUsed', () => {
      it('logs API key usage', async () => {
        await service.logApiKeyUsed('KEY#123', 'CLIENT#acme', '41.190.1.1', '/api/v1/verification');

        const call = dynamodbMock.calls()[0];
        const item = unmarshall(call.args[0].input.Item);

        expect(item.action).toBe('API_KEY_USED');
        expect(item.clientId).toBe('CLIENT#acme');
        expect(item.metadata.endpoint).toBe('/api/v1/verification');
      });
    });
  });

  describe('System Events', () => {
    beforeEach(() => {
      cloudwatchLogsMock.on(CreateLogStreamCommand).resolves({});
      cloudwatchLogsMock.on(PutLogEventsCommand).resolves({});
      dynamodbMock.on(PutItemCommand).resolves({});
    });

    describe('logUnauthorizedAccess', () => {
      it('logs unauthorized access attempt', async () => {
        await service.logUnauthorizedAccess(null, '41.190.1.1', '/api/v1/cases', 'Invalid token');

        const call = dynamodbMock.calls()[0];
        const item = unmarshall(call.args[0].input.Item);

        expect(item.action).toBe('UNAUTHORIZED_ACCESS');
        expect(item.status).toBe('failure');
        expect(item.metadata.reason).toBe('Invalid token');
      });
    });

    describe('logPermissionDenied', () => {
      it('logs permission denied', async () => {
        await service.logPermissionDenied('USER#analyst', '41.190.1.1', 'CASE#123', 'delete');

        const call = dynamodbMock.calls()[0];
        const item = unmarshall(call.args[0].input.Item);

        expect(item.action).toBe('PERMISSION_DENIED');
        expect(item.metadata.resource).toBe('CASE#123');
        expect(item.metadata.action).toBe('delete');
      });
    });
  });
});

