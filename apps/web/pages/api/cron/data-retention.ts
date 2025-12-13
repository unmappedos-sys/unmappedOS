/**
 * API: Cron - Data Retention
 * 
 * Purge old data according to retention policies.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServiceClient } from '@/lib/supabaseService';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ service: 'cron-data-retention' });

// Retention periods in days
const RETENTION_POLICIES = {
  activity_logs: 730, // 2 years
  prices: 365, // 1 year
  whisper_cache: 0, // Delete expired immediately
  replay_summaries: 365, // 1 year
  // audit_logs: Never delete (compliance)
};

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
  const results: Record<string, number> = {};

  try {
    // Purge activity logs
    const activityCutoff = new Date(now.getTime() - RETENTION_POLICIES.activity_logs * 24 * 60 * 60 * 1000);
    const { count: activityDeleted } = await supabase
      .from('activity_logs')
      .delete({ count: 'exact' })
      .lt('created_at', activityCutoff.toISOString());
    results.activity_logs = activityDeleted || 0;

    // Purge prices
    const pricesCutoff = new Date(now.getTime() - RETENTION_POLICIES.prices * 24 * 60 * 60 * 1000);
    const { count: pricesDeleted } = await supabase
      .from('prices')
      .delete({ count: 'exact' })
      .lt('created_at', pricesCutoff.toISOString());
    results.prices = pricesDeleted || 0;

    // Purge expired whisper cache
    const { count: whispersDeleted } = await supabase
      .from('whisper_cache')
      .delete({ count: 'exact' })
      .lt('valid_until', now.toISOString());
    results.whisper_cache = whispersDeleted || 0;

    // Purge replay summaries
    const replayCutoff = new Date(now.getTime() - RETENTION_POLICIES.replay_summaries * 24 * 60 * 60 * 1000);
    const { count: replaysDeleted } = await supabase
      .from('replay_summaries')
      .delete({ count: 'exact' })
      .lt('created_at', replayCutoff.toISOString());
    results.replay_summaries = replaysDeleted || 0;

    logger.info({
      event: 'data_retention_complete',
      deleted: results,
    });

    return res.status(200).json({
      success: true,
      deleted: results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Data retention cron failed');
    return res.status(500).json({ error: 'Internal error' });
  }
}
