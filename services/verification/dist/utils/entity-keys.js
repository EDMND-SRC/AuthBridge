/**
 * Entity key generation for DynamoDB single-table design
 *
 * Pattern:
 * - Verification: PK=CASE#<id>, SK=META
 * - Document: PK=CASE#<verificationId>, SK=DOC#<documentId>
 * - GSI1: Query by client + status
 * - GSI2: Query by creation date
 */
export function generateVerificationPK(verificationId) {
    return `CASE#${verificationId}`;
}
export function generateVerificationSK() {
    return 'META';
}
export function generateDocumentSK(documentId) {
    return `DOC#${documentId}`;
}
export function generateGSI1Keys(clientId, status, createdAt) {
    return {
        GSI1PK: `CLIENT#${clientId}`,
        GSI1SK: `${status}#${createdAt}`,
    };
}
export function generateGSI2Keys(createdAt, verificationId) {
    // Extract YYYY-MM-DD from ISO 8601 timestamp
    const date = createdAt.split('T')[0];
    return {
        GSI2PK: `DATE#${date}`,
        GSI2SK: `${createdAt}#${verificationId}`,
    };
}
export function parseVerificationId(pk) {
    if (!pk.startsWith('CASE#')) {
        return null;
    }
    return pk.substring(5); // Remove 'CASE#' prefix
}
export function parseDocumentId(sk) {
    if (!sk.startsWith('DOC#')) {
        return null;
    }
    return sk.substring(4); // Remove 'DOC#' prefix
}
//# sourceMappingURL=entity-keys.js.map