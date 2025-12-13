/**
 * Activity and Audit Logging Utilities
 * 
 * Activity logs: User-visible actions shown in Operative Record
 * Audit logs: System-level immutable events for compliance
 */

import { createServiceClient } from './supabaseServer';
import { createRequestLogger } from './logger';

export interface ActivityLog {
  user_id: string;
  action_type: string;
  payload: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AuditLog {
  actor_id: string;
  action: string;
  resource: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Log user activity (visible in Operative Record)
 */
export async function logActivity(activity: ActivityLog): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase.from('activity_logs').insert({
    user_id: activity.user_id,
    action_type: activity.action_type,
    payload: activity.payload,
    metadata: activity.metadata || {},
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Failed to log activity:', error);
    throw new Error('ACTIVITY_LOG_FAILED');
  }
}

/**
 * Log audit event (immutable, compliance)
 */
export async function logAudit(audit: AuditLog, req?: any): Promise<void> {
  const supabase = createServiceClient();
  const reqLogger = req ? createRequestLogger(req) : null;

  const auditRecord = {
    actor_id: audit.actor_id,
    action: audit.action,
    resource: audit.resource,
    ip_address: audit.ip_address || req?.headers['x-forwarded-for']?.split(',')[0] || req?.connection?.remoteAddress,
    user_agent: audit.user_agent || req?.headers['user-agent'],
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('audit_logs').insert(auditRecord);

  if (error) {
    console.error('Failed to log audit:', error);
  }

  // Also log to structured logger
  if (reqLogger) {
    reqLogger.info('AUDIT_EVENT', {
      audit_action: audit.action,
      actor: audit.actor_id,
      resource_type: audit.resource.type,
    });
  }
}

/**
 * Get user's activity history
 */
export async function getUserActivity(
  userId: string,
  limit: number = 50,
  offset: number = 0,
  actionType?: string
) {
  const supabase = createServiceClient();

  let query = supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (actionType) {
    query = query.eq('action_type', actionType);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('ACTIVITY_FETCH_FAILED');
  }

  return data || [];
}

/**
 * Export user activity to JSON format
 */
export async function exportActivityJSON(userId: string) {
  const supabase = createServiceClient();

  // Get all user data
  const { data: userData } = await supabase
    .from('users')
    .select('id, karma, level, badges, streak, created_at, last_active')
    .eq('id', userId)
    .single();

  const { data: activities } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const { data: karmaLogs } = await supabase
    .from('karma_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const { data: quests } = await supabase
    .from('user_quests')
    .select('*')
    .eq('user_id', userId);

  return {
    export_date: new Date().toISOString(),
    user: userData,
    activities: activities || [],
    karma_history: karmaLogs || [],
    quests: quests || [],
  };
}

/**
 * Export user activity to CSV format
 */
export async function exportActivityCSV(userId: string): Promise<string> {
  const activities = await getUserActivity(userId, 10000);

  const headers = ['timestamp', 'action_type', 'zone_id', 'city', 'details'];
  const rows = activities.map((activity: { created_at: string; action_type: string; payload: Record<string, any> | null; metadata: Record<string, any> | null }) => [
    activity.created_at,
    activity.action_type,
    activity.payload?.zone_id || '',
    activity.payload?.city || activity.metadata?.city || '',
    JSON.stringify(activity.payload),
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(',')),
  ].join('\n');

  return csv;
}

/**
 * Rate limiting for exports (simple in-memory cache)
 */
const exportCache = new Map<string, number[]>();

export function checkExportRateLimit(userId: string, maxExports: number = 5, windowMs: number = 3600000): boolean {
  const now = Date.now();
  const userExports = exportCache.get(userId) || [];
  
  // Filter recent exports within window
  const recentExports = userExports.filter(timestamp => now - timestamp < windowMs);
  
  if (recentExports.length >= maxExports) {
    return false;
  }
  
  // Add current export
  recentExports.push(now);
  exportCache.set(userId, recentExports);
  
  return true;
}

/**
 * Action type constants for consistency
 */
export const ACTION_TYPES = {
  COMMENT_CREATE: 'comment_create',
  COMMENT_VERIFIED: 'comment_verified',
  PRICE_REPORT: 'price_report',
  HAZARD_REPORT: 'hazard_report',
  PACK_DOWNLOAD: 'pack_download',
  ANCHOR_LOCK: 'anchor_lock',
  VERIFY_COMMENT: 'verify_comment',
  DATA_EXPORT: 'data_export',
  ZONE_OFFLINE: 'zone_offline',
} as const;

/**
 * Audit action types
 */
export const AUDIT_ACTIONS = {
  ZONE_OFFLINED: 'ZONE_OFFLINED',
  ZONE_RESTORED: 'ZONE_RESTORED',
  ROLE_CHANGE: 'ROLE_CHANGE',
  PACK_PUBLISHED: 'PACK_PUBLISHED',
  USER_DELETION_REQUESTED: 'USER_DELETION_REQUESTED',
  CONTENT_MODERATION: 'CONTENT_MODERATION',
} as const;
