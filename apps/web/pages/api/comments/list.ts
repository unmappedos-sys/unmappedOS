/**
 * Comments List API - Get comments for a zone
 * Returns structured intel sorted by trust score
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { zone_id, city, limit = '20' } = req.query;

    if (!zone_id || typeof zone_id !== 'string') {
      return res.status(400).json({ error: 'zone_id required' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let query = supabase
      .from('comments')
      .select(
        `
        id,
        short_tag,
        note,
        price,
        photo_url,
        created_at,
        verified,
        trust_score,
        user_hash
      `
      )
      .eq('zone_id', zone_id)
      .eq('moderated', false)
      .order('trust_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (city) {
      query = query.eq('city', city);
    }

    const { data: comments, error } = await query;

    if (error) {
      console.error('[Comments List] Query error:', error);
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }

    // Anonymize user_hash for display
    const sanitizedComments = comments.map((c) => ({
      ...c,
      user_hash: c.user_hash ? `OP-${c.user_hash.slice(0, 6)}` : 'ANONYMOUS',
    }));

    return res.status(200).json({
      comments: sanitizedComments,
      count: comments.length,
    });
  } catch (error) {
    console.error('[Comments List] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
