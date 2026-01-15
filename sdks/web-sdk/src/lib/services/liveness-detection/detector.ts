// Liveness detection service using MediaPipe Face Mesh
import { FaceMesh, Results } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

export interface FacePositioning {
  centered: boolean;
  distance: 'optimal' | 'tooClose' | 'tooFar';
  message: string;
}

export interface LivenessCheck {
  passed: boolean;
  attempts: number;
}

export interface LivenessChecks {
  blink: LivenessCheck;
  turnLeft: LivenessCheck;
  turnRight: LivenessCheck;
}

export type LivenessPrompt = 'position' | 'blink' | 'turnLeft' | 'turnRight' | 'complete';

interface Point {
  x: number;
  y: number;
  z?: number;
}

// Eye landmarks for blink detection
const LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380];

// Face landmarks for positioning
const NOSE_TIP_INDEX = 1;
const FACE_CENTER_INDEX = 168;

/**
 * Calculate Euclidean distance between two points
 */
function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Calculate Eye Aspect Ratio (EAR) for blink detection
 * EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
 */
function calculateEAR(eyeLandmarks: Point[]): number {
  const vertical1 = distance(eyeLandmarks[1], eyeLandmarks[5]);
  const vertical2 = distance(eyeLandmarks[2], eyeLandmarks[4]);
  const horizontal = distance(eyeLandmarks[0], eyeLandmarks[3]);

  return (vertical1 + vertical2) / (2 * horizontal);
}

/**
 * Detect blink from eye landmarks
 */
export function detectBlinkFromLandmarks(landmarks: Point[]): boolean {
  const leftEye = LEFT_EYE_INDICES.map(i => landmarks[i]);
  const rightEye = RIGHT_EYE_INDICES.map(i => landmarks[i]);

  const leftEAR = calculateEAR(leftEye);
  const rightEAR = calculateEAR(rightEye);
  const avgEAR = (leftEAR + rightEAR) / 2;

  const BLINK_THRESHOLD = 0.2;
  return avgEAR < BLINK_THRESHOLD;
}

/**
 * Detect head turn direction from face landmarks
 */
export function detectHeadTurnFromLandmarks(
  landmarks: Point[],
  direction: 'left' | 'right',
): boolean {
  const noseTip = landmarks[NOSE_TIP_INDEX];
  const faceCenter = landmarks[FACE_CENTER_INDEX];

  const offset = noseTip.x - faceCenter.x;
  const TURN_THRESHOLD = 0.05;

  if (direction === 'left') {
    return offset < -TURN_THRESHOLD;
  } else {
    return offset > TURN_THRESHOLD;
  }
}

/**
 * Calculate face bounding box from landmarks
 */
function calculateBoundingBox(landmarks: Point[]): {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  landmarks.forEach(point => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });

  return {
    left: minX,
    right: maxX,
    top: minY,
    bottom: maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Analyze face positioning from landmarks
 * Note: Uses normalized coordinates (0-1) from MediaPipe, not pixel coordinates
 */
export function analyzeFacePositioningFromLandmarks(
  landmarks: Point[],
): FacePositioning {
  const faceBox = calculateBoundingBox(landmarks);

  const centerX = 0.5;
  const centerY = 0.5;
  const faceCenterX = (faceBox.left + faceBox.right) / 2;
  const faceCenterY = (faceBox.top + faceBox.bottom) / 2;

  const centered =
    Math.abs(faceCenterX - centerX) < 0.1 && Math.abs(faceCenterY - centerY) < 0.1;

  const optimalWidth = 0.4;
  const faceWidth = faceBox.width;

  let distance: 'optimal' | 'tooClose' | 'tooFar';
  let message: string;

  if (faceWidth > optimalWidth * 1.2) {
    distance = 'tooClose';
    message = 'Move further away';
  } else if (faceWidth < optimalWidth * 0.8) {
    distance = 'tooFar';
    message = 'Move closer';
  } else {
    distance = 'optimal';
    message = centered ? 'Perfect! Hold still' : 'Center your face';
  }

  return { centered, distance, message };
}

/**
 * Blink detection state tracker
 */
export class BlinkDetector {
  private earHistory: number[] = [];
  private readonly historySize = 5;
  private readonly blinkThreshold = 0.2;
  private wasBlinking = false;

  addFrame(landmarks: Point[]): boolean {
    const leftEye = LEFT_EYE_INDICES.map(i => landmarks[i]);
    const rightEye = RIGHT_EYE_INDICES.map(i => landmarks[i]);

    const leftEAR = calculateEAR(leftEye);
    const rightEAR = calculateEAR(rightEye);
    const avgEAR = (leftEAR + rightEAR) / 2;

    this.earHistory.push(avgEAR);
    if (this.earHistory.length > this.historySize) {
      this.earHistory.shift();
    }

    const isBlinking = avgEAR < this.blinkThreshold;
    const blinkDetected = this.wasBlinking && !isBlinking;
    this.wasBlinking = isBlinking;

    return blinkDetected;
  }

  reset(): void {
    this.earHistory = [];
    this.wasBlinking = false;
  }
}

/**
 * Head turn detection state tracker
 */
export class HeadTurnDetector {
  private turnHistory: number[] = [];
  private readonly historySize = 10;
  private readonly turnThreshold = 0.05;

  addFrame(landmarks: Point[], direction: 'left' | 'right'): boolean {
    const noseTip = landmarks[NOSE_TIP_INDEX];
    const faceCenter = landmarks[FACE_CENTER_INDEX];
    const offset = noseTip.x - faceCenter.x;

    this.turnHistory.push(offset);
    if (this.turnHistory.length > this.historySize) {
      this.turnHistory.shift();
    }

    if (this.turnHistory.length < this.historySize) {
      return false;
    }

    const avgOffset = this.turnHistory.reduce((a, b) => a + b, 0) / this.turnHistory.length;

    if (direction === 'left') {
      return avgOffset < -this.turnThreshold;
    } else {
      return avgOffset > this.turnThreshold;
    }
  }

  reset(): void {
    this.turnHistory = [];
  }
}

/**
 * MediaPipe Face Mesh wrapper
 */
export class LivenessDetector {
  private faceMesh: FaceMesh | null = null;
  private camera: Camera | null = null;
  private blinkDetector = new BlinkDetector();
  private headTurnDetector = new HeadTurnDetector();
  private onResultsCallback: ((results: Results) => void) | null = null;

  async initialize(
    videoElement: HTMLVideoElement,
    onResults: (results: Results) => void,
  ): Promise<void> {
    this.onResultsCallback = onResults;

    this.faceMesh = new FaceMesh({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.faceMesh.onResults((results: Results) => {
      if (this.onResultsCallback) {
        this.onResultsCallback(results);
      }
    });

    this.camera = new Camera(videoElement, {
      onFrame: async () => {
        if (this.faceMesh) {
          await this.faceMesh.send({ image: videoElement });
        }
      },
      width: 640,
      height: 480,
    });

    await this.camera.start();
  }

  detectBlink(landmarks: Point[]): boolean {
    return this.blinkDetector.addFrame(landmarks);
  }

  detectHeadTurn(landmarks: Point[], direction: 'left' | 'right'): boolean {
    return this.headTurnDetector.addFrame(landmarks, direction);
  }

  analyzeFacePositioning(
    landmarks: Point[],
  ): FacePositioning {
    return analyzeFacePositioningFromLandmarks(landmarks);
  }

  reset(): void {
    this.blinkDetector.reset();
    this.headTurnDetector.reset();
  }

  stop(): void {
    if (this.camera) {
      void this.camera.stop();
    }
  }
}
