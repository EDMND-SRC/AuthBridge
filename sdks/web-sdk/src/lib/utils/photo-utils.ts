import { IAppConfiguration, IAppConfigurationUI } from '../contexts/configuration';
import { DocumentType, IDocument, IDocumentPage } from '../contexts/app-state';
import Compressor from 'compressorjs';
import merge from 'deepmerge';

export type FileEventTarget = EventTarget & { files: FileList };
export type ICameraEvent = Event & { currentTarget: EventTarget & HTMLInputElement };

export const nativeCameraHandler = (e: ICameraEvent): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!e.target) {
      return reject('Event target is missing');
    }
    const target = e.target as FileEventTarget;
    const image = target.files[0];
    const reader1 = new FileReader();
    reader1.readAsDataURL(image);

    reader1.onload = e => {
      const image = e.target?.result;
    };
    new Compressor(image, {
      quality: 0.6,
      success(result) {
        const reader = new FileReader();
        reader.readAsDataURL(result);
        reader.onload = e => {
          const image = e.target?.result;
          resolve(image as string);
        };
      },
      error(err) {
        return reject(err.message);
      },
    });
  });
};

export const clearDocs = (
  type: DocumentType,
  configuration: IAppConfiguration,
  uiPack: IAppConfigurationUI,
  documents: IDocument[],
): IDocument[] => {
  const documentOptionsConfiguration = merge(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    uiPack.documentOptions || {},
    configuration.documentOptions || {},
  );
  const { options } = documentOptionsConfiguration;
  const isFromOptions = Object.keys(options).find(t => t === type);
  if (isFromOptions) {
    return documents.filter(d => !Object.keys(options).find(t => t === d.type));
  }
  return documents.filter(d => type !== d.type);
};

export const addDocument = (
  type: DocumentType,
  base64: string,
  configuration: IAppConfiguration,
  uiPack: IAppConfigurationUI,
  documents: IDocument[],
  document: IDocument,
): IDocument[] => {
  const clearedDocuments = clearDocs(type, configuration, uiPack, documents);
  return [
    ...clearedDocuments,
    {
      ...document,
      pages: [{ side: 'front', base64 }],
    },
  ];
};

const getUpdatedPages = (base64: string, doc: IDocument): IDocumentPage[] => {
  const existingPage = doc.pages.find(p => p.side === 'back');
  if (existingPage) {
    return doc.pages.map(page => {
      if (page.side === 'back') {
        return {
          ...page,
          base64,
          side: 'back',
        };
      }
      return page;
    });
  }
  return [...doc.pages, { base64, side: 'back' }];
};

export const updateDocument = (
  type: DocumentType,
  base64: string,
  documents: IDocument[],
): IDocument[] => {
  return documents.map(doc => {
    if (doc.type === type) {
      const newPagesState = getUpdatedPages(base64, doc);
      return { ...doc, pages: newPagesState };
    }
    return doc;
  });
};

/**
 * Quality feedback types for real-time camera analysis
 */
export interface QualityFeedback {
  lighting: 'tooDark' | 'tooBright' | 'good';
  blur: 'tooBlurry' | 'moveCloser' | 'good';
  glare: 'detected' | 'good';
}

/**
 * Analyze image quality from video stream for real-time feedback
 * @param videoElement - HTMLVideoElement with active camera stream
 * @returns QualityFeedback object with lighting, blur, and glare status
 */
export function analyzeImageQuality(videoElement: HTMLVideoElement): QualityFeedback {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return { lighting: 'good', blur: 'good', glare: 'good' };
  }

  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  ctx.drawImage(videoElement, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Analyze lighting (average brightness)
  let totalBrightness = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    totalBrightness += (r + g + b) / 3;
  }
  const avgBrightness = totalBrightness / (data.length / 4);

  let lighting: QualityFeedback['lighting'] = 'good';
  if (avgBrightness < 50) lighting = 'tooDark';
  if (avgBrightness > 200) lighting = 'tooBright';

  // Analyze blur (Laplacian variance)
  const blurScore = calculateLaplacianVariance(imageData);
  let blur: QualityFeedback['blur'] = 'good';
  if (blurScore < 100) blur = 'tooBlurry';

  // Analyze glare (detect bright spots)
  const glareDetected = detectGlare(data, avgBrightness);
  const glare: QualityFeedback['glare'] = glareDetected ? 'detected' : 'good';

  return { lighting, blur, glare };
}

/**
 * Calculate Laplacian variance for blur detection
 * Higher variance = sharper image
 */
function calculateLaplacianVariance(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const gray = new Float32Array(width * height);

  // Convert to grayscale
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    gray[idx] = (data[i] + data[i + 1] + data[i + 2]) / 3;
  }

  // Apply Laplacian operator
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const laplacian =
        -gray[idx - width - 1] -
        gray[idx - width] -
        gray[idx - width + 1] -
        gray[idx - 1] +
        8 * gray[idx] -
        gray[idx + 1] -
        gray[idx + width - 1] -
        gray[idx + width] -
        gray[idx + width + 1];

      sum += laplacian;
      sumSq += laplacian * laplacian;
      count++;
    }
  }

  const mean = sum / count;
  const variance = sumSq / count - mean * mean;

  return variance;
}

/**
 * Detect glare by finding bright spots significantly above average
 */
function detectGlare(data: Uint8ClampedArray, avgBrightness: number): boolean {
  let brightPixelCount = 0;
  const threshold = avgBrightness + 50;

  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (brightness > threshold) brightPixelCount++;
  }

  const brightPixelRatio = brightPixelCount / (data.length / 4);
  return brightPixelRatio > 0.1; // More than 10% bright pixels
}
