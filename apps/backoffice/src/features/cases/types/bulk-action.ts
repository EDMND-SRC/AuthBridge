export interface BulkApproveRequest {
  caseIds: string[];
}

export interface BulkRejectRequest {
  caseIds: string[];
  reason: string;
  notes?: string;
}

export interface CaseResult {
  caseId: string;
  success: boolean;
  error?: string;
}

export interface BulkOperationResponse {
  data: {
    results: CaseResult[];
    summary: {
      total: number;
      succeeded: number;
      failed: number;
    };
  };
  meta: {
    requestId: string;
    timestamp: string;
    bulkOperationId: string;
  };
}
