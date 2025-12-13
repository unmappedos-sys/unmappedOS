/**
 * Zone Safety Check API - Time-Gated Zone Logic
 * Prevents "Dark Alley" algorithm risk by checking time-of-day safety
 * 
 * Risk: Quiet park at 2PM = safe. Same park at 2AM = mugging hotspot.
 * Solution: Auto-disable or warn about zones after dark
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface SunTimes {
  sunrise: string;
  sunset: string;
}

interface SafetyCheckRequest {
  zone_id: string;
  lat: number;
  lon: number;
  current_time?: string; // ISO 8601, defaults to now
}

interface SafetyCheckResponse {
  zone_id: string;
  safe: boolean;
  status: 'SAFE' | 'CAUTION' | 'UNVERIFIED';
  message: string;
  active_hours?: string;
  sun_times: SunTimes;
  is_daylight: boolean;
  has_lighting: boolean;
}

/**
 * Fetch sunrise/sunset times from Open-Meteo API
 * Free, no API key required
 */
async function getSunTimes(lat: number, lon: number, date: string): Promise<SunTimes> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=sunrise,sunset&timezone=auto&forecast_days=1`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    return {
      sunrise: data.daily.sunrise[0],
      sunset: data.daily.sunset[0],
    };
  } catch (error) {
    console.error('Failed to fetch sun times:', error);
    // Fallback to conservative defaults (assume night)
    return {
      sunrise: '06:00',
      sunset: '18:00',
    };
  }
}

/**
 * Check if current time is between sunrise and sunset
 */
function isDaylight(currentTime: Date, sunrise: string, sunset: string): boolean {
  const current = currentTime.getTime();
  const sunriseTime = new Date(sunrise).getTime();
  const sunsetTime = new Date(sunset).getTime();
  
  return current >= sunriseTime && current <= sunsetTime;
}

/**
 * Check if zone has street lighting (from OSM data or zone metadata)
 */
async function hasLighting(zoneId: string): Promise<boolean> {
  // Check zone metadata for lit=yes tag (from OSM)
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data: zone } = await supabase
    .from('zones')
    .select('metadata')
    .eq('zone_id', zoneId)
    .single();
  
  if (!zone?.metadata) return false;
  
  // Check for OSM lit=yes tag or custom lighting data
  return zone.metadata.lit === 'yes' || zone.metadata.has_lighting === true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { zone_id, lat, lon, current_time } = req.body as SafetyCheckRequest;

  if (!zone_id || lat === undefined || lon === undefined) {
    return res.status(400).json({ error: 'Missing zone_id, lat, or lon' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get zone data
    const { data: zone, error: zoneError } = await supabase
      .from('zones')
      .select('zone_id, texture_type, status, metadata')
      .eq('zone_id', zone_id)
      .single();

    if (zoneError || !zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    const now = current_time ? new Date(current_time) : new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    // Fetch sunrise/sunset times
    const sunTimes = await getSunTimes(lat, lon, dateStr);
    const isDay = isDaylight(now, sunTimes.sunrise, sunTimes.sunset);
    const hasLight = await hasLighting(zone_id);

    // Safety logic based on zone type and time
    let safe = true;
    let status: 'SAFE' | 'CAUTION' | 'UNVERIFIED' = 'SAFE';
    let message = 'ZONE VERIFIED // SECURITY NOMINAL';

    // Silence and Deep Analog zones require extra caution at night
    if (zone.texture_type === 'silence' || zone.texture_type === 'deep_analog') {
      if (!isDay) {
        if (hasLight) {
          status = 'CAUTION';
          message = 'ZONE CAUTION // AFTER DARK - LIT AREA';
          safe = false;
        } else {
          status = 'UNVERIFIED';
          message = 'ZONE SECURITY UNVERIFIED AFTER DARK // PROCEED WITH CAUTION';
          safe = false;
        }
      }
    }

    // Override if zone is manually marked OFFLINE
    if (zone.status === 'OFFLINE') {
      status = 'UNVERIFIED';
      message = 'ZONE OFFLINE // SECURITY COMPROMISED';
      safe = false;
    }

    const response: SafetyCheckResponse = {
      zone_id,
      safe,
      status,
      message,
      active_hours: isDay ? 'DAY_ONLY' : 'NIGHT_RISK',
      sun_times: sunTimes,
      is_daylight: isDay,
      has_lighting: hasLight,
    };

    // Log safety check for analytics (non-critical)
    try {
      await supabase.from('safety_checks').insert({
        zone_id,
        check_time: now.toISOString(),
        is_daylight: isDay,
        status,
        user_warned: !safe,
      });
    } catch (logError) {
      // Non-critical logging error, continue
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('Safety check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
