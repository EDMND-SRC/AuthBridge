export type CaseStatus = 'pending' | 'in-review' | 'approved' | 'rejected';

export type DocumentType = 'omang' | 'passport' | 'drivers_licence';

export interface Case {
  caseId: string;
  customerName: string;
  omangNumber: string | null; // Masked: ***1234
  status: CaseStatus;
  documentType: DocumentType;
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseFilters {
  status?: CaseStatus;
  dateFrom?: string;
  dateTo?: string;
  documentType?: DocumentType;
  assignee?: string;
  search?: string;
}

export interface CaseListResponse {
  data: Case[];
  meta: {
    requestId: string;
    timestamp: string;
    pagination: {
      limit: number;
      cursor: string | null;
      hasMore: boolean;
      total: number;
    };
  };
}

export interface CaseDetail {
  caseId: string;
  status: CaseStatus;
  customer: {
    name: string;
    omangNumber: string; // FULL number (not masked) - audit logged
    dateOfBirth: string;
    gender: string;
    address: string;
  };
  documents: {
    front?: { url: string; uploadedAt: string };
    back?: { url: string; uploadedAt: string };
    selfie: { url: string; uploadedAt: string };
  };
  extractedData: {
    fullName: string;
    idNumber: string;
    dateOfBirth: string;
    placeOfBirth?: string;
    issueDate?: string;
    expiryDate?: string;
    confidence: Record<string, number>;
  };
  verificationChecks: {
    faceMatch: { score: number; status: 'pass' | 'fail' | 'review' };
    liveness: { status: 'pass' | 'fail'; confidence: number };
    documentAuthenticity: { score: number; status: 'pass' | 'fail' };
    omangFormat: { valid: boolean; errors?: string[] };
    duplicateCheck: { found: boolean; caseIds?: string[]; riskLevel?: string };
    expiryCheck: { valid: boolean; daysUntilExpiry?: number };
  };
  history: Array<{
    timestamp: string;
    type: 'system' | 'user';
    action: string;
    userId?: string;
    userName?: string;
    details?: string;
  }>;
  metadata: {
    clientId: string;
    clientName: string;
    reference?: string;
    submittedAt: string;
    assignee?: string;
  };
}
