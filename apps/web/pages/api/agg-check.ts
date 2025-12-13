import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

interface Report {
  zone_id: string;
  city: string;
  category: string;
  user_id: string | null;
  created_at: string;
}

/**
 * Aggregate reports and disable zones with 2+ distinct user reports in 24h
 * Awards karma (+20) to reporters when zone is disabled
 * Can run as cron job or manual trigger
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authorization (in production, use an API key or cron secret)
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Allow unauthenticated in dev mode if no CRON_SECRET set
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    // Get reports from last 24 hours
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select('zone_id, city, category, user_id, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) as { data: Report[] | null; error: Error | null };

    if (reportsError) throw reportsError;
    if (!reports) {
      return res.status(200).json({ success: true, checked: 0, disabled: 0, zones: [] });
    }

    // Group by zone + category and count distinct users
    const zoneAggregation: Record<string, { users: Set<string>; city: string; category: string; reports: Report[] }> = {};
    
    reports.forEach((report: Report) => {
      const key = `${report.zone_id}:${report.category}`;
      if (!zoneAggregation[key]) {
        zoneAggregation[key] = {
          users: new Set(),
          city: report.city,
          category: report.category,
          reports: [],
        };
      }
      if (report.user_id) {
        zoneAggregation[key].users.add(report.user_id);
      }
      zoneAggregation[key].reports.push(report);
    });

    // Find zones to disable (2+ distinct reporters)
    const zonesToDisable: { zone_id: string; city: string; category: string; user_count: number; user_ids: string[] }[] = [];
    
    Object.entries(zoneAggregation).forEach(([key, data]) => {
      if (data.users.size >= 2) {
        const [zone_id] = key.split(':');
        zonesToDisable.push({
          zone_id,
          city: data.city,
          category: data.category,
          user_count: data.users.size,
          user_ids: Array.from(data.users),
        });
      }
    });

    // Disable zones
    const disabledZones: string[] = [];
    
    for (const zone of zonesToDisable) {
      const { error: updateError } = await supabase
        .from('zones')
        .update({
          status: 'OFFLINE',
          status_reason: `HAZARD_AGGREGATION:${zone.category}`,
          status_updated_at: new Date().toISOString(),
        })
        .eq('zone_id', zone.zone_id);

      if (updateError) {
        console.error(`Failed to disable zone ${zone.zone_id}:`, updateError);
        continue;
      }

      disabledZones.push(zone.zone_id);

      // Award karma to reporters (+20 each)
      for (const user_id of zone.user_ids) {
        const { error: karmaError } = await supabase.rpc('increment_karma', {
          user_id_param: user_id,
          delta: 20,
          reason: `ZONE_DISABLE:${zone.zone_id}:${zone.category}`,
        });

        if (karmaError) {
          console.warn(`Karma reward failed for user ${user_id}:`, karmaError);
        }
      }
    }

    console.log(`[AGG-CHECK] Checked ${Object.keys(zoneAggregation).length} zone-categories, disabled ${disabledZones.length} zones`);

    res.status(200).json({
      success: true,
      checked: Object.keys(zoneAggregation).length,
      disabled: disabledZones.length,
      zones: zonesToDisable.map(z => ({
        zone_id: z.zone_id,
        city: z.city,
        category: z.category,
        reporters: z.user_count,
      })),
    });
  } catch (error) {
    console.error('Aggregation error:', error);
    res.status(500).json({ error: 'Failed to aggregate reports' });
  }
}
