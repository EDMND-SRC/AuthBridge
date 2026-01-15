import { describe, it, expect } from 'vitest';
import { calculateDuplicateRiskScore, getRiskLevel } from './risk-calculator';
import type { RiskFactors } from '../types/duplicate';

describe('risk-calculator', () => {
  describe('calculateDuplicateRiskScore', () => {
    it('should return 0 for no risk factors', () => {
      const factors: RiskFactors = {
        crossClientCount: 0,
        biometricMismatches: 0,
        recentDuplicates: 0,
        totalDuplicates: 0,
        statusMismatches: 0,
      };

      const score = calculateDuplicateRiskScore(factors);
      expect(score).toBe(0);
    });

    it('should calculate 40 points for cross-client duplicate', () => {
      const factors: RiskFactors = {
        crossClientCount: 1,
        biometricMismatches: 0,
        recentDuplicates: 0,
        totalDuplicates: 1,
        statusMismatches: 0,
      };

      const score = calculateDuplicateRiskScore(factors);
      expect(score).toBe(40);
    });

    it('should calculate 30 points for biometric mismatch', () => {
      const factors: RiskFactors = {
        crossClientCount: 0,
        biometricMismatches: 1,
        recentDuplicates: 0,
        totalDuplicates: 1,
        statusMismatches: 0,
      };

      const score = calculateDuplicateRiskScore(factors);
      expect(score).toBe(30);
    });

    it('should calculate 15 points for recent duplicate', () => {
      const factors: RiskFactors = {
        crossClientCount: 0,
        biometricMismatches: 0,
        recentDuplicates: 1,
        totalDuplicates: 1,
        statusMismatches: 0,
      };

      const score = calculateDuplicateRiskScore(factors);
      expect(score).toBe(15);
    });

    it('should calculate 10 points for multiple duplicates (>2)', () => {
      const factors: RiskFactors = {
        crossClientCount: 0,
        biometricMismatches: 0,
        recentDuplicates: 0,
        totalDuplicates: 3,
        statusMismatches: 0,
      };

      const score = calculateDuplicateRiskScore(factors);
      expect(score).toBe(10);
    });

    it('should calculate 5 points for status mismatch', () => {
      const factors: RiskFactors = {
        crossClientCount: 0,
        biometricMismatches: 0,
        recentDuplicates: 0,
        totalDuplicates: 1,
        statusMismatches: 1,
      };

      const score = calculateDuplicateRiskScore(factors);
      expect(score).toBe(5);
    });

    it('should calculate combined score for multiple factors', () => {
      const factors: RiskFactors = {
        crossClientCount: 1, // 40
        biometricMismatches: 1, // 30
        recentDuplicates: 1, // 15
        totalDuplicates: 3, // 10
        statusMismatches: 1, // 5
      };

      const score = calculateDuplicateRiskScore(factors);
      expect(score).toBe(100); // 40 + 30 + 15 + 10 + 5 = 100
    });

    it('should cap score at 100', () => {
      const factors: RiskFactors = {
        crossClientCount: 5, // Would be 200 without cap
        biometricMismatches: 5,
        recentDuplicates: 5,
        totalDuplicates: 10,
        statusMismatches: 5,
      };

      const score = calculateDuplicateRiskScore(factors);
      expect(score).toBe(100);
    });

    it('should cap cross-client score at 40', () => {
      const factors: RiskFactors = {
        crossClientCount: 3, // Would be 120 without cap
        biometricMismatches: 0,
        recentDuplicates: 0,
        totalDuplicates: 3, // Adds 10 points for multiple duplicates
        statusMismatches: 0,
      };

      const score = calculateDuplicateRiskScore(factors);
      expect(score).toBe(50); // 40 (cross-client capped) + 10 (multiple)
    });

    it('should cap biometric mismatch score at 30', () => {
      const factors: RiskFactors = {
        crossClientCount: 0,
        biometricMismatches: 3, // Would be 90 without cap
        recentDuplicates: 0,
        totalDuplicates: 3, // Adds 10 points for multiple duplicates
        statusMismatches: 0,
      };

      const score = calculateDuplicateRiskScore(factors);
      expect(score).toBe(40); // 30 (biometric capped) + 10 (multiple)
    });
  });

  describe('getRiskLevel', () => {
    it('should return "low" for score 0-25', () => {
      expect(getRiskLevel(0)).toBe('low');
      expect(getRiskLevel(15)).toBe('low');
      expect(getRiskLevel(25)).toBe('low');
    });

    it('should return "medium" for score 26-50', () => {
      expect(getRiskLevel(26)).toBe('medium');
      expect(getRiskLevel(40)).toBe('medium');
      expect(getRiskLevel(50)).toBe('medium');
    });

    it('should return "high" for score 51-75', () => {
      expect(getRiskLevel(51)).toBe('high');
      expect(getRiskLevel(60)).toBe('high');
      expect(getRiskLevel(75)).toBe('high');
    });

    it('should return "critical" for score 76-100', () => {
      expect(getRiskLevel(76)).toBe('critical');
      expect(getRiskLevel(85)).toBe('critical');
      expect(getRiskLevel(100)).toBe('critical');
    });

    it('should handle edge cases', () => {
      expect(getRiskLevel(-1)).toBe('low'); // Negative treated as low
      expect(getRiskLevel(101)).toBe('critical'); // Over 100 treated as critical
    });
  });
});
