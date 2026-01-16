import { z } from 'zod';
const documentTypeSchema = z.enum(['omang', 'passport', 'drivers_licence', 'id_card']);
const customerSchema = z.object({
    email: z.string().email().optional(),
    name: z.string().min(1).max(255).optional(),
    phone: z.string().regex(/^\+[1-9]\d{1,14}$/).optional(), // E.164 format
}).refine((data) => data.email || data.name || data.phone, {
    message: 'At least one customer identifier required (email, name, or phone)',
    path: ['customer'],
});
const createVerificationRequestSchema = z.object({
    customer: customerSchema,
    documentType: documentTypeSchema.optional(),
    redirectUrl: z.string().url().startsWith('https://').optional(),
    webhookUrl: z.string().url().startsWith('https://').optional(),
    metadata: z.record(z.string()).optional(),
    idempotencyKey: z.string().max(255).optional(),
});
export function validateCreateVerificationRequest(request) {
    const result = createVerificationRequestSchema.safeParse(request);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: result.error };
}
//# sourceMappingURL=validation.js.map