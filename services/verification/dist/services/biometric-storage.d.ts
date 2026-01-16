import type { BiometricData } from '../types/biometric';
export declare class BiometricStorageService {
    private dynamoDBService;
    constructor();
    /**
     * Store biometric results in document entity
     * @param verificationId Verification case ID
     * @param documentId Selfie document ID
     * @param biometricData Complete biometric verification result
     */
    storeBiometricResults(verificationId: string, documentId: string, biometricData: BiometricData): Promise<void>;
    /**
     * Update verification case with biometric summary
     * @param verificationId Verification case ID
     * @param biometricData Complete biometric verification result
     */
    updateVerificationWithBiometricSummary(verificationId: string, biometricData: BiometricData): Promise<void>;
}
//# sourceMappingURL=biometric-storage.d.ts.map