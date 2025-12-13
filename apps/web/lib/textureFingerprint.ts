/**
 * Texture Fingerprint System
 * 
 * Tracks user's preferred textures over time.
 * Updates fingerprint jsonb column for zone recommendations.
 */

import { createServiceClient } from './supabaseService';

export interface TextureFingerprint {
  texture_preferences: Record<string, number>;
  time_preferences: Record<string, number>;
  activity_patterns: Record<string, any>;
  computed_at: string | null;
}

export type TextureType = 
  | 'market'
  | 'nightlife'
  | 'temple'
  | 'park'
  | 'transit'
  | 'residential'
  | 'commercial'
  | 'historic'
  | 'waterfront'
  | 'food_street';

export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Update user's texture fingerprint based on activity
 */
export async function updateTextureFingerprint(
  userId: string,
  textureType: TextureType,
  timeOfDay: TimePeriod,
  weight: number = 1.0
): Promise<void> {
  const supabase = createServiceClient();

  // Get current fingerprint
  const { data: user } = await supabase
    .from('users')
    .select('fingerprint')
    .eq('id', userId)
    .single();

  const userData = user as { fingerprint: any } | null;
  const currentFingerprint: TextureFingerprint = userData?.fingerprint || {
    texture_preferences: {},
    time_preferences: {},
    activity_patterns: {},
    computed_at: null,
  };

  // Update texture preferences using exponential moving average
  const alpha = 0.1; // Learning rate
  const currentTextureScore = currentFingerprint.texture_preferences[textureType] || 0;
  const newTextureScore = currentTextureScore + alpha * (weight - currentTextureScore);
  currentFingerprint.texture_preferences[textureType] = Math.min(1, newTextureScore);

  // Update time preferences
  const currentTimeScore = currentFingerprint.time_preferences[timeOfDay] || 0;
  const newTimeScore = currentTimeScore + alpha * (weight - currentTimeScore);
  currentFingerprint.time_preferences[timeOfDay] = Math.min(1, newTimeScore);

  // Normalize scores (ensure sum doesn't exceed reasonable bounds)
  normalizeScores(currentFingerprint.texture_preferences);
  normalizeScores(currentFingerprint.time_preferences);

  currentFingerprint.computed_at = new Date().toISOString();

  // Save updated fingerprint
  await (supabase
    .from('users') as any)
    .update({ fingerprint: currentFingerprint })
    .eq('id', userId);
}

/**
 * Normalize scores to prevent runaway values
 */
function normalizeScores(scores: Record<string, number>): void {
  const values = Object.values(scores);
  if (values.length === 0) return;

  const max = Math.max(...values);
  if (max > 1) {
    for (const key of Object.keys(scores)) {
      scores[key] = scores[key] / max;
    }
  }
}

/**
 * Get zone recommendations based on user fingerprint
 */
export async function getZoneRecommendations(
  userId: string,
  city: string,
  limit: number = 5
): Promise<Array<{ zone_id: string; score: number; reason: string }>> {
  const supabase = createServiceClient();

  // Get user fingerprint
  const { data: user } = await supabase
    .from('users')
    .select('fingerprint')
    .eq('id', userId)
    .single();

  const userData = user as { fingerprint: any } | null;
  if (!userData?.fingerprint?.texture_preferences) {
    return [];
  }

  const fingerprint = userData.fingerprint as TextureFingerprint;
  const topTextures = getTopPreferences(fingerprint.texture_preferences, 3);

  if (topTextures.length === 0) {
    return [];
  }

  // Get zones matching top textures
  const { data: zones } = await supabase
    .from('zones')
    .select('zone_id, texture_type, status')
    .eq('city', city)
    .eq('status', 'ACTIVE')
    .in('texture_type', topTextures.map(t => t.key));

  if (!zones) return [];

  const zoneData = zones as Array<{ zone_id: string; texture_type: string | null; status: string }>;

  // Score and rank zones
  const recommendations = zoneData.map((zone) => {
    const textureScore = fingerprint.texture_preferences[zone.texture_type || ''] || 0;
    const reason = `Matches your ${zone.texture_type} preference`;

    return {
      zone_id: zone.zone_id,
      score: textureScore,
      reason,
    };
  });

  // Sort by score and limit
  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get top N preferences from a score map
 */
function getTopPreferences(
  scores: Record<string, number>,
  n: number
): Array<{ key: string; score: number }> {
  return Object.entries(scores)
    .map(([key, score]) => ({ key, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

/**
 * Generate fingerprint-based micro-whispers
 */
export function generateFingerprintWhispers(
  fingerprint: TextureFingerprint,
  currentZoneTexture: TextureType
): string[] {
  const whispers: string[] = [];

  // Check if current zone matches preferences
  const textureScore = fingerprint.texture_preferences[currentZoneTexture] || 0;

  if (textureScore > 0.7) {
    whispers.push(`TEXTURE MATCH: ${currentZoneTexture.toUpperCase()} // FAVORABLE CONDITIONS`);
  } else if (textureScore < 0.3 && textureScore > 0) {
    whispers.push(`TEXTURE MISMATCH // CONSIDER ALTERNATE ZONE`);
  }

  // Time-based whispers
  const hour = new Date().getHours();
  let currentPeriod: TimePeriod;
  if (hour >= 5 && hour < 12) currentPeriod = 'morning';
  else if (hour >= 12 && hour < 17) currentPeriod = 'afternoon';
  else if (hour >= 17 && hour < 21) currentPeriod = 'evening';
  else currentPeriod = 'night';

  const timeScore = fingerprint.time_preferences[currentPeriod] || 0;
  if (timeScore > 0.6) {
    whispers.push(`OPTIMAL TIME WINDOW // ${currentPeriod.toUpperCase()} OPS PREFERRED`);
  }

  return whispers;
}

/**
 * Calculate fingerprint similarity between two users (for future social features)
 */
export function calculateFingerprintSimilarity(
  fp1: TextureFingerprint,
  fp2: TextureFingerprint
): number {
  const textures1 = fp1.texture_preferences;
  const textures2 = fp2.texture_preferences;

  const allTextures = new Set([
    ...Object.keys(textures1),
    ...Object.keys(textures2),
  ]);

  if (allTextures.size === 0) return 0;

  let similarity = 0;
  for (const texture of allTextures) {
    const score1 = textures1[texture] || 0;
    const score2 = textures2[texture] || 0;
    similarity += 1 - Math.abs(score1 - score2);
  }

  return similarity / allTextures.size;
}
