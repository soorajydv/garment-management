import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(3),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Use at least 8 characters'),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  phone: z.string().trim().max(30).optional().default(''),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Enter your current password to delete the account'),
});
