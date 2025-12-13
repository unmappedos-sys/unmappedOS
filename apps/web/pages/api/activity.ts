/**
 * Activity API - Get user's activity logs
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserOr401 } from '../../lib/supabaseServer';
import { getUserActivity } from '../../lib/activityLogger';
import { createRequestLogger } from '../../lib/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const user = await getUserOr401(req);
    const reqLogger = createRequestLogger(req);

    reqLogger.info('ACTIVITY_FETCH', { user_id: user.id });

    // Parse query parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const actionType = req.query.action_type as string | undefined;

    // Get activities
    const activities = await getUserActivity(user.id, limit, offset, actionType);

    reqLogger.info('ACTIVITY_FETCH_SUCCESS', {
      user_id: user.id,
      count: activities.length,
    });

    return res.status(200).json({
      success: true,
      activities,
      pagination: {
        limit,
        offset,
        has_more: activities.length === limit,
      },
    });
  } catch (error: any) {
    const reqLogger = createRequestLogger(req);
    
    if (error.message === 'AUTH_REQUIRED') {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
    }

    reqLogger.error('ACTIVITY_FETCH_ERROR', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
