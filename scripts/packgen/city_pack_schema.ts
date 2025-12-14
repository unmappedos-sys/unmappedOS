/**
 * City Pack Schema v2
 * 
 * Production-grade city pack format with:
 * - Zone baselines from OSM
 * - Confidence tracking
 * - Intel aggregation
 * - Texture classification
 */

import type { ZoneBaseline, POIData, CityOSMConfig } from './osm_ingest';

// ============================================================================
// CORE TYPES
// ============================================================================

export type ZoneState = 'ACTIVE' | 'DEGRADED' | 'OFFLINE' | 'UNKNOWN';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'DEGRADED' | 'UNKNOWN';
export type TextureType = 
  | 'MARKET_CHAOS'
  | 'TEMPLE_PEACE'
  | 'NIGHTLIFE_ELECTRIC'
  | 'CAFE_CULTURE'
  | 'TRANSIT_HUB'
  | 'TOURIST_DENSE'
  | 'LOCAL_AUTHENTIC'
  | 'PARK_REFUGE'
  | 'COMMERCIAL'
  | 'RESIDENTIAL'
  | 'MIXED';

export interface ZoneConfidence {
  score: number;           // 0-100
  level: ConfidenceLevel;
  last_verified_at: string | null;
  verification_count: number;
  decay_factor: number;    // Applied daily
  anomaly_detected: boolean;
  anomaly_reason?: string;
}

export interface ZoneIntelAggregate {
  price_reports: number;
  hassle_reports: number;
  crowd_reports: number;
  quiet_confirmations: number;
  construction_reports: number;
  total_intel: number;
  last_intel_at: string | null;
  trust_weighted_score: number;
}

export interface ZoneTexture {
  primary: TextureType;
  secondary: TextureType | null;
  tags: string[];
  walkability: number;     // 0-100
  safety_score: number;    // 0-100
  vibe_keywords: string[];
}

export interface ZonePricing {
  coffee_local: number | null;
  coffee_tourist: number | null;
  beer_local: number | null;
  beer_tourist: number | null;
  meal_street: number | null;
  meal_restaurant: number | null;
  currency: string;
  last_price_at: string | null;
  price_confidence: number;
}

export interface ZoneHazard {
  active: boolean;
  type?: 'SCAM' | 'CONSTRUCTION' | 'UNSAFE' | 'CLOSED' | 'CROWD';
  reason?: string;
  reported_at?: string;
  expires_at?: string;
  report_count: number;
}

export interface Zone {
  // Identity
  id: string;
  name: string;
  city_code: string;
  
  // Location
  center: { lat: number; lon: number };
  radius_m: number;
  polygon?: Array<{ lat: number; lon: number }>;
  
  // State
  state: ZoneState;
  confidence: ZoneConfidence;
  
  // Intelligence
  intel: ZoneIntelAggregate;
  texture: ZoneTexture;
  pricing: ZonePricing;
  hazard: ZoneHazard;
  
  // OSM Baseline
  baseline: {
    poi_count: number;
    poi_density: number;
    lighting_density: number;
    pedestrian_score: number;
    transit_access: number;
    extracted_at: string;
  };
  
  // POIs (lightweight for offline)
  pois: Array<{
    id: string;
    name: string;
    type: string;
    lat: number;
    lon: number;
    opening_hours?: string;
  }>;
  
  // Metadata
  created_at: string;
  updated_at: string;
  pack_version: string;
}

export interface CityPackV2 {
  // Metadata
  version: '2.0.0';
  generated_at: string;
  generator: 'unmapped-os-packgen';
  
  // City Info
  city: {
    code: string;
    name: string;
    country: string;
    center: { lat: number; lon: number };
    timezone: string;
    currency: string;
  };
  
  // Emergency Info
  emergency: {
    police: string;
    ambulance: string;
    embassy?: string;
  };
  
  // Zones
  zones: Zone[];
  zone_count: number;
  
  // Aggregates
  stats: {
    total_pois: number;
    total_intel: number;
    average_confidence: number;
    active_zones: number;
    degraded_zones: number;
    offline_zones: number;
  };
  
  // Data Freshness
  freshness: {
    osm_extracted_at: string;
    intel_synced_at: string | null;
    confidence_calculated_at: string;
  };
}

// ============================================================================
// TEXTURE CLASSIFICATION
// ============================================================================

export function classifyTexture(baseline: ZoneBaseline): ZoneTexture {
  const pois = baseline.pois;
  
  // Count POI types
  const counts: Record<string, number> = {};
  pois.forEach(poi => {
    counts[poi.type] = (counts[poi.type] || 0) + 1;
  });
  
  // Calculate ratios
  const total = pois.length || 1;
  const cafeRatio = (counts.cafe || 0) / total;
  const barRatio = (counts.bar || 0) / total;
  const marketRatio = ((counts.market || 0) + (counts.convenience || 0)) / total;
  const templeRatio = (counts.temple || 0) / total;
  const parkRatio = (counts.park || 0) / total;
  const transitRatio = (counts.transit_stop || 0) / total;
  const touristRatio = ((counts.hotel || 0) + (counts.landmark || 0) + (counts.museum || 0)) / total;
  
  // Determine primary texture
  let primary: TextureType = 'MIXED';
  let secondary: TextureType | null = null;
  const tags: string[] = [];
  const vibeKeywords: string[] = [];
  
  if (marketRatio > 0.3) {
    primary = 'MARKET_CHAOS';
    vibeKeywords.push('bustling', 'bargains', 'crowded', 'authentic');
    tags.push('market', 'shopping', 'local');
  } else if (barRatio > 0.25) {
    primary = 'NIGHTLIFE_ELECTRIC';
    vibeKeywords.push('vibrant', 'late-night', 'social', 'energetic');
    tags.push('nightlife', 'bars', 'clubs');
  } else if (cafeRatio > 0.25) {
    primary = 'CAFE_CULTURE';
    vibeKeywords.push('relaxed', 'wifi', 'work-friendly', 'cozy');
    tags.push('cafes', 'coffee', 'digital-nomad');
  } else if (templeRatio > 0.15) {
    primary = 'TEMPLE_PEACE';
    vibeKeywords.push('serene', 'spiritual', 'quiet', 'historic');
    tags.push('temples', 'historic', 'cultural');
  } else if (parkRatio > 0.2) {
    primary = 'PARK_REFUGE';
    vibeKeywords.push('green', 'peaceful', 'outdoor', 'escape');
    tags.push('parks', 'nature', 'walking');
  } else if (transitRatio > 0.15) {
    primary = 'TRANSIT_HUB';
    vibeKeywords.push('connected', 'busy', 'convenient', 'central');
    tags.push('transit', 'central', 'accessible');
  } else if (touristRatio > 0.2) {
    primary = 'TOURIST_DENSE';
    vibeKeywords.push('touristy', 'landmarks', 'crowded', 'expensive');
    tags.push('tourist', 'sightseeing', 'hotels');
  } else if (baseline.poi_density < 20) {
    primary = 'RESIDENTIAL';
    vibeKeywords.push('quiet', 'local', 'authentic', 'residential');
    tags.push('residential', 'local', 'quiet');
  } else {
    primary = 'LOCAL_AUTHENTIC';
    vibeKeywords.push('authentic', 'local', 'everyday', 'genuine');
    tags.push('local', 'authentic', 'neighborhood');
  }
  
  // Determine secondary
  if (primary !== 'CAFE_CULTURE' && cafeRatio > 0.15) secondary = 'CAFE_CULTURE';
  else if (primary !== 'NIGHTLIFE_ELECTRIC' && barRatio > 0.1) secondary = 'NIGHTLIFE_ELECTRIC';
  else if (primary !== 'MARKET_CHAOS' && marketRatio > 0.15) secondary = 'MARKET_CHAOS';
  
  // Calculate scores
  const walkability = Math.min(100, Math.round(
    baseline.pedestrian_score * 0.5 +
    baseline.lighting_density * 30 +
    Math.min(baseline.poi_density, 100) * 0.2
  ));
  
  const safetyScore = Math.min(100, Math.round(
    baseline.lighting_density * 40 +
    baseline.transit_access * 0.3 +
    (baseline.pedestrian_score > 50 ? 20 : 10) +
    (pois.filter(p => p.type === 'pharmacy' || p.type === 'convenience').length > 0 ? 10 : 0)
  ));
  
  return {
    primary,
    secondary,
    tags,
    walkability,
    safety_score: safetyScore,
    vibe_keywords: vibeKeywords,
  };
}

// ============================================================================
// CONFIDENCE INITIALIZATION
// ============================================================================

export function initializeConfidence(baseline: ZoneBaseline): ZoneConfidence {
  // Higher POI density = more verifiable = higher initial confidence
  const densityBonus = Math.min(30, baseline.poi_density);
  const lightingBonus = baseline.lighting_density * 20;
  const transitBonus = baseline.transit_access * 0.2;
  
  const initialScore = Math.min(75, Math.round(30 + densityBonus + lightingBonus + transitBonus));
  
  return {
    score: initialScore,
    level: scoreToLevel(initialScore),
    last_verified_at: null,
    verification_count: 0,
    decay_factor: 0.98, // 2% daily decay
    anomaly_detected: false,
  };
}

export function scoreToLevel(score: number): ConfidenceLevel {
  if (score >= 80) return 'HIGH';
  if (score >= 60) return 'MEDIUM';
  if (score >= 40) return 'LOW';
  if (score >= 20) return 'DEGRADED';
  return 'UNKNOWN';
}

// ============================================================================
// PACK GENERATION
// ============================================================================

export function generateCityPackV2(
  config: CityOSMConfig,
  baselines: ZoneBaseline[]
): CityPackV2 {
  const now = new Date().toISOString();
  
  const zones: Zone[] = baselines.map(baseline => {
    const texture = classifyTexture(baseline);
    const confidence = initializeConfidence(baseline);
    const zoneConfig = config.zones.find(z => z.id === baseline.zone_id);
    
    return {
      id: baseline.zone_id,
      name: zoneConfig?.name || baseline.zone_id,
      city_code: config.code,
      center: baseline.center,
      radius_m: baseline.radius_m,
      state: 'ACTIVE' as ZoneState,
      confidence,
      intel: {
        price_reports: 0,
        hassle_reports: 0,
        crowd_reports: 0,
        quiet_confirmations: 0,
        construction_reports: 0,
        total_intel: 0,
        last_intel_at: null,
        trust_weighted_score: 0,
      },
      texture,
      pricing: {
        coffee_local: null,
        coffee_tourist: null,
        beer_local: null,
        beer_tourist: null,
        meal_street: null,
        meal_restaurant: null,
        currency: config.currency,
        last_price_at: null,
        price_confidence: 0,
      },
      hazard: {
        active: false,
        report_count: 0,
      },
      baseline: {
        poi_count: baseline.pois.length,
        poi_density: baseline.poi_density,
        lighting_density: baseline.lighting_density,
        pedestrian_score: baseline.pedestrian_score,
        transit_access: baseline.transit_access,
        extracted_at: baseline.extracted_at,
      },
      pois: baseline.pois.slice(0, 50).map(poi => ({
        id: poi.id,
        name: poi.name,
        type: poi.type,
        lat: poi.lat,
        lon: poi.lon,
        opening_hours: poi.opening_hours,
      })),
      created_at: now,
      updated_at: now,
      pack_version: '2.0.0',
    };
  });
  
  const activeZones = zones.filter(z => z.state === 'ACTIVE').length;
  const degradedZones = zones.filter(z => z.state === 'DEGRADED').length;
  const offlineZones = zones.filter(z => z.state === 'OFFLINE').length;
  const avgConfidence = zones.reduce((sum, z) => sum + z.confidence.score, 0) / (zones.length || 1);
  
  return {
    version: '2.0.0',
    generated_at: now,
    generator: 'unmapped-os-packgen',
    city: {
      code: config.code,
      name: config.name,
      country: config.country,
      center: config.center,
      timezone: config.timezone,
      currency: config.currency,
    },
    emergency: config.emergency,
    zones,
    zone_count: zones.length,
    stats: {
      total_pois: zones.reduce((sum, z) => sum + z.pois.length, 0),
      total_intel: 0,
      average_confidence: Math.round(avgConfidence),
      active_zones: activeZones,
      degraded_zones: degradedZones,
      offline_zones: offlineZones,
    },
    freshness: {
      osm_extracted_at: now,
      intel_synced_at: null,
      confidence_calculated_at: now,
    },
  };
}
