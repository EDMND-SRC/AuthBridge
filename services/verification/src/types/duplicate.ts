/**
 * Duplicate detection types for Omang fraud prevention
 */

export type DuplicateRiskLevel = 'low' | 'medium' | 'high' | 'critical' | 'unknown';

export interface DuplicateCase {
  verificationId: string;
  clientId: string;
  status: string;
  biometricScore?: number;
  createdAt: string;
  daysSince: number;
}

export interface DuplicateDetectionResult {
  checked: boolean;
  checkedAt: string;
  duplicatesFound: number;
  sameClientDuplicates: number;
  crossClientDuplicates: number;
  riskLevel: DuplicateRiskLevel;
  riskScore: number;
  duplicateCases: DuplicateCase[];
  requiresManualReview: boolean;
  flagReason?: string;
  error?: string;
}

export interface RiskFactors {
  crossClientCount: number;
  biometricMismatches: number;
  recentDuplicates: number;
  totalDuplicates: number;
  statusMismatches: number;
}

export interface DuplicateDetectionMetadata {
  omangHash: string;
  duplicatesFound: number;
  riskLevel: DuplicateRiskLevel;
  riskScore: number;
  sameClientCount: number;
  crossClientCount: number;
}
