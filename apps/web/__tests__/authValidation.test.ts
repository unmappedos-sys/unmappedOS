/**
 * Auth Validation Tests
 * 
 * Unit tests for zod validation schemas used in authentication forms.
 */

import { signUpSchema, signInSchema, magicLinkSchema } from '../lib/authValidation';

describe('Auth Validation Schemas', () => {
  describe('signUpSchema', () => {
    it('should validate valid sign-up data', () => {
      const validData = {
        email: 'operative@unmappedos.com',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
        name: 'Field Operative',
      };

      const result = signUpSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
      };

      const result = signUpSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('INVALID EMAIL');
      }
    });

    it('should reject password without uppercase', () => {
      const invalidData = {
        email: 'operative@unmappedos.com',
        password: 'securepass123',
        confirmPassword: 'securepass123',
      };

      const result = signUpSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.errors.map(e => e.message);
        expect(messages.some(m => m.includes('UPPERCASE'))).toBe(true);
      }
    });

    it('should reject password without lowercase', () => {
      const invalidData = {
        email: 'operative@unmappedos.com',
        password: 'SECUREPASS123',
        confirmPassword: 'SECUREPASS123',
      };

      const result = signUpSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.errors.map(e => e.message);
        expect(messages.some(m => m.includes('LOWERCASE'))).toBe(true);
      }
    });

    it('should reject password without number', () => {
      const invalidData = {
        email: 'operative@unmappedos.com',
        password: 'SecurePassword',
        confirmPassword: 'SecurePassword',
      };

      const result = signUpSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.errors.map(e => e.message);
        expect(messages.some(m => m.includes('NUMBER'))).toBe(true);
      }
    });

    it('should reject short password', () => {
      const invalidData = {
        email: 'operative@unmappedos.com',
        password: 'Pass1',
        confirmPassword: 'Pass1',
      };

      const result = signUpSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.errors.map(e => e.message);
        expect(messages.some(m => m.includes('MINIMUM 8'))).toBe(true);
      }
    });

    it('should reject mismatched passwords', () => {
      const invalidData = {
        email: 'operative@unmappedos.com',
        password: 'SecurePass123',
        confirmPassword: 'DifferentPass123',
      };

      const result = signUpSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('DO NOT MATCH');
      }
    });

    it('should accept optional name field', () => {
      const dataWithoutName = {
        email: 'operative@unmappedos.com',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
      };

      const result = signUpSchema.safeParse(dataWithoutName);
      expect(result.success).toBe(true);
    });
  });

  describe('signInSchema', () => {
    it('should validate valid sign-in data', () => {
      const validData = {
        email: 'operative@unmappedos.com',
        password: 'SecurePass123',
      };

      const result = signInSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'SecurePass123',
      };

      const result = signInSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing password', () => {
      const invalidData = {
        email: 'operative@unmappedos.com',
        password: '',
      };

      const result = signInSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('PASSWORD REQUIRED');
      }
    });
  });

  describe('magicLinkSchema', () => {
    it('should validate valid email for magic link', () => {
      const validData = {
        email: 'operative@unmappedos.com',
      };

      const result = magicLinkSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'not-an-email',
      };

      const result = magicLinkSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty email', () => {
      const invalidData = {
        email: '',
      };

      const result = magicLinkSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('EMAIL REQUIRED');
      }
    });
  });
});
