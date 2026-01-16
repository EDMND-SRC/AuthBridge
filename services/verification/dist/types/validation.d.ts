/**
 * Validation types for Omang document validation
 */
export interface ValidationResult {
    valid: boolean;
    error?: string;
    warning?: string;
}
export interface OmangNumberValidationResult extends ValidationResult {
    format?: 'valid' | 'invalid';
    value?: string;
}
export interface ExpiryValidationResult extends ValidationResult {
    expired?: boolean;
    daysUntilExpiry?: number;
    expiryDate?: string;
    issueDate?: string;
    expiredDays?: number;
}
export interface OmangValidationResult {
    omangNumber: OmangNumberValidationResult;
    expiry: ExpiryValidationResult;
    overall: {
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
    validatedAt: string;
}
export declare const ValidationErrorCodes: {
    readonly OMANG_INVALID_LENGTH: "OMANG_INVALID_LENGTH";
    readonly OMANG_INVALID_CHARACTERS: "OMANG_INVALID_CHARACTERS";
    readonly OMANG_EXPIRED: "OMANG_EXPIRED";
    readonly OMANG_EXPIRY_MISMATCH: "OMANG_EXPIRY_MISMATCH";
    readonly OMANG_INVALID_DATES: "OMANG_INVALID_DATES";
};
export type ValidationErrorCode = typeof ValidationErrorCodes[keyof typeof ValidationErrorCodes];
//# sourceMappingURL=validation.d.ts.map