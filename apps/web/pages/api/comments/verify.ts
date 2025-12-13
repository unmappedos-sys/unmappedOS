/**
 * Comment Verification API - Verify comment accuracy
 * Requires snapshot GPS verification to confirm user is in zone
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const VerifySchema = z.object({
  comment_id: z.string().uuid(),
  verifier_id: z.string().min(1),
  vote: z.enum(['accurate', 'inaccurate']),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

type VerifyInput = z.infer<typeof VerifySchema>;

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const validation = VerifySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const data: VerifyInput = validation.data;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get comment and associated zone
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id, zone_id, trust_score')
      .eq('id', data.comment_id)
      .single();

    if (commentError || !comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Get zone anchor coordinates
    const { data: zone, error: zoneError } = await supabase
      .from('zones')
      .select('id, anchor_coords')
      .eq('id', comment.zone_id)
      .single();

    if (zoneError || !zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    // Verify user is within 500m of anchor
    const [anchorLon, anchorLat] = zone.anchor_coords;
    const distance = calculateDistance(data.lat, data.lon, anchorLat, anchorLon);

    if (distance > 0.5) {
      // 500m
      return res.status(403).json({
        error: 'VERIFICATION DENIED // POSITION TOO FAR FROM ANCHOR',
        required_distance: '< 500m',
        your_distance: `${Math.round(distance * 1000)}m`,
      });
    }

    // Check if user already verified this comment
    const { data: existing, error: existingError } = await supabase
      .from('comment_verifications')
      .select('id')
      .eq('comment_id', data.comment_id)
      .eq('verifier_id', data.verifier_id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'You already verified this comment' });
    }

    // CONSENSUS ALGORITHM - No moderators needed
    // Get verifier's user level and karma (must be Level 2+ to verify)
    const { data: verifier } = await supabase
      .from('users')
      .select('karma')
      .eq('id', data.verifier_id)
      .single();

    const verifierKarma = verifier?.karma || 0;
    const verifierLevel = Math.floor(verifierKarma / 200) + 1; // Level = karma / 200

    // Reject verification from Level 1 users (prevent spam)
    if (verifierLevel < 2) {
      return res.status(403).json({
        error: 'ACCESS DENIED // INSUFFICIENT CLEARANCE',
        required_level: 2,
        your_level: verifierLevel,
        message: 'Earn 200 more karma to verify intel',
      });
    }

    const verificationWeight = data.vote === 'accurate' ? 1 : -1;
    const karmaMultiplier = Math.min(1 + verifierKarma / 1000, 2); // Max 2x weight at 1000 karma

    // Insert verification
    const { error: insertError } = await supabase.from('comment_verifications').insert({
      comment_id: data.comment_id,
      verifier_id: data.verifier_id,
      vote: data.vote,
      verification_weight: verificationWeight * karmaMultiplier,
    });

    if (insertError) {
      console.error('[Verify] Insert error:', insertError);
      return res.status(500).json({ error: 'Failed to record verification' });
    }

    // Count DISTINCT verifiers at Level 2+ who voted "accurate"
    const { data: verifications } = await supabase
      .from('comment_verifications')
      .select('verifier_id, vote, verification_weight')
      .eq('comment_id', data.comment_id);

    const distinctVerifiers = new Set(
      (verifications || []).filter((v: any) => v.vote === 'accurate').map((v: any) => v.verifier_id)
    );

    const accurateVotes = distinctVerifiers.size;
    const totalWeight = verifications?.reduce((sum: number, v: any) => sum + v.verification_weight, 0) || 0;
    const newTrustScore = Math.max(0, comment.trust_score + totalWeight * 10);

    // AUTO-VERIFY if 3+ distinct Level 2+ users confirm accuracy
    const autoVerified = accurateVotes >= 3;
    const verified_at = autoVerified ? new Date().toISOString() : null;

    // Update comment trust score and auto-verify
    await supabase
      .from('comments')
      .update({
        trust_score: newTrustScore,
        verified: autoVerified || newTrustScore > 20,
        verified_at: verified_at,
        verification_count: accurateVotes,
      })
      .eq('id', data.comment_id);

    // Award karma to verifier (+5, +15 if triggered auto-verify)
    const karmaReward = autoVerified && accurateVotes === 3 ? 15 : 5;
    await supabase.rpc('increment_karma', {
      p_user_id: data.verifier_id,
      p_amount: karmaReward,
      p_reason: autoVerified ? 'consensus_verification_trigger' : 'comment_verification',
    });

    return res.status(200).json({
      success: true,
      message: autoVerified
        ? 'CONSENSUS ACHIEVED // INTEL AUTO-VERIFIED'
        : 'VERIFICATION RECORDED // INTEL VALIDATED',
      new_trust_score: Math.round(newTrustScore),
      karma_awarded: karmaReward,
      verified: autoVerified || newTrustScore > 20,
      consensus_votes: accurateVotes,
      auto_verified: autoVerified,
    });
  } catch (error) {
    console.error('[Verify] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
