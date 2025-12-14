/**
 * Recommendation Ranker
 * 
 * Honest, adaptive recommendation engine that considers:
 * - Texture match (user preference fingerprint)
 * - Confidence score (intel freshness)
 * - Time of day (operational hours, safety)
 * - Weather impact (outdoor vs indoor)
 * - Hazard state (exclusion from recommendations)
 * 
 * All recommendations are explainable.
 */

import type { Zone, ZoneTexture, TextureType } from '../../scripts/packgen/city_pack_schema';
import type { ZoneConfidenceState, ConfidenceLevel } from './confidenceEngine';
import type { CurrentWeather, WeatherModifiers, TextureWeatherWeight } from './weatherService';
import { calculateWeatherModifiers, getWeatherIcon } from './weatherService';

// ============================================================================
// TYPES
// ============================================================================

export interface UserFingerprint {
  preferred_textures: TextureType[];
  avoided_textures: TextureType[];
  time_preference: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' | 'ANY';
  crowd_tolerance: 'LOW' | 'MEDIUM' | 'HIGH';
  activity_level: 'RELAXED' | 'MODERATE' | 'ACTIVE';
  interests: string[];
}

export interface RecommendationContext {
  current_time: Date;
  weather: CurrentWeather | null;
  user_location?: { lat: number; lon: number };
  user_fingerprint?: UserFingerprint;
  exclude_visited?: string[]; // Zone IDs to exclude
  max_results?: number;
}

export interface ZoneRecommendation {
  zone: Zone;
  confidence: ZoneConfidenceState;
  
  // Scores (0-100)
  total_score: number;
  texture_score: number;
  confidence_score: number;
  time_score: number;
  weather_score: number;
  distance_score: number;
  
  // Explanation
  reasons: string[];
  warnings: string[];
  
  // Weather-adjusted metrics
  adjusted_walkability: number;
  adjusted_safety: number;
}

export interface RankerResult {
  recommendations: ZoneRecommendation[];
  excluded_count: number;
  excluded_reasons: {
    offline: number;
    degraded: number;
    hazard: number;
    visited: number;
  };
  context: {
    time_period: string;
    weather_summary: string | null;
    user_has_fingerprint: boolean;
  };
}

// ============================================================================
// SCORING WEIGHTS
// ============================================================================

const WEIGHTS = {
  TEXTURE: 0.30,      // How well zone matches user preference
  CONFIDENCE: 0.25,   // How fresh/reliable the intel is
  TIME: 0.15,         // How appropriate for current time
  WEATHER: 0.15,      // How weather affects the zone
  DISTANCE: 0.15,     // Proximity bonus (if location available)
};

// ============================================================================
// TIME ANALYSIS
// ============================================================================

type TimePeriod = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';

function getTimePeriod(date: Date): TimePeriod {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'MORNING';
  if (hour >= 12 && hour < 17) return 'AFTERNOON';
  if (hour >= 17 && hour < 22) return 'EVENING';
  return 'NIGHT';
}

function getTimeScore(texture: ZoneTexture, period: TimePeriod): number {
  // Texture affinities by time period
  const affinities: Record<TextureType, Record<TimePeriod, number>> = {
    MARKET_CHAOS: { MORNING: 90, AFTERNOON: 70, EVENING: 40, NIGHT: 20 },
    TEMPLE_PEACE: { MORNING: 95, AFTERNOON: 80, EVENING: 60, NIGHT: 30 },
    NIGHTLIFE_ELECTRIC: { MORNING: 10, AFTERNOON: 30, EVENING: 80, NIGHT: 100 },
    CAFE_CULTURE: { MORNING: 90, AFTERNOON: 95, EVENING: 70, NIGHT: 40 },
    TRANSIT_HUB: { MORNING: 80, AFTERNOON: 80, EVENING: 80, NIGHT: 50 },
    TOURIST_DENSE: { MORNING: 70, AFTERNOON: 90, EVENING: 70, NIGHT: 40 },
    LOCAL_AUTHENTIC: { MORNING: 80, AFTERNOON: 80, EVENING: 85, NIGHT: 60 },
    PARK_REFUGE: { MORNING: 90, AFTERNOON: 85, EVENING: 60, NIGHT: 20 },
    COMMERCIAL: { MORNING: 70, AFTERNOON: 90, EVENING: 60, NIGHT: 30 },
    RESIDENTIAL: { MORNING: 60, AFTERNOON: 60, EVENING: 70, NIGHT: 50 },
    MIXED: { MORNING: 70, AFTERNOON: 80, EVENING: 75, NIGHT: 50 },
  };

  return affinities[texture.primary]?.[period] || 60;
}

// ============================================================================
// TEXTURE MATCHING
// ============================================================================

function getTextureScore(
  texture: ZoneTexture,
  fingerprint?: UserFingerprint
): { score: number; reason: string } {
  if (!fingerprint) {
    // No fingerprint - neutral scoring
    return { score: 70, reason: 'General interest' };
  }

  let score = 50; // Base score
  let reason = '';

  // Check preferred textures
  if (fingerprint.preferred_textures.includes(texture.primary)) {
    score += 40;
    reason = `Matches your preference for ${texture.primary.toLowerCase().replace('_', ' ')}`;
  } else if (texture.secondary && fingerprint.preferred_textures.includes(texture.secondary)) {
    score += 25;
    reason = `Secondary match: ${texture.secondary.toLowerCase().replace('_', ' ')}`;
  }

  // Check avoided textures
  if (fingerprint.avoided_textures.includes(texture.primary)) {
    score -= 30;
    reason = reason || `Not typically your style (${texture.primary.toLowerCase().replace('_', ' ')})`;
  }

  // Activity level matching
  const activeTextures: TextureType[] = ['MARKET_CHAOS', 'NIGHTLIFE_ELECTRIC', 'TOURIST_DENSE'];
  const relaxedTextures: TextureType[] = ['TEMPLE_PEACE', 'CAFE_CULTURE', 'PARK_REFUGE'];

  if (fingerprint.activity_level === 'ACTIVE' && activeTextures.includes(texture.primary)) {
    score += 10;
  } else if (fingerprint.activity_level === 'RELAXED' && relaxedTextures.includes(texture.primary)) {
    score += 10;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reason: reason || 'Mixed match with preferences',
  };
}

// ============================================================================
// WEATHER SCORING
// ============================================================================

function getWeatherScore(
  texture: ZoneTexture,
  weather: CurrentWeather | null,
  modifiers: WeatherModifiers | null
): { score: number; adjustment: number; reason: string } {
  if (!weather || !modifiers) {
    return { score: 70, adjustment: 0, reason: 'Weather data unavailable' };
  }

  let score = 80; // Base score for decent weather
  const weights = modifiers.texture_weight;

  // Apply outdoor/indoor adjustments based on texture
  const outdoorTextures: TextureType[] = ['PARK_REFUGE', 'MARKET_CHAOS', 'TEMPLE_PEACE'];
  const indoorTextures: TextureType[] = ['CAFE_CULTURE', 'COMMERCIAL', 'NIGHTLIFE_ELECTRIC'];

  if (outdoorTextures.includes(texture.primary)) {
    score -= weights.outdoor_penalty * 40;
    score -= weights.park_penalty * 20;
  } else if (indoorTextures.includes(texture.primary)) {
    score += weights.indoor_bonus * 30;
    score += weights.cafe_boost * 20;
  }

  // Weather walkability impact
  score += modifiers.walkability_modifier * 0.5;
  score += modifiers.safety_modifier * 0.5;

  let reason = '';
  if (modifiers.warning) {
    reason = modifiers.warning;
  } else if (score > 80) {
    reason = 'Great weather for this zone';
  } else if (score < 50) {
    reason = 'Weather conditions may affect experience';
  } else {
    reason = 'Weather acceptable';
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    adjustment: modifiers.walkability_modifier,
    reason,
  };
}

// ============================================================================
// DISTANCE SCORING
// ============================================================================

function getDistanceScore(
  zoneCenter: { lat: number; lon: number },
  userLocation?: { lat: number; lon: number }
): { score: number; distance_km: number | null } {
  if (!userLocation) {
    return { score: 70, distance_km: null }; // Neutral if no location
  }

  // Haversine distance
  const R = 6371; // Earth's radius in km
  const dLat = (zoneCenter.lat - userLocation.lat) * Math.PI / 180;
  const dLon = (zoneCenter.lon - userLocation.lon) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(zoneCenter.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;

  // Score based on distance (closer = higher score)
  let score: number;
  if (distance < 0.5) score = 100;
  else if (distance < 1) score = 90;
  else if (distance < 2) score = 80;
  else if (distance < 5) score = 60;
  else if (distance < 10) score = 40;
  else score = 20;

  return { score, distance_km: Math.round(distance * 10) / 10 };
}

// ============================================================================
// CONFIDENCE SCORING
// ============================================================================

function getConfidenceScore(confidence: ZoneConfidenceState): { score: number; reason: string } {
  const levelScores: Record<ConfidenceLevel, number> = {
    HIGH: 100,
    MEDIUM: 75,
    LOW: 50,
    DEGRADED: 25,
    UNKNOWN: 10,
  };

  let reason = '';
  if (confidence.level === 'HIGH') {
    reason = 'Recently verified, reliable intel';
  } else if (confidence.level === 'MEDIUM') {
    reason = 'Reasonably fresh intel';
  } else if (confidence.level === 'LOW') {
    reason = 'Limited recent intel - verify on ground';
  } else {
    reason = 'Stale data - use caution';
  }

  // Penalty for anomalies
  let score = levelScores[confidence.level];
  if (confidence.anomaly_detected) {
    score -= 20;
    reason += ' (anomaly detected)';
  }

  return {
    score: Math.max(0, score),
    reason,
  };
}

// ============================================================================
// MAIN RANKER
// ============================================================================

export function rankZones(
  zones: Zone[],
  confidenceStates: Map<string, ZoneConfidenceState>,
  context: RecommendationContext
): RankerResult {
  const timePeriod = getTimePeriod(context.current_time);
  const weatherModifiers = context.weather 
    ? calculateWeatherModifiers(context.weather) 
    : null;

  const excluded = {
    offline: 0,
    degraded: 0,
    hazard: 0,
    visited: 0,
  };

  const recommendations: ZoneRecommendation[] = [];

  for (const zone of zones) {
    const confidence = confidenceStates.get(zone.id) || {
      zone_id: zone.id,
      score: 50,
      level: 'MEDIUM' as ConfidenceLevel,
      state: 'ACTIVE' as const,
      last_verified_at: null,
      last_intel_at: null,
      verification_count: 0,
      intel_count_24h: 0,
      conflict_count: 0,
      hazard_active: false,
      hazard_expires_at: null,
      anomaly_detected: false,
      anomaly_reason: null,
      updated_at: new Date().toISOString(),
    };

    // Exclusion checks
    if (confidence.hazard_active) {
      excluded.hazard++;
      continue;
    }
    if (confidence.state === 'OFFLINE') {
      excluded.offline++;
      continue;
    }
    if (context.exclude_visited?.includes(zone.id)) {
      excluded.visited++;
      continue;
    }

    // Calculate scores
    const textureResult = getTextureScore(zone.texture, context.user_fingerprint);
    const confidenceResult = getConfidenceScore(confidence);
    const timeScore = getTimeScore(zone.texture, timePeriod);
    const weatherResult = getWeatherScore(zone.texture, context.weather, weatherModifiers);
    const distanceResult = getDistanceScore(zone.center, context.user_location);

    // Weighted total
    const totalScore = Math.round(
      textureResult.score * WEIGHTS.TEXTURE +
      confidenceResult.score * WEIGHTS.CONFIDENCE +
      timeScore * WEIGHTS.TIME +
      weatherResult.score * WEIGHTS.WEATHER +
      distanceResult.score * WEIGHTS.DISTANCE
    );

    // Build reasons and warnings
    const reasons: string[] = [];
    const warnings: string[] = [];

    if (textureResult.score >= 70) {
      reasons.push(textureResult.reason);
    }
    if (timeScore >= 80) {
      reasons.push(`Good for ${timePeriod.toLowerCase()}`);
    }
    if (confidenceResult.score >= 75) {
      reasons.push(confidenceResult.reason);
    }

    if (confidence.level === 'LOW' || confidence.level === 'DEGRADED') {
      warnings.push(confidenceResult.reason);
    }
    if (weatherModifiers?.warning) {
      warnings.push(weatherModifiers.warning);
    }
    if (confidence.anomaly_detected) {
      warnings.push('Anomaly detected - verify current conditions');
    }

    // Default reason if none
    if (reasons.length === 0) {
      reasons.push('Available zone');
    }

    // Adjusted scores
    const adjustedWalkability = Math.max(0, Math.min(100,
      zone.texture.walkability + (weatherResult.adjustment || 0)
    ));
    const adjustedSafety = Math.max(0, Math.min(100,
      zone.texture.safety_score + (weatherModifiers?.safety_modifier || 0)
    ));

    recommendations.push({
      zone,
      confidence,
      total_score: totalScore,
      texture_score: textureResult.score,
      confidence_score: confidenceResult.score,
      time_score: timeScore,
      weather_score: weatherResult.score,
      distance_score: distanceResult.score,
      reasons,
      warnings,
      adjusted_walkability: adjustedWalkability,
      adjusted_safety: adjustedSafety,
    });
  }

  // Sort by total score
  recommendations.sort((a, b) => b.total_score - a.total_score);

  // Apply max results limit
  const limitedRecommendations = context.max_results 
    ? recommendations.slice(0, context.max_results)
    : recommendations;

  // Weather summary
  let weatherSummary: string | null = null;
  if (context.weather) {
    const icon = getWeatherIcon(context.weather.category);
    weatherSummary = `${icon} ${Math.round(context.weather.temperature)}°C, ${context.weather.category.toLowerCase().replace('_', ' ')}`;
    if (weatherModifiers?.recommendation) {
      weatherSummary += ` - ${weatherModifiers.recommendation}`;
    }
  }

  return {
    recommendations: limitedRecommendations,
    excluded_count: excluded.offline + excluded.degraded + excluded.hazard + excluded.visited,
    excluded_reasons: excluded,
    context: {
      time_period: timePeriod,
      weather_summary: weatherSummary,
      user_has_fingerprint: !!context.user_fingerprint,
    },
  };
}

// ============================================================================
// EXPLANATION FORMATTER
// ============================================================================

export function formatRecommendationExplanation(rec: ZoneRecommendation): string {
  const parts: string[] = [];
  
  // Main reason
  parts.push(`RECOMMENDED: ${rec.reasons[0]}`);
  
  // Confidence indicator
  const confidenceLabel = rec.confidence.level;
  parts.push(`INTEL: ${confidenceLabel} CONFIDENCE`);
  
  // Scores breakdown
  parts.push(`MATCH: ${rec.total_score}% (texture ${rec.texture_score}, time ${rec.time_score}, weather ${rec.weather_score})`);
  
  // Warnings
  if (rec.warnings.length > 0) {
    parts.push(`⚠️ ${rec.warnings.join(' | ')}`);
  }
  
  return parts.join('\n');
}
