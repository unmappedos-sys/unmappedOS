/**
 * API Route: /api/auth-sync
 * Syncs Supabase Auth user with users table
 * Ensures users table stays in sync with auth provider changes
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    // Get current session from Supabase Auth
    const supabase = createServerSupabaseClient(req, res);
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session || !session.user) {
      return res.status(401).json({ error: 'AUTHENTICATION_REQUIRED' });
    }

    const user = session.user;
    const userId = user.id;

    if (!userId) {
      return res.status(400).json({ error: 'INVALID_USER_DATA' });
    }

    // Check if user exists in users table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingUser, error: checkError } = await (supabase.from('users') as any)
      .select('*')
      .eq('id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = not found, which is expected for new users
      console.error('[AUTH-SYNC] Check error:', checkError);
      return res.status(500).json({ error: 'DATABASE_ERROR' });
    }

    // Create or update user
    if (!existingUser) {
      // Create new user
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newUser, error: insertError } = await (supabase.from('users') as any)
        .insert({
          id: userId,
          email: user.email,
          name: user.user_metadata?.name || user.user_metadata?.full_name || null,
          provider: user.app_metadata?.provider || 'email',
          karma: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('[AUTH-SYNC] Insert error:', insertError);
        return res.status(500).json({ error: 'USER_CREATION_FAILED' });
      }

      console.log(`[AUTH-SYNC] Created new user: ${userId}`);
      return res.status(201).json({
        success: true,
        message: 'USER_CREATED',
        user: newUser,
      });
    } else {
      // Update existing user (name, last_seen, etc.)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updatedUser, error: updateError } = await (supabase.from('users') as any)
        .update({
          name: user.user_metadata?.name || user.user_metadata?.full_name || existingUser.name,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('[AUTH-SYNC] Update error:', updateError);
        return res.status(500).json({ error: 'USER_UPDATE_FAILED' });
      }

      console.log(`[AUTH-SYNC] Updated user: ${userId}`);
      return res.status(200).json({
        success: true,
        message: 'USER_UPDATED',
        user: updatedUser,
      });
    }
  } catch (error) {
    console.error('[AUTH-SYNC] Error:', error);
    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
