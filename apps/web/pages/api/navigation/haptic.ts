/**
 * Pocket Mode (Haptic Navigation) - Device Target Fixation Mitigation
 * 
 * Risk: User staring at glowing phone in sketchy area = target for thieves
 * Solution: Eyes Up, Phone Down - Navigate via vibration patterns
 * 
 * Patterns:
 * - 1 buzz: You are in the zone
 * - 2 buzzes: You are leaving safety perimeter
 * - Long buzz: Anchor reached
 * 
 * Stealth Mode: Screen completely black, haptics active
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface HapticNavigationRequest {
  user_id: string;
  current_location: {
    lat: number;
    lon: number;
  };
  target_zone_id?: string;
  stealth_mode?: boolean;
}

interface HapticResponse {
  haptic_pattern: 'single' | 'double' | 'long' | 'none';
  pattern_meaning: string;
  in_zone: boolean;
  distance_to_anchor?: number;
  zone_id?: string;
  stealth_mode_active: boolean;
}

/**
 * Calculate distance using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

/**
 * Check if point is inside polygon using ray casting algorithm
 */
function pointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    user_id,
    current_location,
    target_zone_id,
    stealth_mode = false,
  } = req.body as HapticNavigationRequest;

  if (!user_id || !current_location?.lat || !current_location?.lon) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // If target zone specified, navigate to it
    if (target_zone_id) {
      const { data: zone } = await supabase
        .from('zones')
        .select('zone_id, anchor, geometry')
        .eq('zone_id', target_zone_id)
        .single();

      if (!zone) {
        return res.status(404).json({ error: 'Target zone not found' });
      }

      const anchorLat = zone.anchor.lat || zone.anchor[1];
      const anchorLon = zone.anchor.lon || zone.anchor[0];

      const distanceToAnchor = calculateDistance(
        current_location.lat,
        current_location.lon,
        anchorLat,
        anchorLon
      );

      // Haptic logic
      let hapticPattern: 'single' | 'double' | 'long' | 'none' = 'none';
      let patternMeaning = 'No haptic feedback';

      if (distanceToAnchor < 20) {
        // Within 20m of anchor
        hapticPattern = 'long';
        patternMeaning = 'ANCHOR REACHED // DESTINATION';
      } else if (distanceToAnchor < 100) {
        // Within 100m (inside zone)
        hapticPattern = 'single';
        patternMeaning = 'IN ZONE // CONTINUE';
      } else if (distanceToAnchor > 500) {
        // Leaving safety perimeter
        hapticPattern = 'double';
        patternMeaning = 'LEAVING ZONE // TURN BACK';
      }

      const response: HapticResponse = {
        haptic_pattern: hapticPattern,
        pattern_meaning: patternMeaning,
        in_zone: distanceToAnchor < 100,
        distance_to_anchor: Math.round(distanceToAnchor),
        zone_id: zone.zone_id,
        stealth_mode_active: stealth_mode,
      };

      return res.status(200).json(response);
    }

    // No target - check if user is in any zone
    const { data: zones } = await supabase
      .from('zones')
      .select('zone_id, anchor, geometry, texture_type')
      .limit(50); // Check nearby zones only in production

    if (!zones || zones.length === 0) {
      return res.status(200).json({
        haptic_pattern: 'none',
        pattern_meaning: 'NO ZONES NEARBY',
        in_zone: false,
        stealth_mode_active: stealth_mode,
      });
    }

    // Find closest zone
    let closestZone = null;
    let closestDistance = Infinity;

    for (const zone of zones) {
      const anchorLat = zone.anchor.lat || zone.anchor[1];
      const anchorLon = zone.anchor.lon || zone.anchor[0];

      const distance = calculateDistance(
        current_location.lat,
        current_location.lon,
        anchorLat,
        anchorLon
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestZone = zone;
      }
    }

    let hapticPattern: 'single' | 'double' | 'long' | 'none' = 'none';
    let patternMeaning = 'No zones nearby';

    if (closestZone && closestDistance < 20) {
      hapticPattern = 'long';
      patternMeaning = 'ANCHOR REACHED';
    } else if (closestZone && closestDistance < 100) {
      hapticPattern = 'single';
      patternMeaning = 'IN ZONE';
    }

    const response: HapticResponse = {
      haptic_pattern: hapticPattern,
      pattern_meaning: patternMeaning,
      in_zone: closestDistance < 100,
      distance_to_anchor: Math.round(closestDistance),
      zone_id: closestZone?.zone_id,
      stealth_mode_active: stealth_mode,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Haptic navigation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
