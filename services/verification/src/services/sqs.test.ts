import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SqsService } from './sqs';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

vi.mock('@aws-sdk/client-sqs');

describe('SqsService', () => {
  let sqsService: SqsService;
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend = vi.fn().mockResolvedValue({});
    vi.mocked(SQSClient).mockImplementation(() => ({
      send: mockSend,
    }) as any);
  });

  describe('sendOcrMessage', () => {
    it('should send message to SQS queue', async () => {
      sqsService = new SqsService('https://sqs.af-south-1.amazonaws.com/123456789/test-queue');

      const message = {
        verificationId: 'ver_123',
        documentId: 'doc_456',
        s3Bucket: 'test-bucket',
        s3Key: 'client_abc/ver_123/omang_front.jpg',
        documentType: 'omang_front',
      };

      await sqsService.sendOcrMessage(message);

      expect(mockSend).toHaveBeenCalledWith(expect.any(SendMessageCommand));
    });

    it('should throw error when queue URL is not configured', async () => {
      sqsService = new SqsService('');

      const message = {
        verificationId: 'ver_123',
        documentId: 'doc_456',
        s3Bucket: 'test-bucket',
        s3Key: 'test-key.jpg',
        documentType: 'omang_front',
      };

      await expect(sqsService.sendOcrMessage(message)).rejects.toThrow(
        'OCR_QUEUE_URL is not configured'
      );
    });

    it('should propagate SQS errors', async () => {
      sqsService = new SqsService('https://sqs.af-south-1.amazonaws.com/123456789/test-queue');
      mockSend.mockRejectedValue(new Error('SQS SendMessage failed'));

      const message = {
        verificationId: 'ver_123',
        documentId: 'doc_456',
        s3Bucket: 'test-bucket',
        s3Key: 'test-key.jpg',
        documentType: 'omang_front',
      };

      await expect(sqsService.sendOcrMessage(message)).rejects.toThrow('SQS SendMessage failed');
    });

    it('should serialize message body as JSON', async () => {
      sqsService = new SqsService('https://sqs.af-south-1.amazonaws.com/123456789/test-queue');

      const message = {
        verificationId: 'ver_123',
        documentId: 'doc_456',
        s3Bucket: 'test-bucket',
        s3Key: 'client_abc/ver_123/omang_front.jpg',
        documentType: 'omang_front',
      };

      await sqsService.sendOcrMessage(message);

      // Verify SendMessageCommand was called with correct parameters
      expect(SendMessageCommand).toHaveBeenCalledWith({
        QueueUrl: 'https://sqs.af-south-1.amazonaws.com/123456789/test-queue',
        MessageBody: JSON.stringify(message),
      });
    });

    it('should use af-south-1 region by default', () => {
      sqsService = new SqsService('https://sqs.af-south-1.amazonaws.com/123456789/test-queue');

      expect(SQSClient).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'af-south-1',
        })
      );
    });
  });
});
