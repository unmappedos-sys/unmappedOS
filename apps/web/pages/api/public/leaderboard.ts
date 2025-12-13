/**
 * API: Leaderboard - Anonymous Rankings
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServiceClient } from '@/lib/supabaseService';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ service: 'api-leaderboard' });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { city, type = 'karma', limit = '10' } = req.query;

  const supabase = createServiceClient();
  const limitNum = Math.min(parseInt(limit as string) || 10, 50);

  try {
    let query = supabase
      .from('users')
      .select('id, callsign, karma, level, streak, city');

    // Filter by city if provided
    if (city && typeof city === 'string') {
      query = query.eq('city', city);
    }

    // Order by requested type
    switch (type) {
      case 'karma':
        query = query.order('karma', { ascending: false });
        break;
      case 'level':
        query = query.order('level', { ascending: false });
        break;
      case 'streak':
        query = query.order('streak', { ascending: false });
        break;
      default:
        query = query.order('karma', { ascending: false });
    }

    const { data: users, error } = await query.limit(limitNum);

    if (error) {
      logger.error({ error }, 'Failed to fetch leaderboard');
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }

    const userData = (users || []) as Array<{ id: string; callsign: string | null; karma: number; level: number; streak: number; city: string | null }>;

    // Anonymize leaderboard - use masked callsigns
    const leaderboard = userData.map((user, index) => ({
      rank: index + 1,
      callsign: maskCallsign(user.callsign || `Operative-${user.id.slice(0, 4)}`),
      karma: user.karma || 0,
      level: user.level || 1,
      streak: user.streak || 0,
      // Don't expose city unless it was the filter
      city: city ? user.city : undefined,
    }));

    return res.status(200).json({
      type,
      city: city || 'global',
      leaderboard,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Leaderboard error');
    return res.status(500).json({ error: 'Internal error' });
  }
}

/**
 * Mask callsign for privacy (show first 2 and last 2 chars)
 */
function maskCallsign(callsign: string): string {
  if (callsign.length <= 5) {
    return callsign.slice(0, 2) + '***';
  }
  return callsign.slice(0, 2) + '***' + callsign.slice(-2);
}
