import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from './dynamodb';
import {
  generateVerificationPK,
  generateVerificationSK,
  generateGSI1Keys,
  generateGSI2Keys,
} from '../utils/entity-keys';
import type {
  VerificationEntity,
  CreateVerificationRequest,
  VerificationStatus,
} from '../types/verification';

export class VerificationService {
  private db: DynamoDBService;

  constructor(tableName: string, region: string) {
    this.db = new DynamoDBService(tableName, region);
  }

  /**
   * Generate verification ID with ver_ prefix
   */
  generateVerificationId(): string {
    return `ver_${uuidv4().replace(/-/g, '')}`;
  }

  /**
   * Calculate TTL (30 days from creation)
   */
  calculateTTL(createdAt: string): number {
    const createdTimestamp = new Date(createdAt).getTime();
    const ttlTimestamp = createdTimestamp + 30 * 24 * 60 * 60 * 1000; // 30 days
    return Math.floor(ttlTimestamp / 1000); // Unix timestamp
  }

  /**
   * Create new verification case
   */
  async createVerification(
    request: CreateVerificationRequest,
    clientId: string
  ): Promise<VerificationEntity> {
    const verificationId = this.generateVerificationId();
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const ttl = this.calculateTTL(createdAt);

    const gsi1Keys = generateGSI1Keys(clientId, 'created', createdAt);
    const gsi2Keys = generateGSI2Keys(createdAt, verificationId);

    const verification: VerificationEntity = {
      PK: generateVerificationPK(verificationId),
      SK: generateVerificationSK(),
      verificationId,
      clientId,
      status: 'created',
      documentType: request.documentType,
      customer: request.customer,
      redirectUrl: request.redirectUrl,
      webhookUrl: request.webhookUrl,
      metadata: request.metadata,
      createdAt,
      updatedAt: createdAt,
      expiresAt,
      ttl,
      ...gsi1Keys,
      ...gsi2Keys,
    };

    await this.db.putVerification(verification);
    return verification;
  }

  /**
   * Get verification by ID
   */
  async getVerification(verificationId: string): Promise<VerificationEntity | null> {
    return this.db.getVerification(verificationId);
  }

  /**
   * List verifications for a client (optionally filtered by status)
   */
  async listVerificationsByClient(
    clientId: string,
    status?: VerificationStatus
  ): Promise<VerificationEntity[]> {
    return this.db.queryByClientAndStatus(clientId, status);
  }

  /**
   * List verifications created on a specific date
   */
  async listVerificationsByDate(date: string): Promise<VerificationEntity[]> {
    return this.db.queryByDate(date);
  }

  /**
   * Update verification status
   */
  async updateStatus(
    verificationId: string,
    status: VerificationStatus
  ): Promise<void> {
    const updatedAt = new Date().toISOString();
    await this.db.updateVerificationStatus(verificationId, status, updatedAt);
  }
}
