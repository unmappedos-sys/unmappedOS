/**
 * Gamification Engine
 * 
 * Handles karma awards, quest tracking, badge unlocks, and streak management.
 * All operations are atomic and use database functions where possible.
 */

import { createServiceClient } from './supabaseServer';
import gamifyData from '../../../data/gamify.json';

export interface QuestProgress {
  quest_id: string;
  status: 'active' | 'completed' | 'failed';
  progress: Record<string, any>;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  unlocked_at?: string;
}

/**
 * Award karma to a user
 * This is the primary gamification action - all user actions trigger karma awards
 */
export async function awardKarma(
  userId: string,
  delta: number,
  reason: string,
  questId?: string
): Promise<void> {
  const supabase = createServiceClient();

  // Use database function for atomic karma update
  const { error } = await supabase.rpc('award_karma', {
    p_user_id: userId,
    p_delta: delta,
    p_reason: reason,
    p_quest_id: questId || null,
  });

  if (error) {
    console.error('Failed to award karma:', error);
    throw new Error(`KARMA_AWARD_FAILED: ${error.message}`);
  }
}

/**
 * Get karma amount for an action type
 */
export function getKarmaForAction(actionType: string): number {
  return gamifyData.karma_actions[actionType as keyof typeof gamifyData.karma_actions] || 0;
}

/**
 * Evaluate and award quests for a user based on their recent activity
 */
export async function evaluateQuests(userId: string): Promise<Badge[]> {
  const supabase = createServiceClient();
  const unlockedBadges: Badge[] = [];

  // Get user's current quest progress
  const { data: userQuests } = await supabase
    .from('user_quests')
    .select('*')
    .eq('user_id', userId);

  // Get user's activity stats
  const { data: activityStats } = await supabase
    .from('activity_logs')
    .select('action_type')
    .eq('user_id', userId);

  if (!activityStats) return unlockedBadges;

  // Count actions by type
  const actionCounts: Record<string, number> = {};
  activityStats.forEach((log: { action_type: string }) => {
    actionCounts[log.action_type] = (actionCounts[log.action_type] || 0) + 1;
  });

  // Check each quest
  for (const quest of gamifyData.quests) {
    const existingQuest = userQuests?.find((q: { quest_id: string; status: string }) => q.quest_id === quest.id);
    
    // Skip completed quests
    if (existingQuest?.status === 'completed') continue;

    // Check if quest criteria are met
    let questCompleted = false;

    if (quest.criteria.action && quest.criteria.count) {
      const count = actionCounts[quest.criteria.action] || 0;
      questCompleted = count >= quest.criteria.count;
    }

    if (quest.criteria.streak) {
      // Check user's current streak
      const { data: userData } = await supabase
        .from('users')
        .select('streak')
        .eq('id', userId)
        .single();

      questCompleted = (userData?.streak || 0) >= quest.criteria.streak;
    }

    if (quest.criteria.unique_cities) {
      // Get unique cities from activity
      const { data: cityData } = await supabase
        .from('activity_logs')
        .select('metadata')
        .eq('user_id', userId)
        .eq('action_type', quest.criteria.action);

      const uniqueCities = new Set(
        cityData?.map((log: { metadata: Record<string, any> | null }) => log.metadata?.city).filter(Boolean) || []
      );
      questCompleted = uniqueCities.size >= quest.criteria.unique_cities;
    }

    // If quest completed, award it
    if (questCompleted) {
      if (!existingQuest) {
        // Create and complete quest
        await supabase.from('user_quests').insert({
          user_id: userId,
          quest_id: quest.id,
          status: 'completed',
          completed_at: new Date().toISOString(),
        });
      } else {
        // Update existing quest to completed
        await supabase
          .from('user_quests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', existingQuest.id);
      }

      // Award karma
      await awardKarma(userId, quest.karma_reward, `Quest completed: ${quest.name}`, quest.id);

      // Unlock badge
      if (quest.badge) {
        const badge = await unlockBadge(userId, quest.badge);
        if (badge) unlockedBadges.push(badge);
      }
    }
  }

  return unlockedBadges;
}

/**
 * Unlock a badge for a user
 */
export async function unlockBadge(userId: string, badgeId: string): Promise<Badge | null> {
  const supabase = createServiceClient();

  // Get badge definition
  const badgeData = gamifyData.badges.find(b => b.id === badgeId);
  if (!badgeData) return null;

  // Get user's current badges
  const { data: userData } = await supabase
    .from('users')
    .select('badges')
    .eq('id', userId)
    .single();

  const currentBadges = (userData?.badges as any[]) || [];

  // Check if already unlocked
  if (currentBadges.some((b: any) => b.id === badgeId)) {
    return null;
  }

  // Add badge with unlock timestamp
  const newBadge = {
    ...badgeData,
    unlocked_at: new Date().toISOString(),
  };

  const updatedBadges = [...currentBadges, newBadge];

  // Update user badges
  await supabase
    .from('users')
    .update({ badges: updatedBadges })
    .eq('id', userId);

  return newBadge as Badge;
}

/**
 * Get user's gamification stats
 */
export async function getUserGamificationStats(userId: string) {
  const supabase = createServiceClient();

  const { data: userData } = await supabase
    .from('users')
    .select('karma, level, badges, streak, last_active, total_intel')
    .eq('id', userId)
    .single();

  const { data: quests } = await supabase
    .from('user_quests')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });

  const { data: karmaHistory } = await supabase
    .from('karma_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    karma: userData?.karma || 0,
    level: userData?.level || 1,
    badges: userData?.badges || [],
    streak: userData?.streak || 0,
    last_active: userData?.last_active,
    total_intel: userData?.total_intel || 0,
    quests: quests || [],
    recent_karma: karmaHistory || [],
  };
}

/**
 * Calculate next level threshold
 */
export function getNextLevelKarma(currentLevel: number): number {
  // level = floor(sqrt(karma / 100)) + 1
  // Solving for karma: karma = ((level - 1) ^ 2) * 100
  return Math.pow(currentLevel, 2) * 100;
}

/**
 * Get progress to next level
 */
export function getLevelProgress(karma: number, level: number): number {
  const currentLevelKarma = Math.pow(level - 1, 2) * 100;
  const nextLevelKarma = Math.pow(level, 2) * 100;
  const progress = ((karma - currentLevelKarma) / (nextLevelKarma - currentLevelKarma)) * 100;
  return Math.min(100, Math.max(0, progress));
}
