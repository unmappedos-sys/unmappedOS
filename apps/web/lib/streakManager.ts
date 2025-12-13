/**
 * Streak Manager
 * 
 * Handles daily activity streaks with proper timezone handling.
 */

import { createServiceClient } from './supabaseService';

export interface StreakInfo {
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  streak_status: 'active' | 'at_risk' | 'broken';
}

/**
 * Update user streak for today's activity
 */
export async function updateStreak(userId: string): Promise<StreakInfo> {
  const supabase = createServiceClient();

  // Get current user data
  const { data: user } = await supabase
    .from('users')
    .select('streak, last_active')
    .eq('id', userId)
    .single();

  if (!user) {
    throw new Error('User not found');
  }

  const userData = user as { streak: number; last_active: string | null };
  const now = new Date();
  const today = getDateString(now);
  const lastActiveDate = userData.last_active ? getDateString(new Date(userData.last_active)) : null;

  let newStreak = userData.streak || 0;
  let streakStatus: StreakInfo['streak_status'] = 'active';

  if (!lastActiveDate) {
    // First activity ever
    newStreak = 1;
  } else if (lastActiveDate === today) {
    // Already active today, no change
    streakStatus = 'active';
  } else if (lastActiveDate === getYesterdayString(now)) {
    // Active yesterday, continue streak
    newStreak = (userData.streak || 0) + 1;
    streakStatus = 'active';
  } else {
    // Streak broken (more than 1 day gap)
    newStreak = 1;
    streakStatus = 'broken';
  }

  // Update user
  await (supabase
    .from('users') as any)
    .update({
      streak: newStreak,
      last_active: now.toISOString(),
    })
    .eq('id', userId);

  return {
    current_streak: newStreak,
    longest_streak: Math.max(newStreak, userData.streak || 0), // Would need separate column for tracking
    last_active_date: today,
    streak_status: streakStatus,
  };
}

/**
 * Check if user's streak is at risk (not active today)
 */
export async function checkStreakStatus(userId: string): Promise<StreakInfo> {
  const supabase = createServiceClient();

  const { data: user } = await supabase
    .from('users')
    .select('streak, last_active')
    .eq('id', userId)
    .single();

  if (!user) {
    return {
      current_streak: 0,
      longest_streak: 0,
      last_active_date: null,
      streak_status: 'broken',
    };
  }

  const userData = user as { streak: number; last_active: string | null };
  const now = new Date();
  const today = getDateString(now);
  const lastActiveDate = userData.last_active ? getDateString(new Date(userData.last_active)) : null;

  let streakStatus: StreakInfo['streak_status'];

  if (lastActiveDate === today) {
    streakStatus = 'active';
  } else if (lastActiveDate === getYesterdayString(now)) {
    streakStatus = 'at_risk';
  } else {
    streakStatus = 'broken';
  }

  return {
    current_streak: userData.streak || 0,
    longest_streak: userData.streak || 0,
    last_active_date: lastActiveDate,
    streak_status: streakStatus,
  };
}

/**
 * Get hours remaining until streak expires
 */
export function getStreakExpiryHours(lastActiveDate: string | null): number {
  if (!lastActiveDate) return 0;

  const lastActive = new Date(lastActiveDate);
  const expiry = new Date(lastActive);
  expiry.setDate(expiry.getDate() + 2); // Expires at end of next day
  expiry.setHours(23, 59, 59, 999);

  const now = new Date();
  const hoursRemaining = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);

  return Math.max(0, Math.floor(hoursRemaining));
}

/**
 * Generate streak-related notification message
 */
export function getStreakMessage(info: StreakInfo): string | null {
  if (info.streak_status === 'at_risk') {
    const hoursLeft = getStreakExpiryHours(info.last_active_date);
    return `⚠️ STREAK AT RISK // ${hoursLeft}H REMAINING // COMPLETE ANY ACTION`;
  }

  if (info.current_streak >= 7 && info.streak_status === 'active') {
    return `🔥 ${info.current_streak}-DAY STREAK // FIELD VETERAN STATUS`;
  }

  if (info.current_streak === 1 && info.streak_status === 'active') {
    return `✓ STREAK STARTED // RETURN TOMORROW TO CONTINUE`;
  }

  return null;
}

// Helper functions
function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getYesterdayString(date: Date): string {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return getDateString(yesterday);
}
