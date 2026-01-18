import { describe, it, expect } from 'vitest';
import type {
  DataRequestType,
  DataRequestStatus,
  SubjectIdentifierType,
  SubjectIdentifier,
  DataRequestEntity,
  CreateDataRequestInput,
  ExportData,
  DeletionQueueItem,
} from './data-request';

describe('Data Request Types', () => {
  describe('DataRequestType', () => {
    it('should allow export type', () => {
      const type: DataRequestType = 'export';
      expect(type).toBe('export');
    });

    it('should allow deletion type', () => {
      const type: DataRequestType = 'deletion';
      expect(type).toBe('deletion');
    });
  });

  describe('DataRequestStatus', () => {
    it('should allow all valid statuses', () => {
      const statuses: DataRequestStatus[] = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
      statuses.forEach(status => {
        expect(['pending', 'processing', 'completed', 'failed', 'cancelled']).toContain(status);
      });
    });
  });

  describe('SubjectIdentifierType', () => {
    it('should allow email type', () => {
      const type: SubjectIdentifierType = 'email';
      expect(type).toBe('email');
    });

    it('should allow omangNumber type', () => {
      const type: SubjectIdentifierType = 'omangNumber';
      expect(type).toBe('omangNumber');
    });

    it('should allow verificationId type', () => {
      const type: SubjectIdentifierType = 'verificationId';
      expect(type).toBe('verificationId');
    });
  });

  describe('SubjectIdentifier', () => {
    it('should create valid subject identifier with email', () => {
      const identifier: SubjectIdentifier = {
        type: 'email',
        value: 'john@example.com',
      };
      expect(identifier.type).toBe('email');
      expect(identifier.value).toBe('john@example.com');
    });

    it('should create valid subject identifier with omangNumber', () => {
      const identifier: SubjectIdentifier = {
        type: 'omangNumber',
        value: '123456789',
      };
      expect(identifier.type).toBe('omangNumber');
      expect(identifier.value).toBe('123456789');
    });
  });

  describe('DataRequestEntity', () => {
    it('should create valid export request entity', () => {
      const entity: DataRequestEntity = {
        PK: 'DSR#dsr_abc123',
        SK: 'META',
        GSI1PK: 'SUBJECT#john@example.com',
        GSI1SK: '2026-01-18T00:00:00Z#dsr_abc123',
        requestId: 'dsr_abc123',
        type: 'export',
        status: 'pending',
        subjectIdentifier: {
          type: 'email',
          value: 'john@example.com',
        },
        requestedBy: 'CLIENT#acme-corp',
        createdAt: '2026-01-18T00:00:00Z',
        updatedAt: '2026-01-18T00:00:00Z',
        ttl: 1739793600,
      };

      expect(entity.type).toBe('export');
      expect(entity.status).toBe('pending');
      expect(entity.requestId).toBe('dsr_abc123');
    });

    it('should create valid deletion request entity with scheduled date', () => {
      const entity: DataRequestEntity = {
        PK: 'DSR#dsr_def456',
        SK: 'META',
        GSI1PK: 'SUBJECT#john@example.com',
        GSI1SK: '2026-01-18T00:00:00Z#dsr_def456',
        requestId: 'dsr_def456',
        type: 'deletion',
        status: 'pending',
        subjectIdentifier: {
          type: 'email',
          value: 'john@example.com',
        },
        requestedBy: 'CLIENT#acme-corp',
        reason: 'user_request',
        scheduledDeletionDate: '2026-02-17T00:00:00Z',
        createdAt: '2026-01-18T00:00:00Z',
        updatedAt: '2026-01-18T00:00:00Z',
        ttl: 1739793600,
      };

      expect(entity.type).toBe('deletion');
      expect(entity.scheduledDeletionDate).toBeDefined();
      expect(entity.reason).toBe('user_request');
    });
  });

  describe('CreateDataRequestInput', () => {
    it('should create valid export request input', () => {
      const input: CreateDataRequestInput = {
        type: 'export',
        subjectIdentifier: {
          type: 'email',
          value: 'john@example.com',
        },
        requestedBy: 'CLIENT#acme-corp',
        notificationEmail: 'john@example.com',
      };

      expect(input.type).toBe('export');
      expect(input.notificationEmail).toBe('john@example.com');
    });

    it('should create valid deletion request input', () => {
      const input: CreateDataRequestInput = {
        type: 'deletion',
        subjectIdentifier: {
          type: 'omangNumber',
          value: '123456789',
        },
        requestedBy: 'CLIENT#acme-corp',
        reason: 'user_request',
        confirmDeletion: true,
      };

      expect(input.type).toBe('deletion');
      expect(input.confirmDeletion).toBe(true);
      expect(input.reason).toBe('user_request');
    });
  });

  describe('ExportData', () => {
    it('should create valid export data structure', () => {
      const exportData: ExportData = {
        exportMetadata: {
          exportId: 'dsr_abc123',
          exportedAt: '2026-01-18T00:00:00Z',
          subjectIdentifier: 'john@example.com',
          dataCategories: ['verifications', 'documents', 'auditLogs'],
        },
        personalData: {
          email: 'john@example.com',
          name: 'John Doe',
          phone: '+26771234567',
        },
        verifications: [
          {
            verificationId: 'ver_123',
            status: 'approved',
            documentType: 'omang',
            createdAt: '2026-01-17T00:00:00Z',
            completedAt: '2026-01-17T00:05:00Z',
            extractedData: { fullName: 'John Doe' },
            biometricScore: 0.95,
            documents: [
              {
                documentId: 'doc_456',
                documentType: 'omang-front',
                downloadUrl: 'https://presigned-url.example.com',
                uploadedAt: '2026-01-17T00:00:00Z',
              },
            ],
          },
        ],
        auditLogs: [
          {
            timestamp: '2026-01-17T00:00:00Z',
            action: 'CASE_CREATED',
            details: { verificationId: 'ver_123' },
          },
        ],
      };

      expect(exportData.exportMetadata.dataCategories).toHaveLength(3);
      expect(exportData.verifications).toHaveLength(1);
      expect(exportData.auditLogs).toHaveLength(1);
    });
  });

  describe('DeletionQueueItem', () => {
    it('should create valid deletion queue item', () => {
      const queueItem: DeletionQueueItem = {
        PK: 'DELETION_QUEUE#2026-02-17',
        SK: '2026-02-17T02:00:00Z#dsr_def456',
        requestId: 'dsr_def456',
        subjectIdentifier: {
          type: 'email',
          value: 'john@example.com',
        },
        itemsToDelete: [
          {
            type: 'dynamodb',
            pk: 'CASE#ver_123',
            sk: 'META',
          },
          {
            type: 's3',
            bucket: 'authbridge-documents-staging',
            key: 'client1/ver_123/omang-front.jpg',
          },
        ],
        status: 'pending',
        createdAt: '2026-01-18T00:00:00Z',
      };

      expect(queueItem.itemsToDelete).toHaveLength(2);
      expect(queueItem.itemsToDelete[0].type).toBe('dynamodb');
      expect(queueItem.itemsToDelete[1].type).toBe('s3');
    });
  });
});
