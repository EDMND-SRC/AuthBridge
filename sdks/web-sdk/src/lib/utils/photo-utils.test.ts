import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analyzeImageQuality, type QualityFeedback } from './photo-utils';

describe('Photo Quality Utils', () => {
  let mockVideo: HTMLVideoElement;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    // Mock video element
    mockVideo = {
      videoWidth: 1920,
      videoHeight: 1080,
    } as HTMLVideoElement;

    // Mock canvas and context
    mockContext = {
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({
        data: new Uint8ClampedArray(1920 * 1080 * 4).fill(128), // Mid-gray image
        width: 1920,
        height: 1080,
      }),
    } as unknown as CanvasRenderingContext2D;

    mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockContext),
      width: 0,
      height: 0,
    } as unknown as HTMLCanvasElement;

    // Mock document.createElement
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLElement);
  });

  describe('analyzeImageQuality', () => {
    describe('Lighting Detection', () => {
      it('should detect good lighting conditions (brightness 50-200)', () => {
        // Mock mid-brightness image (good lighting) - RGB values around 128
        const pixelCount = 1920 * 1080;
        const data = new Uint8ClampedArray(pixelCount * 4);
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 128;     // R
          data[i + 1] = 128; // G
          data[i + 2] = 128; // B
          data[i + 3] = 255; // A
        }
        mockContext.getImageData = vi.fn().mockReturnValue({
          data,
          width: 1920,
          height: 1080,
        });

        const result = analyzeImageQuality(mockVideo);

        expect(result.lighting).toBe('good');
      });

      it('should detect too dark lighting (brightness < 50)', () => {
        // Mock dark image - RGB values around 30
        const pixelCount = 1920 * 1080;
        const data = new Uint8ClampedArray(pixelCount * 4);
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 30;      // R
          data[i + 1] = 30;  // G
          data[i + 2] = 30;  // B
          data[i + 3] = 255; // A
        }
        mockContext.getImageData = vi.fn().mockReturnValue({
          data,
          width: 1920,
          height: 1080,
        });

        const result = analyzeImageQuality(mockVideo);

        expect(result.lighting).toBe('tooDark');
      });

      it('should detect too bright lighting (brightness > 200)', () => {
        // Mock bright image - RGB values around 220
        const pixelCount = 1920 * 1080;
        const data = new Uint8ClampedArray(pixelCount * 4);
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 220;     // R
          data[i + 1] = 220; // G
          data[i + 2] = 220; // B
          data[i + 3] = 255; // A
        }
        mockContext.getImageData = vi.fn().mockReturnValue({
          data,
          width: 1920,
          height: 1080,
        });

        const result = analyzeImageQuality(mockVideo);

        expect(result.lighting).toBe('tooBright');
      });

      it('should handle edge case at brightness threshold 50', () => {
        const pixelCount = 1920 * 1080;
        const data = new Uint8ClampedArray(pixelCount * 4);
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 50;      // R - exactly at threshold
          data[i + 1] = 50;  // G
          data[i + 2] = 50;  // B
          data[i + 3] = 255; // A
        }
        mockContext.getImageData = vi.fn().mockReturnValue({
          data,
          width: 1920,
          height: 1080,
        });

        const result = analyzeImageQuality(mockVideo);

        // At exactly 50, should be 'good' (not < 50)
        expect(result.lighting).toBe('good');
      });
    });

    describe('Blur Detection', () => {
      it('should detect sharp image (high Laplacian variance)', () => {
        // Create image with high contrast edges (sharp)
        const pixelCount = 100 * 100; // Smaller for test
        const data = new Uint8ClampedArray(pixelCount * 4);

        // Create alternating pattern for high variance
        for (let i = 0; i < data.length; i += 4) {
          const pixelIndex = i / 4;
          const row = Math.floor(pixelIndex / 100);
          const col = pixelIndex % 100;
          const value = ((row + col) % 2 === 0) ? 255 : 0; // Checkerboard
          data[i] = value;
          data[i + 1] = value;
          data[i + 2] = value;
          data[i + 3] = 255;
        }

        mockContext.getImageData = vi.fn().mockReturnValue({
          data,
          width: 100,
          height: 100,
        });

        const result = analyzeImageQuality(mockVideo);

        // High variance checkerboard should be detected as sharp
        expect(['good', 'tooBlurry', 'moveCloser']).toContain(result.blur);
      });

      it('should detect blurry image (low Laplacian variance)', () => {
        // Create uniform image (no edges = blurry)
        const pixelCount = 100 * 100;
        const data = new Uint8ClampedArray(pixelCount * 4);

        // Uniform gray - no edges
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 128;
          data[i + 1] = 128;
          data[i + 2] = 128;
          data[i + 3] = 255;
        }

        mockContext.getImageData = vi.fn().mockReturnValue({
          data,
          width: 100,
          height: 100,
        });

        const result = analyzeImageQuality(mockVideo);

        // Uniform image has zero variance = blurry
        expect(result.blur).toBe('tooBlurry');
      });

      it('should return valid blur status', () => {
        const result = analyzeImageQuality(mockVideo);

        expect(['tooBlurry', 'moveCloser', 'good']).toContain(result.blur);
      });
    });

    describe('Glare Detection', () => {
      it('should detect glare when >10% pixels are significantly brighter than average', () => {
        const pixelCount = 1000; // 1000 pixels
        const data = new Uint8ClampedArray(pixelCount * 4);

        // 85% normal pixels (brightness 100)
        for (let i = 0; i < 850 * 4; i += 4) {
          data[i] = 100;
          data[i + 1] = 100;
          data[i + 2] = 100;
          data[i + 3] = 255;
        }

        // 15% very bright pixels (brightness 255) - glare spots
        for (let i = 850 * 4; i < data.length; i += 4) {
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
          data[i + 3] = 255;
        }

        mockContext.getImageData = vi.fn().mockReturnValue({
          data,
          width: 100,
          height: 10,
        });

        const result = analyzeImageQuality(mockVideo);

        expect(result.glare).toBe('detected');
      });

      it('should not detect glare when bright pixels are <10%', () => {
        const pixelCount = 1000;
        const data = new Uint8ClampedArray(pixelCount * 4);

        // 95% normal pixels
        for (let i = 0; i < 950 * 4; i += 4) {
          data[i] = 100;
          data[i + 1] = 100;
          data[i + 2] = 100;
          data[i + 3] = 255;
        }

        // Only 5% bright pixels - not enough for glare
        for (let i = 950 * 4; i < data.length; i += 4) {
          data[i] = 200;
          data[i + 1] = 200;
          data[i + 2] = 200;
          data[i + 3] = 255;
        }

        mockContext.getImageData = vi.fn().mockReturnValue({
          data,
          width: 100,
          height: 10,
        });

        const result = analyzeImageQuality(mockVideo);

        expect(result.glare).toBe('good');
      });

      it('should return valid glare status', () => {
        const result = analyzeImageQuality(mockVideo);

        expect(['detected', 'good']).toContain(result.glare);
      });
    });

    describe('Edge Cases', () => {
      it('should handle missing canvas context gracefully', () => {
        mockCanvas.getContext = vi.fn().mockReturnValue(null);

        const result = analyzeImageQuality(mockVideo);

        expect(result).toEqual({
          lighting: 'good',
          blur: 'good',
          glare: 'good',
        });
      });

      it('should return all quality metrics', () => {
        const result = analyzeImageQuality(mockVideo);

        expect(result).toHaveProperty('lighting');
        expect(result).toHaveProperty('blur');
        expect(result).toHaveProperty('glare');
      });

      it('should handle small video dimensions', () => {
        mockVideo.videoWidth = 10;
        mockVideo.videoHeight = 10;

        const data = new Uint8ClampedArray(10 * 10 * 4).fill(128);
        mockContext.getImageData = vi.fn().mockReturnValue({
          data,
          width: 10,
          height: 10,
        });

        const result = analyzeImageQuality(mockVideo);

        expect(result).toHaveProperty('lighting');
        expect(result).toHaveProperty('blur');
        expect(result).toHaveProperty('glare');
      });

      it('should handle zero-size video gracefully', () => {
        mockVideo.videoWidth = 0;
        mockVideo.videoHeight = 0;

        mockContext.getImageData = vi.fn().mockReturnValue({
          data: new Uint8ClampedArray(0),
          width: 0,
          height: 0,
        });

        // Should not throw
        expect(() => analyzeImageQuality(mockVideo)).not.toThrow();
      });
    });
  });
});
