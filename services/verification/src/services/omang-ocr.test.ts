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
          { BlockType: 'LINE', Id: '1', Text: 'SURNAME: MOEPSWA', Confidence: 99.2 },
          { BlockType: 'LINE', Id: '2', Text: 'FORENAMES: MOTLOTLEGI EDMOND P', Confidence: 98.5 },
          { BlockType: 'LINE', Id: '3', Text: 'ID NUMBER: 059016012', Confidence: 99.8 },
          { BlockType: 'LINE', Id: '4', Text: 'DATE OF BIRTH: 25/08/1994', Confidence: 97.3 },
          { BlockType: 'LINE', Id: '5', Text: 'PLACE OF BIRTH: FRANCISTOWN', Confidence: 96.5 },
        ],
      };

      mockTextractService.detectDocumentTextWithRetry.mockResolvedValue(mockTextractResponse);

      const result = await ocrService.extractOmangFront('test-bucket', 'test-key.jpg');

      expect(result.extractedFields.surname).toBe('MOEPSWA');
      expect(result.extractedFields.forenames).toBe('MOTLOTLEGI EDMOND P');
      expect(result.extractedFields.idNumber).toBe('059016012');
      expect(result.extractedFields.dateOfBirth).toBe('25/08/1994');
      expect(result.extractedFields.placeOfBirth).toBe('FRANCISTOWN');
      expect(result.confidence.overall).toBeGreaterThan(95);
      expect(result.requiresManualReview).toBe(false);
      expect(result.extractionMethod).toBe('pattern');
    });

    it('should flag low confidence extractions for manual review', async () => {
      const mockTextractResponse = {
        Blocks: [
          { BlockType: 'LINE', Id: '1', Text: 'SURNAME: MOEPSWA', Confidence: 75.0 },
          { BlockType: 'LINE', Id: '2', Text: 'ID NUMBER: 059016012', Confidence: 70.0 },
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
          { BlockType: 'LINE', Id: '1', Text: 'SURNAME: MOEPSWA', Confidence: 99.2 },
          { BlockType: 'LINE', Id: '2', Text: 'ID NUMBER: 059016012', Confidence: 99.8 },
        ],
      };

      mockTextractService.detectDocumentTextWithRetry.mockResolvedValue(mockTextractResponse);

      const result = await ocrService.extractOmangFront('test-bucket', 'test-key.jpg');

      expect(result.missingFields).toContain('forenames');
      expect(result.missingFields).toContain('dateOfBirth');
    });

    it('should include raw Textract response', async () => {
      const mockTextractResponse = {
        Blocks: [
          { BlockType: 'LINE', Id: '1', Text: 'SURNAME: MOEPSWA', Confidence: 99.2 },
        ],
      };

      mockTextractService.detectDocumentTextWithRetry.mockResolvedValue(mockTextractResponse);

      const result = await ocrService.extractOmangFront('test-bucket', 'test-key.jpg');

      expect(result.rawTextractResponse).toEqual(mockTextractResponse);
    });

    it('should measure processing time', async () => {
      const mockTextractResponse = {
        Blocks: [
          { BlockType: 'LINE', Id: '1', Text: 'SURNAME: MOEPSWA', Confidence: 99.2 },
        ],
      };

      mockTextractService.detectDocumentTextWithRetry.mockResolvedValue(mockTextractResponse);

      const result = await ocrService.extractOmangFront('test-bucket', 'test-key.jpg');

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('extractOmangBack', () => {
    it('should extract all back side fields', async () => {
      const mockTextractResponse = {
        Blocks: [
          { BlockType: 'LINE', Id: '1', Text: 'NATIONALITY: MOTSWANA', Confidence: 99.0 },
          { BlockType: 'LINE', Id: '2', Text: 'SEX: M', Confidence: 99.5 },
          { BlockType: 'LINE', Id: '3', Text: 'COLOUR OF EYES: BROWN', Confidence: 98.2 },
          { BlockType: 'LINE', Id: '4', Text: 'DATE OF EXPIRY: 22/05/2032', Confidence: 97.8 },
          { BlockType: 'LINE', Id: '5', Text: 'PLACE OF APPLICATION: GABORONE', Confidence: 96.5 },
        ],
      };

      mockTextractService.detectDocumentTextWithRetry.mockResolvedValue(mockTextractResponse);

      const result = await ocrService.extractOmangBack('test-bucket', 'test-key.jpg');

      expect(result.extractedFields.nationality).toBe('MOTSWANA');
      expect(result.extractedFields.sex).toBe('M');
      expect(result.extractedFields.colourOfEyes).toBe('BROWN');
      expect(result.extractedFields.dateOfExpiry).toBe('22/05/2032');
      expect(result.extractedFields.placeOfApplication).toBe('GABORONE');
    });

    it('should extract address fields from back side', async () => {
      const mockTextractResponse = {
        Blocks: [
          { BlockType: 'LINE', Id: '1', Text: 'NATIONALITY: MOTSWANA', Confidence: 99.0 },
          { BlockType: 'LINE', Id: '2', Text: 'SEX: M', Confidence: 99.5 },
          { BlockType: 'LINE', Id: '3', Text: 'DATE OF EXPIRY: 22/05/2032', Confidence: 97.8 },
          { BlockType: 'LINE', Id: '4', Text: 'PLOT 12345', Confidence: 98.5 },
          { BlockType: 'LINE', Id: '5', Text: 'SOUTH EAST DISTRICT', Confidence: 97.8 },
        ],
      };

      mockTextractService.detectDocumentTextWithRetry.mockResolvedValue(mockTextractResponse);

      const result = await ocrService.extractOmangBack('test-bucket', 'test-key.jpg');

      expect(result.extractedFields.plot).toBe('12345');
      expect(result.extractedFields.district).toBe('SOUTH EAST DISTRICT');
    });
  });
});
