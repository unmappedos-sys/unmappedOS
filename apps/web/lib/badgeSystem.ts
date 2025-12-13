/**
 * Badge Unlock System
 * 
 * Handles badge evaluation and unlocking based on user activity.
 */

import { createServiceClient } from './supabaseService';
import { awardKarma } from './gamify';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  category: string;
  unlock_criteria: Record<string, any>;
}

export interface UnlockResult {
  badge: Badge;
  unlocked: boolean;
  already_had: boolean;
}

// Badge definitions with unlock criteria
export const BADGE_CRITERIA: Record<string, (stats: UserStats) => boolean> = {
  first_intel: (stats) => stats.total_reports >= 1,
  first_anchor: (stats) => stats.total_anchors >= 1,
  price_patrol: (stats) => stats.prices_today >= 5,
  streak_5: (stats) => stats.current_streak >= 5,
  streak_30: (stats) => stats.current_streak >= 30,
  zone_explorer_10: (stats) => stats.unique_zones >= 10,
  zone_explorer_50: (stats) => stats.unique_zones >= 50,
  crisis_survivor: (stats) => stats.crises_resolved >= 1,
  ghost_hunter: (stats) => stats.beacons_discovered >= 10,
  night_owl: (stats) => stats.night_ops >= 10,
  early_bird: (stats) => stats.morning_ops >= 10,
  karma_100: (stats) => stats.total_karma >= 100,
  karma_1000: (stats) => stats.total_karma >= 1000,
  level_5: (stats) => stats.level >= 5,
  level_10: (stats) => stats.level >= 10,
};

export interface UserStats {
  total_reports: number;
  total_anchors: number;
  prices_today: number;
  current_streak: number;
  unique_zones: number;
  crises_resolved: number;
  beacons_discovered: number;
  night_ops: number;
  morning_ops: number;
  total_karma: number;
  level: number;
}

/**
 * Evaluate all badges for a user and unlock any earned
 */
export async function evaluateBadges(userId: string): Promise<UnlockResult[]> {
  const supabase = createServiceClient();
  const results: UnlockResult[] = [];

  // Get user's current stats
  const stats = await getUserStats(userId);

  // Get all badges
  const { data: allBadges } = await supabase
    .from('badges')
    .select('*');

  // Get user's unlocked badges
  const { data: userBadges } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId);

  const userBadgeData = userBadges as Array<{ badge_id: string }> | null;
  const unlockedBadgeIds = new Set(userBadgeData?.map((b) => b.badge_id) || []);

  const badgeList = (allBadges || []) as Array<{ id: string; rarity: string; [key: string]: any }>;

  // Evaluate each badge
  for (const badge of badgeList) {
    const criteria = BADGE_CRITERIA[badge.id];
    
    if (!criteria) continue;

    const isEarned = criteria(stats);
    const alreadyHad = unlockedBadgeIds.has(badge.id);

    if (isEarned && !alreadyHad) {
      // Unlock the badge
      await unlockBadge(userId, badge.id);
      
      results.push({
        badge: badge as Badge,
        unlocked: true,
        already_had: false,
      });
    } else if (alreadyHad) {
      results.push({
        badge: badge as Badge,
        unlocked: false,
        already_had: true,
      });
    }
  }

  return results;
}

/**
 * Unlock a specific badge for a user
 */
export async function unlockBadge(userId: string, badgeId: string): Promise<void> {
  const supabase = createServiceClient();

  // Insert badge unlock
  const { error } = await supabase
    .from('user_badges')
    .insert({
      user_id: userId,
      badge_id: badgeId,
    } as any);

  if (error && !error.message.includes('duplicate')) {
    throw new Error(`Failed to unlock badge: ${error.message}`);
  }

  // Award karma for badge unlock
  const karmaAmounts: Record<string, number> = {
    common: 10,
    uncommon: 25,
    rare: 50,
    epic: 100,
    legendary: 250,
  };

  // Get badge rarity
  const { data: badge } = await supabase
    .from('badges')
    .select('rarity')
    .eq('id', badgeId)
    .single();

  if (badge) {
    const badgeData = badge as { rarity: string };
    const karma = karmaAmounts[badgeData.rarity] || 10;
    await awardKarma(userId, karma, `badge_unlocked:${badgeId}`);
  }
}

/**
 * Get user stats for badge evaluation
 */
async function getUserStats(userId: string): Promise<UserStats> {
  const supabase = createServiceClient();

  // Get user data
  const { data: user } = await supabase
    .from('users')
    .select('karma, level, streak')
    .eq('id', userId)
    .single();

  // Count reports
  const { count: reportCount } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Count anchors reached
  const { count: anchorCount } = await supabase
    .from('activity_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action_type', 'anchor_reached');

  // Count prices today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const { count: pricesToday } = await supabase
    .from('prices')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', todayStart.toISOString());

  // Count unique zones
  const { data: zoneEntries } = await supabase
    .from('activity_logs')
    .select('payload')
    .eq('user_id', userId)
    .eq('action_type', 'zone_enter');

  const zoneEntryData = zoneEntries as Array<{ payload: { zone_id?: string } | null }> | null;
  const uniqueZones = new Set(
    zoneEntryData?.map((e) => e.payload?.zone_id).filter(Boolean) || []
  );

  // Count crisis events resolved
  const { count: crisesResolved } = await supabase
    .from('crisis_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('resolved', true);

  // Count time-based ops
  const { data: timeOps } = await supabase
    .from('activity_logs')
    .select('created_at')
    .eq('user_id', userId);

  let nightOps = 0;
  let morningOps = 0;

  const timeOpsData = (timeOps || []) as Array<{ created_at: string }>;
  for (const op of timeOpsData) {
    const hour = new Date(op.created_at).getHours();
    if (hour >= 0 && hour < 6) nightOps++;
    if (hour >= 5 && hour < 7) morningOps++;
  }

  const userData = user as { streak: number; karma: number; level: number } | null;
  return {
    total_reports: reportCount || 0,
    total_anchors: anchorCount || 0,
    prices_today: pricesToday || 0,
    current_streak: userData?.streak || 0,
    unique_zones: uniqueZones.size,
    crises_resolved: crisesResolved || 0,
    beacons_discovered: 0, // Would need separate tracking
    night_ops: nightOps,
    morning_ops: morningOps,
    total_karma: userData?.karma || 0,
    level: userData?.level || 1,
  };
}

/**
 * Get badge unlock notification message
 */
export function getBadgeUnlockMessage(badge: Badge): string {
  const rarityEmoji: Record<string, string> = {
    common: '🎖️',
    uncommon: '🏅',
    rare: '🥇',
    epic: '🏆',
    legendary: '👑',
  };

  const emoji = rarityEmoji[badge.rarity] || '🎖️';
  
  return `${emoji} BADGE UNLOCKED: ${badge.name.toUpperCase()} // ${badge.description}`;
}
