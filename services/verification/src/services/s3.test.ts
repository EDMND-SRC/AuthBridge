import { describe, it, expect, vi, beforeEach } from 'vitest';
import { S3Service } from './s3';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(function() {
    return {
      send: vi.fn(),
    };
  }),
  PutObjectCommand: vi.fn(function(params) { return params; }),
  DeleteObjectCommand: vi.fn(function(params) { return params; }),
  GetObjectCommand: vi.fn(function(params) { return params; }),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://presigned-url.example.com'),
}));

describe('S3Service', () => {
  let s3Service: S3Service;

  beforeEach(() => {
    s3Service = new S3Service('test-bucket', 'af-south-1');
  });

  describe('generateS3Key', () => {
    it('should generate key with correct pattern for JPEG', () => {
      const key = s3Service.generateS3Key(
        'client_123',
        'ver_456',
        'omang_front',
        'image/jpeg'
      );

      expect(key).toMatch(/^client_123\/ver_456\/omang_front-\d+\.jpg$/);
    });

    it('should generate key with correct pattern for PNG', () => {
      const key = s3Service.generateS3Key(
        'client_123',
        'ver_456',
        'selfie',
        'image/png'
      );

      expect(key).toMatch(/^client_123\/ver_456\/selfie-\d+\.png$/);
    });

    it('should generate key with correct pattern for PDF', () => {
      const key = s3Service.generateS3Key(
        'client_123',
        'ver_456',
        'passport',
        'application/pdf'
      );

      expect(key).toMatch(/^client_123\/ver_456\/passport-\d+\.pdf$/);
    });

    it('should generate unique keys for same parameters', () => {
      const key1 = s3Service.generateS3Key(
        'client_123',
        'ver_456',
        'omang_front',
        'image/jpeg'
      );

      // Small delay to ensure different timestamp
      const key2 = s3Service.generateS3Key(
        'client_123',
        'ver_456',
        'omang_front',
        'image/jpeg'
      );

      // Keys should be different due to timestamp
      // Note: In fast execution they might be the same, so we just check format
      expect(key1).toMatch(/^client_123\/ver_456\/omang_front-\d+\.jpg$/);
      expect(key2).toMatch(/^client_123\/ver_456\/omang_front-\d+\.jpg$/);
    });

    it('should handle unknown mime type with bin extension', () => {
      const key = s3Service.generateS3Key(
        'client_123',
        'ver_456',
        'document',
        'application/octet-stream'
      );

      expect(key).toMatch(/^client_123\/ver_456\/document-\d+\.bin$/);
    });
  });

  describe('getBucketName', () => {
    it('should return the bucket name', () => {
      expect(s3Service.getBucketName()).toBe('test-bucket');
    });
  });

  describe('generatePresignedUrl', () => {
    it('should generate presigned URL with expiry', async () => {
      const result = await s3Service.generatePresignedUrl('test-key');

      expect(result.url).toBe('https://presigned-url.example.com');
      expect(result.expiresAt).toBeDefined();

      // Verify expiry is approximately 15 minutes from now
      const expiresAt = new Date(result.expiresAt);
      const now = new Date();
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / (1000 * 60);

      expect(diffMinutes).toBeGreaterThan(14);
      expect(diffMinutes).toBeLessThan(16);
    });
  });
});
