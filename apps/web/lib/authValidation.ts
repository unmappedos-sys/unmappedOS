/**
 * Auth Validation Schemas
 * 
 * Zod schemas for validating authentication inputs.
 */

import { z } from 'zod';

export const signUpSchema = z.object({
  email: z
    .string()
    .min(1, 'EMAIL REQUIRED')
    .email('INVALID EMAIL FORMAT'),
  password: z
    .string()
    .min(8, 'PASSWORD MINIMUM 8 CHARACTERS')
    .regex(/[A-Z]/, 'PASSWORD REQUIRES UPPERCASE')
    .regex(/[a-z]/, 'PASSWORD REQUIRES LOWERCASE')
    .regex(/[0-9]/, 'PASSWORD REQUIRES NUMBER'),
  confirmPassword: z.string().min(1, 'CONFIRM PASSWORD REQUIRED'),
  name: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'PASSWORDS DO NOT MATCH',
  path: ['confirmPassword'],
});

export const signInSchema = z.object({
  email: z
    .string()
    .min(1, 'EMAIL REQUIRED')
    .email('INVALID EMAIL FORMAT'),
  password: z
    .string()
    .min(1, 'PASSWORD REQUIRED'),
});

export const magicLinkSchema = z.object({
  email: z
    .string()
    .min(1, 'EMAIL REQUIRED')
    .email('INVALID EMAIL FORMAT'),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type MagicLinkInput = z.infer<typeof magicLinkSchema>;

/**
 * Validate a callsign (username)
 * Rules: 3-20 chars, alphanumeric with underscores and hyphens only
 */
export function validateCallsign(callsign: string): boolean {
  if (!callsign || callsign.length < 3 || callsign.length > 20) {
    return false;
  }
  // Only allow alphanumeric, underscore, and hyphen
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return validPattern.test(callsign);
}

/**
 * Validate auth session (placeholder for middleware use)
 */
export async function validateAuthSession(token: string): Promise<boolean> {
  // In real implementation, this would verify the JWT
  return token.length > 0;
}
