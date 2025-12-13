/**
 * Zone Suggestion API - Crowd-Verification System
 * Prevents "Honeypot Trap" risk where malicious users lure victims
 * 
 * Risk: Bad actor marks dangerous dead-end as "Hidden Gem"
 * Solution: Users can only suggest zones (not create). Requires 3 unconnected
 *           high-level verifiers before zone becomes visible.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ZoneSuggestionSchema = z.object({
  user_id: z.string().uuid(),
  city: z.string().min(1),
  name: z.string().min(3).max(100),
  texture_type: z.enum(['neon', 'silence', 'deep_analog', 'public']),
  centroid: z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  }),
  description: z.string().max(500),
  tags: z.array(z.string()).optional(),
});

const VerificationSchema = z.object({
  suggestion_id: z.string().uuid(),
  verifier_id: z.string().uuid(),
  vote: z.enum(['approve', 'reject']),
  reason: z.string().max(200).optional(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

type ZoneSuggestion = z.infer<typeof ZoneSuggestionSchema>;
type Verification = z.infer<typeof VerificationSchema>;

/**
 * Check if two users are "connected" (same IP range, same device, etc.)
 * This prevents sock puppet attacks
 */
async function areUsersConnected(user1: string, user2: string): Promise<boolean> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Check if users have ever verified each other's content excessively
  const { data: crossVerifications } = await supabase
    .from('comment_verifications')
    .select('id')
    .or(`verifier_id.eq.${user1},verifier_id.eq.${user2}`)
    .or(`comment_id.in.(SELECT id FROM comments WHERE user_id IN ('${user1}','${user2}'))`)
    .limit(10);
  
  // If they've cross-verified more than 5 times, flag as suspicious
  if (crossVerifications && crossVerifications.length > 5) {
    return true;
  }
  
  // TODO: Add IP range checking, device fingerprinting
  
  return false;
}

/**
 * Calculate distance between two points (Haversine)
 */
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

/**
 * Submit a zone suggestion (not create!)
 */
async function submitSuggestion(req: NextApiRequest, res: NextApiResponse) {
  const validation = ZoneSuggestionSchema.safeParse(req.body);
  
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors,
    });
  }

  const data: ZoneSuggestion = validation.data;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check user's karma level (must be Level 3+ to suggest zones)
  const { data: user } = await supabase
    .from('users')
    .select('karma, clearance_level')
    .eq('id', data.user_id)
    .single();

  if (!user || user.clearance_level < 3) {
    return res.status(403).json({
      error: 'CLEARANCE DENIED',
      message: 'Minimum Clearance Level 3 (500 karma) required to suggest zones',
      your_clearance: user?.clearance_level || 1,
    });
  }

  // Check if similar suggestion already exists nearby (within 100m)
  const { data: existing } = await supabase
    .rpc('find_nearby_suggestions', {
      p_lat: data.centroid.lat,
      p_lon: data.centroid.lon,
      p_radius_km: 0.1, // 100m
    });

  if (existing && existing.length > 0) {
    return res.status(400).json({
      error: 'DUPLICATE_SUGGESTION',
      message: 'A zone suggestion already exists within 100m of this location',
      existing_id: existing[0].id,
    });
  }

  // Insert suggestion (status: PENDING)
  const { data: suggestion, error: insertError } = await supabase
    .from('zone_suggestions')
    .insert({
      user_id: data.user_id,
      city: data.city,
      name: data.name,
      texture_type: data.texture_type,
      centroid: data.centroid,
      description: data.description,
      tags: data.tags || [],
      status: 'PENDING',
      verification_count: 0,
      rejection_count: 0,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Suggestion insert error:', insertError);
    return res.status(500).json({ error: 'Failed to submit suggestion' });
  }

  // Award karma for suggesting (+25)
  await supabase.rpc('increment_karma', {
    p_user_id: data.user_id,
    p_amount: 25,
    p_reason: 'zone_suggestion_submitted',
  });

  return res.status(201).json({
    success: true,
    message: 'ZONE SUGGESTION SUBMITTED // AWAITING VERIFICATION',
    suggestion_id: suggestion.id,
    required_verifications: 3,
    karma_awarded: 25,
  });
}

/**
 * Verify a zone suggestion (requires 3 unconnected Level 4+ users)
 */
async function verifySuggestion(req: NextApiRequest, res: NextApiResponse) {
  const validation = VerificationSchema.safeParse(req.body);
  
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.errors,
    });
  }

  const data: Verification = validation.data;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get suggestion
  const { data: suggestion } = await supabase
    .from('zone_suggestions')
    .select('*')
    .eq('id', data.suggestion_id)
    .single();

  if (!suggestion) {
    return res.status(404).json({ error: 'Suggestion not found' });
  }

  // Check verifier clearance (must be Level 4+ = 600+ karma)
  const { data: verifier } = await supabase
    .from('users')
    .select('karma, clearance_level')
    .eq('id', data.verifier_id)
    .single();

  const verifierLevel = Math.floor((verifier?.karma || 0) / 200) + 1;

  if (verifierLevel < 4) {
    return res.status(403).json({
      error: 'INSUFFICIENT_CLEARANCE',
      message: 'Level 4+ (600 karma) required to verify zone suggestions',
      your_level: verifierLevel,
    });
  }

  // Cannot verify own suggestion
  if (suggestion.user_id === data.verifier_id) {
    return res.status(400).json({ error: 'Cannot verify your own suggestion' });
  }

  // Check if already verified
  const { data: existingVerification } = await supabase
    .from('zone_suggestion_verifications')
    .select('id')
    .eq('suggestion_id', data.suggestion_id)
    .eq('verifier_id', data.verifier_id)
    .single();

  if (existingVerification) {
    return res.status(400).json({ error: 'You already verified this suggestion' });
  }

  // Verify verifier is within 1km of suggested zone (must visit to verify)
  const distance = calculateDistance(
    data.lat,
    data.lon,
    suggestion.centroid.lat,
    suggestion.centroid.lon
  );

  if (distance > 1) {
    return res.status(403).json({
      error: 'TOO_FAR_FROM_ZONE',
      message: 'You must be within 1km of the zone to verify',
      distance_km: distance.toFixed(2),
    });
  }

  // Check if verifier is "connected" to suggester (prevents collusion)
  const isConnected = await areUsersConnected(data.verifier_id, suggestion.user_id);
  if (isConnected) {
    return res.status(403).json({
      error: 'SUSPICIOUS_CONNECTION',
      message: 'Verification denied: suspicious relationship with suggester',
    });
  }

  // Insert verification
  await supabase.from('zone_suggestion_verifications').insert({
    suggestion_id: data.suggestion_id,
    verifier_id: data.verifier_id,
    vote: data.vote,
    reason: data.reason,
    verified_at: new Date().toISOString(),
  });

  // Update counts
  if (data.vote === 'approve') {
    suggestion.verification_count += 1;
  } else {
    suggestion.rejection_count += 1;
  }

  await supabase
    .from('zone_suggestions')
    .update({
      verification_count: suggestion.verification_count,
      rejection_count: suggestion.rejection_count,
    })
    .eq('id', data.suggestion_id);

  // If 3 approvals achieved, auto-approve and create zone
  let zoneCreated = false;
  if (suggestion.verification_count >= 3) {
    // Create actual zone
    const { data: newZone } = await supabase.from('zones').insert({
      zone_id: `${suggestion.city}_suggested_${Date.now()}`,
      city: suggestion.city,
      texture_type: suggestion.texture_type,
      centroid: suggestion.centroid,
      geometry: { type: 'Point', coordinates: [suggestion.centroid.lon, suggestion.centroid.lat] },
      anchor: suggestion.centroid,
      neon_color: suggestion.texture_type === 'neon' ? '#00FFFF' : '#FFFFFF',
      status: 'ACTIVE',
      clearance_level: suggestion.texture_type === 'deep_analog' ? 5 : 1,
      metadata: {
        suggested_by: suggestion.user_id,
        verified_by_crowd: true,
        suggestion_id: suggestion.id,
      },
    }).select().single();

    // Update suggestion status
    await supabase
      .from('zone_suggestions')
      .update({ status: 'APPROVED', zone_id: newZone.zone_id })
      .eq('id', data.suggestion_id);

    // Award suggester bonus karma (+100)
    await supabase.rpc('increment_karma', {
      p_user_id: suggestion.user_id,
      p_amount: 100,
      p_reason: 'zone_suggestion_approved',
    });

    zoneCreated = true;
  }

  // If 3 rejections, auto-reject
  if (suggestion.rejection_count >= 3) {
    await supabase
      .from('zone_suggestions')
      .update({ status: 'REJECTED' })
      .eq('id', data.suggestion_id);
  }

  // Award verifier karma (+15)
  await supabase.rpc('increment_karma', {
    p_user_id: data.verifier_id,
    p_amount: 15,
    p_reason: 'zone_suggestion_verified',
  });

  return res.status(200).json({
    success: true,
    message: zoneCreated
      ? 'CONSENSUS ACHIEVED // ZONE CREATED'
      : 'VERIFICATION RECORDED',
    verification_count: suggestion.verification_count,
    rejection_count: suggestion.rejection_count,
    zone_created: zoneCreated,
    karma_awarded: 15,
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body;

  if (action === 'suggest') {
    return submitSuggestion(req, res);
  } else if (action === 'verify') {
    return verifySuggestion(req, res);
  } else {
    return res.status(400).json({ error: 'Invalid action. Use "suggest" or "verify"' });
  }
}
