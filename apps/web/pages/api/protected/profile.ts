/**
 * API: User Profile
 * 
 * Get and update user profile including fingerprint.
 */

import { createApiHandler, ApiError } from '@/lib/apiHandler';
import { updateFingerprintSchema } from '@/lib/validation';

export default createApiHandler(
  {
    // Get user profile
    GET: async (ctx) => {
      if (!ctx.userId) {
        throw ApiError.unauthorized();
      }

      const { data, error } = await ctx.supabase
        .from('users')
        .select('id, name, email, karma, level, streak, badges, total_intel, fingerprint, current_mode, shadow_mode, vitality, created_at')
        .eq('id', ctx.userId)
        .single();

      if (error || !data) {
        throw ApiError.notFound('User not found');
      }

      return {
        profile: data,
      };
    },

    // Update user profile (fingerprint, mode, etc.)
    PATCH: async (ctx) => {
      if (!ctx.userId) {
        throw ApiError.unauthorized();
      }

      const updates: Record<string, any> = {};

      // Handle fingerprint update
      if (ctx.req.body.fingerprint) {
        const validated = updateFingerprintSchema.parse(ctx.req.body.fingerprint);

        // Merge with existing fingerprint
        const { data: existing } = await ctx.supabase
          .from('users')
          .select('fingerprint')
          .eq('id', ctx.userId)
          .single();

        const existingData = existing as { fingerprint: any } | null;
        updates.fingerprint = {
          ...existingData?.fingerprint,
          ...validated,
          computed_at: new Date().toISOString(),
        };
      }

      // Handle mode update
      if (ctx.req.body.current_mode) {
        const validModes = ['FAST_OPS', 'DEEP_OPS', 'SAFE_OPS', 'CRISIS', 'STANDARD'];
        if (!validModes.includes(ctx.req.body.current_mode)) {
          throw ApiError.badRequest('Invalid mode');
        }
        updates.current_mode = ctx.req.body.current_mode;
      }

      // Handle shadow mode
      if (typeof ctx.req.body.shadow_mode === 'boolean') {
        updates.shadow_mode = ctx.req.body.shadow_mode;
      }

      // Handle vitality
      if (typeof ctx.req.body.vitality === 'number') {
        updates.vitality = Math.max(0, Math.min(100, ctx.req.body.vitality));
      }

      // Handle name
      if (ctx.req.body.name) {
        updates.name = ctx.req.body.name.substring(0, 100);
      }

      if (Object.keys(updates).length === 0) {
        throw ApiError.badRequest('No valid updates provided');
      }

      const { error } = await (ctx.supabase
        .from('users') as any)
        .update(updates)
        .eq('id', ctx.userId);

      if (error) {
        ctx.req.log.error({ error }, 'Failed to update user profile');
        throw ApiError.internal('Failed to update profile');
      }

      ctx.req.log.info({
        event: 'profile_updated',
        fields: Object.keys(updates),
      });

      return {
        success: true,
        updated_fields: Object.keys(updates),
      };
    },
  },
  { auth: true }
);
