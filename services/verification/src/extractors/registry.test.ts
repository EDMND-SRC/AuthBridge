import { describe, it, expect } from 'vitest';
import {
  getExtractor,
  hasExtractor,
  getAllExtractors,
  getExtractorsForCountry,
  getSupportedCountries,
  getSupportedDocumentTypes,
} from './registry';

describe('Extractor Registry', () => {
  describe('getExtractor', () => {
    it('should return Botswana Omang extractor', () => {
      const extractor = getExtractor('BW', 'national_id');

      expect(extractor).toBeDefined();
      expect(extractor?.country).toBe('BW');
      expect(extractor?.documentType).toBe('national_id');
    });

    it('should return Botswana drivers licence extractor', () => {
      const extractor = getExtractor('BW', 'drivers_licence');

      expect(extractor).toBeDefined();
      expect(extractor?.country).toBe('BW');
      expect(extractor?.documentType).toBe('drivers_licence');
    });

    it('should return Botswana passport extractor', () => {
      const extractor = getExtractor('BW', 'passport');

      expect(extractor).toBeDefined();
      expect(extractor?.country).toBe('BW');
      expect(extractor?.documentType).toBe('passport');
    });

    it('should return undefined for unsupported country', () => {
      const extractor = getExtractor('ZA' as any, 'national_id');

      expect(extractor).toBeUndefined();
    });
  });

  describe('hasExtractor', () => {
    it('should return true for registered extractors', () => {
      expect(hasExtractor('BW', 'national_id')).toBe(true);
      expect(hasExtractor('BW', 'drivers_licence')).toBe(true);
      expect(hasExtractor('BW', 'passport')).toBe(true);
    });

    it('should return false for unregistered extractors', () => {
      expect(hasExtractor('ZA' as any, 'national_id')).toBe(false);
    });
  });

  describe('getAllExtractors', () => {
    it('should return all registered extractors', () => {
      const extractors = getAllExtractors();

      expect(extractors.length).toBeGreaterThanOrEqual(3);
      expect(extractors.some(e => e.documentType === 'national_id')).toBe(true);
      expect(extractors.some(e => e.documentType === 'drivers_licence')).toBe(true);
      expect(extractors.some(e => e.documentType === 'passport')).toBe(true);
    });
  });

  describe('getExtractorsForCountry', () => {
    it('should return all Botswana extractors', () => {
      const extractors = getExtractorsForCountry('BW');

      expect(extractors.length).toBe(3);
      expect(extractors.every(e => e.country === 'BW')).toBe(true);
    });
  });

  describe('getSupportedCountries', () => {
    it('should include Botswana', () => {
      const countries = getSupportedCountries();

      expect(countries).toContain('BW');
    });
  });

  describe('getSupportedDocumentTypes', () => {
    it('should return all document types for Botswana', () => {
      const types = getSupportedDocumentTypes('BW');

      expect(types).toContain('national_id');
      expect(types).toContain('drivers_licence');
      expect(types).toContain('passport');
    });
  });
});
