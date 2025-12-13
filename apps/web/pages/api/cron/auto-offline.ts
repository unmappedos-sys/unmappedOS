/**
 * API: Cron - Auto Offline Zones
 * 
 * Scheduled job to check for zones that should go offline
 * based on report aggregation.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServiceClient } from '@/lib/supabaseService';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ service: 'cron-auto-offline' });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify cron secret
  const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
  
  if (cronSecret !== process.env.CRON_SECRET) {
    logger.warn('Unauthorized cron attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    // Find zones with multiple independent reports
    const { data: reportCounts } = await supabase
      .from('reports')
      .select('zone_id, city, device_fingerprint')
      .in('category', ['OBSTRUCTION', 'HASSLE', 'SAFETY_CONCERN', 'CLOSED'])
      .gte('created_at', twentyFourHoursAgo.toISOString());

    // Group by zone and count unique devices
    const zoneCounts: Record<string, { city: string; devices: Set<string> }> = {};

    const reportData = (reportCounts || []) as Array<{ zone_id: string; city: string; device_fingerprint: string | null }>;
    for (const report of reportData) {
      const key = `${report.zone_id}:${report.city}`;
      if (!zoneCounts[key]) {
        zoneCounts[key] = { city: report.city, devices: new Set() };
      }
      if (report.device_fingerprint) {
        zoneCounts[key].devices.add(report.device_fingerprint);
      }
    }

    // Find zones to offline (>= 2 independent reports)
    const zonesToOffline: Array<{ zone_id: string; city: string; report_count: number }> = [];

    for (const [key, data] of Object.entries(zoneCounts)) {
      if (data.devices.size >= 2) {
        const [zone_id, city] = key.split(':');
        zonesToOffline.push({
          zone_id,
          city: data.city,
          report_count: data.devices.size,
        });
      }
    }

    // Update zones to offline
    let offlinedCount = 0;

    for (const zone of zonesToOffline) {
      const { error } = await (supabase
        .from('zones') as any)
        .update({
          status: 'OFFLINE',
          status_reason: `AUTO_OFFLINE: ${zone.report_count} independent reports in 24h`,
          status_updated_at: now.toISOString(),
        })
        .eq('zone_id', zone.zone_id)
        .eq('city', zone.city)
        .eq('status', 'ACTIVE'); // Only update if currently active

      if (!error) {
        offlinedCount++;
        logger.info({
          event: 'zone_auto_offlined',
          zone_id: zone.zone_id,
          city: zone.city,
          report_count: zone.report_count,
        });
      }
    }

    // Also check for zones to bring back online (no recent reports)
    const { data: offlineZones } = await supabase
      .from('zones')
      .select('zone_id, city, status_updated_at')
      .eq('status', 'OFFLINE')
      .like('status_reason', 'AUTO_OFFLINE%');

    let onlinedCount = 0;
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const offlineZoneData = (offlineZones || []) as Array<{ zone_id: string; city: string; status_updated_at: string }>;
    for (const zone of offlineZoneData) {
      // Check if offline for more than 7 days with no new reports
      if (new Date(zone.status_updated_at) < sevenDaysAgo) {
        const { count } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('zone_id', zone.zone_id)
          .eq('city', zone.city)
          .gte('created_at', sevenDaysAgo.toISOString());

        if ((count || 0) < 2) {
          // Bring back online
          await (supabase
            .from('zones') as any)
            .update({
              status: 'ACTIVE',
              status_reason: 'AUTO_RESTORED: No recent reports',
              status_updated_at: now.toISOString(),
            })
            .eq('zone_id', zone.zone_id)
            .eq('city', zone.city);

          onlinedCount++;
          logger.info({
            event: 'zone_auto_restored',
            zone_id: zone.zone_id,
            city: zone.city,
          });
        }
      }
    }

    logger.info({
      event: 'cron_complete',
      zones_offlined: offlinedCount,
      zones_restored: onlinedCount,
    });

    return res.status(200).json({
      success: true,
      zones_offlined: offlinedCount,
      zones_restored: onlinedCount,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Cron job failed');
    return res.status(500).json({ error: 'Internal error' });
  }
}
