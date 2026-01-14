import Compressor from 'compressorjs';

export interface CompressionOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface CompressionResult {
  blob: Blob;
  base64: string;
  compressionRatio: number;
}

/**
 * Compress an image using CompressorJS
 * @param file - Image file or blob to compress
 * @param options - Compression options (quality, maxWidth, maxHeight)
 * @returns Promise with compressed blob, base64 string, and compression ratio
 */
export async function compressImage(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const { quality = 0.85, maxWidth = 1920, maxHeight = 1080 } = options;
  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality,
      maxWidth,
      maxHeight,
      mimeType: 'image/jpeg',
      success(result: Blob) {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            blob: result,
            base64: reader.result as string,
            compressionRatio: originalSize / result.size,
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(result);
      },
      error(err: Error) {
        reject(err);
      },
    });
  });
}

/**
 * Validate that an image blob is under 1MB
 * @param blob - Image blob to validate
 * @returns true if blob size is <= 1MB
 */
export function validateImageSize(blob: Blob): boolean {
  const MAX_SIZE = 1024 * 1024; // 1MB
  return blob.size <= MAX_SIZE;
}
