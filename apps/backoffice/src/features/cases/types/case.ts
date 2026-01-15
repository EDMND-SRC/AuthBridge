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
