import { describe, it, expect } from 'vitest';
import {
  assessImageQuality,
  shouldRequestRecapture,
  ImageQualityResult,
} from './image-quality';
import { TextractBlock } from '../types/ocr';

describe('image-quality', () => {
  describe('assessImageQuality', () => {
    it('should return not readable when no text detected', () => {
      const blocks: TextractBlock[] = [];

      const result = assessImageQuality(blocks);

      expect(result.isReadable).toBe(false);
      expect(result.qualityScore).toBe(0);
      expect(result.issues).toContain('NO_TEXT_DETECTED');
    });

    it('should return readable for high quality image', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'REPUBLIC OF BOTSWANA', Confidence: 99.5 },
        { BlockType: 'LINE', Id: '2', Text: 'SURNAME: MOGOROSI', Confidence: 98.2 },
        { BlockType: 'LINE', Id: '3', Text: 'OMANG NO: 123456789', Confidence: 99.1 },
        { BlockType: 'LINE', Id: '4', Text: 'DATE OF BIRTH: 15/03/1985', Confidence: 97.8 },
        { BlockType: 'LINE', Id: '5', Text: 'SEX: M', Confidence: 99.9 },
      ];

      const result = assessImageQuality(blocks);

      expect(result.isReadable).toBe(true);
      expect(result.qualityScore).toBeGreaterThanOrEqual(80);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect blurry image with low confidence', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'REPUBLIC OF BOTSWANA', Confidence: 45.0 },
        { BlockType: 'LINE', Id: '2', Text: 'SURNAME: MOGOROSI', Confidence: 42.0 },
        { BlockType: 'LINE', Id: '3', Text: 'OMANG NO: 123456789', Confidence: 48.0 },
        { BlockType: 'LINE', Id: '4', Text: 'DATE OF BIRTH', Confidence: 40.0 },
      ];

      const result = assessImageQuality(blocks);

      expect(result.issues).toContain('BLURRY_IMAGE');
      expect(result.qualityScore).toBeLessThan(80);
    });

    it('should detect very low confidence as unreadable', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'REPUBLIC', Confidence: 20.0 },
        { BlockType: 'LINE', Id: '2', Text: 'SURNAME', Confidence: 25.0 },
        { BlockType: 'LINE', Id: '3', Text: 'OMANG', Confidence: 22.0 },
      ];

      const result = assessImageQuality(blocks);

      expect(result.issues).toContain('VERY_LOW_CONFIDENCE');
      expect(result.qualityScore).toBeLessThan(50);
    });

    it('should detect insufficient text blocks', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'BOTSWANA', Confidence: 95.0 },
        { BlockType: 'LINE', Id: '2', Text: 'OMANG', Confidence: 92.0 },
      ];

      const result = assessImageQuality(blocks);

      expect(result.issues).toContain('INSUFFICIENT_TEXT');
    });

    it('should detect poor lighting from mixed confidence', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'REPUBLIC OF BOTSWANA', Confidence: 95.0 },
        { BlockType: 'LINE', Id: '2', Text: 'SURNAME', Confidence: 20.0 },
        { BlockType: 'LINE', Id: '3', Text: 'OMANG', Confidence: 25.0 },
        { BlockType: 'LINE', Id: '4', Text: 'DATE', Confidence: 22.0 },
      ];

      const result = assessImageQuality(blocks);

      expect(result.issues).toContain('POOR_LIGHTING');
    });

    it('should generate appropriate recommendation', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'TEXT', Confidence: 25.0 },
        { BlockType: 'LINE', Id: '2', Text: 'MORE', Confidence: 28.0 },
        { BlockType: 'LINE', Id: '3', Text: 'STUFF', Confidence: 22.0 },
      ];

      const result = assessImageQuality(blocks);

      expect(result.recommendation).toBeTruthy();
      expect(result.recommendation.length).toBeGreaterThan(10);
    });

    it('should ignore non-LINE blocks', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'PAGE', Id: '0', Confidence: 99.0 },
        { BlockType: 'LINE', Id: '1', Text: 'REPUBLIC OF BOTSWANA', Confidence: 99.5 },
        { BlockType: 'WORD', Id: '2', Text: 'REPUBLIC', Confidence: 99.5 },
        { BlockType: 'LINE', Id: '3', Text: 'SURNAME: MOGOROSI', Confidence: 98.2 },
        { BlockType: 'LINE', Id: '4', Text: 'OMANG NO: 123456789', Confidence: 99.1 },
      ];

      const result = assessImageQuality(blocks);

      expect(result.isReadable).toBe(true);
    });
  });

  describe('shouldRequestRecapture', () => {
    it('should request recapture when not readable', () => {
      const qualityResult: ImageQualityResult = {
        isReadable: false,
        qualityScore: 0,
        issues: ['NO_TEXT_DETECTED'],
        recommendation: 'No text detected',
      };

      expect(shouldRequestRecapture(qualityResult, 0, 7)).toBe(true);
    });

    it('should request recapture when quality score is very low', () => {
      const qualityResult: ImageQualityResult = {
        isReadable: true,
        qualityScore: 25,
        issues: ['VERY_LOW_CONFIDENCE'],
        recommendation: 'Image is blurry',
      };

      expect(shouldRequestRecapture(qualityResult, 2, 7)).toBe(true);
    });

    it('should request recapture when less than 50% fields extracted', () => {
      const qualityResult: ImageQualityResult = {
        isReadable: true,
        qualityScore: 70,
        issues: [],
        recommendation: 'Acceptable',
      };

      expect(shouldRequestRecapture(qualityResult, 2, 7)).toBe(true);
    });

    it('should not request recapture for good quality with sufficient fields', () => {
      const qualityResult: ImageQualityResult = {
        isReadable: true,
        qualityScore: 85,
        issues: [],
        recommendation: 'Acceptable',
      };

      expect(shouldRequestRecapture(qualityResult, 5, 7)).toBe(false);
    });
  });
});
