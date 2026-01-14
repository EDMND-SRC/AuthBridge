import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from './dynamodb';
import { generateVerificationPK, generateVerificationSK, generateGSI1Keys, generateGSI2Keys, } from '../utils/entity-keys';
export class VerificationService {
    db;
    constructor(tableName, region) {
        this.db = new DynamoDBService(tableName, region);
    }
    /**
     * Generate verification ID with ver_ prefix
     */
    generateVerificationId() {
        return `ver_${uuidv4().replace(/-/g, '')}`;
    }
    /**
     * Calculate TTL (30 days from creation)
     */
    calculateTTL(createdAt) {
        const createdTimestamp = new Date(createdAt).getTime();
        const ttlTimestamp = createdTimestamp + 30 * 24 * 60 * 60 * 1000; // 30 days
        return Math.floor(ttlTimestamp / 1000); // Unix timestamp
    }
    /**
     * Create new verification case
     */
    async createVerification(request, clientId) {
        const verificationId = this.generateVerificationId();
        const createdAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const ttl = this.calculateTTL(createdAt);
        const gsi1Keys = generateGSI1Keys(clientId, 'created', createdAt);
        const gsi2Keys = generateGSI2Keys(createdAt, verificationId);
        const verification = {
            PK: generateVerificationPK(verificationId),
            SK: generateVerificationSK(),
            verificationId,
            clientId,
            status: 'created',
            documentType: request.documentType,
            customerMetadata: request.customerMetadata,
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
    async getVerification(verificationId) {
        return this.db.getVerification(verificationId);
    }
    /**
     * List verifications for a client (optionally filtered by status)
     */
    async listVerificationsByClient(clientId, status) {
        return this.db.queryByClientAndStatus(clientId, status);
    }
    /**
     * List verifications created on a specific date
     */
    async listVerificationsByDate(date) {
        return this.db.queryByDate(date);
    }
    /**
     * Update verification status
     */
    async updateStatus(verificationId, status) {
        const updatedAt = new Date().toISOString();
        await this.db.updateVerificationStatus(verificationId, status, updatedAt);
    }
}
//# sourceMappingURL=verification.js.map