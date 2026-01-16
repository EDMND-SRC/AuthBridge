/**
 * Document types for document upload functionality
 */

export type DocumentSide =
  | 'omang_front'
  | 'omang_back'
  | 'selfie'
  | 'passport'
  | 'drivers_licence_front'
  | 'drivers_licence_back'
  | 'id_card_front'
  | 'id_card_back';

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
  imageData: string; // base64 data URI
  metadata?: DocumentMetadata;
}

export interface DocumentEntity {
  PK: string; // CASE#<verificationId>
  SK: string; // DOC#<documentId>
  documentId: string;
  verificationId: string;
  documentType: DocumentSide;
  s3Key: string;
  s3Bucket: string;
  fileSize: number; // bytes
  mimeType: string;
  uploadedAt: string; // ISO 8601
  status: DocumentStatus;
  metadata?: DocumentMetadata;
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

// File validation constants
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MIN_IMAGE_WIDTH = 640;
export const MIN_IMAGE_HEIGHT = 480;
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const PRESIGNED_URL_EXPIRY_SECONDS = 15 * 60; // 15 minutes
