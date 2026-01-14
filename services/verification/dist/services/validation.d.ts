import { z } from 'zod';
import type { CreateVerificationRequest } from '../types/verification';
export declare function validateCreateVerificationRequest(request: unknown): {
    success: true;
    data: CreateVerificationRequest;
} | {
    success: false;
    errors: z.ZodError;
};
//# sourceMappingURL=validation.d.ts.map