/**
 * Biometric verification types for face liveness and comparison
 */

export interface LivenessResult {
  confidence: number;
  status: 'SUCCEEDED' | 'FAILED' | 'UNKNOWN';
  passed: boolean;
  sessionId: string;
  auditImages?: string[];
  processedAt: string;
}

export interface FaceComparisonResult {
  similarity: number;
  passed: boolean;
  sourceImageFace: {
    confidence: number;
    boundingBox: BoundingBox;
  };
  targetImageFace?: {
    confidence: number;
    boundingBox: BoundingBox;
  };
  processedAt: string;
}

export interface BoundingBox {
  width: number;
  height: number;
  left: number;
  top: number;
}

export interface BiometricData {
  liveness: LivenessResult;
  faceComparison: FaceComparisonResult;
  overallScore: number;
  passed: boolean;
  requiresManualReview: boolean;
  processedAt: string;
  processingTimeMs: number;
}

export interface BiometricSummary {
  livenessScore: number;
  similarityScore: number;
  overallScore: number;
  passed: boolean;
  requiresManualReview: boolean;
  processedAt: string;
}

export interface BiometricProcessingRequest {
  verificationId: string;
  selfieDocumentId: string;
  omangFrontDocumentId: string;
}

export interface BiometricError {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}
