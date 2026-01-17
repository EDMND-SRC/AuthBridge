export type DataRequestType = 'export' | 'deletion';
export type DataRequestStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type SubjectIdentifierType = 'email' | 'omangNumber' | 'verificationId';
export type DeletionReason = 'user_request' | 'data_retention_expired' | 'legal_requirement';

export interface SubjectIdentifier {
  type: SubjectIdentifierType;
  value: string;
}

export interface DataRequestEntity {
  PK: string;                    // DSR#{requestId}
  SK: string;                    // META
  GSI1PK: string;                // SUBJECT#{subjectIdentifier}
  GSI1SK: string;                // {createdAt}#{requestId}
  requestId: string;
  type: DataRequestType;
  status: DataRequestStatus;
  subjectIdentifier: SubjectIdentifier;
  requestedBy: string;           // clientId or userId
  reason?: string;               // for deletion
  exportUrl?: string;            // presigned URL for export
  exportExpiresAt?: string;      // ISO 8601
  scheduledDeletionDate?: string; // ISO 8601
  completedAt?: string;          // ISO 8601
  errorMessage?: string;
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
  ttl: number;                   // Unix timestamp (90 days)
}

export interface CreateDataRequestInput {
  type: DataRequestType;
  subjectIdentifier: SubjectIdentifier;
  requestedBy: string;
  reason?: string;
  notificationEmail?: string;
  confirmDeletion?: boolean;
}

export interface ExportData {
  exportMetadata: {
    exportId: string;
    exportedAt: string;
    subjectIdentifier: string;
    dataCategories: string[];
  };
  personalData: {
    email?: string;
    name?: string;
    phone?: string;
  };
  verifications: Array<{
    verificationId: string;
    status: string;
    documentType: string;
    createdAt: string;
    completedAt?: string;
    extractedData?: Record<string, any>;
    biometricScore?: number;
    documents: Array<{
      documentId: string;
      documentType: string;
      downloadUrl: string;
      uploadedAt: string;
    }>;
  }>;
  auditLogs: Array<{
    timestamp: string;
    action: string;
    details: Record<string, any>;
  }>;
}

export interface DeletionQueueItem {
  PK: string;                    // DELETION_QUEUE#{date}
  SK: string;                    // {scheduledTime}#{requestId}
  requestId: string;
  subjectIdentifier: SubjectIdentifier;
  itemsToDelete: Array<{
    type: 'dynamodb' | 's3';
    pk?: string;
    sk?: string;
    bucket?: string;
    key?: string;
  }>;
  status: 'pending' | 'processing' | 'completed';
  createdAt: string;
}
