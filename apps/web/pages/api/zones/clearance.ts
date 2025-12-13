/**
 * Clearance Check API - Verify user has access to zone
 * Protects fragile "Deep Analog" zones from mass tourism
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface ClearanceCheck {
  zone_id: string;
  user_id: string;
}

// Calculate user level from karma
function calculateLevel(karma: number): number {
  return Math.floor(karma / 200) + 1;
}

// Calculate clearance level from karma
function calculateClearance(karma: number): number {
  if (karma >= 1000) return 5; // Field Agent
  if (karma >= 500) return 3;  // Operative
  return 1;                      // Rookie
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { zone_id, user_id } = req.body as ClearanceCheck;

  if (!zone_id || !user_id) {
    return res.status(400).json({ error: 'Missing zone_id or user_id' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get zone clearance requirement
    const { data: zone, error: zoneError } = await supabase
      .from('zones')
      .select('zone_id, clearance_level, texture_type')
      .eq('zone_id', zone_id)
      .single();

    if (zoneError || !zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    // Get user's current karma and calculate clearance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('karma')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userClearance = calculateClearance(user.karma);
    const userLevel = calculateLevel(user.karma);
    const requiredClearance = zone.clearance_level || 1;

    const accessGranted = userClearance >= requiredClearance;

    if (!accessGranted) {
      const karmaNeeded = requiredClearance === 5 ? 1000 : requiredClearance === 3 ? 500 : 0;
      const karmaToGo = Math.max(0, karmaNeeded - user.karma);

      return res.status(403).json({
        access: 'DENIED',
        message: 'INSUFFICIENT SECURITY CLEARANCE',
        zone_id,
        zone_type: zone.texture_type,
        required_clearance: requiredClearance,
        your_clearance: userClearance,
        your_level: userLevel,
        karma_needed: karmaToGo,
        hint: requiredClearance === 5
          ? 'This "Deep Analog" zone is reserved for Field Agents (1000+ karma)'
          : 'Earn more karma to unlock restricted zones',
      });
    }

    return res.status(200).json({
      access: 'GRANTED',
      message: 'CLEARANCE VERIFIED // ACCESS AUTHORIZED',
      zone_id,
      zone_type: zone.texture_type,
      required_clearance: requiredClearance,
      your_clearance: userClearance,
      your_level: userLevel,
    });
  } catch (error) {
    console.error('Clearance check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
