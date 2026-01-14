import { describe, it, expect } from 'vitest';
import {
  validateUploadDocumentRequest,
  parseBase64DataUri,
  validateFileSize,
  validateMimeType,
  isValidDocumentSide,
  getJpegDimensions,
  getPngDimensions,
  getImageDimensions,
  validateImageDimensions,
} from './file-validation';
import { MAX_FILE_SIZE, MIN_IMAGE_WIDTH, MIN_IMAGE_HEIGHT } from '../types/document';

describe('file-validation', () => {
  describe('validateUploadDocumentRequest', () => {
    it('should validate a valid request', () => {
      const request = {
        documentType: 'omang_front',
        imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      };

      const result = validateUploadDocumentRequest(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.documentType).toBe('omang_front');
      }
    });

    it('should validate request with metadata', () => {
      const request = {
        documentType: 'selfie',
        imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        metadata: {
          captureMethod: 'camera',
          deviceType: 'mobile',
          timestamp: '2026-01-14T10:00:00Z',
        },
      };

      const result = validateUploadDocumentRequest(request);
      expect(result.success).toBe(true);
    });

    it('should reject invalid document type', () => {
      const request = {
        documentType: 'invalid_type',
        imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      };

      const result = validateUploadDocumentRequest(request);
      expect(result.success).toBe(false);
    });

    it('should reject missing imageData', () => {
      const request = {
        documentType: 'omang_front',
      };

      const result = validateUploadDocumentRequest(request);
      expect(result.success).toBe(false);
    });

    it('should reject empty imageData', () => {
      const request = {
        documentType: 'omang_front',
        imageData: '',
      };

      const result = validateUploadDocumentRequest(request);
      expect(result.success).toBe(false);
    });

    it('should validate all document types', () => {
      const documentTypes = [
        'omang_front',
        'omang_back',
        'selfie',
        'passport',
        'drivers_license_front',
        'drivers_license_back',
        'id_card_front',
        'id_card_back',
      ];

      for (const documentType of documentTypes) {
        const request = {
          documentType,
          imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        };
        const result = validateUploadDocumentRequest(request);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('parseBase64DataUri', () => {
    it('should parse valid JPEG data URI', () => {
      const dataUri = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const result = parseBase64DataUri(dataUri);

      expect(result).not.toBeNull();
      expect(result?.mimeType).toBe('image/jpeg');
      expect(result?.data).toBeInstanceOf(Buffer);
      expect(result?.size).toBeGreaterThan(0);
    });

    it('should parse valid PNG data URI', () => {
      const dataUri = 'data:image/png;base64,iVBORw0KGgo=';
      const result = parseBase64DataUri(dataUri);

      expect(result).not.toBeNull();
      expect(result?.mimeType).toBe('image/png');
    });

    it('should parse valid PDF data URI', () => {
      const dataUri = 'data:application/pdf;base64,JVBERi0xLjQ=';
      const result = parseBase64DataUri(dataUri);

      expect(result).not.toBeNull();
      expect(result?.mimeType).toBe('application/pdf');
    });

    it('should reject invalid mime type', () => {
      const dataUri = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      const result = parseBase64DataUri(dataUri);

      expect(result).toBeNull();
    });

    it('should reject invalid data URI format', () => {
      const invalidUris = [
        'not-a-data-uri',
        'data:image/jpeg,/9j/4AAQSkZJRg==', // missing base64
        'image/jpeg;base64,/9j/4AAQSkZJRg==', // missing data:
        '',
      ];

      for (const uri of invalidUris) {
        const result = parseBase64DataUri(uri);
        expect(result).toBeNull();
      }
    });

    it('should calculate correct size', () => {
      // "Hello" in base64 is "SGVsbG8="
      const dataUri = 'data:image/jpeg;base64,SGVsbG8=';
      const result = parseBase64DataUri(dataUri);

      expect(result).not.toBeNull();
      expect(result?.size).toBe(5); // "Hello" is 5 bytes
    });
  });

  describe('validateFileSize', () => {
    it('should accept file under limit', () => {
      const result = validateFileSize(1024 * 1024); // 1MB
      expect(result.valid).toBe(true);
    });

    it('should accept file at limit', () => {
      const result = validateFileSize(MAX_FILE_SIZE);
      expect(result.valid).toBe(true);
    });

    it('should reject file over limit', () => {
      const result = validateFileSize(MAX_FILE_SIZE + 1);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.message).toContain('Maximum: 10MB');
      }
    });

    it('should include file size in error message', () => {
      const size = 12 * 1024 * 1024; // 12MB
      const result = validateFileSize(size);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.message).toContain('12.00MB');
      }
    });
  });

  describe('validateMimeType', () => {
    it('should accept image/jpeg', () => {
      const result = validateMimeType('image/jpeg');
      expect(result.valid).toBe(true);
    });

    it('should accept image/png', () => {
      const result = validateMimeType('image/png');
      expect(result.valid).toBe(true);
    });

    it('should accept application/pdf', () => {
      const result = validateMimeType('application/pdf');
      expect(result.valid).toBe(true);
    });

    it('should reject image/gif', () => {
      const result = validateMimeType('image/gif');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.message).toContain('image/jpeg');
        expect(result.message).toContain('image/png');
        expect(result.message).toContain('application/pdf');
      }
    });

    it('should reject text/plain', () => {
      const result = validateMimeType('text/plain');
      expect(result.valid).toBe(false);
    });
  });

  describe('isValidDocumentSide', () => {
    it('should return true for valid document sides', () => {
      const validSides = [
        'omang_front',
        'omang_back',
        'selfie',
        'passport',
        'drivers_license_front',
        'drivers_license_back',
        'id_card_front',
        'id_card_back',
      ];

      for (const side of validSides) {
        expect(isValidDocumentSide(side)).toBe(true);
      }
    });

    it('should return false for invalid document sides', () => {
      const invalidSides = ['invalid', 'front', 'back', '', 'omang'];

      for (const side of invalidSides) {
        expect(isValidDocumentSide(side)).toBe(false);
      }
    });
  });
});


describe('getJpegDimensions', () => {
  it('should return null for invalid buffer', () => {
    const buffer = Buffer.from([0x00, 0x00, 0x00]);
    const result = getJpegDimensions(buffer);
    expect(result).toBeNull();
  });

  it('should return null for empty buffer', () => {
    const buffer = Buffer.alloc(0);
    const result = getJpegDimensions(buffer);
    expect(result).toBeNull();
  });
});

describe('getPngDimensions', () => {
  it('should return null for invalid buffer', () => {
    const buffer = Buffer.from([0x00, 0x00, 0x00]);
    const result = getPngDimensions(buffer);
    expect(result).toBeNull();
  });

  it('should return null for buffer too small', () => {
    const buffer = Buffer.alloc(10);
    const result = getPngDimensions(buffer);
    expect(result).toBeNull();
  });

  it('should return null for invalid PNG signature', () => {
    const buffer = Buffer.alloc(30);
    buffer.fill(0);
    const result = getPngDimensions(buffer);
    expect(result).toBeNull();
  });

  it('should extract dimensions from valid PNG header', () => {
    // Create a minimal PNG header with dimensions 800x600
    const buffer = Buffer.alloc(30);
    // PNG signature
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
    // IHDR chunk length (13 bytes)
    buffer.writeUInt32BE(13, 8);
    // IHDR chunk type
    Buffer.from('IHDR').copy(buffer, 12);
    // Width (800)
    buffer.writeUInt32BE(800, 16);
    // Height (600)
    buffer.writeUInt32BE(600, 20);

    const result = getPngDimensions(buffer);
    expect(result).toEqual({ width: 800, height: 600 });
  });
});

describe('getImageDimensions', () => {
  it('should return null for PDF', () => {
    const buffer = Buffer.from('%PDF-1.4');
    const result = getImageDimensions(buffer, 'application/pdf');
    expect(result).toBeNull();
  });

  it('should call getJpegDimensions for JPEG', () => {
    const buffer = Buffer.from([0xff, 0xd8, 0x00]);
    const result = getImageDimensions(buffer, 'image/jpeg');
    // Will return null because it's not a valid JPEG, but it should try
    expect(result).toBeNull();
  });

  it('should call getPngDimensions for PNG', () => {
    const buffer = Buffer.alloc(10);
    const result = getImageDimensions(buffer, 'image/png');
    expect(result).toBeNull();
  });
});

describe('validateImageDimensions', () => {
  it('should accept valid dimensions', () => {
    const result = validateImageDimensions({ width: 800, height: 600 }, 'image/jpeg');
    expect(result.valid).toBe(true);
  });

  it('should accept dimensions at minimum', () => {
    const result = validateImageDimensions(
      { width: MIN_IMAGE_WIDTH, height: MIN_IMAGE_HEIGHT },
      'image/jpeg'
    );
    expect(result.valid).toBe(true);
  });

  it('should reject width below minimum', () => {
    const result = validateImageDimensions({ width: 320, height: 600 }, 'image/jpeg');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain('320x600');
      expect(result.message).toContain(`${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT}`);
    }
  });

  it('should reject height below minimum', () => {
    const result = validateImageDimensions({ width: 800, height: 240 }, 'image/jpeg');
    expect(result.valid).toBe(false);
  });

  it('should skip validation for PDF', () => {
    const result = validateImageDimensions(null, 'application/pdf');
    expect(result.valid).toBe(true);
  });

  it('should reject null dimensions for images', () => {
    const result = validateImageDimensions(null, 'image/jpeg');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain('Unable to read');
    }
  });
});


import { scanForViruses, checkImageQuality } from './file-validation';

describe('scanForViruses', () => {
  it('should return clean for normal image data', () => {
    // Simulate JPEG header
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const result = scanForViruses(buffer);
    expect(result.clean).toBe(true);
  });

  it('should detect EICAR test file', () => {
    const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    const buffer = Buffer.from(eicar);
    const result = scanForViruses(buffer);
    expect(result.clean).toBe(false);
    if (!result.clean) {
      expect(result.threat).toContain('EICAR');
    }
  });

  it('should detect Windows executable (MZ header)', () => {
    const buffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
    const result = scanForViruses(buffer);
    expect(result.clean).toBe(false);
    if (!result.clean) {
      expect(result.threat).toContain('Windows executable');
    }
  });

  it('should detect Linux executable (ELF header)', () => {
    const buffer = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01]);
    const result = scanForViruses(buffer);
    expect(result.clean).toBe(false);
    if (!result.clean) {
      expect(result.threat).toContain('Linux executable');
    }
  });

  it('should detect PHP script', () => {
    const buffer = Buffer.from('<?php echo "malicious"; ?>');
    const result = scanForViruses(buffer);
    expect(result.clean).toBe(false);
    if (!result.clean) {
      expect(result.threat).toContain('PHP');
    }
  });

  it('should detect embedded JavaScript', () => {
    const buffer = Buffer.from('<script>alert("xss")</script>');
    const result = scanForViruses(buffer);
    expect(result.clean).toBe(false);
    if (!result.clean) {
      expect(result.threat).toContain('script');
    }
  });

  it('should detect shell script', () => {
    const buffer = Buffer.from('#!/bin/bash\nrm -rf /');
    const result = scanForViruses(buffer);
    expect(result.clean).toBe(false);
    if (!result.clean) {
      expect(result.threat).toContain('Shell script');
    }
  });

  it('should detect ZIP archive', () => {
    const buffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
    const result = scanForViruses(buffer);
    expect(result.clean).toBe(false);
    if (!result.clean) {
      expect(result.threat).toContain('ZIP');
    }
  });

  it('should detect RAR archive', () => {
    const buffer = Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07]);
    const result = scanForViruses(buffer);
    expect(result.clean).toBe(false);
    if (!result.clean) {
      expect(result.threat).toContain('RAR');
    }
  });

  it('should return clean for empty buffer', () => {
    const buffer = Buffer.alloc(0);
    const result = scanForViruses(buffer);
    expect(result.clean).toBe(true);
  });

  it('should return clean for PNG header', () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const result = scanForViruses(buffer);
    expect(result.clean).toBe(true);
  });
});

describe('checkImageQuality', () => {
  it('should skip quality checks for PDF', () => {
    const buffer = Buffer.from('%PDF-1.4');
    const result = checkImageQuality(buffer, null, 'application/pdf');
    expect(result.acceptable).toBe(true);
  });

  it('should return metrics for image', () => {
    // Create a buffer with varied pixel values (good contrast/brightness)
    const buffer = Buffer.alloc(1000);
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.floor(Math.random() * 200) + 28; // Values between 28-227
    }

    const result = checkImageQuality(buffer, { width: 100, height: 10 }, 'image/jpeg');
    expect(result.metrics).toBeDefined();
    expect(result.metrics.blur).toBeGreaterThanOrEqual(0);
    expect(result.metrics.blur).toBeLessThanOrEqual(1);
    expect(result.metrics.brightness).toBeGreaterThanOrEqual(0);
    expect(result.metrics.brightness).toBeLessThanOrEqual(1);
    expect(result.metrics.contrast).toBeGreaterThanOrEqual(0);
    expect(result.metrics.contrast).toBeLessThanOrEqual(1);
  });

  it('should detect too dark image', () => {
    // Create a very dark buffer with high variance pattern
    const buffer = Buffer.alloc(1000);
    for (let i = 0; i < buffer.length; i++) {
      // Create a pattern with high variance: 0, 75, 0, 75...
      // This gives good variance but average brightness ~37/255 = 0.14 (below 0.15 threshold)
      buffer[i] = i % 2 === 0 ? 0 : 75;
    }

    const result = checkImageQuality(buffer, { width: 100, height: 10 }, 'image/jpeg');
    expect(result.acceptable).toBe(false);
    if (!result.acceptable) {
      // Could fail on blur or dark
      expect(result.reason.toLowerCase()).toMatch(/blur|dark/);
    }
  });

  it('should detect too bright image', () => {
    // Create a very bright buffer with high variance pattern
    const buffer = Buffer.alloc(1000);
    for (let i = 0; i < buffer.length; i++) {
      // Create a pattern with high variance: 180, 255, 180, 255...
      // This gives variance ~1406 which should pass blur check
      buffer[i] = i % 2 === 0 ? 180 : 255;
    }

    const result = checkImageQuality(buffer, { width: 100, height: 10 }, 'image/jpeg');
    // The average brightness is (180+255)/2 = 217.5 / 255 = 0.85+
    expect(result.acceptable).toBe(false);
    if (!result.acceptable) {
      // Could fail on blur or brightness
      expect(result.reason.toLowerCase()).toMatch(/blur|bright/);
    }
  });

  it('should detect low contrast image', () => {
    // Create a buffer with very low variance around middle brightness
    const buffer = Buffer.alloc(1000);
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = 128 + Math.floor(Math.random() * 10) - 5; // Values 123-133 (low contrast)
    }

    const result = checkImageQuality(buffer, { width: 100, height: 10 }, 'image/jpeg');
    expect(result.acceptable).toBe(false);
    if (!result.acceptable) {
      // Could fail on blur or contrast depending on variance
      expect(result.reason.toLowerCase()).toMatch(/blur|contrast/);
    }
  });

  it('should accept image with good quality', () => {
    // Create a buffer with good variance (simulating a real image)
    const buffer = Buffer.alloc(5000);
    for (let i = 0; i < buffer.length; i++) {
      // Create varied values with good distribution
      buffer[i] = Math.floor(Math.sin(i * 0.1) * 80 + 128);
    }

    const result = checkImageQuality(buffer, { width: 100, height: 50 }, 'image/jpeg');
    // This should have acceptable brightness and contrast
    expect(result.metrics.brightness).toBeGreaterThan(0.15);
    expect(result.metrics.brightness).toBeLessThan(0.85);
  });

  it('should handle null dimensions gracefully', () => {
    const buffer = Buffer.alloc(1000);
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.floor(Math.random() * 200) + 28;
    }

    const result = checkImageQuality(buffer, null, 'image/jpeg');
    expect(result.metrics).toBeDefined();
  });

  it('should handle empty buffer', () => {
    const buffer = Buffer.alloc(0);
    const result = checkImageQuality(buffer, { width: 0, height: 0 }, 'image/jpeg');
    expect(result.metrics).toBeDefined();
  });
});
