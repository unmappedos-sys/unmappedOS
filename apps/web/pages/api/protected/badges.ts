/**
 * API: Badges - Get User Badges and Check Unlocks
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { evaluateBadges, getBadgeUnlockMessage } from '@/lib/badgeSystem';
import { createServiceClient } from '@/lib/supabaseService';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ service: 'api-badges' });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient(req, res);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id;
  const serviceClient = createServiceClient();

  if (req.method === 'GET') {
    try {
      // Get user's unlocked badges
      const { data: userBadges } = await serviceClient
        .from('user_badges')
        .select(`
          unlocked_at,
          badges (
            id,
            name,
            description,
            icon,
            rarity,
            category
          )
        `)
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });

      // Get all available badges
      const { data: allBadges } = await serviceClient
        .from('badges')
        .select('*')
        .order('rarity');

      const unlockedIds = new Set(userBadges?.map((b: any) => b.badges?.id) || []);
      const badgeList = allBadges as Array<{ id: string; [key: string]: any }> | null;

      return res.status(200).json({
        unlocked: userBadges?.map((b: any) => ({
          ...b.badges,
          unlocked_at: b.unlocked_at,
        })) || [],
        available: badgeList?.filter((b) => !unlockedIds.has(b.id)) || [],
        total_unlocked: userBadges?.length || 0,
        total_available: badgeList?.length || 0,
      });
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get badges');
      return res.status(500).json({ error: 'Failed to get badges' });
    }
  }

  if (req.method === 'POST') {
    // Evaluate and unlock any earned badges
    try {
      const results = await evaluateBadges(userId);
      const newUnlocks = results.filter((r) => r.unlocked && !r.already_had);

      logger.info({
        event: 'badges_evaluated',
        userId,
        new_unlocks: newUnlocks.length,
      });

      return res.status(200).json({
        evaluated: results.length,
        new_unlocks: newUnlocks.map((r) => ({
          badge: r.badge,
          message: getBadgeUnlockMessage(r.badge),
        })),
      });
    } catch (error) {
      logger.error({ error, userId }, 'Failed to evaluate badges');
      return res.status(500).json({ error: 'Failed to evaluate badges' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
