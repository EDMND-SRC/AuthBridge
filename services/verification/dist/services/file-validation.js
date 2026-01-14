import { z } from 'zod';
import { MAX_FILE_SIZE, MIN_IMAGE_WIDTH, MIN_IMAGE_HEIGHT, ALLOWED_MIME_TYPES, } from '../types/document';
const documentSideSchema = z.enum([
    'omang_front',
    'omang_back',
    'selfie',
    'passport',
    'drivers_license_front',
    'drivers_license_back',
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
/**
 * Validate upload document request schema
 */
export function validateUploadDocumentRequest(request) {
    const result = uploadDocumentRequestSchema.safeParse(request);
    if (result.success) {
        return { success: true, data: result.data };
    }
    const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
    }));
    return { success: false, errors };
}
/**
 * Parse base64 data URI and extract mime type and binary data
 * Supports format: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...
 */
export function parseBase64DataUri(dataUri) {
    // Match data URI pattern
    const match = dataUri.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!match) {
        return null;
    }
    const [, mimeType, base64Data] = match;
    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return null;
    }
    try {
        const data = Buffer.from(base64Data, 'base64');
        return {
            mimeType: mimeType,
            data,
            size: data.length,
        };
    }
    catch {
        return null;
    }
}
/**
 * Validate file size (max 10MB)
 */
export function validateFileSize(size) {
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
 * Validate mime type
 */
export function validateMimeType(mimeType) {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
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
export function isValidDocumentSide(documentSide) {
    return documentSideSchema.safeParse(documentSide).success;
}
/**
 * Extract image dimensions from JPEG buffer
 * JPEG SOF0 marker contains width and height
 */
export function getJpegDimensions(buffer) {
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
    }
    catch {
        return null;
    }
}
/**
 * Extract image dimensions from PNG buffer
 * PNG IHDR chunk contains width and height
 */
export function getPngDimensions(buffer) {
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
    }
    catch {
        return null;
    }
}
/**
 * Get image dimensions from buffer based on mime type
 */
export function getImageDimensions(buffer, mimeType) {
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
export function validateImageDimensions(dimensions, mimeType) {
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
/**
 * Scan file buffer for known malicious signatures
 * This is a basic signature-based scan - production should use ClamAV or similar
 */
export function scanForViruses(buffer) {
    // Check for EICAR test file (standard antivirus test)
    const bufferString = buffer.toString('utf8', 0, Math.min(buffer.length, 128));
    if (bufferString.includes(EICAR_SIGNATURE)) {
        return { clean: false, threat: 'EICAR test file detected' };
    }
    // Check for known malicious signatures
    for (const { signature, name } of MALICIOUS_SIGNATURES) {
        if (buffer.length >= signature.length) {
            const header = buffer.slice(0, signature.length);
            if (header.equals(signature)) {
                return { clean: false, threat: `Suspicious file type: ${name}` };
            }
        }
    }
    // Check for embedded scripts in image files
    const lowerContent = buffer.toString('utf8', 0, Math.min(buffer.length, 1024)).toLowerCase();
    if (lowerContent.includes('<script') || lowerContent.includes('javascript:')) {
        return { clean: false, threat: 'Embedded script detected' };
    }
    return { clean: true };
}
// Thresholds for image quality
const BLUR_THRESHOLD = 0.7; // Max acceptable blur
const MIN_BRIGHTNESS = 0.15; // Too dark below this
const MAX_BRIGHTNESS = 0.85; // Too bright above this
const MIN_CONTRAST = 0.2; // Too low contrast below this
/**
 * Calculate Laplacian variance as blur metric
 * Lower variance = more blur
 */
function calculateBlurMetric(buffer, width, height) {
    // Simplified blur detection using pixel variance
    // In production, use Sharp or OpenCV for proper Laplacian variance
    if (buffer.length < width * height) {
        return 0.5; // Default if buffer too small
    }
    // Sample pixels and calculate variance
    const sampleSize = Math.min(1000, Math.floor(buffer.length / 4));
    const samples = [];
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
function calculateBrightness(buffer) {
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
function calculateContrast(buffer) {
    if (buffer.length === 0) {
        return 0.5;
    }
    const sampleSize = Math.min(5000, buffer.length);
    const step = Math.max(1, Math.floor(buffer.length / sampleSize));
    const samples = [];
    for (let i = 0; i < buffer.length && samples.length < sampleSize; i += step) {
        samples.push(buffer[i]);
    }
    if (samples.length < 10) {
        return 0.5;
    }
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const stdDev = Math.sqrt(samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length);
    // Normalize to 0-1 (typical stdDev for good contrast is 50-80)
    return Math.min(stdDev / 80, 1);
}
/**
 * Check image quality (blur, brightness, contrast)
 * Returns quality metrics and whether image is acceptable
 */
export function checkImageQuality(buffer, dimensions, mimeType) {
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
    const metrics = { blur, brightness, contrast };
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
//# sourceMappingURL=file-validation.js.map