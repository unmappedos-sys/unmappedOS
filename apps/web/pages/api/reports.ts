import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getUserOr401, createServiceClient } from '../../lib/supabaseServer';
import { logActivity, ACTION_TYPES } from '../../lib/activityLogger';
import { awardKarma, evaluateQuests, getKarmaForAction } from '../../lib/gamify';
import { createRequestLogger } from '../../lib/logger';

const reportSchema = z.object({
  zoneId: z.string(),
  city: z.string(),
  category: z.enum([
    'OBSTRUCTION',
    'CROWD_SURGE',
    'CLOSED',
    'DATA_ANOMALY',
    'AGGRESSIVE_TOUTING',
    'CONFUSING_TRANSIT',
    'OVERPRICING',
  ]),
  description: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const user = await getUserOr401(req);
    const reqLogger = createRequestLogger(req);

    const data = reportSchema.parse(req.body);

    reqLogger.info('HAZARD_REPORT', {
      user_id: user.id,
      zone_id: data.zoneId,
      city: data.city,
      category: data.category,
    });

    const supabase = createServiceClient();

    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        user_id: user.id,
        zone_id: data.zoneId,
        city: data.city,
        report_type: 'hazard',
        description: `${data.category}: ${data.description || ''}`,
        severity: data.severity || 'medium',
        status: 'pending',
        metadata: data.metadata || {},
      })
      .select()
      .single();

    if (error) {
      reqLogger.error('REPORT_INSERT_FAILED', { error });
      throw error;
    }

    // Log activity
    await logActivity({
      user_id: user.id,
      action_type: ACTION_TYPES.HAZARD_REPORT,
      payload: {
        report_id: report.id,
        zone_id: data.zoneId,
        city: data.city,
        category: data.category,
      },
    });

    // Award karma
    const karmaAmount = getKarmaForAction(ACTION_TYPES.HAZARD_REPORT);
    await awardKarma(user.id, karmaAmount, `Hazard report: ${data.category}`);

    // Evaluate quests
    const unlockedBadges = await evaluateQuests(user.id);

    reqLogger.info('REPORT_SUCCESS', {
      report_id: report.id,
      karma_awarded: karmaAmount,
    });

    res.status(201).json({
      success: true,
      report,
      karma_awarded: karmaAmount,
      badges_unlocked: unlockedBadges,
      message: 'HAZARD REPORT LOGGED // INTEL QUEUED',
    });
  } catch (error: any) {
    const reqLogger = createRequestLogger(req);
    
    if (error.message === 'AUTH_REQUIRED') {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
    }

    reqLogger.error('REPORT_ERROR', { error });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to submit report' });
  }
}
