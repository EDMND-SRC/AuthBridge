export type VerificationStatus = 'created' | 'documents_uploading' | 'documents_complete' | 'submitted' | 'processing' | 'pending_review' | 'in_review' | 'approved' | 'rejected' | 'auto_rejected' | 'resubmission_required' | 'expired';
export type DocumentType = 'omang' | 'passport' | 'drivers_licence' | 'id_card';
export interface CustomerMetadata {
    name?: string;
    email?: string;
    phone?: string;
    externalId?: string;
    redirectUrl?: string;
}
export interface VerificationEntity {
    PK: string;
    SK: string;
    verificationId: string;
    clientId: string;
    status: VerificationStatus;
    documentType?: DocumentType;
    customer?: Customer;
    customerMetadata?: CustomerMetadata;
    redirectUrl?: string;
    webhookUrl?: string;
    metadata?: Record<string, string>;
    createdAt: string;
    updatedAt: string;
    submittedAt?: string;
    completedAt?: string;
    expiresAt: string;
    ttl: number;
    GSI1PK: string;
    GSI1SK: string;
    GSI2PK: string;
    GSI2SK: string;
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
        district?: string;
        locality?: string;
        [key: string]: unknown;
    };
    rejectionReason?: string;
    rejectionCode?: 'BLURRY_IMAGE' | 'FACE_MISMATCH' | 'INVALID_DOCUMENT' | 'EXPIRED_DOCUMENT' | 'DUPLICATE_OMANG';
    assignee?: string;
}
export interface DocumentEntity {
    PK: string;
    SK: string;
    documentId: string;
    verificationId: string;
    documentType: string;
    s3Key: string;
    s3Bucket: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
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
//# sourceMappingURL=verification.d.ts.map