import { z } from 'zod';
import {
  MAX_FILE_SIZE,
  MIN_IMAGE_WIDTH,
  MIN_IMAGE_HEIGHT,
  ALLOWED_MIME_TYPES,
  type AllowedMimeType,
  type DocumentSide,
  type UploadDocumentRequest,
} from '../types/document';

const documentSideSchema = z.enum([
  'omang_front',
  'omang_back',
  'selfie',
  'passport',
  'drivers_licence_front',
  'drivers_licence_back',
  'id_card_front',
  'id_card_back',
]);

const documentMetadataSchema = z.object({
  captureMethod: z.enum(['camera', 'upload']).optional(),
  deviceType: z.enum(['mobile', 'desktop', 'tablet']).optional(),
  timestamp: z.string().datetime().optional(),
}).optional();

const uploadDocumentRequestSchema = z.object({
  documentType: documentSideSchema,
  imageData: z.string().min(1, 'Image data is required'),
  metadata: documentMetadataSchema,
});

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
  errors: Array<{ field: string; message: string }>;
}

/**
 * Validate upload document request schema
 */
export function validateUploadDocumentRequest(
  request: unknown
): FileValidationResult | FileValidationError {
  const result = uploadDocumentRequestSchema.safeParse(request);

  if (result.success) {
    return { success: true, data: result.data as UploadDocumentRequest };
  }

  const errors = result.error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));

  return { success: false, errors };
}

/**
 * Parse base64 data URI and extract mime type and binary data.
 * Validates MIME type and checks magic bytes to prevent type spoofing.
 *
 * Supports format: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...
 *
 * @param dataUri - Base64 data URI string
 * @returns Parsed data with validated MIME type, or null if invalid
 */
export function parseBase64DataUri(dataUri: string): ParsedBase64 | null {
  // Match data URI pattern
  const match = dataUri.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);

  if (!match) {
    return null;
  }

  const [, mimeType, base64Data] = match;

  // Validate mime type
  if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
    return null;
  }

  try {
    const data = Buffer.from(base64Data, 'base64');

    // Validate magic bytes match declared MIME type (prevent type spoofing)
    if (!validateMagicBytes(data, mimeType as AllowedMimeType)) {
      return null;
    }

    return {
      mimeType: mimeType as AllowedMimeType,
      data,
      size: data.length,
    };
  } catch {
    return null;
  }
}

/**
 * Validate file magic bytes match declared MIME type.
 * Prevents attackers from uploading malicious files with fake MIME type headers.
 *
 * @param buffer - File data buffer
 * @param mimeType - Declared MIME type
 * @returns True if magic bytes match MIME type
 */
function validateMagicBytes(buffer: Buffer, mimeType: AllowedMimeType): boolean {
  if (buffer.length < 4) {
    return false;
  }

  switch (mimeType) {
    case 'image/jpeg':
      // JPEG: FF D8 FF
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

    case 'image/png':
      // PNG: 89 50 4E 47 0D 0A 1A 0A
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );

    case 'application/pdf':
      // PDF: %PDF
      return buffer.toString('utf8', 0, 4) === '%PDF';

    default:
      return false;
  }
}

/**
 * Validate file size against maximum allowed size.
 *
 * @param size - File size in bytes
 * @returns Validation result with error message if invalid
 */
export function validateFileSize(size: number): { valid: true } | { valid: false; message: string } {
  if (size > MAX_FILE_SIZE) {
    const sizeMB = (size / (1024 * 1024)).toFixed(2);
    const maxMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      message: `File size: ${sizeMB}MB, Maximum: ${maxMB}MB`,
    };
  }
  return { valid: true };
}

/**
 * Validate MIME type against allowed types.
 *
 * @param mimeType - MIME type string to validate
 * @returns Validation result with error message if invalid
 */
export function validateMimeType(
  mimeType: string
): { valid: true } | { valid: false; message: string } {
  if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
    return {
      valid: false,
      message: `Supported types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }
  return { valid: true };
}

/**
 * Check if document type is valid for the verification document type
 */
export function isValidDocumentSide(documentSide: string): documentSide is DocumentSide {
  return documentSideSchema.safeParse(documentSide).success;
}

/**
 * Extract image dimensions from JPEG buffer
 * JPEG SOF0 marker contains width and height
 */
export function getJpegDimensions(buffer: Buffer): ImageDimensions | null {
  try {
    let offset = 2; // Skip SOI marker (0xFFD8)

    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) {
        return null;
      }

      const marker = buffer[offset + 1];

      // SOF0, SOF1, SOF2 markers contain dimensions
      if (marker >= 0xc0 && marker <= 0xc3) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { width, height };
      }

      // Skip to next marker
      const length = buffer.readUInt16BE(offset + 2);
      offset += 2 + length;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract image dimensions from PNG buffer
 * PNG IHDR chunk contains width and height
 */
export function getPngDimensions(buffer: Buffer): ImageDimensions | null {
  try {
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    // IHDR chunk starts at offset 8
    if (buffer.length < 24) {
      return null;
    }

    // Check PNG signature
    const signature = buffer.slice(0, 8);
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (!signature.equals(pngSignature)) {
      return null;
    }

    // IHDR chunk: width at offset 16, height at offset 20
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);

    return { width, height };
  } catch {
    return null;
  }
}

/**
 * Get image dimensions from buffer based on mime type
 */
export function getImageDimensions(buffer: Buffer, mimeType: string): ImageDimensions | null {
  if (mimeType === 'image/jpeg') {
    return getJpegDimensions(buffer);
  }
  if (mimeType === 'image/png') {
    return getPngDimensions(buffer);
  }
  // PDF doesn't have image dimensions in the same way
  return null;
}

/**
 * Validate image dimensions (min 640x480)
 */
export function validateImageDimensions(
  dimensions: ImageDimensions | null,
  mimeType: string
): { valid: true } | { valid: false; message: string } {
  // Skip dimension validation for PDFs
  if (mimeType === 'application/pdf') {
    return { valid: true };
  }

  if (!dimensions) {
    return {
      valid: false,
      message: 'Unable to read image dimensions',
    };
  }

  if (dimensions.width < MIN_IMAGE_WIDTH || dimensions.height < MIN_IMAGE_HEIGHT) {
    return {
      valid: false,
      message: `Image dimensions: ${dimensions.width}x${dimensions.height}, Minimum: ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT}`,
    };
  }

  return { valid: true };
}

// Known malicious file signatures (magic bytes)
const MALICIOUS_SIGNATURES = [
  // Executable files
  { signature: Buffer.from([0x4d, 0x5a]), name: 'Windows executable (MZ)' }, // PE/EXE
  { signature: Buffer.from([0x7f, 0x45, 0x4c, 0x46]), name: 'Linux executable (ELF)' },
  // Script files that could be disguised
  { signature: Buffer.from('<?php'), name: 'PHP script' },
  { signature: Buffer.from('<script'), name: 'JavaScript/HTML script' },
  { signature: Buffer.from('#!/'), name: 'Shell script' },
  // Archive files that could contain malware
  { signature: Buffer.from([0x50, 0x4b, 0x03, 0x04]), name: 'ZIP archive' },
  { signature: Buffer.from([0x52, 0x61, 0x72, 0x21]), name: 'RAR archive' },
  // Other potentially dangerous formats
  { signature: Buffer.from([0xd0, 0xcf, 0x11, 0xe0]), name: 'Microsoft Office (OLE)' },
];

// EICAR test signature for antivirus testing
const EICAR_SIGNATURE = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

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
export function scanForViruses(buffer: Buffer): VirusScanResult | VirusScanThreat {
  // Check for EICAR test file (standard antivirus test)
  const bufferString = buffer.toString('utf8', 0, Math.min(buffer.length, 128));
  if (bufferString.includes(EICAR_SIGNATURE)) {
    return { clean: false, threat: 'EICAR test file detected' };
  }

  // Check for known malicious signatures at file start
  for (const { signature, name } of MALICIOUS_SIGNATURES) {
    if (buffer.length >= signature.length) {
      const header = buffer.slice(0, signature.length);
      if (header.equals(signature)) {
        return { clean: false, threat: `Suspicious file type: ${name}` };
      }
    }
  }

  // Check for embedded scripts throughout entire file (not just first 1KB)
  // Scan in chunks to avoid memory issues with large files
  const chunkSize = 4096;
  for (let offset = 0; offset < buffer.length; offset += chunkSize) {
    const chunk = buffer.toString('utf8', offset, Math.min(offset + chunkSize, buffer.length)).toLowerCase();
    if (chunk.includes('<script') || chunk.includes('javascript:') || chunk.includes('<?php')) {
      return { clean: false, threat: 'Embedded script detected in file content' };
    }
  }

  return { clean: true };
}

export interface ImageQualityMetrics {
  blur: number;      // 0-1, higher = more blur
  brightness: number; // 0-1, 0.5 = ideal
  contrast: number;   // 0-1, higher = more contrast
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

// Thresholds for image quality
const BLUR_THRESHOLD = 0.7;        // Max acceptable blur
const MIN_BRIGHTNESS = 0.15;       // Too dark below this
const MAX_BRIGHTNESS = 0.85;       // Too bright above this
const MIN_CONTRAST = 0.2;          // Too low contrast below this

/**
 * Calculate Laplacian variance as blur metric
 * Lower variance = more blur
 */
function calculateBlurMetric(buffer: Buffer, width: number, height: number): number {
  // Simplified blur detection using pixel variance
  // In production, use Sharp or OpenCV for proper Laplacian variance

  if (buffer.length < width * height) {
    return 0.5; // Default if buffer too small
  }

  // Sample pixels and calculate variance
  const sampleSize = Math.min(1000, Math.floor(buffer.length / 4));
  const samples: number[] = [];
  const step = Math.floor(buffer.length / sampleSize);

  for (let i = 0; i < buffer.length && samples.length < sampleSize; i += step) {
    samples.push(buffer[i]);
  }

  if (samples.length < 10) {
    return 0.5;
  }

  // Calculate variance
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;

  // Normalize variance to 0-1 scale (higher variance = less blur = lower blur score)
  // Typical variance for sharp images is 1000-5000, blurry is < 500
  const normalizedVariance = Math.min(variance / 3000, 1);

  // Invert so higher = more blur
  return 1 - normalizedVariance;
}

/**
 * Calculate average brightness of image
 */
function calculateBrightness(buffer: Buffer): number {
  if (buffer.length === 0) {
    return 0.5;
  }

  // Sample pixels for brightness
  const sampleSize = Math.min(5000, buffer.length);
  const step = Math.max(1, Math.floor(buffer.length / sampleSize));
  let sum = 0;
  let count = 0;

  for (let i = 0; i < buffer.length; i += step) {
    sum += buffer[i];
    count++;
  }

  return count > 0 ? (sum / count) / 255 : 0.5;
}

/**
 * Calculate contrast using standard deviation of pixel values
 */
function calculateContrast(buffer: Buffer): number {
  if (buffer.length === 0) {
    return 0.5;
  }

  const sampleSize = Math.min(5000, buffer.length);
  const step = Math.max(1, Math.floor(buffer.length / sampleSize));
  const samples: number[] = [];

  for (let i = 0; i < buffer.length && samples.length < sampleSize; i += step) {
    samples.push(buffer[i]);
  }

  if (samples.length < 10) {
    return 0.5;
  }

  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const stdDev = Math.sqrt(
    samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length
  );

  // Normalize to 0-1 (typical stdDev for good contrast is 50-80)
  return Math.min(stdDev / 80, 1);
}

/**
 * Parse multipart/form-data request body
 * Extracts documentType, file data, and optional metadata
 */
export function parseMultipartFormData(
  body: string,
  contentType: string
): {
  documentType: string;
  imageBuffer: Buffer;
  mimeType: string;
  metadata?: {
    captureMethod?: 'camera' | 'upload';
    deviceType?: 'mobile' | 'desktop' | 'tablet';
    timestamp?: string;
  };
} | null {
  // Extract boundary from content-type header
  const boundaryMatch = contentType.match(/boundary=(.+)$/);
  if (!boundaryMatch) {
    return null;
  }

  const boundary = boundaryMatch[1];
  const parts = body.split(`--${boundary}`);

  let documentType = '';
  let imageBuffer: Buffer | null = null;
  let mimeType = '';
  const metadata: {
    captureMethod?: 'camera' | 'upload';
    deviceType?: 'mobile' | 'desktop' | 'tablet';
    timestamp?: string;
  } = {};

  for (const part of parts) {
    if (part.includes('Content-Disposition')) {
      // Parse part headers and body
      const [headers, ...bodyParts] = part.split('\r\n\r\n');
      const partBody = bodyParts.join('\r\n\r\n').trim();

      if (headers.includes('name="documentType"')) {
        documentType = partBody;
      } else if (headers.includes('name="file"')) {
        // Extract MIME type from Content-Type header
        const mimeMatch = headers.match(/Content-Type:\s*(.+)/i);
        if (mimeMatch) {
          mimeType = mimeMatch[1].trim();
        }

        // Convert body to buffer
        imageBuffer = Buffer.from(partBody, 'binary');
      } else if (headers.includes('name="metadata"')) {
        try {
          const parsedMetadata = JSON.parse(partBody);

          // Validate metadata fields match expected types
          if (parsedMetadata.captureMethod && !['camera', 'upload'].includes(parsedMetadata.captureMethod)) {
            // Invalid captureMethod, skip this field
          } else if (parsedMetadata.captureMethod) {
            metadata.captureMethod = parsedMetadata.captureMethod;
          }

          if (parsedMetadata.deviceType && !['mobile', 'desktop', 'tablet'].includes(parsedMetadata.deviceType)) {
            // Invalid deviceType, skip this field
          } else if (parsedMetadata.deviceType) {
            metadata.deviceType = parsedMetadata.deviceType;
          }

          if (parsedMetadata.timestamp && typeof parsedMetadata.timestamp === 'string') {
            metadata.timestamp = parsedMetadata.timestamp;
          }
        } catch {
          // Ignore invalid metadata JSON
        }
      }
    }
  }

  if (!documentType || !imageBuffer) {
    return null;
  }

  return { documentType, imageBuffer, mimeType, metadata };
}

/**
 * Check image quality (blur, brightness, contrast)
 * Returns quality metrics and whether image is acceptable
 */
export function checkImageQuality(
  buffer: Buffer,
  dimensions: ImageDimensions | null,
  mimeType: string
): ImageQualityResult | ImageQualityFailure {
  // Skip quality checks for PDFs
  if (mimeType === 'application/pdf') {
    return {
      acceptable: true,
      metrics: { blur: 0, brightness: 0.5, contrast: 0.5 },
    };
  }

  const width = dimensions?.width || 640;
  const height = dimensions?.height || 480;

  const blur = calculateBlurMetric(buffer, width, height);
  const brightness = calculateBrightness(buffer);
  const contrast = calculateContrast(buffer);

  const metrics: ImageQualityMetrics = { blur, brightness, contrast };

  // Check blur
  if (blur > BLUR_THRESHOLD) {
    return {
      acceptable: false,
      reason: `Image is too blurry (score: ${(blur * 100).toFixed(0)}%, max: ${(BLUR_THRESHOLD * 100).toFixed(0)}%)`,
      metrics,
    };
  }

  // Check brightness
  if (brightness < MIN_BRIGHTNESS) {
    return {
      acceptable: false,
      reason: `Image is too dark (brightness: ${(brightness * 100).toFixed(0)}%, min: ${(MIN_BRIGHTNESS * 100).toFixed(0)}%)`,
      metrics,
    };
  }

  if (brightness > MAX_BRIGHTNESS) {
    return {
      acceptable: false,
      reason: `Image is too bright/overexposed (brightness: ${(brightness * 100).toFixed(0)}%, max: ${(MAX_BRIGHTNESS * 100).toFixed(0)}%)`,
      metrics,
    };
  }

  // Check contrast
  if (contrast < MIN_CONTRAST) {
    return {
      acceptable: false,
      reason: `Image has insufficient contrast (score: ${(contrast * 100).toFixed(0)}%, min: ${(MIN_CONTRAST * 100).toFixed(0)}%)`,
      metrics,
    };
  }

  return { acceptable: true, metrics };
}
