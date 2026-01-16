import { appState, IAppState } from '../../contexts/app-state';
import { currentLanguage, Languages } from '../../contexts/translation';
import {
  EActionNames,
  EEventTypes,
  EVerificationErrorCodes,
  IDocumentVerificationResponse,
  IOuterEvent,
  IVerificationStartedEvent,
  IVerificationErrorEvent,
  IDocumentSelectedEvent,
  IDocumentCapturedEvent,
} from './types';
import { get } from 'svelte/store';
import { flowEventBus } from '../../services/flow-event-bus/flow-event-bus';
import { EFlowEvent } from '../../services/flow-event-bus/enums';
import { BALLERINE_EVENT } from './constants';
import { IEventOptions } from '../../services/flow-event-bus/interfaces';

// SDK version for event metadata
// Note: Hardcoded to avoid build-time import issues with package.json in Vite/Svelte
// Keep in sync with package.json version when releasing
const SDK_VERSION = '1.2.0';

const outerScopeContext = window.__blrn_context;
const isProd = window.__blrn_is_prod;
const endpoint =
  outerScopeContext && outerScopeContext.debug !== undefined
    ? '/upload-docs'
    : '/v2/enduser/verify';
const local = outerScopeContext && outerScopeContext.local !== undefined;
const baseUrl = local ? 'http://localhost:3001' : window.__blrn_api_url;
const docTypeMapping = {
  documentBack: 'document-back',
  documentFront: 'document-front',
  selfie: 'face',
};

export const subscribe = () => {
  window.addEventListener('message', e => {
    const event = e.data as IOuterEvent;
    if (event.eventName === 'blrn_set_lang') {
      const language = event.config.lang as Languages;
      currentLanguage.set(language);
    }
  });
};

export const sendIframeEvent = (eventOptions: IEventOptions) => {
  window.parent.postMessage(eventOptions, '*'); // iframe
};

export const sendFlowCompleteEvent = (verificationResponse: IDocumentVerificationResponse) => {
  const { status, idvResult } = verificationResponse;
  const payload = { status, idvResult };
  const eventOptions = {
    eventName: BALLERINE_EVENT,
    eventType: EEventTypes.SYNC_FLOW_COMPLETE,
    shouldExit: true,
    payload,
  };

  sendIframeEvent(eventOptions);
  // Should finalize the signature on the callbacks interface
  flowEventBus({
    type: EFlowEvent.FLOW_COMPLETE,
    payload: eventOptions,
  });
};

export const sendVerificationUpdateEvent = (
  details: IDocumentVerificationResponse,
  shouldExit = false,
) => {
  const eventOptions = {
    eventName: BALLERINE_EVENT,
    eventType: EEventTypes.VERIFICATION_UPDATE,
    shouldExit,
    details,
  };
  window.parent.postMessage(eventOptions, '*');
};

export const sendNavigationUpdateEvent = () => {
  const as = get(appState);

  const eventOptions = {
    eventName: BALLERINE_EVENT,
    eventType: EEventTypes.NAVIGATION_UPDATE,
    details: {
      currentIdx: as.currentStepIdx,
      // Note: currentPage and previousPage are correctly typed as string in IAppState
      // They represent page/step names, not numeric indices
      currentPage: as.currentPage,
      previousPage: as.previousPage,
    },
  };
  window.parent.postMessage(eventOptions, '*');
  flowEventBus({
    type: EFlowEvent.FLOW_NAVIGATION_UPDATE,
    payload: eventOptions,
  });
};

export const sendButtonClickEvent = (
  actionName: EActionNames,
  status: IDocumentVerificationResponse,
  as: IAppState,
  shouldExit = false,
) => {
  const eventOptions = {
    eventName: BALLERINE_EVENT,
    eventType: EEventTypes.BUTTON_CLICK,
    shouldExit,
    details: {
      actionName,
      currentIdx: as.currentStepIdx,
      currentPage: as.currentPage,
      status,
    },
  };

  window.parent.postMessage(eventOptions, '*');
};

/**
 * Emits a verification.started event when user clicks "Start Verification"
 * @param sessionId - The current session ID
 * @param clientId - Optional client ID
 */
export const sendVerificationStartedEvent = (
  sessionId: string,
  clientId?: string,
) => {
  const event: IVerificationStartedEvent = {
    type: EEventTypes.VERIFICATION_STARTED,
    timestamp: new Date().toISOString(),
    sessionId,
    metadata: {
      clientId,
      sdkVersion: SDK_VERSION,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    },
  };

  const eventOptions = {
    eventName: BALLERINE_EVENT,
    eventType: EEventTypes.VERIFICATION_STARTED,
    shouldExit: false,
    payload: event,
  };

  sendIframeEvent(eventOptions);
};

/**
 * Emits a verification.error event when initialization fails
 * @param errorCode - The error code
 * @param message - Human-readable error message
 * @param sessionId - The session ID (may be null if session was invalid)
 */
export const sendVerificationErrorEvent = (
  errorCode: EVerificationErrorCodes,
  message: string,
  sessionId: string | null = null,
) => {
  const event: IVerificationErrorEvent = {
    type: EEventTypes.VERIFICATION_ERROR,
    timestamp: new Date().toISOString(),
    sessionId,
    error: {
      code: errorCode,
      message,
    },
  };

  const eventOptions = {
    eventName: BALLERINE_EVENT,
    eventType: EEventTypes.VERIFICATION_ERROR,
    shouldExit: false,
    payload: event,
  };

  sendIframeEvent(eventOptions);

  // Also emit via flow event bus for error handling
  flowEventBus({
    type: EFlowEvent.FLOW_ERROR,
    payload: eventOptions,
  });
};

/**
 * Emits a document.selected event when user selects a document type
 * @param documentType - The selected document type
 */
export const sendDocumentSelectedEvent = (
  documentType: 'omang' | 'passport' | 'driversLicense',
) => {
  const sessionId = window.__blrn_context?.endUserInfo?.id || 'unknown';
  const clientId = window.__blrn_context?.backendConfig?.auth?.clientId;

  const event: IDocumentSelectedEvent = {
    type: EEventTypes.DOCUMENT_SELECTED,
    timestamp: new Date().toISOString(),
    sessionId,
    data: {
      documentType,
    },
    metadata: {
      clientId,
      sdkVersion: SDK_VERSION,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    },
  };

  const eventOptions = {
    eventName: BALLERINE_EVENT,
    eventType: EEventTypes.DOCUMENT_SELECTED,
    shouldExit: false,
    payload: event,
  };

  sendIframeEvent(eventOptions);
};

/**
 * Emits a document.captured event when user captures a document photo
 * @param documentType - The document type being captured
 * @param side - Which side of the document (front or back)
 * @param imageSize - Size of the compressed image in bytes
 * @param compressionRatio - Ratio of original size to compressed size
 * @param captureTime - Time taken to capture and compress in milliseconds
 * @param cameraResolution - Camera resolution used (e.g., "1920x1080")
 */
export const sendDocumentCapturedEvent = (
  documentType: 'omang' | 'passport' | 'driversLicense',
  side: 'front' | 'back',
  imageSize: number,
  compressionRatio: number,
  captureTime: number,
  cameraResolution: string,
) => {
  const sessionId = window.__blrn_context?.endUserInfo?.id || 'unknown';
  const clientId = window.__blrn_context?.backendConfig?.auth?.clientId;

  const event: IDocumentCapturedEvent = {
    type: EEventTypes.DOCUMENT_CAPTURED,
    timestamp: new Date().toISOString(),
    sessionId,
    data: {
      documentType,
      side,
      imageSize,
      compressionRatio,
      captureTime,
    },
    metadata: {
      clientId,
      sdkVersion: SDK_VERSION,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      cameraResolution,
    },
  };

  const eventOptions = {
    eventName: BALLERINE_EVENT,
    eventType: EEventTypes.DOCUMENT_CAPTURED,
    shouldExit: false,
    payload: event,
  };

  sendIframeEvent(eventOptions);
};

/**
 * Emits a document.uploaded event when user uploads a document file
 * @param documentType - The document type being uploaded
 * @param side - Which side of the document (front or back)
 * @param fileName - Name of the uploaded file
 * @param originalSize - Original file size in bytes
 * @param compressedSize - Compressed file size in bytes
 * @param compressionRatio - Ratio of original size to compressed size
 * @param uploadTime - Time taken to upload and compress in milliseconds
 * @param uploadMethod - How the file was uploaded (button or dragDrop)
 */
export const sendDocumentUploadedEvent = (
  documentType: 'omang' | 'passport' | 'driversLicense',
  side: 'front' | 'back',
  fileName: string,
  originalSize: number,
  compressedSize: number,
  compressionRatio: number,
  uploadTime: number,
  uploadMethod: 'button' | 'dragDrop',
) => {
  const sessionId = window.__blrn_context?.endUserInfo?.id || 'unknown';
  const clientId = window.__blrn_context?.backendConfig?.auth?.clientId;

  const event: IDocumentUploadedEvent = {
    type: EEventTypes.DOCUMENT_UPLOADED,
    timestamp: new Date().toISOString(),
    sessionId,
    data: {
      documentType,
      side,
      fileName,
      originalSize,
      compressedSize,
      compressionRatio,
      uploadTime,
    },
    metadata: {
      clientId,
      sdkVersion: SDK_VERSION,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      uploadMethod,
    },
  };

  const eventOptions = {
    eventName: BALLERINE_EVENT,
    eventType: EEventTypes.DOCUMENT_UPLOADED,
    shouldExit: false,
    payload: event,
  };

  sendIframeEvent(eventOptions);
};

/**
 * Send selfie.captured event
 * @param fileName - Name of the selfie file
 * @param originalSize - Original file size in bytes
 * @param compressedSize - Compressed file size in bytes
 * @param compressionRatio - Ratio of original size to compressed size
 * @param captureTime - Time taken to capture and compress in milliseconds
 * @param cameraResolution - Camera resolution used (e.g., "1920x1080")
 * @param livenessChecks - Results of liveness detection checks
 * @param totalAttempts - Total number of capture attempts
 * @param faceQuality - Face quality metrics
 */
export const sendSelfieCapturedEvent = (
  fileName: string,
  originalSize: number,
  compressedSize: number,
  compressionRatio: number,
  captureTime: number,
  cameraResolution: string,
  livenessChecks: {
    blink: { passed: boolean; attempts: number };
    turnLeft: { passed: boolean; attempts: number };
    turnRight: { passed: boolean; attempts: number };
  },
  totalAttempts: number,
  faceQuality: {
    centered: boolean;
    distance: 'optimal' | 'tooClose' | 'tooFar';
    message: string;
  },
) => {
  const sessionId = window.__blrn_context?.endUserInfo?.id || 'unknown';
  const clientId = window.__blrn_context?.backendConfig?.auth?.clientId;
  const deviceType =
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop';

  const event: ISelfieCapturedEvent = {
    type: EEventTypes.SELFIE_CAPTURED,
    timestamp: new Date().toISOString(),
    sessionId,
    data: {
      fileName,
      originalSize,
      compressedSize,
      compressionRatio,
      captureTime,
      cameraResolution,
      livenessChecks,
      totalAttempts,
      faceQuality: {
        centered: faceQuality.centered,
        distance: faceQuality.distance,
        lighting: 'good', // Placeholder - would be calculated from video analysis
      },
    },
    metadata: {
      clientId,
      sdkVersion: SDK_VERSION,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      deviceType,
    },
  };

  const eventOptions = {
    eventName: BALLERINE_EVENT,
    eventType: EEventTypes.SELFIE_CAPTURED,
    shouldExit: false,
    payload: event,
  };

  sendIframeEvent(eventOptions);
};
