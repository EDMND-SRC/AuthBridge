import { describe, it, expect } from 'vitest';
import { maskOmangNumber, maskAddress } from './masking';

describe('maskOmangNumber', () => {
  it('should mask Omang number showing last 4 digits', () => {
    expect(maskOmangNumber('123456789')).toBe('***6789');
  });

  it('should handle short Omang numbers', () => {
    expect(maskOmangNumber('123')).toBe('***');
  });

  it('should handle undefined Omang number', () => {
    expect(maskOmangNumber(undefined)).toBe('');
  });

  it('should handle empty string', () => {
    expect(maskOmangNumber('')).toBe('');
  });

  it('should handle exactly 4 digits', () => {
    expect(maskOmangNumber('1234')).toBe('***1234');
  });
});

describe('maskAddress', () => {
  it('should extract district from structured address object', () => {
    const address = {
      district: 'Gaborone',
      locality: 'Block 8',
      plotNumber: '12345',
    };
    expect(maskAddress(address)).toBe('Gaborone');
  });

  it('should extract district from comma-separated string', () => {
    expect(maskAddress('Plot 12345, Block 8, Gaborone')).toBe('Gaborone');
  });

  it('should handle single-part address string', () => {
    expect(maskAddress('Gaborone')).toBe('Gaborone');
  });

  it('should handle undefined address', () => {
    expect(maskAddress(undefined)).toBe('');
  });

  it('should handle empty string', () => {
    expect(maskAddress('')).toBe('');
  });

  it('should handle address object without district', () => {
    const address = {
      locality: 'Block 8',
      plotNumber: '12345',
    };
    expect(maskAddress(address)).toBe('');
  });
});
