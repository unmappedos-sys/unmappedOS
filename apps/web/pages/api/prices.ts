import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getUserOr401, createServiceClient } from '../../lib/supabaseServer';
import { logActivity, ACTION_TYPES } from '../../lib/activityLogger';
import { awardKarma, evaluateQuests, getKarmaForAction } from '../../lib/gamify';
import { createRequestLogger } from '../../lib/logger';

const priceSchema = z.object({
  zoneId: z.string(),
  city: z.string(),
  category: z.enum([
    'meal_cheap',
    'meal_mid',
    'coffee',
    'beer',
    'water_bottle',
    'transit_single',
    'accommodation_budget',
    'accommodation_mid',
  ]),
  amount: z.number().positive(),
  currency: z.string().length(3),
  notes: z.string().optional(),
  location: z.object({
    lat: z.number(),
    lon: z.number(),
  }).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const user = await getUserOr401(req);
    const reqLogger = createRequestLogger(req);

    const data = priceSchema.parse(req.body);

    reqLogger.info('PRICE_REPORT', {
      user_id: user.id,
      zone_id: data.zoneId,
      city: data.city,
      category: data.category,
    });

    const supabase = createServiceClient();

    const { data: price, error } = await supabase
      .from('prices')
      .insert({
        user_id: user.id,
        zone_id: data.zoneId,
        city: data.city,
        item_type: data.category,
        price_value: data.amount,
        currency: data.currency,
        metadata: {
          notes: data.notes,
          location: data.location,
        },
      })
      .select()
      .single();

    if (error) {
      reqLogger.error('PRICE_INSERT_FAILED', { error });
      throw error;
    }

    // Log activity
    await logActivity({
      user_id: user.id,
      action_type: ACTION_TYPES.PRICE_REPORT,
      payload: {
        price_id: price.id,
        zone_id: data.zoneId,
        city: data.city,
        category: data.category,
        amount: data.amount,
      },
    });

    // Award karma
    const karmaAmount = getKarmaForAction(ACTION_TYPES.PRICE_REPORT);
    await awardKarma(user.id, karmaAmount, `Price report: ${data.category}`);

    // Evaluate quests
    const unlockedBadges = await evaluateQuests(user.id);

    // Calculate zone median for this category
    const { data: stats } = await supabase
      .from('prices')
      .select('amount')
      .eq('zone_id', data.zoneId)
      .eq('category', data.category)
      .gte('reported_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    let median = null;
    if (stats && stats.length > 0) {
      const amounts = stats.map((s: { amount: number }) => s.amount).sort((a: number, b: number) => a - b);
      const mid = Math.floor(amounts.length / 2);
      median = amounts.length % 2 !== 0 ? amounts[mid] : (amounts[mid - 1] + amounts[mid]) / 2;
    }

    res.status(201).json({ 
      success: true, 
      price,
      karma_awarded: karmaAmount,
      badges_unlocked: unlockedBadges,
      zone_median: median,
      message: 'PRICE INTEL LOGGED',
    });
  } catch (error: any) {
    const reqLogger = createRequestLogger(req);
    
    if (error.message === 'AUTH_REQUIRED') {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
    }

    reqLogger.error('PRICE_ERROR', { error });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to submit price' });
  }
}
