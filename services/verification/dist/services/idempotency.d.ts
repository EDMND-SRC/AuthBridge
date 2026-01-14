export interface IdempotencyRecord {
    PK: string;
    SK: string;
    idempotencyKey: string;
    clientId: string;
    verificationId: string;
    createdAt: string;
    ttl: number;
}
export declare class IdempotencyService {
    private client;
    private tableName;
    constructor(tableName: string, region: string);
    /**
     * Generate PK for idempotency record
     */
    private generatePK;
    /**
     * Check if idempotency key exists and return existing verification ID
     * Returns null if key doesn't exist
     */
    checkIdempotencyKey(clientId: string, idempotencyKey: string): Promise<string | null>;
    /**
     * Store idempotency key with verification ID
     * Uses conditional write to prevent race conditions
     */
    storeIdempotencyKey(clientId: string, idempotencyKey: string, verificationId: string): Promise<void>;
}
export declare class IdempotencyConflictError extends Error {
    idempotencyKey: string;
    constructor(idempotencyKey: string);
}
//# sourceMappingURL=idempotency.d.ts.map