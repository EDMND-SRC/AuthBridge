import { describe, it, expect } from 'vitest';
import {
  extractOmangFrontFields,
  extractOmangBackFields,
  calculateFieldConfidence,
  calculateOverallConfidence,
} from './field-extractors';
import { TextractBlock } from '../types/ocr';

describe('field-extractors', () => {
  describe('extractOmangFrontFields', () => {
    it('should extract all front side fields from clear text', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'SURNAME: MOGOROSI', Confidence: 99.2 },
        { BlockType: 'LINE', Id: '2', Text: 'FIRST NAMES: KGOSI THABO', Confidence: 98.5 },
        { BlockType: 'LINE', Id: '3', Text: 'OMANG NO: 123456789', Confidence: 99.8 },
        { BlockType: 'LINE', Id: '4', Text: 'DATE OF BIRTH: 15/03/1985', Confidence: 97.3 },
        { BlockType: 'LINE', Id: '5', Text: 'SEX: M', Confidence: 99.9 },
        { BlockType: 'LINE', Id: '6', Text: 'DATE OF ISSUE: 15/03/2015', Confidence: 96.8 },
        { BlockType: 'LINE', Id: '7', Text: 'DATE OF EXPIRY: 15/03/2025', Confidence: 97.1 },
      ];

      const result = extractOmangFrontFields(blocks);

      expect(result.fields.surname).toBe('MOGOROSI');
      expect(result.fields.firstNames).toBe('KGOSI THABO');
      expect(result.fields.omangNumber).toBe('123456789');
      expect(result.fields.dateOfBirth).toBe('15/03/1985');
      expect(result.fields.sex).toBe('M');
      expect(result.fields.dateOfIssue).toBe('15/03/2015');
      expect(result.fields.dateOfExpiry).toBe('15/03/2025');
      expect(result.confidence.surname).toBe(99.2);
      expect(result.confidence.omangNumber).toBe(99.8);
    });

    it('should handle missing fields gracefully', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'SURNAME: MOGOROSI', Confidence: 99.2 },
        { BlockType: 'LINE', Id: '2', Text: 'OMANG NO: 123456789', Confidence: 99.8 },
      ];

      const result = extractOmangFrontFields(blocks);

      expect(result.fields.surname).toBe('MOGOROSI');
      expect(result.fields.omangNumber).toBe('123456789');
      expect(result.fields.firstNames).toBeUndefined();
      expect(result.fields.dateOfBirth).toBeUndefined();
    });

    it('should handle variations in field labels', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'FIRST NAME: KGOSI', Confidence: 98.5 },
        { BlockType: 'LINE', Id: '2', Text: 'OMANG NUMBER: 123456789', Confidence: 99.8 },
      ];

      const result = extractOmangFrontFields(blocks);

      expect(result.fields.firstNames).toBe('KGOSI');
      expect(result.fields.omangNumber).toBe('123456789');
    });

    it('should extract fields with no colon separator', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'SURNAME MOGOROSI', Confidence: 99.2 },
        { BlockType: 'LINE', Id: '2', Text: 'OMANG NO 123456789', Confidence: 99.8 },
      ];

      const result = extractOmangFrontFields(blocks);

      expect(result.fields.surname).toBe('MOGOROSI');
      expect(result.fields.omangNumber).toBe('123456789');
    });
  });

  describe('extractOmangBackFields', () => {
    it('should extract address fields from back side', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'ADDRESS:', Confidence: 99.0 },
        { BlockType: 'LINE', Id: '2', Text: 'PLOT 12345', Confidence: 98.5 },
        { BlockType: 'LINE', Id: '3', Text: 'GABORONE', Confidence: 99.2 },
        { BlockType: 'LINE', Id: '4', Text: 'SOUTH EAST DISTRICT', Confidence: 97.8 },
      ];

      const result = extractOmangBackFields(blocks);

      expect(result.fields.plot).toBe('12345');
      expect(result.fields.locality).toBe('GABORONE');
      expect(result.fields.district).toBe('SOUTH EAST DISTRICT');
    });

    it('should handle multi-line address parsing', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'PLOT 5432A', Confidence: 98.5 },
        { BlockType: 'LINE', Id: '2', Text: 'FRANCISTOWN', Confidence: 99.2 },
        { BlockType: 'LINE', Id: '3', Text: 'NORTH EAST DISTRICT', Confidence: 97.8 },
      ];

      const result = extractOmangBackFields(blocks);

      expect(result.fields.plot).toBe('5432A');
      expect(result.fields.locality).toBe('FRANCISTOWN');
      expect(result.fields.district).toBe('NORTH EAST DISTRICT');
    });
  });

  describe('calculateFieldConfidence', () => {
    it('should return confidence from blocks', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'SURNAME: MOGOROSI', Confidence: 99.2 },
      ];

      const confidence = calculateFieldConfidence(blocks, 'SURNAME: MOGOROSI');

      expect(confidence).toBe(99.2);
    });

    it('should return 0 for missing text', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'SURNAME: MOGOROSI', Confidence: 99.2 },
      ];

      const confidence = calculateFieldConfidence(blocks, 'NOT FOUND');

      expect(confidence).toBe(0);
    });
  });

  describe('calculateOverallConfidence', () => {
    it('should calculate weighted average confidence', () => {
      const fieldConfidence = {
        surname: 99.0,
        firstNames: 98.0,
        omangNumber: 99.5,
        dateOfBirth: 97.0,
        overall: 0,
      };

      const overall = calculateOverallConfidence(fieldConfidence);

      // Weighted: (99*1.5 + 98*1.5 + 99.5*2.0 + 97*1.0) / 6.0
      expect(overall).toBeCloseTo(98.58, 1);
    });

    it('should handle missing fields', () => {
      const fieldConfidence = {
        omangNumber: 99.5,
        overall: 0,
      };

      const overall = calculateOverallConfidence(fieldConfidence);

      expect(overall).toBeGreaterThan(0);
    });
  });
});
