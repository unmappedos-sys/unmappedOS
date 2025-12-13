/**
 * API: Place Digital Cairn
 * POST /api/cairns/place
 * 
 * Places a geometric stone at an anchor point.
 * No text allowed - just shapes and colors.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface PlaceCairnRequest {
  anchor_id: string;
  shape: 'circle' | 'triangle' | 'square' | 'diamond' | 'hexagon' | 'star';
  color: string;
  user_id: string;
}

interface PlaceCairnResponse {
  success: boolean;
  stone_id?: string;
  error?: string;
}

// Generate anonymous user hash for privacy
function generateUserHash(userId: string): string {
  return createHash('sha256').update(userId + 'cairn_salt_v1').digest('hex').slice(0, 16);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PlaceCairnResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { anchor_id, shape, color, user_id } = req.body as PlaceCairnRequest;

    if (!anchor_id || !shape || !color || !user_id) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Validate shape
    const validShapes = ['circle', 'triangle', 'square', 'diamond', 'hexagon', 'star'];
    if (!validShapes.includes(shape)) {
      return res.status(400).json({ success: false, error: 'Invalid shape' });
    }

    const userHash = generateUserHash(user_id);

    // Check if user already placed a stone at this anchor
    const { data: existing } = await supabase
      .from('digital_cairns')
      .select('id')
      .eq('anchor_id', anchor_id)
      .eq('user_hash', userHash)
      .single();

    if (existing) {
      return res.status(409).json({ success: false, error: 'Already placed a stone here' });
    }

    // Get current stone count for position
    const { count } = await supabase
      .from('digital_cairns')
      .select('*', { count: 'exact', head: true })
      .eq('anchor_id', anchor_id);

    // Insert new stone
    const { data: stone, error } = await supabase
      .from('digital_cairns')
      .insert({
        anchor_id,
        shape,
        color,
        user_hash: userHash,
        position: count || 0,
        placed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Cairns] Failed to place stone:', error);
      return res.status(500).json({ success: false, error: 'Failed to place stone' });
    }

    return res.status(201).json({ success: true, stone_id: stone.id });
  } catch (error) {
    console.error('[Cairns] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
