import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OmangOcrService } from './omang-ocr';
import { TextractService } from './textract';

vi.mock('./textract');

describe('OmangOcrService', () => {
  let ocrService: OmangOcrService;
  let mockTextractService: any;

  beforeEach(() => {
    mockTextractService = {
      detectDocumentTextWithRetry: vi.fn(),
    };
    vi.mocked(TextractService).mockImplementation(() => mockTextractService);

    ocrService = new OmangOcrService();
  });

  describe('extractOmangFront', () => {
    it('should extract all fields from clear Omang front image', async () => {
      const mockTextractResponse = {
        Blocks: [
          { BlockType: 'LINE', Id: '1', Text: 'SURNAME: MOGOROSI', Confidence: 99.2 },
          { BlockType: 'LINE', Id: '2', Text: 'FIRST NAMES: KGOSI THABO', Confidence: 98.5 },
          { BlockType: 'LINE', Id: '3', Text: 'OMANG NO: 123456789', Confidence: 99.8 },
          { BlockType: 'LINE', Id: '4', Text: 'DATE OF BIRTH: 15/03/1985', Confidence: 97.3 },
          { BlockType: 'LINE', Id: '5', Text: 'SEX: M', Confidence: 99.9 },
          { BlockType: 'LINE', Id: '6', Text: 'DATE OF ISSUE: 15/03/2015', Confidence: 96.8 },
          { BlockType: 'LINE', Id: '7', Text: 'DATE OF EXPIRY: 15/03/2025', Confidence: 97.1 },
        ],
      };

      mockTextractService.detectDocumentTextWithRetry.mockResolvedValue(mockTextractResponse);

      const result = await ocrService.extractOmangFront('test-bucket', 'test-key.jpg');

      expect(result.extractedFields.surname).toBe('MOGOROSI');
      expect(result.extractedFields.firstNames).toBe('KGOSI THABO');
      expect(result.extractedFields.omangNumber).toBe('123456789');
      expect(result.extractedFields.dateOfBirth).toBe('15/03/1985');
      expect(result.extractedFields.sex).toBe('M');
      expect(result.confidence.overall).toBeGreaterThan(95);
      expect(result.requiresManualReview).toBe(false);
      expect(result.extractionMethod).toBe('pattern');
    });

    it('should flag low confidence extractions for manual review', async () => {
      const mockTextractResponse = {
        Blocks: [
          { BlockType: 'LINE', Id: '1', Text: 'SURNAME: MOGOROSI', Confidence: 75.0 },
          { BlockType: 'LINE', Id: '2', Text: 'OMANG NO: 123456789', Confidence: 70.0 },
        ],
      };

      mockTextractService.detectDocumentTextWithRetry.mockResolvedValue(mockTextractResponse);

      const result = await ocrService.extractOmangFront('test-bucket', 'test-key.jpg');

      expect(result.confidence.overall).toBeLessThan(80);
      expect(result.requiresManualReview).toBe(true);
    });

    it('should identify missing fields', async () => {
      const mockTextractResponse = {
        Blocks: [
          { BlockType: 'LINE', Id: '1', Text: 'SURNAME: MOGOROSI', Confidence: 99.2 },
          { BlockType: 'LINE', Id: '2', Text: 'OMANG NO: 123456789', Confidence: 99.8 },
        ],
      };

      mockTextractService.detectDocumentTextWithRetry.mockResolvedValue(mockTextractResponse);

      const result = await ocrService.extractOmangFront('test-bucket', 'test-key.jpg');

      expect(result.missingFields).toContain('firstNames');
      expect(result.missingFields).toContain('dateOfBirth');
    });

    it('should include raw Textract response', async () => {
      const mockTextractResponse = {
        Blocks: [
          { BlockType: 'LINE', Id: '1', Text: 'SURNAME: MOGOROSI', Confidence: 99.2 },
        ],
      };

      mockTextractService.detectDocumentTextWithRetry.mockResolvedValue(mockTextractResponse);

      const result = await ocrService.extractOmangFront('test-bucket', 'test-key.jpg');

      expect(result.rawTextractResponse).toEqual(mockTextractResponse);
    });

    it('should measure processing time', async () => {
      const mockTextractResponse = {
        Blocks: [
          { BlockType: 'LINE', Id: '1', Text: 'SURNAME: MOGOROSI', Confidence: 99.2 },
        ],
      };

      mockTextractService.detectDocumentTextWithRetry.mockResolvedValue(mockTextractResponse);

      const result = await ocrService.extractOmangFront('test-bucket', 'test-key.jpg');

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('extractOmangBack', () => {
    it('should extract address fields from back side', async () => {
      const mockTextractResponse = {
        Blocks: [
          { BlockType: 'LINE', Id: '1', Text: 'ADDRESS:', Confidence: 99.0 },
          { BlockType: 'LINE', Id: '2', Text: 'PLOT 12345', Confidence: 98.5 },
          { BlockType: 'LINE', Id: '3', Text: 'GABORONE', Confidence: 99.2 },
          { BlockType: 'LINE', Id: '4', Text: 'SOUTH EAST DISTRICT', Confidence: 97.8 },
        ],
      };

      mockTextractService.detectDocumentTextWithRetry.mockResolvedValue(mockTextractResponse);

      const result = await ocrService.extractOmangBack('test-bucket', 'test-key.jpg');

      expect(result.extractedFields.plot).toBe('12345');
      expect(result.extractedFields.locality).toBe('GABORONE');
      expect(result.extractedFields.district).toBe('SOUTH EAST DISTRICT');
    });
  });
});
