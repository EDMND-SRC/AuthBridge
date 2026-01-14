import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OcrStorageService } from './ocr-storage';
import { DynamoDBService } from './dynamodb';
import { OcrResult } from '../types/ocr';

vi.mock('./dynamodb');

describe('OcrStorageService', () => {
  let ocrStorageService: OcrStorageService;
  let mockDynamoDBService: any;

  beforeEach(() => {
    mockDynamoDBService = {
      updateItem: vi.fn(),
      getItem: vi.fn(),
    };
    vi.mocked(DynamoDBService).mockImplementation(() => mockDynamoDBService);

    ocrStorageService = new OcrStorageService();
  });

  describe('storeOcrResults', () => {
    it('should update document entity with OCR results', async () => {
      const ocrResult: OcrResult = {
        extractedFields: {
          surname: 'MOGOROSI',
          firstNames: 'KGOSI THABO',
          omangNumber: '123456789',
          dateOfBirth: '15/03/1985',
          sex: 'M',
          dateOfIssue: '15/03/2015',
          dateOfExpiry: '15/03/2025',
        },
        confidence: {
          surname: 99.2,
          firstNames: 98.5,
          omangNumber: 99.8,
          dateOfBirth: 97.3,
          sex: 99.9,
          dateOfIssue: 96.8,
          dateOfExpiry: 97.1,
          overall: 98.4,
        },
        rawTextractResponse: { Blocks: [] },
        extractionMethod: 'pattern',
        processingTimeMs: 4500,
        requiresManualReview: false,
        missingFields: [],
      };

      mockDynamoDBService.updateItem.mockResolvedValue({});

      await ocrStorageService.storeOcrResults(
        'ver_123',
        'doc_456',
        'omang_front',
        ocrResult
      );

      expect(mockDynamoDBService.updateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          Key: {
            PK: 'CASE#ver_123',
            SK: 'DOC#doc_456',
          },
          UpdateExpression: expect.stringContaining('ocrData'),
          ExpressionAttributeValues: expect.objectContaining({
            ':ocrData': expect.objectContaining({
              extractedFields: ocrResult.extractedFields,
              confidence: ocrResult.confidence,
            }),
            ':status': 'processed',
            ':processedAt': expect.any(String),
          }),
        })
      );
    });

    it('should throw error when DynamoDB update fails', async () => {
      const ocrResult: OcrResult = {
        extractedFields: { surname: 'TEST' },
        confidence: { overall: 95 },
        rawTextractResponse: {},
        extractionMethod: 'pattern',
        processingTimeMs: 1000,
        requiresManualReview: false,
        missingFields: [],
      };

      mockDynamoDBService.updateItem.mockRejectedValue(new Error('DynamoDB error'));

      await expect(
        ocrStorageService.storeOcrResults('ver_123', 'doc_456', 'omang_front', ocrResult)
      ).rejects.toThrow('DynamoDB error');
    });

    it('should update verification case with extracted customer data', async () => {
      const ocrResult: OcrResult = {
        extractedFields: {
          surname: 'MOGOROSI',
          firstNames: 'KGOSI THABO',
          omangNumber: '123456789',
          dateOfBirth: '15/03/1985',
          sex: 'M',
          plot: '12345',
          locality: 'GABORONE',
          district: 'SOUTH EAST DISTRICT',
        },
        confidence: {
          overall: 98.4,
        },
        rawTextractResponse: { Blocks: [] },
        extractionMethod: 'pattern',
        processingTimeMs: 4500,
        requiresManualReview: false,
        missingFields: [],
      };

      mockDynamoDBService.updateItem.mockResolvedValue({});

      await ocrStorageService.updateVerificationWithExtractedData(
        'ver_123',
        ocrResult
      );

      expect(mockDynamoDBService.updateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          Key: {
            PK: 'CASE#ver_123',
            SK: 'META',
          },
          UpdateExpression: expect.stringContaining('customerData'),
          ExpressionAttributeValues: expect.objectContaining({
            ':customerData': expect.objectContaining({
              fullName: 'KGOSI THABO MOGOROSI',
              omangNumber: '123456789',
              dateOfBirth: '1985-03-15',
              sex: 'M',
            }),
          }),
        })
      );
    });

    it('should handle missing address fields gracefully', async () => {
      const ocrResult: OcrResult = {
        extractedFields: {
          surname: 'MOGOROSI',
          firstNames: 'KGOSI THABO',
          omangNumber: '123456789',
        },
        confidence: {
          overall: 98.4,
        },
        rawTextractResponse: { Blocks: [] },
        extractionMethod: 'pattern',
        processingTimeMs: 4500,
        requiresManualReview: false,
        missingFields: ['plot', 'locality', 'district'],
      };

      mockDynamoDBService.updateItem.mockResolvedValue({});

      await ocrStorageService.updateVerificationWithExtractedData(
        'ver_123',
        ocrResult
      );

      expect(mockDynamoDBService.updateItem).toHaveBeenCalled();
      const call = mockDynamoDBService.updateItem.mock.calls[0][0];
      expect(call.ExpressionAttributeValues[':customerData'].address).toBeUndefined();
    });

    it('should throw error when verification update fails', async () => {
      const ocrResult: OcrResult = {
        extractedFields: { surname: 'TEST', firstNames: 'USER' },
        confidence: { overall: 95 },
        rawTextractResponse: {},
        extractionMethod: 'pattern',
        processingTimeMs: 1000,
        requiresManualReview: false,
        missingFields: [],
      };

      mockDynamoDBService.updateItem.mockRejectedValue(new Error('DynamoDB connection failed'));

      await expect(
        ocrStorageService.updateVerificationWithExtractedData('ver_123', ocrResult)
      ).rejects.toThrow('DynamoDB connection failed');
    });
  });

  describe('date conversion', () => {
    it('should convert DD/MM/YYYY to ISO 8601 format', async () => {
      const ocrResult: OcrResult = {
        extractedFields: {
          surname: 'TEST',
          firstNames: 'USER',
          dateOfBirth: '01/12/1990',
          dateOfExpiry: '31/01/2030',
        },
        confidence: { overall: 95 },
        rawTextractResponse: {},
        extractionMethod: 'pattern',
        processingTimeMs: 1000,
        requiresManualReview: false,
        missingFields: [],
      };

      mockDynamoDBService.updateItem.mockResolvedValue({});

      await ocrStorageService.updateVerificationWithExtractedData('ver_123', ocrResult);

      const call = mockDynamoDBService.updateItem.mock.calls[0][0];
      expect(call.ExpressionAttributeValues[':customerData'].dateOfBirth).toBe('1990-12-01');
      expect(call.ExpressionAttributeValues[':customerData'].documentExpiry).toBe('2030-01-31');
    });

    it('should handle single digit day and month', async () => {
      const ocrResult: OcrResult = {
        extractedFields: {
          surname: 'TEST',
          firstNames: 'USER',
          dateOfBirth: '5/3/1985',
        },
        confidence: { overall: 95 },
        rawTextractResponse: {},
        extractionMethod: 'pattern',
        processingTimeMs: 1000,
        requiresManualReview: false,
        missingFields: [],
      };

      mockDynamoDBService.updateItem.mockResolvedValue({});

      await ocrStorageService.updateVerificationWithExtractedData('ver_123', ocrResult);

      const call = mockDynamoDBService.updateItem.mock.calls[0][0];
      expect(call.ExpressionAttributeValues[':customerData'].dateOfBirth).toBe('1985-03-05');
    });
  });

  describe('partial field updates', () => {
    it('should handle OCR result with only surname', async () => {
      const ocrResult: OcrResult = {
        extractedFields: {
          surname: 'MOGOROSI',
        },
        confidence: { overall: 75 },
        rawTextractResponse: {},
        extractionMethod: 'pattern',
        processingTimeMs: 1000,
        requiresManualReview: true,
        missingFields: ['firstNames', 'omangNumber', 'dateOfBirth'],
      };

      mockDynamoDBService.updateItem.mockResolvedValue({});

      await ocrStorageService.updateVerificationWithExtractedData('ver_123', ocrResult);

      const call = mockDynamoDBService.updateItem.mock.calls[0][0];
      const customerData = call.ExpressionAttributeValues[':customerData'];

      expect(customerData.fullName).toBeUndefined(); // Needs both surname and firstNames
      expect(customerData.omangNumber).toBeUndefined();
      expect(customerData.dateOfBirth).toBeUndefined();
      expect(customerData.extractionConfidence).toBe(75);
    });

    it('should handle empty extracted fields', async () => {
      const ocrResult: OcrResult = {
        extractedFields: {},
        confidence: { overall: 0 },
        rawTextractResponse: {},
        extractionMethod: 'pattern',
        processingTimeMs: 500,
        requiresManualReview: true,
        missingFields: ['surname', 'firstNames', 'omangNumber', 'dateOfBirth'],
      };

      mockDynamoDBService.updateItem.mockResolvedValue({});

      await ocrStorageService.updateVerificationWithExtractedData('ver_123', ocrResult);

      const call = mockDynamoDBService.updateItem.mock.calls[0][0];
      const customerData = call.ExpressionAttributeValues[':customerData'];

      expect(customerData.extractionConfidence).toBe(0);
      expect(customerData.extractedAt).toBeDefined();
    });
  });
});

