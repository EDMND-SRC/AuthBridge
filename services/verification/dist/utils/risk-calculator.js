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
export function calculateDuplicateRiskScore(factors) {
    let score = 0;
    // Cross-client duplicates (40 points max)
    score += Math.min(factors.crossClientCount * 40, 40);
    // Biometric mismatches (30 points max)
    score += Math.min(factors.biometricMismatches * 30, 30);
    // Recent duplicates (15 points max)
    score += Math.min(factors.recentDuplicates * 15, 15);
    // Multiple duplicates (10 points)
    if (factors.totalDuplicates > 2) {
        score += 10;
    }
    // Status mismatches (5 points max)
    score += Math.min(factors.statusMismatches * 5, 5);
    // Cap at 100
    return Math.min(score, 100);
}
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
export function getRiskLevel(score) {
    if (score <= 25)
        return 'low';
    if (score <= 50)
        return 'medium';
    if (score <= 75)
        return 'high';
    return 'critical';
}
//# sourceMappingURL=risk-calculator.js.map