export type VerificationStatus = 'created' | 'documents_uploading' | 'documents_complete' | 'submitted' | 'processing' | 'pending_review' | 'in_review' | 'approved' | 'rejected' | 'auto_rejected' | 'resubmission_required' | 'expired';
export type DocumentType = 'omang' | 'passport' | 'drivers_license' | 'id_card';
export interface CustomerMetadata {
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
    documentType: DocumentType;
    customerMetadata: CustomerMetadata;
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
export interface CreateVerificationRequest {
    documentType: DocumentType;
    customerMetadata: CustomerMetadata;
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