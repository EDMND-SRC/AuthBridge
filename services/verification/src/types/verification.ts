export type VerificationStatus =
  | 'created'
  | 'documents_uploading'
  | 'documents_complete'
  | 'submitted'
  | 'processing'
  | 'pending_review'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'auto_rejected'
  | 'resubmission_required'
  | 'expired';

export type DocumentType = 'omang' | 'passport' | 'drivers_licence' | 'id_card';

export interface CustomerMetadata {
  name?: string;
  email?: string;
  phone?: string;
  externalId?: string;
  redirectUrl?: string;
}

export interface VerificationEntity {
  PK: string; // CASE#<verificationId>
  SK: string; // META
  verificationId: string;
  clientId: string;
  status: VerificationStatus;
  documentType?: DocumentType;
  customer?: Customer;
  customerMetadata?: CustomerMetadata; // Legacy field, kept for backward compatibility
  redirectUrl?: string;
  webhookUrl?: string;
  metadata?: Record<string, string>;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  submittedAt?: string; // ISO 8601
  completedAt?: string; // ISO 8601
  expiresAt: string; // ISO 8601 (30 days from creation)
  ttl: number; // Unix timestamp for DynamoDB TTL
  GSI1PK: string; // CLIENT#<clientId>
  GSI1SK: string; // <status>#<createdAt>
  GSI2PK: string; // DATE#<YYYY-MM-DD> or OMANG#<hash> for duplicate detection
  GSI2SK: string; // <createdAt>#<verificationId> or CASE#<verificationId>
  biometricSummary?: {
    livenessScore: number;
    similarityScore: number;
    overallScore: number;
    passed: boolean;
    requiresManualReview: boolean;
    processedAt: string;
  };
  extractedData?: {
    idNumber?: string;
    surname?: string;
    forenames?: string;
    dateOfBirth?: string;
    sex?: string;
    dateOfExpiry?: string;
    [key: string]: unknown;
  };
  assignee?: string;
}

export interface DocumentEntity {
  PK: string; // CASE#<verificationId>
  SK: string; // DOC#<documentId>
  documentId: string;
  verificationId: string;
  documentType: string; // omang_front, omang_back, selfie, etc.
  s3Key: string;
  s3Bucket: string;
  fileSize: number; // bytes
  mimeType: string;
  uploadedAt: string; // ISO 8601
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  processingResults?: {
    ocrData?: unknown;
    biometricScore?: number;
    qualityChecks?: unknown;
  };
}

export interface Customer {
  email?: string;
  name?: string;
  phone?: string;
}

export interface CreateVerificationRequest {
  customer: Customer;
  documentType?: DocumentType;
  redirectUrl?: string;
  webhookUrl?: string;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
}

export interface CreateVerificationResponse {
  verificationId: string;
  status: VerificationStatus;
  sessionToken: string;
  sdkUrl: string;
  expiresAt: string;
  meta: {
    requestId: string;
    timestamp: string;
  };
}
