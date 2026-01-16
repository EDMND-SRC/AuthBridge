/**
 * Service for storing duplicate detection results in DynamoDB
 */
import { DynamoDBService } from './dynamodb';
import type { DuplicateDetectionResult } from '../types/duplicate';
export declare class DuplicateStorageService {
    private dynamoDBService;
    constructor(dynamoDBService?: DynamoDBService);
    /**
     * Store duplicate detection results in verification entity
     *
     * @param verificationId - Verification case ID
     * @param duplicateResult - Duplicate detection result
     */
    storeDuplicateResults(verificationId: string, duplicateResult: DuplicateDetectionResult): Promise<void>;
}
//# sourceMappingURL=duplicate-storage.d.ts.map