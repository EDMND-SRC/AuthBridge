import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TextractService } from './textract';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';

vi.mock('@aws-sdk/client-textract');

describe('TextractService', () => {
  let textractService: TextractService;
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSend = vi.fn();
    vi.mocked(TextractClient).mockImplementation(() => ({
      send: mockSend,
    }) as any);

    textractService = new TextractService();
  });

  describe('detectDocumentText', () => {
    it('should call Textract with correct S3 parameters', async () => {
      const mockResponse = {
        DocumentMetadata: { Pages: 1 },
        Blocks: [
          {
            BlockType: 'PAGE',
            Id: '1',
            Confidence: 99.5,
          },
          {
            BlockType: 'LINE',
            Id: '2',
            Text: 'SURNAME: MOGOROSI',
            Confidence: 99.2,
          },
        ],
      };

      mockSend.mockResolvedValue(mockResponse);

      const result = await textractService.detectDocumentText(
        'test-bucket',
        'test-key.jpg'
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(DetectDocumentTextCommand)
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle Textract API errors', async () => {
      mockSend.mockRejectedValue(new Error('ProvisionedThroughputExceededException'));

      await expect(
        textractService.detectDocumentText('test-bucket', 'test-key.jpg')
      ).rejects.toThrow('ProvisionedThroughputExceededException');
    });

    it('should use af-south-1 region', () => {
      expect(TextractClient).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'af-south-1',
        })
      );
    });
  });

  describe('detectDocumentTextWithRetry', () => {
    it('should retry on throttling errors', async () => {
      const mockResponse = {
        DocumentMetadata: { Pages: 1 },
        Blocks: [],
      };

      mockSend
        .mockRejectedValueOnce(new Error('ProvisionedThroughputExceededException'))
        .mockResolvedValueOnce(mockResponse);

      const result = await textractService.detectDocumentTextWithRetry(
        'test-bucket',
        'test-key.jpg'
      );

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockResponse);
    });

    it('should fail after max retries', async () => {
      mockSend.mockRejectedValue(new Error('ProvisionedThroughputExceededException'));

      await expect(
        textractService.detectDocumentTextWithRetry('test-bucket', 'test-key.jpg')
      ).rejects.toThrow('ProvisionedThroughputExceededException');

      expect(mockSend).toHaveBeenCalledTimes(4); // Initial + 3 retries
    }, 10000); // 10s timeout to account for exponential backoff (1s + 2s + 4s)

    it('should not retry on non-retryable errors', async () => {
      mockSend.mockRejectedValue(new Error('InvalidS3ObjectException'));

      await expect(
        textractService.detectDocumentTextWithRetry('test-bucket', 'test-key.jpg')
      ).rejects.toThrow('InvalidS3ObjectException');

      expect(mockSend).toHaveBeenCalledTimes(1); // No retries
    });
  });
});
