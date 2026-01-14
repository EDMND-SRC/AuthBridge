import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentService } from './document';
import type { DynamoDBService } from './dynamodb';
import type { S3Service } from './s3';
import type { VerificationEntity } from '../types/verification';

describe('DocumentService', () => {
  let documentService: DocumentService;
  let mockDb: DynamoDBService;
  let mockS3: S3Service;

  const mockVerification: VerificationEntity = {
    PK: 'CASE#ver_123',
    SK: 'META',
    verificationId: 'ver_123',
    clientId: 'client_456',
    status: 'created',
    documentType: 'omang',
    customerMetadata: {},
    createdAt: '2026-01-14T10:00:00Z',
    updatedAt: '2026-01-14T10:00:00Z',
    expiresAt: '2026-02-13T10:00:00Z',
    ttl: 1739527200,
    GSI1PK: 'CLIENT#client_456',
    GSI1SK: 'created#2026-01-14T10:00:00Z',
    GSI2PK: 'DATE#2026-01-14',
    GSI2SK: '2026-01-14T10:00:00Z#ver_123',
  };

  beforeEach(() => {
    mockDb = {
      putDocument: vi.fn().mockResolvedValue(undefined),
      getDocument: vi.fn().mockResolvedValue(null),
      queryDocuments: vi.fn().mockResolvedValue([]),
    } as unknown as DynamoDBService;

    mockS3 = {
      generateS3Key: vi.fn().mockReturnValue('client_456/ver_123/omang_front-1234567890.jpg'),
      uploadDocument: vi.fn().mockResolvedValue(undefined),
      generatePresignedUrl: vi.fn().mockResolvedValue({
        url: 'https://presigned-url.example.com',
        expiresAt: '2026-01-14T10:15:00Z',
      }),
      deleteDocument: vi.fn().mockResolvedValue(undefined),
      getBucketName: vi.fn().mockReturnValue('test-bucket'),
    } as unknown as S3Service;

    documentService = new DocumentService(mockDb, mockS3);
  });

  describe('generateDocumentId', () => {
    it('should generate ID with doc_ prefix', () => {
      const id = documentService.generateDocumentId();
      expect(id).toMatch(/^doc_[a-f0-9]{32}$/);
    });

    it('should generate unique IDs', () => {
      const id1 = documentService.generateDocumentId();
      const id2 = documentService.generateDocumentId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('uploadDocument', () => {
    it('should upload document and return response', async () => {
      const imageData = Buffer.from('test-image-data');

      const result = await documentService.uploadDocument(
        mockVerification,
        'omang_front',
        imageData,
        'image/jpeg',
        { captureMethod: 'camera', deviceType: 'mobile' },
        'req_123'
      );

      expect(result.documentId).toMatch(/^doc_/);
      expect(result.verificationId).toBe('ver_123');
      expect(result.documentType).toBe('omang_front');
      expect(result.s3Key).toBe('client_456/ver_123/omang_front-1234567890.jpg');
      expect(result.fileSize).toBe(imageData.length);
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.status).toBe('uploaded');
      expect(result.presignedUrl).toBe('https://presigned-url.example.com');
      expect(result.presignedUrlExpiresAt).toBe('2026-01-14T10:15:00Z');
      expect(result.meta.requestId).toBe('req_123');
    });

    it('should call S3 upload with correct parameters', async () => {
      const imageData = Buffer.from('test-image-data');

      await documentService.uploadDocument(
        mockVerification,
        'omang_front',
        imageData,
        'image/jpeg'
      );

      expect(mockS3.uploadDocument).toHaveBeenCalledWith(
        'client_456/ver_123/omang_front-1234567890.jpg',
        imageData,
        'image/jpeg',
        expect.objectContaining({
          verificationId: 'ver_123',
          documentType: 'omang_front',
        })
      );
    });

    it('should store document in DynamoDB', async () => {
      const imageData = Buffer.from('test-image-data');

      await documentService.uploadDocument(
        mockVerification,
        'omang_front',
        imageData,
        'image/jpeg'
      );

      expect(mockDb.putDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          PK: 'CASE#ver_123',
          SK: expect.stringMatching(/^DOC#doc_/),
          verificationId: 'ver_123',
          documentType: 'omang_front',
          s3Bucket: 'test-bucket',
          fileSize: imageData.length,
          mimeType: 'image/jpeg',
          status: 'uploaded',
        })
      );
    });

    it('should cleanup S3 on DynamoDB failure', async () => {
      const imageData = Buffer.from('test-image-data');
      mockDb.putDocument = vi.fn().mockRejectedValue(new Error('DynamoDB error'));

      await expect(
        documentService.uploadDocument(
          mockVerification,
          'omang_front',
          imageData,
          'image/jpeg'
        )
      ).rejects.toThrow('DynamoDB error');

      expect(mockS3.deleteDocument).toHaveBeenCalledWith(
        'client_456/ver_123/omang_front-1234567890.jpg'
      );
    });
  });

  describe('getDocument', () => {
    it('should return document when found', async () => {
      const mockDocument = {
        PK: 'CASE#ver_123',
        SK: 'DOC#doc_456',
        documentId: 'doc_456',
        verificationId: 'ver_123',
        documentType: 'omang_front',
        s3Key: 'test-key',
        s3Bucket: 'test-bucket',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        uploadedAt: '2026-01-14T10:00:00Z',
        status: 'uploaded',
      };

      mockDb.getDocument = vi.fn().mockResolvedValue(mockDocument);

      const result = await documentService.getDocument('ver_123', 'doc_456');
      expect(result).toEqual(mockDocument);
    });

    it('should return null when not found', async () => {
      mockDb.getDocument = vi.fn().mockResolvedValue(null);

      const result = await documentService.getDocument('ver_123', 'doc_456');
      expect(result).toBeNull();
    });
  });

  describe('listDocuments', () => {
    it('should return list of documents', async () => {
      const mockDocuments = [
        { documentId: 'doc_1', documentType: 'omang_front' },
        { documentId: 'doc_2', documentType: 'omang_back' },
      ];

      mockDb.queryDocuments = vi.fn().mockResolvedValue(mockDocuments);

      const result = await documentService.listDocuments('ver_123');
      expect(result).toEqual(mockDocuments);
    });

    it('should return empty array when no documents', async () => {
      mockDb.queryDocuments = vi.fn().mockResolvedValue([]);

      const result = await documentService.listDocuments('ver_123');
      expect(result).toEqual([]);
    });
  });

  describe('countDocuments', () => {
    it('should return document count', async () => {
      mockDb.queryDocuments = vi.fn().mockResolvedValue([
        { documentId: 'doc_1' },
        { documentId: 'doc_2' },
        { documentId: 'doc_3' },
      ]);

      const count = await documentService.countDocuments('ver_123');
      expect(count).toBe(3);
    });

    it('should return 0 when no documents', async () => {
      mockDb.queryDocuments = vi.fn().mockResolvedValue([]);

      const count = await documentService.countDocuments('ver_123');
      expect(count).toBe(0);
    });
  });
});
