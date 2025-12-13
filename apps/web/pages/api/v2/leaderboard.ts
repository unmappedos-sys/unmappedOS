/**
 * Optimized Leaderboard API with Caching
 *
 * Performance optimizations:
 * - 5-minute cache TTL (eventually consistent)
 * - Edge runtime for low latency
 * - Pagination support
 * - Index-optimized queries
 */

import type { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabaseService';
import { getCached, setCached } from '../../../lib/cache';

export const config = {
  runtime: 'edge',
  regions: ['sin1', 'hnd1', 'iad1', 'fra1', 'syd1'], // Global edge deployment
};

interface LeaderboardEntry {
  rank: number;
  callsign: string;
  karma: number;
  level: number;
  streak: number;
}

interface LeaderboardResponse {
  type: string;
  city: string;
  leaderboard: LeaderboardEntry[];
  cached: boolean;
  updated_at: string;
}

export default async function handler(req: NextRequest) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city') || 'global';
  const type = searchParams.get('type') || 'karma';
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);

  const cacheKey = `leaderboard:${city}:${type}:${limit}`;
  const LEADERBOARD_TTL = 300; // 5 minutes

  try {
    // Try cache first
    const cached = await getCached<LeaderboardResponse>(cacheKey, {
      namespace: 'unmapped',
      ttl: LEADERBOARD_TTL,
    });

    if (cached) {
      return new Response(JSON.stringify({ ...cached, cached: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      });
    }

    // Cache miss - fetch from database
    const supabase = createServiceClient();

    let query = supabase.from('users').select('id, callsign, karma, level, streak, city');

    // Filter by city if not global
    if (city !== 'global') {
      query = query.eq('city', city);
    }

    // Order by requested metric
    const orderColumn = type === 'streak' ? 'streak' : type === 'level' ? 'level' : 'karma';
    query = query.order(orderColumn, { ascending: false }).limit(limit);

    const { data: users, error } = await query;

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const userData = (users || []) as Array<{
      id: string;
      callsign: string | null;
      karma: number;
      level: number;
      streak: number;
      city: string | null;
    }>;

    // Mask callsigns for privacy
    const leaderboard: LeaderboardEntry[] = userData.map((user, index) => ({
      rank: index + 1,
      callsign: maskCallsign(user.callsign || `OP-${user.id.slice(0, 4)}`),
      karma: user.karma || 0,
      level: user.level || 1,
      streak: user.streak || 0,
    }));

    const result: LeaderboardResponse = {
      type,
      city,
      leaderboard,
      cached: false,
      updated_at: new Date().toISOString(),
    };

    // Store in cache
    await setCached(cacheKey, result, {
      namespace: 'unmapped',
      ttl: LEADERBOARD_TTL,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': result.cached ? 'HIT' : 'MISS',
      },
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch leaderboard' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Mask callsign for privacy (show first 2 + last 2 chars)
 */
function maskCallsign(callsign: string): string {
  if (callsign.length <= 5) {
    return callsign.slice(0, 2) + '***';
  }
  return callsign.slice(0, 2) + '***' + callsign.slice(-2);
}
