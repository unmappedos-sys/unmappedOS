/**
 * API: Get Digital Cairn by Anchor
 * GET /api/cairns/[anchorId]
 * 
 * Returns all stones placed at an anchor point.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface Stone {
  id: string;
  shape: string;
  color: string;
  position: number;
  placed_at: string;
}

interface CairnResponse {
  anchor_id: string;
  stones: Stone[];
  total_count: number;
  last_stone_at: string | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CairnResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { anchorId } = req.query;

    if (!anchorId || typeof anchorId !== 'string') {
      return res.status(400).json({ error: 'Invalid anchor ID' });
    }

    // Get all stones at this anchor
    const { data: stones, error } = await supabase
      .from('digital_cairns')
      .select('id, shape, color, position, placed_at')
      .eq('anchor_id', anchorId)
      .order('position', { ascending: true });

    if (error) {
      console.error('[Cairns] Failed to fetch stones:', error);
      return res.status(500).json({ error: 'Failed to fetch cairn' });
    }

    const response: CairnResponse = {
      anchor_id: anchorId,
      stones: stones || [],
      total_count: stones?.length || 0,
      last_stone_at: stones?.length ? stones[stones.length - 1].placed_at : null,
    };

    // Cache for 1 minute
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json(response);
  } catch (error) {
    console.error('[Cairns] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
