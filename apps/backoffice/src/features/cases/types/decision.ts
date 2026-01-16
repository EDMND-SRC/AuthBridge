export const REJECT_REASONS = [
  { value: 'blurry_image', label: 'Blurry or Low Quality Image' },
  { value: 'face_mismatch', label: 'Face Does Not Match ID Photo' },
  { value: 'invalid_document', label: 'Invalid or Expired Document' },
  { value: 'duplicate_detected', label: 'Duplicate Submission Detected' },
  { value: 'incomplete_data', label: 'Incomplete or Missing Information' },
  { value: 'fraudulent', label: 'Suspected Fraudulent Document' },
  { value: 'other', label: 'Other (Specify in Notes)' }
] as const;

export type RejectReasonValue = typeof REJECT_REASONS[number]['value'];

export interface RejectCaseParams {
  caseId: string;
  reason: RejectReasonValue;
  notes?: string;
}

export interface CaseDecisionResponse {
  data: {
    caseId: string;
    status: 'approved' | 'rejected';
    reason?: string;
    notes?: string;
    updatedAt: string;
    updatedBy: string;
  };
  meta: {
    requestId: string;
    timestamp: string;
  };
}
