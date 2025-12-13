/**
 * API: User Quests
 * 
 * Get and update user quest progress.
 */

import { createApiHandler, ApiError } from '@/lib/apiHandler';
import { updateQuestProgressSchema } from '@/lib/validation';
import { awardKarma } from '@/lib/gamify';
import { createServiceClient } from '@/lib/supabaseService';

export default createApiHandler(
  {
    // Get user's quests
    GET: async (ctx) => {
      if (!ctx.userId) {
        throw ApiError.unauthorized();
      }

      const supabase = createServiceClient();

      // Get all active quests
      const { data: quests } = await supabase
        .from('quests')
        .select('*')
        .eq('active', true);

      // Get user's quest progress
      const { data: userQuests } = await supabase
        .from('user_quests')
        .select('*')
        .eq('user_id', ctx.userId);

      // Merge quest data with user progress
      const questList = (quests || []) as Array<{ id: string; karma_reward: number; [key: string]: any }>;
      const userQuestList = (userQuests || []) as Array<{ quest_id: string; status: string; progress: any; started_at: string; completed_at: string | null }>;
      const questsWithProgress = questList.map((quest) => {
        const userQuest = userQuestList.find((uq) => uq.quest_id === quest.id);
        return {
          ...quest,
          user_status: userQuest?.status || 'not_started',
          progress: userQuest?.progress || {},
          started_at: userQuest?.started_at,
          completed_at: userQuest?.completed_at,
        };
      });

      return {
        quests: questsWithProgress,
        active_count: questsWithProgress.filter((q) => q.user_status === 'active').length,
        completed_count: questsWithProgress.filter((q) => q.user_status === 'completed').length,
      };
    },

    // Update quest progress
    POST: async (ctx, body) => {
      if (!ctx.userId) {
        throw ApiError.unauthorized();
      }

      const validated = updateQuestProgressSchema.parse(body);
      const supabase = createServiceClient();

      // Get quest details
      const { data: quest } = await supabase
        .from('quests')
        .select('*')
        .eq('id', validated.quest_id)
        .single();

      if (!quest) {
        throw ApiError.notFound('Quest not found');
      }

      const questData = quest as { id: string; karma_reward: number; [key: string]: any };

      // Upsert user quest progress
      const { error } = await supabase
        .from('user_quests')
        .upsert({
          user_id: ctx.userId,
          quest_id: validated.quest_id,
          progress: validated.progress,
          status: validated.status || 'active',
          completed_at: validated.status === 'completed' ? new Date().toISOString() : null,
        } as any, {
          onConflict: 'user_id,quest_id',
        });

      if (error) {
        ctx.req.log.error({ error }, 'Failed to update quest progress');
        throw ApiError.internal('Failed to update quest');
      }

      // Award karma if quest completed
      if (validated.status === 'completed') {
        await awardKarma(
          ctx.userId,
          questData.karma_reward,
          'quest_completed',
          validated.quest_id
        );

        ctx.req.log.info({
          event: 'quest_completed',
          quest_id: validated.quest_id,
          karma_awarded: questData.karma_reward,
        });
      }

      return {
        success: true,
        quest_id: validated.quest_id,
        status: validated.status || 'active',
        karma_awarded: validated.status === 'completed' ? questData.karma_reward : 0,
      };
    },
  },
  { auth: true }
);
