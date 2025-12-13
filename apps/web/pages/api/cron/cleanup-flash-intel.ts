/**
 * Flash Intel Cleanup - Remove expired ephemeral intel
 * Should be called periodically (e.g., via cron job or Vercel Cron)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date().toISOString();

    // Delete expired flash intel
    const { data: deleted, error } = await supabase
      .from('comments')
      .delete()
      .eq('flash_intel', true)
      .lt('expires_at', now)
      .select('id, zone_id');

    if (error) {
      console.error('Flash intel cleanup error:', error);
      return res.status(500).json({ error: 'Cleanup failed' });
    }

    console.log(`[Flash Intel Cleanup] Burned ${deleted?.length || 0} expired messages`);

    return res.status(200).json({
      success: true,
      message: 'FLASH INTEL CLEANUP COMPLETE',
      burned_count: deleted?.length || 0,
      timestamp: now,
    });
  } catch (error) {
    console.error('Cleanup handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
