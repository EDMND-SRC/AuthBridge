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
          surname: 'MOEPSWA',
          forenames: 'MOTLOTLEGI EDMOND P',
          idNumber: '059016012',
          dateOfBirth: '25/08/1994',
          placeOfBirth: 'FRANCISTOWN',
        },
        confidence: {
          surname: 99.2,
          forenames: 98.5,
          idNumber: 99.8,
          dateOfBirth: 97.3,
          placeOfBirth: 96.5,
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

    it('should store validation result and set status to validated', async () => {
      const ocrResult: OcrResult = {
        extractedFields: {
          surname: 'MOEPSWA',
          idNumber: '059016012',
          dateOfExpiry: '22/05/2032',
        },
        confidence: { overall: 98.5 },
        rawTextractResponse: {},
        extractionMethod: 'pattern',
        processingTimeMs: 4500,
        requiresManualReview: false,
        missingFields: [],
      };

      const validationResult = {
        omangNumber: { valid: true, format: 'valid' as const, value: '059016012' },
        expiry: { valid: true, expired: false, daysUntilExpiry: 2300 },
        overall: { valid: true, errors: [], warnings: [] },
        validatedAt: '2026-01-15T10:00:00Z',
      };

      mockDynamoDBService.updateItem.mockResolvedValue({});

      await ocrStorageService.storeOcrResults(
        'ver_123',
        'doc_456',
        'omang_front',
        ocrResult,
        null,
        validationResult
      );

      expect(mockDynamoDBService.updateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          ExpressionAttributeValues: expect.objectContaining({
            ':ocrData': expect.objectContaining({
              validation: expect.objectContaining({
                omangNumber: validationResult.omangNumber,
                expiry: validationResult.expiry,
                overall: validationResult.overall,
              }),
            }),
            ':status': 'validated',
          }),
        })
      );
    });

    it('should set status to validation_failed when validation fails', async () => {
      const ocrResult: OcrResult = {
        extractedFields: {
          surname: 'MOEPSWA',
          idNumber: '12345678', // Invalid
          dateOfExpiry: '22/05/2032',
        },
        confidence: { overall: 98.5 },
        rawTextractResponse: {},
        extractionMethod: 'pattern',
        processingTimeMs: 4500,
        requiresManualReview: true,
        missingFields: [],
      };

      const validationResult = {
        omangNumber: { valid: false, format: 'invalid' as const, error: 'ID number must be exactly 9 digits' },
        expiry: { valid: true, expired: false, daysUntilExpiry: 2300 },
        overall: { valid: false, errors: ['ID number must be exactly 9 digits'], warnings: [] },
        validatedAt: '2026-01-15T10:00:00Z',
      };

      mockDynamoDBService.updateItem.mockResolvedValue({});

      await ocrStorageService.storeOcrResults(
        'ver_123',
        'doc_456',
        'omang_front',
        ocrResult,
        null,
        validationResult
      );

      expect(mockDynamoDBService.updateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          ExpressionAttributeValues: expect.objectContaining({
            ':status': 'validation_failed',
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
          surname: 'MOEPSWA',
          forenames: 'MOTLOTLEGI EDMOND P',
          idNumber: '059016012',
          dateOfBirth: '25/08/1994',
          placeOfBirth: 'FRANCISTOWN',
          nationality: 'MOTSWANA',
          sex: 'M',
          colourOfEyes: 'BROWN',
          placeOfApplication: 'GABORONE',
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
              fullName: 'MOTLOTLEGI EDMOND P MOEPSWA',
              idNumber: '059016012',
              dateOfBirth: '1994-08-25',
              placeOfBirth: 'FRANCISTOWN',
              nationality: 'MOTSWANA',
              sex: 'M',
              colourOfEyes: 'BROWN',
              placeOfApplication: 'GABORONE',
            }),
          }),
        })
      );
    });

    it('should handle missing address fields gracefully', async () => {
      const ocrResult: OcrResult = {
        extractedFields: {
          surname: 'MOEPSWA',
          forenames: 'MOTLOTLEGI EDMOND P',
          idNumber: '059016012',
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
        extractedFields: { surname: 'TEST', forenames: 'USER' },
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
          forenames: 'USER',
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
          forenames: 'USER',
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
          surname: 'MOEPSWA',
        },
        confidence: { overall: 75 },
        rawTextractResponse: {},
        extractionMethod: 'pattern',
        processingTimeMs: 1000,
        requiresManualReview: true,
        missingFields: ['forenames', 'idNumber', 'dateOfBirth'],
      };

      mockDynamoDBService.updateItem.mockResolvedValue({});

      await ocrStorageService.updateVerificationWithExtractedData('ver_123', ocrResult);

      const call = mockDynamoDBService.updateItem.mock.calls[0][0];
      const customerData = call.ExpressionAttributeValues[':customerData'];

      expect(customerData.fullName).toBeUndefined(); // Needs both surname and forenames
      expect(customerData.idNumber).toBeUndefined();
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
        missingFields: ['surname', 'forenames', 'idNumber', 'dateOfBirth'],
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
