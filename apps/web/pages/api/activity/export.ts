/**
 * Activity Export API - Export user activity as CSV or JSON
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserOr401 } from '../../../lib/supabaseServer';
import { 
  exportActivityJSON, 
  exportActivityCSV, 
  checkExportRateLimit,
  logActivity,
  ACTION_TYPES 
} from '../../../lib/activityLogger';
import { awardKarma, getKarmaForAction, evaluateQuests } from '../../../lib/gamify';
import { createRequestLogger } from '../../../lib/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const user = await getUserOr401(req);
    const reqLogger = createRequestLogger(req);

    reqLogger.info('ACTIVITY_EXPORT', { user_id: user.id });

    // Check rate limit
    const maxExports = parseInt(process.env.RATE_LIMIT_EXPORT || '5');
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW || '3600000');

    if (!checkExportRateLimit(user.id, maxExports, windowMs)) {
      reqLogger.warn('EXPORT_RATE_LIMIT_EXCEEDED', { user_id: user.id });
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: `You can export up to ${maxExports} times per hour`,
      });
    }

    // Get format
    const format = (req.query.format as string) || 'json';

    if (format === 'csv') {
      const csv = await exportActivityCSV(user.id);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="unmappedos-activity-${user.id}.csv"`);
      
      reqLogger.info('EXPORT_SUCCESS', { user_id: user.id, format: 'csv' });
      return res.status(200).send(csv);
    }

    if (format === 'json') {
      const data = await exportActivityJSON(user.id);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="unmappedos-activity-${user.id}.json"`);
      
      reqLogger.info('EXPORT_SUCCESS', { user_id: user.id, format: 'json' });
      return res.status(200).json(data);
    }

    return res.status(400).json({
      error: 'INVALID_FORMAT',
      message: 'Format must be "json" or "csv"',
    });
  } catch (error: any) {
    const reqLogger = createRequestLogger(req);
    
    if (error.message === 'AUTH_REQUIRED') {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
    }

    reqLogger.error('EXPORT_ERROR', { error });
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    // Log export activity and award karma (async, don't block response)
    try {
      const user = await getUserOr401(req);
      
      await logActivity({
        user_id: user.id,
        action_type: ACTION_TYPES.DATA_EXPORT,
        payload: { format: req.query.format || 'json' },
      });

      await awardKarma(
        user.id,
        getKarmaForAction(ACTION_TYPES.DATA_EXPORT),
        'Activity data export'
      );

      await evaluateQuests(user.id);
    } catch (err) {
      // Silent fail for post-response processing
    }
  }
}
