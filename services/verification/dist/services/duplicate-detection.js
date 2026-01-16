/**
 * Duplicate detection service for Omang fraud prevention
 * Implements privacy-conscious duplicate detection using SHA-256 hashing
 */
import { differenceInDays } from 'date-fns';
import { createOmangHashKey } from '../utils/omang-hash';
import { calculateDuplicateRiskScore, getRiskLevel } from '../utils/risk-calculator';
import { logger } from '../utils/logger';
export class DuplicateDetectionService {
    dynamoDBService;
    constructor(dynamoDBService) {
        this.dynamoDBService = dynamoDBService;
    }
    /**
     * Check for duplicate Omang numbers across verifications
     *
     * @param omangNumber - The Omang number to check
     * @param currentVerificationId - Current verification ID (excluded from results)
     * @param currentClientId - Current client ID
     * @param currentBiometricScore - Current biometric score
     * @returns Duplicate detection result with risk assessment
     */
    async checkDuplicates(omangNumber, currentVerificationId, currentClientId, currentBiometricScore) {
        const checkedAt = new Date().toISOString();
        try {
            // Query by Omang hash
            const omangHashKey = createOmangHashKey(omangNumber);
            const allCases = await this.dynamoDBService.queryByOmangHash(omangHashKey);
            // Filter out current verification
            const duplicateCases = allCases.filter((c) => c.verificationId !== currentVerificationId);
            if (duplicateCases.length === 0) {
                return {
                    checked: true,
                    checkedAt,
                    duplicatesFound: 0,
                    sameClientDuplicates: 0,
                    crossClientDuplicates: 0,
                    riskLevel: 'low',
                    riskScore: 0,
                    duplicateCases: [],
                    requiresManualReview: false,
                };
            }
            // Build duplicate case list
            const now = new Date();
            const cases = duplicateCases.map((c) => ({
                verificationId: c.verificationId,
                clientId: c.clientId,
                status: c.status,
                biometricScore: c.biometricSummary?.overallScore,
                createdAt: c.createdAt,
                daysSince: differenceInDays(now, new Date(c.createdAt)),
            }));
            // Calculate risk factors
            const sameClientCount = cases.filter((c) => c.clientId === currentClientId).length;
            const crossClientCount = cases.filter((c) => c.clientId !== currentClientId).length;
            const biometricMismatches = cases.filter((c) => {
                if (!c.biometricScore)
                    return false;
                const scoreDiff = Math.abs(c.biometricScore - currentBiometricScore);
                return scoreDiff > 20; // >20% difference suggests different person
            }).length;
            const recentDuplicates = cases.filter((c) => c.daysSince <= 30).length;
            const statusMismatches = cases.filter((c) => c.status === 'rejected' || c.status === 'auto_rejected').length;
            const riskFactors = {
                crossClientCount,
                biometricMismatches,
                recentDuplicates,
                totalDuplicates: cases.length,
                statusMismatches,
            };
            // Calculate risk score and level
            const riskScore = calculateDuplicateRiskScore(riskFactors);
            const riskLevel = getRiskLevel(riskScore);
            // Determine if manual review required
            const requiresManualReview = riskLevel === 'medium' ||
                riskLevel === 'high' ||
                riskLevel === 'critical';
            // Generate flag reason
            let flagReason;
            if (requiresManualReview) {
                const reasons = [];
                if (crossClientCount > 0) {
                    reasons.push(`${crossClientCount} cross-client duplicate(s)`);
                }
                if (biometricMismatches > 0) {
                    reasons.push(`${biometricMismatches} biometric mismatch(es)`);
                }
                if (recentDuplicates > 0) {
                    reasons.push(`${recentDuplicates} recent duplicate(s)`);
                }
                flagReason = reasons.join(', ');
            }
            return {
                checked: true,
                checkedAt,
                duplicatesFound: cases.length,
                sameClientDuplicates: sameClientCount,
                crossClientDuplicates: crossClientCount,
                riskLevel,
                riskScore,
                duplicateCases: cases,
                requiresManualReview,
                flagReason,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Duplicate check failed', {
                verificationId: currentVerificationId,
                error: errorMessage,
            });
            // Return safe default
            return {
                checked: false,
                checkedAt,
                duplicatesFound: 0,
                sameClientDuplicates: 0,
                crossClientDuplicates: 0,
                riskLevel: 'unknown',
                riskScore: 0,
                duplicateCases: [],
                requiresManualReview: false,
                error: errorMessage,
            };
        }
    }
}
//# sourceMappingURL=duplicate-detection.js.map