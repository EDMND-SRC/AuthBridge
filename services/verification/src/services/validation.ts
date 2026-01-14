import { z } from 'zod';
import type { CreateVerificationRequest } from '../types/verification';

const documentTypeSchema = z.enum(['omang', 'passport', 'drivers_license', 'id_card']);

const customerMetadataSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/).optional(), // E.164 format
  externalId: z.string().max(255).optional(),
  redirectUrl: z.string().url().startsWith('https://').optional(),
});

const createVerificationRequestSchema = z.object({
  documentType: documentTypeSchema,
  customerMetadata: customerMetadataSchema,
  idempotencyKey: z.string().max(255).optional(),
});

export function validateCreateVerificationRequest(
  request: unknown
): { success: true; data: CreateVerificationRequest } | { success: false; errors: z.ZodError } {
  const result = createVerificationRequestSchema.safeParse(request);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
}
