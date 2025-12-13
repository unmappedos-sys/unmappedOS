/**
 * API: Streaks - Get and Update User Streak
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { updateStreak, checkStreakStatus, getStreakMessage } from '@/lib/streakManager';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ service: 'api-streaks' });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient(req, res);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id;

  if (req.method === 'GET') {
    try {
      const streakInfo = await checkStreakStatus(userId);
      const message = getStreakMessage(streakInfo);

      return res.status(200).json({
        ...streakInfo,
        message,
      });
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get streak');
      return res.status(500).json({ error: 'Failed to get streak' });
    }
  }

  if (req.method === 'POST') {
    try {
      const streakInfo = await updateStreak(userId);
      const message = getStreakMessage(streakInfo);

      logger.info({
        event: 'streak_updated',
        userId,
        current_streak: streakInfo.current_streak,
        status: streakInfo.streak_status,
      });

      return res.status(200).json({
        ...streakInfo,
        message,
      });
    } catch (error) {
      logger.error({ error, userId }, 'Failed to update streak');
      return res.status(500).json({ error: 'Failed to update streak' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
