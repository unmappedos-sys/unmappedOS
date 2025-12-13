/**
 * API: Submit Price
 * 
 * Handles price submissions with delta calculation.
 */

import { createApiHandler, ApiError } from '@/lib/apiHandler';
import { submitPriceSchema } from '@/lib/validation';
import { submitPrice } from '@/lib/priceDelta';
import { awardKarma, getKarmaForAction } from '@/lib/gamify';

export default createApiHandler(
  {
    POST: async (ctx, body) => {
      if (!ctx.userId) {
        throw ApiError.unauthorized();
      }

      const validated = submitPriceSchema.parse(body);

      // Submit price and get delta
      const result = await submitPrice(ctx.userId, {
        zone_id: validated.zone_id,
        city: validated.city,
        category: validated.category,
        amount: validated.amount,
        currency: validated.currency,
        notes: validated.notes,
        coordinates: validated.coordinates,
      });

      // Award karma for price submission
      const karmaAmount = getKarmaForAction('price_submitted');
      await awardKarma(ctx.userId, karmaAmount, 'price_submitted');

      // Log activity
      await ctx.supabase.from('activity_logs').insert({
        user_id: ctx.userId,
        action_type: 'price_submitted',
        payload: {
          zone_id: validated.zone_id,
          city: validated.city,
          category: validated.category,
          delta: result.delta,
        },
      } as any);

      ctx.req.log.info({
        event: 'price_submitted',
        zone_id: validated.zone_id,
        category: validated.category,
        has_delta: !!result.delta,
      });

      return {
        success: true,
        price_id: result.priceId,
        delta: result.delta,
        karma_awarded: karmaAmount,
      };
    },
  },
  { auth: true }
);
