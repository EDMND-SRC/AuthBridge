export type WebhookEventType = 'verification.created' | 'verification.submitted' | 'verification.approved' | 'verification.rejected' | 'verification.resubmission_required' | 'verification.expired';
export interface ClientConfiguration {
    PK: string;
    SK: string;
    clientId: string;
    companyName: string;
    tier: 'api_access' | 'business' | 'enterprise';
    apiKey: string;
    webhookUrl?: string;
    webhookSecret?: string;
    webhookEnabled: boolean;
    webhookEvents: WebhookEventType[];
    createdAt: string;
    updatedAt: string;
}
export interface WebhookDeliveryLog {
    PK: string;
    SK: string;
    webhookId: string;
    verificationId: string;
    clientId: string;
    eventType: WebhookEventType;
    webhookUrl: string;
    attemptNumber: number;
    statusCode?: number;
    responseBody?: string;
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
//# sourceMappingURL=webhook.d.ts.map