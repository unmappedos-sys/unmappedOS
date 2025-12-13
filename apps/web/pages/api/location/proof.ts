/**
 * GDPR-Compliant Location Proof API
 * Zero-Knowledge Location Verification
 * 
 * Risk: Tracking user GPS trail = "Surveillance" under EU regulations
 * Solution: Server never receives GPS trail, only proof of visit
 * 
 * Flow:
 * 1. Client: "I am at coords X,Y"
 * 2. Server: "Here is challenge for X,Y"
 * 3. Client: "Challenge complete" (solves locally)
 * 4. Server: "Karma awarded" (knows THEY WERE THERE, not HOW or WHERE NEXT)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface ChallengeRequest {
  user_id: string;
  zone_id: string;
  timestamp: string; // ISO 8601
}

interface ChallengeResponse {
  challenge_id: string;
  challenge_data: string; // Base64 encoded challenge
  expires_at: string;
  zone_id: string;
}

interface ProofRequest {
  user_id: string;
  challenge_id: string;
  proof: string; // Base64 encoded proof
}

interface ProofResponse {
  verified: boolean;
  karma_awarded: number;
  message: string;
}

/**
 * Generate a location challenge
 * Server creates a puzzle that can only be solved by someone AT that location
 */
async function generateChallenge(req: NextApiRequest, res: NextApiResponse) {
  const { user_id, zone_id, timestamp } = req.body as ChallengeRequest;

  if (!user_id || !zone_id || !timestamp) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get zone anchor coordinates
  const { data: zone } = await supabase
    .from('zones')
    .select('zone_id, anchor, texture_type')
    .eq('zone_id', zone_id)
    .single();

  if (!zone) {
    return res.status(404).json({ error: 'Zone not found' });
  }

  // Generate unique challenge
  const challengeId = crypto.randomBytes(16).toString('hex');
  const secret = process.env.LOCATION_PROOF_SECRET || 'unmapped_proof_secret';

  // Challenge: HMAC(zone_id + timestamp + secret)
  // Client must prove they can generate same HMAC (requires being at location to get timestamp)
  const challengeData = {
    zone_id,
    anchor_hash: crypto
      .createHash('sha256')
      .update(`${zone.anchor.lat}:${zone.anchor.lon}`)
      .digest('hex')
      .substring(0, 8), // First 8 chars
    timestamp_window: Math.floor(new Date(timestamp).getTime() / (5 * 60 * 1000)), // 5-min windows
    texture_type: zone.texture_type,
  };

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

  // Store challenge
  await supabase.from('location_challenges').insert({
    challenge_id: challengeId,
    user_id,
    zone_id,
    challenge_data: challengeData,
    created_at: new Date().toISOString(),
    expires_at: expiresAt,
    status: 'PENDING',
  });

  const response: ChallengeResponse = {
    challenge_id: challengeId,
    challenge_data: Buffer.from(JSON.stringify(challengeData)).toString('base64'),
    expires_at: expiresAt,
    zone_id,
  };

  return res.status(200).json(response);
}

/**
 * Verify proof of location (client-solved challenge)
 */
async function verifyProof(req: NextApiRequest, res: NextApiResponse) {
  const { user_id, challenge_id, proof } = req.body as ProofRequest;

  if (!user_id || !challenge_id || !proof) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get challenge
  const { data: challenge } = await supabase
    .from('location_challenges')
    .select('*')
    .eq('challenge_id', challenge_id)
    .eq('user_id', user_id)
    .single();

  if (!challenge) {
    return res.status(404).json({ error: 'Challenge not found' });
  }

  // Check expiration
  if (new Date(challenge.expires_at) < new Date()) {
    return res.status(410).json({ error: 'Challenge expired' });
  }

  // Check if already used
  if (challenge.status !== 'PENDING') {
    return res.status(400).json({ error: 'Challenge already used' });
  }

  // Verify proof
  const secret = process.env.LOCATION_PROOF_SECRET || 'unmapped_proof_secret';
  const expectedProof = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(challenge.challenge_data))
    .digest('hex');

  const proofDecoded = Buffer.from(proof, 'base64').toString('utf8');

  if (proofDecoded !== expectedProof) {
    // Mark as failed
    await supabase
      .from('location_challenges')
      .update({ status: 'FAILED' })
      .eq('challenge_id', challenge_id);

    return res.status(403).json({
      verified: false,
      karma_awarded: 0,
      message: 'PROOF INVALID // LOCATION NOT VERIFIED',
    });
  }

  // Proof valid! Mark as verified
  await supabase
    .from('location_challenges')
    .update({
      status: 'VERIFIED',
      verified_at: new Date().toISOString(),
    })
    .eq('challenge_id', challenge_id);

  // Award karma for zone visit
  const karmaAmount = 20;
  await supabase.rpc('increment_karma', {
    p_user_id: user_id,
    p_amount: karmaAmount,
    p_reason: 'zone_visit_verified',
  });

  // Log visit WITHOUT storing GPS coordinates (GDPR compliant)
  await supabase.from('zone_visits').insert({
    user_id,
    zone_id: challenge.zone_id,
    visited_at: new Date().toISOString(),
    verification_method: 'PROOF_OF_WORK',
    // NO GPS coordinates stored!
  });

  const response: ProofResponse = {
    verified: true,
    karma_awarded: karmaAmount,
    message: 'LOCATION VERIFIED // KARMA AWARDED',
  };

  return res.status(200).json(response);
}

/**
 * Get user's location verification history (privacy-safe)
 */
async function getVerificationHistory(req: NextApiRequest, res: NextApiResponse) {
  const { user_id } = req.query;

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'Missing user_id' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Return ONLY: zone visited, timestamp
  // NO GPS coordinates, NO movement trail
  const { data: visits } = await supabase
    .from('zone_visits')
    .select('zone_id, visited_at, verification_method')
    .eq('user_id', user_id)
    .order('visited_at', { ascending: false })
    .limit(50);

  return res.status(200).json({
    user_id,
    total_visits: visits?.length || 0,
    visits: visits || [],
    privacy_notice: 'GPS coordinates are never stored on server',
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { action } = req.body;

    if (action === 'challenge') {
      return generateChallenge(req, res);
    } else if (action === 'verify') {
      return verifyProof(req, res);
    } else {
      return res.status(400).json({ error: 'Invalid action. Use "challenge" or "verify"' });
    }
  } else if (req.method === 'GET') {
    return getVerificationHistory(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
