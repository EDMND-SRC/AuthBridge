/**
 * AuthBridge Web SDK - Verification Factories
 *
 * Faker-based factories for test data generation.
 * Use overrides to customize data for specific test scenarios.
 */

// Note: Install @faker-js/faker if not present: pnpm add -D @faker-js/faker

type DocumentType = 'idCard' | 'driversLicense' | 'passport' | 'voterId';
type VerificationType = 'kyc' | 'kyb';
type VerificationStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

export interface Verification {
  sessionId: string;
  type: VerificationType;
  documentType: DocumentType;
  status: VerificationStatus;
  callbackUrl: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

/**
 * Generate a UUID v4 (simple implementation for tests)
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a random email
 */
function generateEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test-${random}-${timestamp}@example.com`;
}

/**
 * Generate a random name
 */
function generateName(): string {
  const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${first} ${last}`;
}

/**
 * Generate a random URL
 */
function generateUrl(): string {
  const random = Math.random().toString(36).substring(2, 8);
  return `https://example.com/callback/${random}`;
}

/**
 * Create a verification session with sensible defaults
 *
 * @example
 * // Default verification
 * const verification = createVerification();
 *
 * // KYB verification with passport
 * const kybVerification = createVerification({
 *   type: 'kyb',
 *   documentType: 'passport',
 * });
 */
export function createVerification(overrides: Partial<Verification> = {}): Verification {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

  return {
    sessionId: generateUUID(),
    type: 'kyc',
    documentType: 'passport',
    status: 'pending',
    callbackUrl: generateUrl(),
    createdAt: now,
    expiresAt,
    ...overrides,
  };
}

/**
 * Create a KYC verification (convenience wrapper)
 */
export function createKYCVerification(overrides: Partial<Verification> = {}): Verification {
  return createVerification({ type: 'kyc', ...overrides });
}

/**
 * Create a KYB verification (convenience wrapper)
 */
export function createKYBVerification(overrides: Partial<Verification> = {}): Verification {
  return createVerification({ type: 'kyb', ...overrides });
}

/**
 * Create a user with sensible defaults
 *
 * @example
 * // Default user
 * const user = createUser();
 *
 * // User with specific email
 * const specificUser = createUser({ email: 'admin@example.com' });
 */
export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: generateUUID(),
    email: generateEmail(),
    name: generateName(),
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Create multiple verifications
 */
export function createVerifications(count: number, overrides: Partial<Verification> = {}): Verification[] {
  return Array.from({ length: count }, () => createVerification(overrides));
}

/**
 * Create multiple users
 */
export function createUsers(count: number, overrides: Partial<User> = {}): User[] {
  return Array.from({ length: count }, () => createUser(overrides));
}
