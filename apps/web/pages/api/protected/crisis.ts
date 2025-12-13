/**
 * API: Crisis Event
 * 
 * Log crisis mode activation/deactivation.
 */

import { createApiHandler, ApiError } from '@/lib/apiHandler';
import { z } from 'zod';
import { logAudit } from '@/lib/loggerMiddleware';

const activateSchema = z.object({
  trigger_type: z.enum(['manual', 'shake', 'low_battery', 'sos_button', 'auto']),
  city: z.string().optional(),
  location_coarse: z.object({
    lat: z.number(),
    lon: z.number(),
  }).optional(),
});

const resolveSchema = z.object({
  event_id: z.string().uuid(),
});

export default createApiHandler(
  {
    // Activate crisis mode
    POST: async (ctx, body) => {
      if (!ctx.userId) {
        throw ApiError.unauthorized();
      }

      const validated = activateSchema.parse(body);

      const { data, error } = await ctx.supabase
        .from('crisis_events')
        .insert({
          user_id: ctx.userId,
          trigger_type: validated.trigger_type,
          city: validated.city,
          location_coarse: validated.location_coarse,
          resolved: false,
        } as any)
        .select('id')
        .single();

      if (error) {
        ctx.req.log.error({ error }, 'Failed to create crisis event');
        throw ApiError.internal('Failed to log crisis event');
      }

      // Log audit event (crisis is important)
      await logAudit(ctx.userId, 'CRISIS_ACTIVATED', {
        trigger_type: validated.trigger_type,
        city: validated.city,
      }, ctx.req);

      ctx.req.log.warn({
        event: 'crisis_activated',
        trigger_type: validated.trigger_type,
        city: validated.city,
      });

      return {
        success: true,
        event_id: (data as any).id,
        message: 'CRISIS MODE LOGGED // STAY SAFE',
      };
    },

    // Resolve crisis mode
    PATCH: async (ctx) => {
      if (!ctx.userId) {
        throw ApiError.unauthorized();
      }

      const validated = resolveSchema.parse(ctx.req.body);

      const { error } = await (ctx.supabase
        .from('crisis_events') as any)
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', validated.event_id)
        .eq('user_id', ctx.userId);

      if (error) {
        ctx.req.log.error({ error }, 'Failed to resolve crisis event');
        throw ApiError.internal('Failed to resolve crisis event');
      }

      await logAudit(ctx.userId, 'CRISIS_RESOLVED', {
        event_id: validated.event_id,
      }, ctx.req);

      ctx.req.log.info({
        event: 'crisis_resolved',
        event_id: validated.event_id,
      });

      return {
        success: true,
        message: 'CRISIS RESOLVED // SYSTEMS NORMAL',
      };
    },
  },
  { auth: true }
);
