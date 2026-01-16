/**
 * Document types for document upload functionality
 */
export type DocumentSide = 'omang_front' | 'omang_back' | 'selfie' | 'passport' | 'drivers_licence_front' | 'drivers_licence_back' | 'id_card_front' | 'id_card_back';
export type DocumentStatus = 'uploaded' | 'processing' | 'processed' | 'failed';
export type CaptureMethod = 'camera' | 'upload';
export type DeviceType = 'mobile' | 'desktop' | 'tablet';
export interface DocumentMetadata {
    captureMethod?: CaptureMethod;
    deviceType?: DeviceType;
    timestamp?: string;
}
export interface UploadDocumentRequest {
    documentType: DocumentSide;
    imageData: string;
    metadata?: DocumentMetadata;
}
export interface DocumentEntity {
    PK: string;
    SK: string;
    documentId: string;
    verificationId: string;
    documentType: DocumentSide;
    s3Key: string;
    s3Bucket: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
    status: DocumentStatus;
    metadata?: DocumentMetadata;
    ocrConfidence?: number;
    processedAt?: string;
    processingResults?: {
        ocrData?: unknown;
        biometricScore?: number;
        qualityChecks?: unknown;
    };
}
export interface UploadDocumentResponse {
    documentId: string;
    verificationId: string;
    documentType: DocumentSide;
    s3Key: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
    status: DocumentStatus;
    presignedUrl: string;
    presignedUrlExpiresAt: string;
    meta: {
        requestId: string;
        timestamp: string;
    };
}
export declare const MAX_FILE_SIZE: number;
export declare const MIN_IMAGE_WIDTH = 640;
export declare const MIN_IMAGE_HEIGHT = 480;
export declare const ALLOWED_MIME_TYPES: readonly ["image/jpeg", "image/png", "application/pdf"];
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];
export declare const PRESIGNED_URL_EXPIRY_SECONDS: number;
//# sourceMappingURL=document.d.ts.map