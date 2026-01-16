export type WebhookEventType =
  | 'verification.created'
  | 'verification.submitted'
  | 'verification.approved'
  | 'verification.rejected'
  | 'verification.resubmission_required'
  | 'verification.expired';

export interface ClientConfiguration {
  PK: string; // CLIENT#<clientId>
  SK: string; // CONFIG
  clientId: string;
  companyName: string;
  tier: 'api_access' | 'business' | 'enterprise';
  apiKey: string; // Hashed
  webhookUrl?: string; // HTTPS URL
  webhookSecret?: string; // Auto-generated if not provided
  webhookEnabled: boolean;
  webhookEvents: WebhookEventType[]; // Events to subscribe to
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDeliveryLog {
  PK: string; // WEBHOOK#<webhookId>
  SK: string; // ATTEMPT#<attemptNumber>
  webhookId: string; // whk_<uuid>
  verificationId: string;
  clientId: string;
  eventType: WebhookEventType;
  webhookUrl: string;
  attemptNumber: number; // 1, 2, or 3
  statusCode?: number; // HTTP status code
  responseBody?: string; // Truncated to 1KB
  error?: string;
  deliveredAt?: string;
  failedAt?: string;
  nextRetryAt?: string;
  createdAt: string;
}

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: {
    verificationId: string;
    status: string;
    documentType?: string;
    createdAt: string;
    updatedAt: string;
    customer?: {
      name?: string;
      email?: string;
      omangNumber?: string;
    };
    extractedData?: {
      fullName?: string;
      dateOfBirth?: string;
      sex?: string;
      dateOfExpiry?: string;
    };
    biometricScore?: number;
    completedAt?: string;
    rejectionReason?: string;
    rejectionCode?: string;
  };
}
