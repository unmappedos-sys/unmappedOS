/**
 * Mission Whisper Engine
 * 
 * Generates short, data-backed intel whispers for the HUD.
 * Whispers are context-aware snippets based on:
 * - Aggregated reports
 * - Price drift
 * - Time of day
 * - Zone status
 * - Historical patterns
 */

import { createServiceClient } from './supabaseService';

export interface Whisper {
  id: string;
  text: string;
  type: 'intel' | 'price' | 'safety' | 'timing' | 'local';
  confidence: number;
  zone_id?: string;
  expires_at: Date;
}

interface WhisperContext {
  zone_id: string;
  city: string;
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
  day_of_week: number;
  user_fingerprint?: Record<string, number>;
}

// Whisper templates
const WHISPER_TEMPLATES = {
  intel: [
    'ZONE STATUS: {status} // {reason}',
    '{report_count} REPORTS IN 24H // STAY ALERT',
    'RECENT ACTIVITY: {activity_type}',
    'SECTOR CLEAR // NO RECENT FLAGS',
  ],
  price: [
    'LOCAL PRICE DELTA: {delta}%',
    '{category} INDEX: {trend}',
    'COFFEE INDEX STABLE // OPERATIONS CLEAR',
    'PRICING ANOMALY DETECTED // VERIFY BEFORE COMMIT',
  ],
  safety: [
    'CONSTRUCTION {direction} EDGE // REDUCE EXPOSURE',
    'HIGH FOOT TRAFFIC // MAINTAIN AWARENESS',
    'QUIET SECTOR // LOW VISIBILITY',
    'SAFE CORRIDOR AVAILABLE // {direction}',
  ],
  timing: [
    'PEAK HOURS APPROACHING // EXPECT DENSITY',
    'OFF-PEAK WINDOW // OPTIMAL MOVEMENT',
    'LOCAL CLOSURE IN {minutes}M',
    'NIGHT OPS RECOMMENDED',
  ],
  local: [
    'LOCAL FAVORITE NEARBY // HIGH TRUST SCORE',
    'GHOST BEACON {direction} // INVESTIGATE',
    'ANCHOR {distance}M {direction}',
    'TEXTURE MATCH: {texture_type}',
  ],
};

/**
 * Generate whispers for a zone context
 */
export async function generateWhispers(
  context: WhisperContext
): Promise<Whisper[]> {
  const whispers: Whisper[] = [];
  const supabase = createServiceClient();

  // Check for cached whispers first
  const cached = await getCachedWhispers(context.zone_id, context.city);
  if (cached.length > 0) {
    return cached;
  }

  // Generate new whispers based on data

  // 1. Intel whispers from recent reports
  const { data: reports } = await supabase
    .from('reports')
    .select('category, created_at')
    .eq('zone_id', context.zone_id)
    .eq('city', context.city)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (reports && reports.length > 0) {
    whispers.push({
      id: `intel-${context.zone_id}-${Date.now()}`,
      text: `${reports.length} REPORTS IN 24H // STAY ALERT`,
      type: 'intel',
      confidence: 0.9,
      zone_id: context.zone_id,
      expires_at: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    });
  } else {
    whispers.push({
      id: `intel-clear-${context.zone_id}-${Date.now()}`,
      text: 'SECTOR CLEAR // NO RECENT FLAGS',
      type: 'intel',
      confidence: 0.8,
      zone_id: context.zone_id,
      expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });
  }

  // 2. Price whispers
  const { data: prices } = await supabase
    .from('prices')
    .select('category, delta_percentage')
    .eq('zone_id', context.zone_id)
    .eq('city', context.city)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .not('delta_percentage', 'is', null);

  const priceData = prices as Array<{ category: string; delta_percentage: number | null }> | null;
  if (priceData && priceData.length > 0) {
    const avgDelta = priceData.reduce((sum, p) => sum + (p.delta_percentage || 0), 0) / priceData.length;

    if (Math.abs(avgDelta) > 5) {
      const sign = avgDelta > 0 ? '+' : '';
      whispers.push({
        id: `price-${context.zone_id}-${Date.now()}`,
        text: `LOCAL PRICE DELTA: ${sign}${Math.round(avgDelta)}%`,
        type: 'price',
        confidence: 0.85,
        zone_id: context.zone_id,
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      });
    } else {
      whispers.push({
        id: `price-stable-${context.zone_id}-${Date.now()}`,
        text: 'PRICE INDEX STABLE // OPERATIONS CLEAR',
        type: 'price',
        confidence: 0.75,
        zone_id: context.zone_id,
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000),
      });
    }
  }

  // 3. Timing whispers
  const timingWhisper = generateTimingWhisper(context.time_of_day, context.day_of_week);
  if (timingWhisper) {
    whispers.push({
      id: `timing-${context.zone_id}-${Date.now()}`,
      text: timingWhisper,
      type: 'timing',
      confidence: 0.7,
      zone_id: context.zone_id,
      expires_at: new Date(Date.now() + 30 * 60 * 1000),
    });
  }

  // 4. Safety whispers based on zone status
  const { data: zone } = await supabase
    .from('zones')
    .select('status, status_reason')
    .eq('zone_id', context.zone_id)
    .eq('city', context.city)
    .single();

  const zoneData = zone as { status: string; status_reason: string | null } | null;
  if (zoneData && zoneData.status !== 'ACTIVE') {
    whispers.push({
      id: `safety-${context.zone_id}-${Date.now()}`,
      text: `ZONE STATUS: ${zoneData.status} // ${zoneData.status_reason || 'VERIFY CONDITIONS'}`,
      type: 'safety',
      confidence: 0.95,
      zone_id: context.zone_id,
      expires_at: new Date(Date.now() + 15 * 60 * 1000),
    });
  }

  // Cache the whispers
  await cacheWhispers(whispers, context.zone_id, context.city);

  return whispers;
}

/**
 * Get cached whispers for a zone
 */
async function getCachedWhispers(zoneId: string, city: string): Promise<Whisper[]> {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from('whisper_cache')
    .select('*')
    .eq('zone_id', zoneId)
    .eq('city', city)
    .gt('valid_until', new Date().toISOString());

  if (!data) return [];

  const whisperData = data as Array<{
    id: string;
    whisper_text: string;
    whisper_type: string;
    confidence: number;
    zone_id: string;
    valid_until: string;
  }>;

  return whisperData.map((w) => ({
    id: w.id,
    text: w.whisper_text,
    type: w.whisper_type as Whisper['type'],
    confidence: w.confidence,
    zone_id: w.zone_id,
    expires_at: new Date(w.valid_until),
  }));
}

/**
 * Cache whispers in database
 */
async function cacheWhispers(
  whispers: Whisper[],
  zoneId: string,
  city: string
): Promise<void> {
  const supabase = createServiceClient();

  const inserts = whispers.map((w) => ({
    zone_id: zoneId,
    city,
    whisper_text: w.text,
    whisper_type: w.type,
    confidence: w.confidence,
    valid_until: w.expires_at.toISOString(),
  }));

  await supabase.from('whisper_cache').insert(inserts as any);
}

/**
 * Generate timing-based whisper
 */
function generateTimingWhisper(
  timeOfDay: WhisperContext['time_of_day'],
  dayOfWeek: number
): string | null {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  switch (timeOfDay) {
    case 'morning':
      if (dayOfWeek === 1) {
        return 'MONDAY RUSH EXPECTED // ALLOW BUFFER';
      }
      return 'MORNING OPS // OPTIMAL VISIBILITY';

    case 'afternoon':
      if (isWeekend) {
        return 'WEEKEND TRAFFIC // ELEVATED DENSITY';
      }
      return null;

    case 'evening':
      return 'PEAK HOURS ACTIVE // EXPECT CONGESTION';

    case 'night':
      return 'NIGHT OPS MODE // SAFE CORRIDORS PRIORITIZED';

    default:
      return null;
  }
}

/**
 * Get time of day category
 */
export function getTimeOfDay(): WhisperContext['time_of_day'] {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Format whisper for HUD display
 */
export function formatWhisperForHUD(whisper: Whisper): string {
  const prefix = getWhisperPrefix(whisper.type);
  return `${prefix} ${whisper.text}`;
}

function getWhisperPrefix(type: Whisper['type']): string {
  switch (type) {
    case 'intel':
      return '📡';
    case 'price':
      return '💰';
    case 'safety':
      return '⚠️';
    case 'timing':
      return '⏱️';
    case 'local':
      return '📍';
    default:
      return '//';
  }
}
