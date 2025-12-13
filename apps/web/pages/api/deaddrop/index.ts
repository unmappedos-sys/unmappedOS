/**
 * Dead Drop - P2P Offline Intel Sharing via QR Code
 * Allows operatives to share fresh zone data offline (basement bars, remote temples)
 * 
 * Flow:
 * 1. User A (fresh data) generates QR "Mission Code"
 * 2. User B (stale data) scans QR
 * 3. B instantly receives latest hazards, prices, zone updates
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface DeadDropPayload {
  drop_id: string;
  city: string;
  created_at: string;
  expires_at: string;
  sender_id: string;
  sender_level: number;
  data: {
    hazards: any[];
    prices: any[];
    zone_updates: any[];
  };
  signature: string;
}

// Generate a Dead Drop package (for QR code)
async function generateDeadDrop(req: NextApiRequest, res: NextApiResponse) {
  const { city, user_id, include_last_hours = 24 } = req.body;

  if (!city || !user_id) {
    return res.status(400).json({ error: 'Missing city or user_id' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const cutoffTime = new Date(Date.now() - include_last_hours * 60 * 60 * 1000).toISOString();

    // Get user's level
    const { data: user } = await supabase
      .from('users')
      .select('karma')
      .eq('id', user_id)
      .single();

    const userLevel = Math.floor((user?.karma || 0) / 200) + 1;

    // Fetch recent hazards
    const { data: hazards } = await supabase
      .from('reports')
      .select('id, zone_id, category, metadata, created_at')
      .eq('city', city)
      .gte('created_at', cutoffTime)
      .order('created_at', { ascending: false })
      .limit(20);

    // Fetch recent verified prices
    const { data: prices } = await supabase
      .from('prices')
      .select('zone_id, category, amount, currency, created_at')
      .eq('city', city)
      .gte('created_at', cutoffTime)
      .order('created_at', { ascending: false })
      .limit(20);

    // Fetch zone status updates
    const { data: zoneUpdates } = await supabase
      .from('zones')
      .select('zone_id, status, status_reason, updated_at')
      .eq('city', city)
      .gte('updated_at', cutoffTime)
      .order('updated_at', { ascending: false });

    // Generate drop ID
    const dropId = crypto.randomBytes(8).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours

    // Create payload
    const payload: DeadDropPayload = {
      drop_id: dropId,
      city,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      sender_id: user_id,
      sender_level: userLevel,
      data: {
        hazards: hazards || [],
        prices: prices || [],
        zone_updates: zoneUpdates || [],
      },
      signature: '', // Will be calculated
    };

    // Sign payload (simple HMAC for integrity)
    const secret = process.env.DEAD_DROP_SECRET || 'unmapped_dead_drop_secret';
    const dataString = JSON.stringify(payload.data);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(dataString)
      .digest('hex')
      .substring(0, 16);

    payload.signature = signature;

    // Store dead drop (for retrieval/validation)
    await supabase.from('dead_drops').insert({
      drop_id: dropId,
      city,
      sender_id: user_id,
      payload: payload,
      expires_at: expiresAt.toISOString(),
    });

    // Encode as base64 for QR
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');

    return res.status(200).json({
      success: true,
      message: 'DEAD DROP CREATED // MISSION CODE READY',
      drop_id: dropId,
      qr_data: `unmappedos://deaddrop/${dropId}`,
      payload_base64: base64Payload,
      expires_at: expiresAt.toISOString(),
      data_count: {
        hazards: hazards?.length || 0,
        prices: prices?.length || 0,
        zone_updates: zoneUpdates?.length || 0,
      },
    });
  } catch (error) {
    console.error('Dead drop generation error:', error);
    return res.status(500).json({ error: 'Failed to create dead drop' });
  }
}

// Retrieve a Dead Drop (by scanning QR)
async function retrieveDeadDrop(req: NextApiRequest, res: NextApiResponse) {
  const { drop_id, receiver_id } = req.body;

  if (!drop_id || !receiver_id) {
    return res.status(400).json({ error: 'Missing drop_id or receiver_id' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch dead drop
    const { data: drop, error: dropError } = await supabase
      .from('dead_drops')
      .select('*')
      .eq('drop_id', drop_id)
      .single();

    if (dropError || !drop) {
      return res.status(404).json({ error: 'DEAD DROP NOT FOUND // INVALID MISSION CODE' });
    }

    // Check expiration
    if (new Date(drop.expires_at) < new Date()) {
      return res.status(410).json({ error: 'DEAD DROP EXPIRED // INTEL TOO OLD' });
    }

    // Verify signature
    const payload = drop.payload as DeadDropPayload;
    const secret = process.env.DEAD_DROP_SECRET || 'unmapped_dead_drop_secret';
    const dataString = JSON.stringify(payload.data);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(dataString)
      .digest('hex')
      .substring(0, 16);

    if (payload.signature !== expectedSignature) {
      return res.status(400).json({ error: 'SIGNATURE MISMATCH // COMPROMISED DATA' });
    }

    // Award karma to receiver (+10 for P2P sync)
    await supabase.rpc('increment_karma', {
      p_user_id: receiver_id,
      p_amount: 10,
      p_reason: 'dead_drop_receive',
    });

    // Award karma to sender (+5 for sharing)
    await supabase.rpc('increment_karma', {
      p_user_id: payload.sender_id,
      p_amount: 5,
      p_reason: 'dead_drop_share',
    });

    return res.status(200).json({
      success: true,
      message: 'DEAD DROP RETRIEVED // INTEL RECEIVED',
      city: payload.city,
      sender_level: payload.sender_level,
      data: payload.data,
      created_at: payload.created_at,
      karma_awarded: 10,
    });
  } catch (error) {
    console.error('Dead drop retrieval error:', error);
    return res.status(500).json({ error: 'Failed to retrieve dead drop' });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body;

  if (action === 'generate') {
    return generateDeadDrop(req, res);
  } else if (action === 'retrieve') {
    return retrieveDeadDrop(req, res);
  } else {
    return res.status(400).json({ error: 'Invalid action. Use "generate" or "retrieve"' });
  }
}
