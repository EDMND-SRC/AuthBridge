import { DynamoDBService } from './dynamodb';
import { OcrResult } from '../types/ocr';
import { ImageQualityResult } from './image-quality';
import { OmangValidationResult } from '../types/validation';

/**
 * Service for storing OCR results in DynamoDB
 * Handles persistence of extracted data from Textract processing
 */
export class OcrStorageService {
  private dynamoDBService: DynamoDBService;

  constructor() {
    this.dynamoDBService = new DynamoDBService();
  }

  /**
   * Store OCR results in document entity
   * Updates the document record with extracted fields, confidence scores, and raw Textract response
   *
   * @param verificationId - The verification case ID
   * @param documentId - The document ID within the verification
   * @param documentType - Type of document (omang_front, omang_back, selfie, etc.)
   * @param ocrResult - The OCR extraction result from Textract processing
   * @param qualityResult - Optional image quality assessment result
   * @param validationResult - Optional Omang validation result
   * @throws Error if DynamoDB update fails
   */
  async storeOcrResults(
    verificationId: string,
    documentId: string,
    documentType: string,
    ocrResult: OcrResult,
    qualityResult?: ImageQualityResult | null,
    validationResult?: OmangValidationResult | null
  ): Promise<void> {
    const now = new Date().toISOString();

    const ocrData: any = {
      extractedFields: ocrResult.extractedFields,
      confidence: ocrResult.confidence,
      rawTextractResponse: ocrResult.rawTextractResponse,
      extractionMethod: ocrResult.extractionMethod,
      processingTimeMs: ocrResult.processingTimeMs,
      requiresManualReview: ocrResult.requiresManualReview,
      missingFields: ocrResult.missingFields,
    };

    // Add quality assessment if available
    if (qualityResult) {
      ocrData.imageQuality = {
        isReadable: qualityResult.isReadable,
        qualityScore: qualityResult.qualityScore,
        issues: qualityResult.issues,
        recommendation: qualityResult.recommendation,
      };
    }

    // Add validation results if available
    if (validationResult) {
      ocrData.validation = {
        omangNumber: validationResult.omangNumber,
        expiry: validationResult.expiry,
        overall: validationResult.overall,
        validatedAt: validationResult.validatedAt,
      };
    }

    // Determine document status based on validation
    let documentStatus = 'processed';
    if (validationResult && !validationResult.overall.valid) {
      documentStatus = 'validation_failed';
    } else if (validationResult && validationResult.overall.valid) {
      documentStatus = 'validated';
    }

    await this.dynamoDBService.updateItem({
      Key: {
        PK: `CASE#${verificationId}`,
        SK: `DOC#${documentId}`,
      },
      UpdateExpression:
        'SET #ocrData = :ocrData, #status = :status, #processedAt = :processedAt',
      ExpressionAttributeNames: {
        '#ocrData': 'ocrData',
        '#status': 'status',
        '#processedAt': 'processedAt',
      },
      ExpressionAttributeValues: {
        ':ocrData': ocrData,
        ':status': documentStatus,
        ':processedAt': now,
      },
    });
  }

  /**
   * Update verification case with extracted customer data
   * Populates the customerData field on the verification META record
   *
   * @param verificationId - The verification case ID
   * @param ocrResult - The OCR extraction result containing extracted fields
   * @throws Error if DynamoDB update fails
   */
  async updateVerificationWithExtractedData(
    verificationId: string,
    ocrResult: OcrResult
  ): Promise<void> {
    const { extractedFields, confidence } = ocrResult;
    const now = new Date().toISOString();

    // Build customer data object
    const customerData: any = {};

    // Full name (forenames + surname)
    if (extractedFields.surname && extractedFields.forenames) {
      customerData.fullName = `${extractedFields.forenames} ${extractedFields.surname}`;
    }

    // ID number (will be encrypted in production)
    if (extractedFields.idNumber) {
      customerData.idNumber = extractedFields.idNumber;
    }

    // Date of birth (convert to ISO 8601)
    if (extractedFields.dateOfBirth) {
      customerData.dateOfBirth = this.convertToISO8601(extractedFields.dateOfBirth);
    }

    // Place of birth
    if (extractedFields.placeOfBirth) {
      customerData.placeOfBirth = extractedFields.placeOfBirth;
    }

    // Nationality
    if (extractedFields.nationality) {
      customerData.nationality = extractedFields.nationality;
    }

    // Sex
    if (extractedFields.sex) {
      customerData.sex = extractedFields.sex;
    }

    // Colour of eyes
    if (extractedFields.colourOfEyes) {
      customerData.colourOfEyes = extractedFields.colourOfEyes;
    }

    // Place of application
    if (extractedFields.placeOfApplication) {
      customerData.placeOfApplication = extractedFields.placeOfApplication;
    }

    // Address (only if any address fields present)
    if (extractedFields.plot || extractedFields.locality || extractedFields.district) {
      customerData.address = {
        plot: extractedFields.plot,
        locality: extractedFields.locality,
        district: extractedFields.district,
      };
    }

    // Document expiry
    if (extractedFields.dateOfExpiry) {
      customerData.documentExpiry = this.convertToISO8601(extractedFields.dateOfExpiry);
    }

    // Extraction metadata
    customerData.extractionConfidence = confidence.overall;
    customerData.extractedAt = now;

    // Build update expression
    let updateExpression = 'SET #customerData = :customerData';
    const expressionAttributeNames: Record<string, string> = {
      '#customerData': 'customerData',
    };
    const expressionAttributeValues: Record<string, any> = {
      ':customerData': customerData,
    };

    // Add GSI2PK with ID number hash for duplicate detection
    if (extractedFields.idNumber) {
      const { createOmangHashKey } = await import('../utils/omang-hash.js');
      const omangHashKey = createOmangHashKey(extractedFields.idNumber);

      updateExpression += ', #GSI2PK = :GSI2PK, #GSI2SK = :GSI2SK';
      expressionAttributeNames['#GSI2PK'] = 'GSI2PK';
      expressionAttributeNames['#GSI2SK'] = 'GSI2SK';
      expressionAttributeValues[':GSI2PK'] = omangHashKey;
      expressionAttributeValues[':GSI2SK'] = `CASE#${verificationId}`;
    }

    await this.dynamoDBService.updateItem({
      Key: {
        PK: `CASE#${verificationId}`,
        SK: 'META',
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    });
  }

  /**
   * Convert DD/MM/YYYY to ISO 8601 (YYYY-MM-DD)
   */
  private convertToISO8601(date: string): string {
    const [day, month, year] = date.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
}
