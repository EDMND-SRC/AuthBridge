import { derived, writable } from 'svelte/store';
import { steps } from '../navigation';
import { IAppState, IDocument, IDocumentInfo, ISelectedParams } from './types';

// const STORAGE_SELFIE_KEY = "selfie";
// const STORAGE_DOCUMENTS_KEY = "documents";
// const STORAGE_DOCUMENT_INFO_KEY = "document-info";

//selfie uir
// export const selfieUri = writable<string>(sessionStorage.getItem(STORAGE_SELFIE_KEY) || "");
// selfieUri.subscribe(selfie => {
//   sessionStorage.setItem(STORAGE_SELFIE_KEY, selfie);
// });
export const selfieUri = writable<string>('');

//docs
export const documents = writable<IDocument[]>([]);
// let savedDocs = sessionStorage.getItem(STORAGE_DOCUMENTS_KEY);
// export const documents = writable<IDocument[]>(savedDocs ? JSON.parse(savedDocs) : []);
// documents.subscribe(docs => {
//   sessionStorage.setItem(STORAGE_DOCUMENTS_KEY, JSON.stringify(docs));
// });

//selected docs
export const selectedDocumentInfo = writable<IDocumentInfo>();
// let savedSelectedDocs = sessionStorage.getItem(STORAGE_DOCUMENT_INFO_KEY);
// export const selectedDocumentInfo = writable<IDocumentInfo>(savedSelectedDocs ? JSON.parse(savedSelectedDocs) : "");
// selectedDocumentInfo.subscribe(docInfo => {
//   sessionStorage.setItem(STORAGE_DOCUMENT_INFO_KEY, JSON.stringify(docInfo));
// });

// const APP_STATE_KEY = "appState";

//reload state from session storage if it exists
// let savedState = sessionStorage.getItem(APP_STATE_KEY);
// let savedStateObj;
// if (savedState) savedStateObj = JSON.parse(savedState);

export const currentStepIdx = writable<number>(0);
export const currentParams = writable<ISelectedParams | null>(null);
export const currentRoute = writable<string>();

let previousPage = 'none';

export const appState = derived(currentRoute, $currentRoute => {
  const index = steps.findIndex(s => s.name === $currentRoute);

  const appState: IAppState = {
    currentStepIdx: index,
    currentPage: $currentRoute,
    previousPage,
  };

  previousPage = $currentRoute;

  return appState;
});

export const currentStepId = writable<string>('welcome');

// Document selection state
export type DocumentType = 'omang' | 'passport' | 'driversLicense' | null;
export const selectedDocument = writable<DocumentType>(null);

export function selectDocument(type: DocumentType) {
  selectedDocument.set(type);
}

export function clearDocumentSelection() {
  selectedDocument.set(null);
}

// Document capture metadata for event emission on review confirmation
export interface ICaptureMetadata {
  documentType: 'omang' | 'passport' | 'driversLicense';
  side: 'front' | 'back';
  imageSize: number;
  compressionRatio: number;
  captureTime: number;
  cameraResolution: string;
}

// Document upload metadata for event emission on review confirmation
export interface IUploadMetadata {
  documentType: 'omang' | 'passport' | 'driversLicense';
  side: 'front' | 'back';
  fileName: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  uploadTime: number;
  uploadMethod: 'button' | 'dragDrop';
}

export const pendingCaptureMetadata = writable<ICaptureMetadata | null>(null);
export const pendingUploadMetadata = writable<IUploadMetadata | null>(null);

export function setPendingCaptureMetadata(metadata: ICaptureMetadata) {
  pendingCaptureMetadata.set(metadata);
}

export function clearPendingCaptureMetadata() {
  pendingCaptureMetadata.set(null);
}

export function setPendingUploadMetadata(metadata: IUploadMetadata) {
  pendingUploadMetadata.set(metadata);
}

export function clearPendingUploadMetadata() {
  pendingUploadMetadata.set(null);
}

// Selfie capture metadata for event emission on review confirmation
export interface ISelfieMetadata {
  fileName: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  captureTime: number;
  cameraResolution: string;
  livenessChecks: {
    blink: { passed: boolean; attempts: number };
    turnLeft: { passed: boolean; attempts: number };
    turnRight: { passed: boolean; attempts: number };
  };
  totalAttempts: number;
  faceQuality: {
    centered: boolean;
    distance: 'optimal' | 'tooClose' | 'tooFar';
    message: string;
  };
}

export const pendingSelfieMetadata = writable<ISelfieMetadata | null>(null);

export function setPendingSelfieMetadata(metadata: ISelfieMetadata) {
  pendingSelfieMetadata.set(metadata);
}

export function clearPendingSelfieMetadata() {
  pendingSelfieMetadata.set(null);
}
