import { type AllowedMimeType, type DocumentSide, type UploadDocumentRequest } from '../types/document';
export interface ParsedBase64 {
    mimeType: AllowedMimeType;
    data: Buffer;
    size: number;
}
export interface ImageDimensions {
    width: number;
    height: number;
}
export interface FileValidationResult {
    success: true;
    data: UploadDocumentRequest;
}
export interface FileValidationError {
    success: false;
    errors: Array<{
        field: string;
        message: string;
    }>;
}
/**
 * Validate upload document request schema
 */
export declare function validateUploadDocumentRequest(request: unknown): FileValidationResult | FileValidationError;
/**
 * Parse base64 data URI and extract mime type and binary data.
 * Validates MIME type and checks magic bytes to prevent type spoofing.
 *
 * Supports format: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...
 *
 * @param dataUri - Base64 data URI string
 * @returns Parsed data with validated MIME type, or null if invalid
 */
export declare function parseBase64DataUri(dataUri: string): ParsedBase64 | null;
/**
 * Validate file size against maximum allowed size.
 *
 * @param size - File size in bytes
 * @returns Validation result with error message if invalid
 */
export declare function validateFileSize(size: number): {
    valid: true;
} | {
    valid: false;
    message: string;
};
/**
 * Validate MIME type against allowed types.
 *
 * @param mimeType - MIME type string to validate
 * @returns Validation result with error message if invalid
 */
export declare function validateMimeType(mimeType: string): {
    valid: true;
} | {
    valid: false;
    message: string;
};
/**
 * Check if document type is valid for the verification document type
 */
export declare function isValidDocumentSide(documentSide: string): documentSide is DocumentSide;
/**
 * Extract image dimensions from JPEG buffer
 * JPEG SOF0 marker contains width and height
 */
export declare function getJpegDimensions(buffer: Buffer): ImageDimensions | null;
/**
 * Extract image dimensions from PNG buffer
 * PNG IHDR chunk contains width and height
 */
export declare function getPngDimensions(buffer: Buffer): ImageDimensions | null;
/**
 * Get image dimensions from buffer based on mime type
 */
export declare function getImageDimensions(buffer: Buffer, mimeType: string): ImageDimensions | null;
/**
 * Validate image dimensions (min 640x480)
 */
export declare function validateImageDimensions(dimensions: ImageDimensions | null, mimeType: string): {
    valid: true;
} | {
    valid: false;
    message: string;
};
export interface VirusScanResult {
    clean: true;
}
export interface VirusScanThreat {
    clean: false;
    threat: string;
}
/**
 * Scan file buffer for known malicious signatures.
 *
 * This is a basic signature-based scan suitable for common threats.
 * For production, consider integrating ClamAV or AWS GuardDuty Malware Protection.
 *
 * Scans entire file for:
 * - EICAR test signatures
 * - Executable file headers (PE, ELF)
 * - Script files (PHP, JavaScript, shell)
 * - Archive files (ZIP, RAR)
 * - Embedded scripts in images
 *
 * @param buffer - File data buffer to scan
 * @returns Scan result indicating if file is clean or contains threats
 */
export declare function scanForViruses(buffer: Buffer): VirusScanResult | VirusScanThreat;
export interface ImageQualityMetrics {
    blur: number;
    brightness: number;
    contrast: number;
}
export interface ImageQualityResult {
    acceptable: true;
    metrics: ImageQualityMetrics;
}
export interface ImageQualityFailure {
    acceptable: false;
    reason: string;
    metrics: ImageQualityMetrics;
}
/**
 * Parse multipart/form-data request body
 * Extracts documentType, file data, and optional metadata
 */
export declare function parseMultipartFormData(body: string, contentType: string): {
    documentType: string;
    imageBuffer: Buffer;
    mimeType: string;
    metadata?: {
        captureMethod?: 'camera' | 'upload';
        deviceType?: 'mobile' | 'desktop' | 'tablet';
        timestamp?: string;
    };
} | null;
/**
 * Check image quality (blur, brightness, contrast)
 * Returns quality metrics and whether image is acceptable
 */
export declare function checkImageQuality(buffer: Buffer, dimensions: ImageDimensions | null, mimeType: string): ImageQualityResult | ImageQualityFailure;
//# sourceMappingURL=file-validation.d.ts.map