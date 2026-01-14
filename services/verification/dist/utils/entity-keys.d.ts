/**
 * Entity key generation for DynamoDB single-table design
 *
 * Pattern:
 * - Verification: PK=CASE#<id>, SK=META
 * - Document: PK=CASE#<verificationId>, SK=DOC#<documentId>
 * - GSI1: Query by client + status
 * - GSI2: Query by creation date
 */
export declare function generateVerificationPK(verificationId: string): string;
export declare function generateVerificationSK(): string;
export declare function generateDocumentSK(documentId: string): string;
export interface GSI1Keys {
    GSI1PK: string;
    GSI1SK: string;
}
export declare function generateGSI1Keys(clientId: string, status: string, createdAt: string): GSI1Keys;
export interface GSI2Keys {
    GSI2PK: string;
    GSI2SK: string;
}
export declare function generateGSI2Keys(createdAt: string, verificationId: string): GSI2Keys;
export declare function parseVerificationId(pk: string): string | null;
export declare function parseDocumentId(sk: string): string | null;
//# sourceMappingURL=entity-keys.d.ts.map