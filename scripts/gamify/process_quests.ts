/**
 * Background Quest Processor
 * Run via cron/GitHub Actions to evaluate and award quests
 */

import { createClient } from '@supabase/supabase-js';
import { evaluateQuests } from '../../apps/web/lib/gamify';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function processQuests() {
  console.log('[Gamify] Starting quest processing...');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get all users who have been active in the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: activeUsers, error } = await supabase
    .from('users')
    .select('id')
    .gte('last_active', sevenDaysAgo);

  if (error) {
    console.error('[Gamify] Failed to fetch active users:', error);
    return;
  }

  if (!activeUsers || activeUsers.length === 0) {
    console.log('[Gamify] No active users found');
    return;
  }

  console.log(`[Gamify] Processing quests for ${activeUsers.length} users...`);

  let processed = 0;
  let errors = 0;

  for (const user of activeUsers) {
    try {
      const unlockedBadges = await evaluateQuests(user.id);
      
      if (unlockedBadges.length > 0) {
        console.log(`[Gamify] User ${user.id} unlocked ${unlockedBadges.length} badges`);
      }
      
      processed++;
    } catch (error) {
      console.error(`[Gamify] Error processing user ${user.id}:`, error);
      errors++;
    }
  }

  console.log(`[Gamify] Quest processing complete. Processed: ${processed}, Errors: ${errors}`);
}

// Run if called directly
if (require.main === module) {
  processQuests()
    .then(() => {
      console.log('[Gamify] Quest processing finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Gamify] Fatal error:', error);
      process.exit(1);
    });
}

export default processQuests;
