/**
 * Daily Confidence Decay Cron Job
 * 
 * Runs daily to:
 * - Apply time-based decay to all zone confidence scores
 * - Expire old hazards
 * - Reset daily intel counters
 * - Detect stale zones
 * - Auto-resolve old anomalies
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const CRON_SECRET = process.env.CRON_SECRET;

interface DecayResult {
  zones_decayed: number;
  hazards_expired: number;
  anomalies_resolved: number;
  degraded_zones: string[];
  offline_zones: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🔄 Starting daily confidence decay job...');
  const startTime = Date.now();

  try {
    const result: DecayResult = {
      zones_decayed: 0,
      hazards_expired: 0,
      anomalies_resolved: 0,
      degraded_zones: [],
      offline_zones: [],
    };

    // 1. Apply confidence decay via stored procedure
    const { data: decayData, error: decayError } = await supabase
      .rpc('apply_confidence_decay');

    if (decayError) {
      console.error('Decay function error:', decayError);
    } else {
      result.zones_decayed = decayData || 0;
      console.log(`  ✓ Decayed ${result.zones_decayed} zones`);
    }

    // 2. Expire old hazards
    const { data: hazardData, error: hazardError } = await supabase
      .from('zone_hazards')
      .update({
        active: false,
        resolved_at: new Date().toISOString(),
      })
      .eq('active', true)
      .lt('expires_at', new Date().toISOString())
      .select('zone_id');

    if (!hazardError && hazardData) {
      result.hazards_expired = hazardData.length;
      console.log(`  ✓ Expired ${result.hazards_expired} hazards`);

      // Update zone confidence for expired hazards
      for (const row of hazardData) {
        await supabase
          .from('zone_confidence')
          .update({
            hazard_active: false,
            hazard_expires_at: null,
            state: 'ACTIVE',
            updated_at: new Date().toISOString(),
          })
          .eq('zone_id', row.zone_id);
      }
    }

    // 3. Auto-resolve old anomalies (>48h)
    const anomalyThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: anomalyData, error: anomalyError } = await supabase
      .from('zone_anomalies')
      .update({
        resolved_at: new Date().toISOString(),
        auto_resolved: true,
      })
      .is('resolved_at', null)
      .lt('detected_at', anomalyThreshold)
      .select('zone_id');

    if (!anomalyError && anomalyData) {
      result.anomalies_resolved = anomalyData.length;
      console.log(`  ✓ Auto-resolved ${result.anomalies_resolved} anomalies`);

      // Clear anomaly flag on zones with no unresolved anomalies
      const clearedZones = [...new Set(anomalyData.map(r => r.zone_id))];
      for (const zoneId of clearedZones) {
        const { count } = await supabase
          .from('zone_anomalies')
          .select('*', { count: 'exact', head: true })
          .eq('zone_id', zoneId)
          .is('resolved_at', null);

        if (count === 0) {
          await supabase
            .from('zone_confidence')
            .update({
              anomaly_detected: false,
              anomaly_reason: null,
              updated_at: new Date().toISOString(),
            })
            .eq('zone_id', zoneId);
        }
      }
    }

    // 4. Get current degraded and offline zones for reporting
    const { data: statusData } = await supabase
      .from('zone_confidence')
      .select('zone_id, state')
      .in('state', ['DEGRADED', 'OFFLINE']);

    if (statusData) {
      result.degraded_zones = statusData
        .filter(z => z.state === 'DEGRADED')
        .map(z => z.zone_id);
      result.offline_zones = statusData
        .filter(z => z.state === 'OFFLINE')
        .map(z => z.zone_id);
    }

    // 5. Log job completion
    const duration = Date.now() - startTime;
    console.log(`\n✅ Daily decay job completed in ${duration}ms`);
    console.log(`   - Zones decayed: ${result.zones_decayed}`);
    console.log(`   - Hazards expired: ${result.hazards_expired}`);
    console.log(`   - Anomalies resolved: ${result.anomalies_resolved}`);
    console.log(`   - Currently degraded: ${result.degraded_zones.length}`);
    console.log(`   - Currently offline: ${result.offline_zones.length}`);

    // Store job run in audit log
    await supabase.from('audit_log').insert({
      action: 'CRON_CONFIDENCE_DECAY',
      actor: 'system',
      data: {
        ...result,
        duration_ms: duration,
      },
    });

    return res.status(200).json({
      success: true,
      duration_ms: duration,
      ...result,
    });

  } catch (error) {
    console.error('❌ Daily decay job failed:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
