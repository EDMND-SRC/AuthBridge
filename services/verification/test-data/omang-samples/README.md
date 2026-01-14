# Synthetic Omang Test Images

This directory contains descriptions of synthetic test images for OCR testing.

> **Note:** Actual image files are not committed to the repository. Use the Textract mock responses in tests instead.

## Test Image Specifications

### 1. clear-front.jpg
**Description:** Clear, well-lit Omang front side
**Expected Results:**
- All fields extracted
- Confidence > 95%
- No manual review required

**Mock Textract Response:**
```json
{
  "Blocks": [
    { "BlockType": "LINE", "Text": "REPUBLIC OF BOTSWANA", "Confidence": 99.5 },
    { "BlockType": "LINE", "Text": "SURNAME: MOGOROSI", "Confidence": 99.2 },
    { "BlockType": "LINE", "Text": "FIRST NAMES: KGOSI THABO", "Confidence": 98.5 },
    { "BlockType": "LINE", "Text": "OMANG NO: 123456789", "Confidence": 99.8 },
    { "BlockType": "LINE", "Text": "DATE OF BIRTH: 15/03/1985", "Confidence": 97.3 },
    { "BlockType": "LINE", "Text": "SEX: M", "Confidence": 99.9 },
    { "BlockType": "LINE", "Text": "DATE OF ISSUE: 15/03/2015", "Confidence": 96.8 },
    { "BlockType": "LINE", "Text": "DATE OF EXPIRY: 15/03/2025", "Confidence": 97.1 }
  ]
}
```

### 2. blurry-front.jpg
**Description:** Blurry Omang front side (out of focus)
**Expected Results:**
- Some fields extracted
- Confidence 40-60%
- Manual review required

**Mock Textract Response:**
```json
{
  "Blocks": [
    { "BlockType": "LINE", "Text": "REPUBLIC OF BOTSWANA", "Confidence": 55.0 },
    { "BlockType": "LINE", "Text": "SURNAME: MOGOROSI", "Confidence": 48.2 },
    { "BlockType": "LINE", "Text": "OMANG NO: 123456789", "Confidence": 52.5 },
    { "BlockType": "LINE", "Text": "DATE OF BIRTH: 15/03/1985", "Confidence": 45.0 }
  ]
}
```

### 3. rotated-front.jpg
**Description:** Rotated Omang front side (90 degrees)
**Expected Results:**
- Partial field extraction
- Confidence varies
- Manual review required

**Mock Textract Response:**
```json
{
  "Blocks": [
    { "BlockType": "LINE", "Text": "BOTSWANA", "Confidence": 75.0 },
    { "BlockType": "LINE", "Text": "MOGOROSI", "Confidence": 70.2 },
    { "BlockType": "LINE", "Text": "123456789", "Confidence": 68.5 }
  ]
}
```

### 4. poor-lighting.jpg
**Description:** Omang front side with poor lighting (shadows)
**Expected Results:**
- Mixed confidence scores
- Some fields unreadable
- Manual review required

**Mock Textract Response:**
```json
{
  "Blocks": [
    { "BlockType": "LINE", "Text": "REPUBLIC OF BOTSWANA", "Confidence": 92.0 },
    { "BlockType": "LINE", "Text": "SURNAME: MOGOROSI", "Confidence": 25.0 },
    { "BlockType": "LINE", "Text": "FIRST NAMES: KGOSI", "Confidence": 28.0 },
    { "BlockType": "LINE", "Text": "OMANG NO: 123456789", "Confidence": 88.5 },
    { "BlockType": "LINE", "Text": "DATE OF BIRTH", "Confidence": 22.0 }
  ]
}
```

### 5. partial-document.jpg
**Description:** Partially visible Omang (cropped)
**Expected Results:**
- Few fields extracted
- Missing critical fields
- Manual review required

**Mock Textract Response:**
```json
{
  "Blocks": [
    { "BlockType": "LINE", "Text": "SURNAME: MOGOROSI", "Confidence": 95.0 },
    { "BlockType": "LINE", "Text": "FIRST NAMES: KGOSI THABO", "Confidence": 94.0 }
  ]
}
```

### 6. clear-back.jpg
**Description:** Clear Omang back side (address)
**Expected Results:**
- All address fields extracted
- Confidence > 95%
- No manual review required

**Mock Textract Response:**
```json
{
  "Blocks": [
    { "BlockType": "LINE", "Text": "ADDRESS:", "Confidence": 99.0 },
    { "BlockType": "LINE", "Text": "PLOT 12345", "Confidence": 98.5 },
    { "BlockType": "LINE", "Text": "GABORONE", "Confidence": 99.2 },
    { "BlockType": "LINE", "Text": "SOUTH EAST DISTRICT", "Confidence": 97.8 }
  ]
}
```

### 7. no-text.jpg
**Description:** Blank or wrong-facing image
**Expected Results:**
- No fields extracted
- Quality score = 0
- Recapture required

**Mock Textract Response:**
```json
{
  "Blocks": []
}
```

## Using Test Data in Unit Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { OmangOcrService } from '../services/omang-ocr';

// Mock Textract with clear-front response
vi.mock('@aws-sdk/client-textract', () => ({
  TextractClient: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({
      Blocks: [
        { BlockType: 'LINE', Text: 'SURNAME: MOGOROSI', Confidence: 99.2 },
        // ... more blocks
      ]
    })
  })),
  DetectDocumentTextCommand: vi.fn()
}));

describe('OmangOcrService', () => {
  it('should extract all fields from clear image', async () => {
    const service = new OmangOcrService();
    const result = await service.extractOmangFront('bucket', 'clear-front.jpg');

    expect(result.extractedFields.surname).toBe('MOGOROSI');
    expect(result.confidence.overall).toBeGreaterThan(95);
  });
});
```

## Generating Real Test Images

For integration testing with real Textract API:

1. Use image generation tools to create synthetic Omang cards
2. Ensure no real PII is used
3. Store in S3 test bucket: `authbridge-test-images-staging`
4. Reference by key in integration tests

**DO NOT commit real Omang images to the repository.**
