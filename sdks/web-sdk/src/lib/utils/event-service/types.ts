import { DecisionStatus } from '../../contexts/app-state/types';

export enum EEventTypes {
  SYNC_FLOW_COMPLETE = 'sync_flow_complete',
  VERIFICATION_UPDATE = 'verification_update',
  NAVIGATION_UPDATE = 'navigation_update',
  BUTTON_CLICK = 'button_click',
  VERIFICATION_STARTED = 'verification.started',
  VERIFICATION_ERROR = 'verification.error',
  DOCUMENT_SELECTED = 'document.selected',
  DOCUMENT_CAPTURED = 'document.captured',
  DOCUMENT_UPLOADED = 'document.uploaded',
}

export enum EActionNames {
  CLOSE = 'close',
  START_VERIFICATION = 'start_verification',
}

export enum EVerificationStatuses {
  COMPLETED = 'completed',
  PENDING = 'pending',
  ERROR = 'error',
  DATA_COLLECTION = 'data_collection',
}

export enum EVerificationErrorCodes {
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_INVALID = 'SESSION_INVALID',
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
}

export interface ISendDocumentsResponse {
  status: 'success' | 'fail';
}

export interface IDocumentVerificationResponse {
  status: EVerificationStatuses;
  idvResult?: DecisionStatus;
  code?: number;
  reasonCode?: number;
}

export interface IVerificationStartedEvent {
  type: EEventTypes.VERIFICATION_STARTED;
  timestamp: string;
  sessionId: string;
  metadata: {
    clientId?: string;
    sdkVersion: string;
    userAgent: string;
  };
}

export interface IVerificationErrorEvent {
  type: EEventTypes.VERIFICATION_ERROR;
  timestamp: string;
  sessionId: string | null;
  error: {
    code: EVerificationErrorCodes;
    message: string;
  };
}

export interface IDocumentSelectedEvent {
  type: EEventTypes.DOCUMENT_SELECTED;
  timestamp: string;
  sessionId: string;
  data: {
    documentType: 'omang' | 'passport' | 'driversLicense';
  };
  metadata: {
    clientId?: string;
    sdkVersion: string;
    userAgent: string;
  };
}

export interface IDocumentCapturedEvent {
  type: EEventTypes.DOCUMENT_CAPTURED;
  timestamp: string;
  sessionId: string;
  data: {
    documentType: 'omang' | 'passport' | 'driversLicense';
    side: 'front' | 'back';
    imageSize: number;
    compressionRatio: number;
    captureTime: number;
  };
  metadata: {
    clientId?: string;
    sdkVersion: string;
    userAgent: string;
    cameraResolution: string;
  };
}

export interface IDocumentUploadedEvent {
  type: EEventTypes.DOCUMENT_UPLOADED;
  timestamp: string;
  sessionId: string;
  data: {
    documentType: 'omang' | 'passport' | 'driversLicense';
    side: 'front' | 'back';
    fileName: string;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    uploadTime: number;
  };
  metadata: {
    clientId?: string;
    sdkVersion: string;
    userAgent: string;
    uploadMethod: 'button' | 'dragDrop';
  };
}

export interface IOuterEvent {
  eventName: string;
  config: Record<string, string>;
  shouldExit: boolean;
}
