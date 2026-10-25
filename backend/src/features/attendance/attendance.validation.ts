import { z } from 'zod';

export const rejectionSchema = z.object({
  reason: z.string().trim().max(300).optional().default(''),
});
