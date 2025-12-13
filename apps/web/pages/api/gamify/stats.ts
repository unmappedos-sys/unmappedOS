/**
 * Gamification Stats API - Get user's karma, level, badges, quests
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserOr401 } from '../../../lib/supabaseServer';
import { getUserGamificationStats } from '../../../lib/gamify';
import { createRequestLogger } from '../../../lib/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const user = await getUserOr401(req);
    const reqLogger = createRequestLogger(req);

    reqLogger.info('GAMIFY_STATS_FETCH', { user_id: user.id });

    // Get gamification stats
    const stats = await getUserGamificationStats(user.id);

    return res.status(200).json({
      success: true,
      ...stats,
    });
  } catch (error: any) {
    const reqLogger = createRequestLogger(req);
    
    if (error.message === 'AUTH_REQUIRED') {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
    }

    reqLogger.error('GAMIFY_STATS_ERROR', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
