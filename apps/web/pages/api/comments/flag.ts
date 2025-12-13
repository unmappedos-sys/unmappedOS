/**
 * Comment Flag API - Flag inappropriate comments
 * Auto-hides comments with 2+ reports from trusted users
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const FlagSchema = z.object({
  comment_id: z.string().uuid(),
  reason: z.enum(['spam', 'offensive', 'misleading', 'other']),
  reporter_id: z.string().optional(),
});

type FlagInput = z.infer<typeof FlagSchema>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const validation = FlagSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const data: FlagInput = validation.data;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if comment exists
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id, moderated')
      .eq('id', data.comment_id)
      .single();

    if (commentError || !comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.moderated) {
      return res.status(400).json({ error: 'Comment already moderated' });
    }

    // Insert flag
    const { error: flagError } = await supabase.from('comment_flags').insert({
      comment_id: data.comment_id,
      reason: data.reason,
      reporter_id: data.reporter_id || null,
    });

    if (flagError) {
      console.error('[Flag] Insert error:', flagError);
      return res.status(500).json({ error: 'Failed to flag comment' });
    }

    // Count total flags for this comment
    const { data: flags, error: countError } = await supabase
      .from('comment_flags')
      .select('id, reporter_id')
      .eq('comment_id', data.comment_id);

    if (countError) {
      console.error('[Flag] Count error:', countError);
      return res.status(500).json({ error: 'Failed to process flag' });
    }

    // Auto-hide if 2+ flags from distinct users
    const distinctReporters = new Set(flags.map((f) => f.reporter_id).filter(Boolean));
    if (distinctReporters.size >= 2) {
      const { error: moderateError } = await supabase
        .from('comments')
        .update({ moderated: true })
        .eq('id', data.comment_id);

      if (moderateError) {
        console.error('[Flag] Moderate error:', moderateError);
      } else {
        return res.status(200).json({
          success: true,
          message: 'INTEL FLAGGED // AUTO-MODERATED: MULTIPLE REPORTS',
          auto_hidden: true,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'INTEL FLAGGED // UNDER REVIEW',
      flag_count: flags.length,
    });
  } catch (error) {
    console.error('[Flag] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
