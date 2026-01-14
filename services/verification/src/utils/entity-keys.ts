/**
 * Entity key generation for DynamoDB single-table design
 *
 * Pattern:
 * - Verification: PK=CASE#<id>, SK=META
 * - Document: PK=CASE#<verificationId>, SK=DOC#<documentId>
 * - GSI1: Query by client + status
 * - GSI2: Query by creation date
 */

export function generateVerificationPK(verificationId: string): string {
  return `CASE#${verificationId}`;
}

export function generateVerificationSK(): string {
  return 'META';
}

export function generateDocumentSK(documentId: string): string {
  return `DOC#${documentId}`;
}

export interface GSI1Keys {
  GSI1PK: string;
  GSI1SK: string;
}

export function generateGSI1Keys(
  clientId: string,
  status: string,
  createdAt: string
): GSI1Keys {
  return {
    GSI1PK: `CLIENT#${clientId}`,
    GSI1SK: `${status}#${createdAt}`,
  };
}

export interface GSI2Keys {
  GSI2PK: string;
  GSI2SK: string;
}

export function generateGSI2Keys(
  createdAt: string,
  verificationId: string
): GSI2Keys {
  // Extract YYYY-MM-DD from ISO 8601 timestamp
  const date = createdAt.split('T')[0];

  return {
    GSI2PK: `DATE#${date}`,
    GSI2SK: `${createdAt}#${verificationId}`,
  };
}

export function parseVerificationId(pk: string): string | null {
  if (!pk.startsWith('CASE#')) {
    return null;
  }
  return pk.substring(5); // Remove 'CASE#' prefix
}

export function parseDocumentId(sk: string): string | null {
  if (!sk.startsWith('DOC#')) {
    return null;
  }
  return sk.substring(4); // Remove 'DOC#' prefix
}
