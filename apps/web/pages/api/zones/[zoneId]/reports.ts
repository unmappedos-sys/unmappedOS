/**
 * API: Zone Reports
 * GET /api/zones/[zoneId]/reports
 * GET /api/zones/[zoneId]/reports/count
 * 
 * Returns reports for a zone within a time window.
 * Used by texture system and safe corridors for intelligence.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface Report {
  id: string;
  category: string;
  status: string;
  created_at: string;
}

interface ReportsResponse {
  zone_id: string;
  reports: Report[];
  count: number;
  hours: number;
}

interface CountResponse {
  zone_id: string;
  count: number;
  hours: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ReportsResponse | CountResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { zoneId, hours = '24' } = req.query;
    const hoursNum = parseInt(hours as string, 10) || 24;
    const isCountOnly = req.url?.includes('/count');

    if (!zoneId || typeof zoneId !== 'string') {
      return res.status(400).json({ error: 'Invalid zone ID' });
    }

    // Calculate time window
    const since = new Date();
    since.setHours(since.getHours() - hoursNum);

    // Query reports
    let reports: Report[] | null = null;
    let count: number | null = null;

    if (isCountOnly) {
      const result = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('zone_id', zoneId)
        .eq('status', 'verified')
        .gte('created_at', since.toISOString());
      
      count = result.count;
      if (result.error) {
        console.error('[Zone Reports] Failed to fetch:', result.error);
        return res.status(500).json({ error: 'Failed to fetch reports' });
      }
    } else {
      const result = await supabase
        .from('reports')
        .select('id, category, status, created_at')
        .eq('zone_id', zoneId)
        .eq('status', 'verified')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false });
      
      reports = result.data as Report[] | null;
      count = result.data?.length || 0;
      if (result.error) {
        console.error('[Zone Reports] Failed to fetch:', result.error);
        return res.status(500).json({ error: 'Failed to fetch reports' });
      }
    }

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

    if (isCountOnly) {
      return res.status(200).json({
        zone_id: zoneId,
        count: count || 0,
        hours: hoursNum,
      });
    }

    return res.status(200).json({
      zone_id: zoneId,
      reports: reports || [],
      count: count || 0,
      hours: hoursNum,
    });
  } catch (error) {
    console.error('[Zone Reports] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
