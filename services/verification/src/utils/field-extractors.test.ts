import { describe, it, expect } from 'vitest';
import {
  extractOmangFrontFields,
  extractOmangBackFields,
  extractDriversLicenceFields,
  calculateFieldConfidence,
  calculateOverallConfidence,
} from './field-extractors';
import { TextractBlock } from '../types/ocr';

describe('field-extractors', () => {
  describe('extractOmangFrontFields', () => {
    it('should extract all front side fields from clear text', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'SURNAME: MOEPSWA', Confidence: 99.2 },
        { BlockType: 'LINE', Id: '2', Text: 'FORENAMES: MOTLOTLEGI EDMOND P', Confidence: 98.5 },
        { BlockType: 'LINE', Id: '3', Text: 'ID NUMBER: 059016012', Confidence: 99.8 },
        { BlockType: 'LINE', Id: '4', Text: 'DATE OF BIRTH: 25/08/1994', Confidence: 97.3 },
        { BlockType: 'LINE', Id: '5', Text: 'PLACE OF BIRTH: FRANCISTOWN', Confidence: 96.5 },
      ];

      const result = extractOmangFrontFields(blocks);

      expect(result.fields.surname).toBe('MOEPSWA');
      expect(result.fields.forenames).toBe('MOTLOTLEGI EDMOND P');
      expect(result.fields.idNumber).toBe('059016012');
      expect(result.fields.dateOfBirth).toBe('25/08/1994');
      expect(result.fields.placeOfBirth).toBe('FRANCISTOWN');
      expect(result.confidence.surname).toBe(99.2);
      expect(result.confidence.idNumber).toBe(99.8);
    });

    it('should handle missing fields gracefully', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'SURNAME: MOEPSWA', Confidence: 99.2 },
        { BlockType: 'LINE', Id: '2', Text: 'ID NUMBER: 059016012', Confidence: 99.8 },
      ];

      const result = extractOmangFrontFields(blocks);

      expect(result.fields.surname).toBe('MOEPSWA');
      expect(result.fields.idNumber).toBe('059016012');
      expect(result.fields.forenames).toBeUndefined();
      expect(result.fields.dateOfBirth).toBeUndefined();
    });

    it('should handle variations in field labels', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'FORENAME: MOTLOTLEGI', Confidence: 98.5 },
        { BlockType: 'LINE', Id: '2', Text: 'ID NUMBER 059016012', Confidence: 99.8 },
      ];

      const result = extractOmangFrontFields(blocks);

      expect(result.fields.forenames).toBe('MOTLOTLEGI');
      expect(result.fields.idNumber).toBe('059016012');
    });

    it('should extract fields with no colon separator', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'SURNAME MOEPSWA', Confidence: 99.2 },
        { BlockType: 'LINE', Id: '2', Text: 'ID NUMBER 059016012', Confidence: 99.8 },
      ];

      const result = extractOmangFrontFields(blocks);

      expect(result.fields.surname).toBe('MOEPSWA');
      expect(result.fields.idNumber).toBe('059016012');
    });
  });

  describe('extractOmangBackFields', () => {
    it('should extract all back side fields', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'NATIONALITY: MOTSWANA', Confidence: 99.0 },
        { BlockType: 'LINE', Id: '2', Text: 'SEX: M', Confidence: 99.5 },
        { BlockType: 'LINE', Id: '3', Text: 'COLOUR OF EYES: BROWN', Confidence: 98.2 },
        { BlockType: 'LINE', Id: '4', Text: 'DATE OF EXPIRY: 22/05/2032', Confidence: 97.8 },
        { BlockType: 'LINE', Id: '5', Text: 'PLACE OF APPLICATION: GABORONE', Confidence: 96.5 },
      ];

      const result = extractOmangBackFields(blocks);

      expect(result.fields.nationality).toBe('MOTSWANA');
      expect(result.fields.sex).toBe('M');
      expect(result.fields.colourOfEyes).toBe('BROWN');
      expect(result.fields.dateOfExpiry).toBe('22/05/2032');
      expect(result.fields.placeOfApplication).toBe('GABORONE');
    });

    it('should extract address fields from back side', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'NATIONALITY: MOTSWANA', Confidence: 99.0 },
        { BlockType: 'LINE', Id: '2', Text: 'SEX: M', Confidence: 99.5 },
        { BlockType: 'LINE', Id: '3', Text: 'DATE OF EXPIRY: 22/05/2032', Confidence: 97.8 },
        { BlockType: 'LINE', Id: '4', Text: 'PLOT 12345', Confidence: 98.5 },
        { BlockType: 'LINE', Id: '5', Text: 'SOUTH EAST DISTRICT', Confidence: 97.8 },
      ];

      const result = extractOmangBackFields(blocks);

      expect(result.fields.plot).toBe('12345');
      expect(result.fields.district).toBe('SOUTH EAST DISTRICT');
    });

    it('should handle female sex value', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'SEX: F', Confidence: 99.5 },
      ];

      const result = extractOmangBackFields(blocks);

      expect(result.fields.sex).toBe('F');
    });
  });

  describe('calculateFieldConfidence', () => {
    it('should return confidence from blocks', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'SURNAME: MOEPSWA', Confidence: 99.2 },
      ];

      const confidence = calculateFieldConfidence(blocks, 'SURNAME: MOEPSWA');

      expect(confidence).toBe(99.2);
    });

    it('should return 0 for missing text', () => {
      const blocks: TextractBlock[] = [
        { BlockType: 'LINE', Id: '1', Text: 'SURNAME: MOEPSWA', Confidence: 99.2 },
      ];

      const confidence = calculateFieldConfidence(blocks, 'NOT FOUND');

      expect(confidence).toBe(0);
    });
  });

  describe('calculateOverallConfidence', () => {
    it('should calculate weighted average confidence', () => {
      const fieldConfidence = {
        surname: 99.0,
        forenames: 98.0,
        idNumber: 99.5,
        dateOfBirth: 97.0,
        overall: 0,
      };

      const overall = calculateOverallConfidence(fieldConfidence);

      // Weighted: (99*1.5 + 98*1.5 + 99.5*2.0 + 97*1.0) / 6.0
      expect(overall).toBeCloseTo(98.58, 1);
    });

    it('should handle missing fields', () => {
      const fieldConfidence = {
        idNumber: 99.5,
        overall: 0,
      };

      const overall = calculateOverallConfidence(fieldConfidence);

      expect(overall).toBeGreaterThan(0);
    });

    it('should include back side fields in calculation', () => {
      const fieldConfidence = {
        nationality: 98.0,
        sex: 99.0,
        dateOfExpiry: 97.0,
        overall: 0,
      };

      const overall = calculateOverallConfidence(fieldConfidence);

      expect(overall).toBeGreaterThan(0);
    });
  });
});


describe('extractDriversLicenceFields', () => {
  it('should extract all driver licence fields from clear text', () => {
    const blocks: TextractBlock[] = [
      { BlockType: 'LINE', Id: '1', Text: 'REPUBLIC OF BOTSWANA', Confidence: 99.0 },
      { BlockType: 'LINE', Id: '2', Text: 'DRIVING LICENCE', Confidence: 99.0 },
      { BlockType: 'LINE', Id: '3', Text: 'MOEPSWA', Confidence: 99.2 },
      { BlockType: 'LINE', Id: '4', Text: 'MOTLOTLEGI EDMOND P', Confidence: 98.5 },
      { BlockType: 'LINE', Id: '5', Text: 'ID: Omang 059016012', Confidence: 99.8 },
      { BlockType: 'LINE', Id: '6', Text: 'Gender: M', Confidence: 99.5 },
      { BlockType: 'LINE', Id: '7', Text: 'Date of Birth: 25/08/1994', Confidence: 97.3 },
      { BlockType: 'LINE', Id: '8', Text: 'Licence Number: 687215', Confidence: 98.7 },
      { BlockType: 'LINE', Id: '9', Text: 'Class B', Confidence: 99.1 },
      { BlockType: 'LINE', Id: '10', Text: 'Validity Period: Oct 2024 - Oct 2029', Confidence: 96.5 },
      { BlockType: 'LINE', Id: '11', Text: 'First Issue: 04/10/2024', Confidence: 97.2 },
      { BlockType: 'LINE', Id: '12', Text: 'Driver Restriction: 0', Confidence: 98.0 },
      { BlockType: 'LINE', Id: '13', Text: 'Veh. Restr.: 0', Confidence: 97.5 },
      { BlockType: 'LINE', Id: '14', Text: 'Endorsement: No', Confidence: 98.3 },
    ];

    const result = extractDriversLicenceFields(blocks);

    expect(result.fields.surname).toBe('MOEPSWA');
    expect(result.fields.forenames).toBe('MOTLOTLEGI EDMOND P');
    expect(result.fields.omangNumber).toBe('059016012');
    expect(result.fields.gender).toBe('M');
    expect(result.fields.dateOfBirth).toBe('25/08/1994');
    expect(result.fields.licenceNumber).toBe('687215');
    expect(result.fields.licenceClass).toBe('B');
    expect(result.fields.validityPeriodStart).toBe('Oct 2024');
    expect(result.fields.validityPeriodEnd).toBe('Oct 2029');
    expect(result.fields.firstIssue).toBe('04/10/2024');
    expect(result.fields.driverRestriction).toBe('0');
    expect(result.fields.vehicleRestriction).toBe('0');
    expect(result.fields.endorsement).toBe('No');
  });

  it('should handle missing optional fields gracefully', () => {
    const blocks: TextractBlock[] = [
      { BlockType: 'LINE', Id: '1', Text: 'MOEPSWA', Confidence: 99.2 },
      { BlockType: 'LINE', Id: '2', Text: 'MOTLOTLEGI EDMOND P', Confidence: 98.5 },
      { BlockType: 'LINE', Id: '3', Text: 'ID: Omang 059016012', Confidence: 99.8 },
      { BlockType: 'LINE', Id: '4', Text: 'Licence Number: 687215', Confidence: 98.7 },
    ];

    const result = extractDriversLicenceFields(blocks);

    expect(result.fields.surname).toBe('MOEPSWA');
    expect(result.fields.omangNumber).toBe('059016012');
    expect(result.fields.licenceNumber).toBe('687215');
    expect(result.fields.validityPeriodStart).toBeUndefined();
    expect(result.fields.endorsement).toBeUndefined();
  });

  it('should extract different licence classes', () => {
    const blocks: TextractBlock[] = [
      { BlockType: 'LINE', Id: '1', Text: 'Class EC1', Confidence: 99.1 },
    ];

    const result = extractDriversLicenceFields(blocks);

    expect(result.fields.licenceClass).toBe('EC1');
  });

  it('should handle female gender', () => {
    const blocks: TextractBlock[] = [
      { BlockType: 'LINE', Id: '1', Text: 'Gender: F', Confidence: 99.5 },
    ];

    const result = extractDriversLicenceFields(blocks);

    expect(result.fields.gender).toBe('F');
  });

  it('should extract endorsement Yes value', () => {
    const blocks: TextractBlock[] = [
      { BlockType: 'LINE', Id: '1', Text: 'Endorsement: Yes', Confidence: 98.3 },
    ];

    const result = extractDriversLicenceFields(blocks);

    expect(result.fields.endorsement).toBe('Yes');
  });
});
