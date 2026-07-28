import { z } from 'zod';

/** Password policy: length-first per NIST SP 800-63B; no composition rules. */
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128);

export const registerSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: passwordSchema,
  displayName: z.string().min(1).max(120),
  organisationName: z.string().min(2).max(120),
  industry: z.string().max(80).optional(),
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const mfaVerifySchema = z.object({
  mfaToken: z.string().min(10),
  code: z.string().min(6).max(24),
});
export type MfaVerifyDto = z.infer<typeof mfaVerifySchema>;

export const mfaConfirmSchema = z.object({
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
});
export type MfaConfirmDto = z.infer<typeof mfaConfirmSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});
export type RefreshDto = z.infer<typeof refreshSchema>;

export const createTokenSchema = z.object({
  name: z.string().min(1).max(120),
  scopes: z
    .array(z.enum(['read', 'write', 'admin']))
    .min(1)
    .default(['read']),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});
export type CreateTokenDto = z.infer<typeof createTokenSchema>;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResult {
  mfaRequired: boolean;
  mfaToken?: string;
  tokens?: TokenPair;
  user?: { id: string; email: string; displayName: string };
}
