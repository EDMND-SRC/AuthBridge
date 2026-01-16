/**
 * Risk scoring calculator for duplicate detection
 * Implements weighted scoring algorithm from Story 2.4
 */
import type { RiskFactors, DuplicateRiskLevel } from '../types/duplicate';
/**
 * Calculate duplicate risk score based on multiple factors
 *
 * Risk Factors:
 * - Cross-client duplicate: 40 points (max)
 * - Biometric mismatch: 30 points (max)
 * - Recent duplicate: 15 points (max)
 * - Multiple duplicates: 10 points
 * - Status mismatch: 5 points (max)
 *
 * @param factors - Risk factors to evaluate
 * @returns Risk score (0-100)
 */
export declare function calculateDuplicateRiskScore(factors: RiskFactors): number;
/**
 * Get risk level from risk score
 *
 * Thresholds:
 * - 0-25: Low risk (legitimate re-verification)
 * - 26-50: Medium risk (flag for review)
 * - 51-75: High risk (requires manual approval)
 * - 76-100: Critical risk (auto-reject or escalate)
 *
 * @param score - Risk score (0-100)
 * @returns Risk level
 */
export declare function getRiskLevel(score: number): DuplicateRiskLevel;
//# sourceMappingURL=risk-calculator.d.ts.map