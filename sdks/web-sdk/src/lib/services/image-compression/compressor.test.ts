import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateImageSize, compressImage } from './compressor';

// Mock CompressorJS
vi.mock('compressorjs', () => ({
  default: vi.fn().mockImplementation((file, options) => {
    // Simulate successful compression
    const compressedSize = Math.floor(file.size * 0.4); // 60% compression
    const compressedBlob = new Blob(['x'.repeat(compressedSize)], { type: 'image/jpeg' });

    // Call success callback asynchronously
    setTimeout(() => {
      options.success(compressedBlob);
    }, 0);
  }),
}));

describe('Image Compression Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateImageSize', () => {
    it('should return true for images < 1MB', () => {
      const smallBlob = new Blob(['x'.repeat(500 * 1024)], { type: 'image/jpeg' });
      expect(validateImageSize(smallBlob)).toBe(true);
    });

    it('should return false for images > 1MB', () => {
      const largeBlob = new Blob(['x'.repeat(2 * 1024 * 1024)], { type: 'image/jpeg' });
      expect(validateImageSize(largeBlob)).toBe(false);
    });

    it('should return true for images exactly 1MB', () => {
      const exactBlob = new Blob(['x'.repeat(1024 * 1024)], { type: 'image/jpeg' });
      expect(validateImageSize(exactBlob)).toBe(true);
    });

    it('should return true for empty blob', () => {
      const emptyBlob = new Blob([], { type: 'image/jpeg' });
      expect(validateImageSize(emptyBlob)).toBe(true);
    });
  });

  describe('compressImage', () => {
    it('should compress image with default options', async () => {
      const originalBlob = new Blob(['x'.repeat(1000)], { type: 'image/jpeg' });

      const result = await compressImage(originalBlob);

      expect(result).toHaveProperty('blob');
      expect(result).toHaveProperty('base64');
      expect(result).toHaveProperty('compressionRatio');
    });

    it('should use quality 0.85 by default', async () => {
      const Compressor = (await import('compressorjs')).default;
      const originalBlob = new Blob(['x'.repeat(1000)], { type: 'image/jpeg' });

      await compressImage(originalBlob);

      expect(Compressor).toHaveBeenCalledWith(
        originalBlob,
        expect.objectContaining({ quality: 0.85 })
      );
    });

    it('should use maxWidth 1920 by default', async () => {
      const Compressor = (await import('compressorjs')).default;
      const originalBlob = new Blob(['x'.repeat(1000)], { type: 'image/jpeg' });

      await compressImage(originalBlob);

      expect(Compressor).toHaveBeenCalledWith(
        originalBlob,
        expect.objectContaining({ maxWidth: 1920 })
      );
    });

    it('should use maxHeight 1080 by default', async () => {
      const Compressor = (await import('compressorjs')).default;
      const originalBlob = new Blob(['x'.repeat(1000)], { type: 'image/jpeg' });

      await compressImage(originalBlob);

      expect(Compressor).toHaveBeenCalledWith(
        originalBlob,
        expect.objectContaining({ maxHeight: 1080 })
      );
    });

    it('should accept custom compression options', async () => {
      const Compressor = (await import('compressorjs')).default;
      const originalBlob = new Blob(['x'.repeat(1000)], { type: 'image/jpeg' });

      await compressImage(originalBlob, {
        quality: 0.7,
        maxWidth: 1280,
        maxHeight: 720,
      });

      expect(Compressor).toHaveBeenCalledWith(
        originalBlob,
        expect.objectContaining({
          quality: 0.7,
          maxWidth: 1280,
          maxHeight: 720,
        })
      );
    });

    it('should output JPEG format', async () => {
      const Compressor = (await import('compressorjs')).default;
      const originalBlob = new Blob(['x'.repeat(1000)], { type: 'image/png' });

      await compressImage(originalBlob);

      expect(Compressor).toHaveBeenCalledWith(
        originalBlob,
        expect.objectContaining({ mimeType: 'image/jpeg' })
      );
    });

    it('should calculate compression ratio correctly', async () => {
      const originalBlob = new Blob(['x'.repeat(1000)], { type: 'image/jpeg' });

      const result = await compressImage(originalBlob);

      // Compression ratio = original size / compressed size
      expect(result.compressionRatio).toBeGreaterThan(1);
    });

    it('should return base64 encoded string', async () => {
      const originalBlob = new Blob(['x'.repeat(1000)], { type: 'image/jpeg' });

      const result = await compressImage(originalBlob);

      expect(result.base64).toMatch(/^data:/);
    });

    it('should handle compression errors', async () => {
      const Compressor = (await import('compressorjs')).default;

      // Mock compression failure
      (Compressor as any).mockImplementationOnce((file: Blob, options: any) => {
        setTimeout(() => {
          options.error(new Error('Compression failed'));
        }, 0);
      });

      const originalBlob = new Blob(['x'.repeat(1000)], { type: 'image/jpeg' });

      await expect(compressImage(originalBlob)).rejects.toThrow('Compression failed');
    });

    it('should handle File input as well as Blob', async () => {
      const file = new File(['x'.repeat(1000)], 'test.jpg', { type: 'image/jpeg' });

      const result = await compressImage(file);

      expect(result).toHaveProperty('blob');
      expect(result).toHaveProperty('base64');
    });
  });
});
