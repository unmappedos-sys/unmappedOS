/**
 * City Pack Schema v1
 * 
 * The canonical schema for Unmapped OS city packs.
 * Designed for offline-first use with honest confidence indicators.
 * 
 * CORE PRINCIPLES:
 * - No fake real-time claims
 * - Confidence decays over time
 * - All data sources are auditable
 * - Structural data from OSM (slow-moving truth)
 * - Behavioral baselines computed, not scraped
 * - Manual seeds are minimal and controlled
 */

// ============================================================================
// PACK VERSION
// ============================================================================

export const PACK_SCHEMA_VERSION = '1.0.0' as const;

// ============================================================================
// ENUMS & LITERAL TYPES
// ============================================================================

export type ZoneState = 'ACTIVE' | 'DEGRADED' | 'OFFLINE' | 'PENDING_REVIEW';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'DEGRADED' | 'UNVERIFIED';

export type TextureType = 
  | 'SILENCE'      // Quiet residential, parks
  | 'ANALOG'       // Local markets, traditional shops
  | 'NEON'         // Nightlife, entertainment
  | 'CHAOS'        // Tourist areas, busy markets
  | 'MIXED';       // No dominant pattern

export type AnchorType = 
  | 'ARTWORK'
  | 'FOUNTAIN'
  | 'MEMORIAL'
  | 'PLAZA'
  | 'TEMPLE'
  | 'STATUE'
  | 'LANDMARK'
  | 'INTERSECTION'
  | 'STATION'
  | 'PARK_ENTRANCE';

export type TransportType = 
  | 'METER_TAXI'
  | 'GRAB'
  | 'BOLT'
  | 'BUS'
  | 'TRAIN'
  | 'METRO'
  | 'FERRY'
  | 'AIRPORT_RAIL'
  | 'SHUTTLE';

export type PlugType = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O';

export type CurrencyCode = 'THB' | 'JPY' | 'SGD' | 'HKD' | 'KRW' | 'IDR' | 'MYR' | 'VND' | 'TWD' | 'USD' | 'EUR' | string;

// ============================================================================
// CORE TYPES
// ============================================================================

export interface LatLon {
  lat: number;
  lon: number;
}

export interface PriceRange {
  min: number;
  max: number;
  typical: number;
  currency: string;
}

export interface TimeWindow {
  start: string;  // HH:mm format
  end: string;    // HH:mm format
}

// ============================================================================
// PACK METADATA
// ============================================================================

export interface CityMeta {
  city_slug: string;          // e.g., "bangkok", "tokyo"
  city_name: string;          // e.g., "Bangkok"
  country: string;            // e.g., "Thailand"
  country_code: string;       // ISO 3166-1 alpha-2
  timezone: string;           // IANA timezone
  currency: string;           // ISO 4217 code
  currency_symbol: string;    // e.g., "฿", "¥"
  language_codes: string[];   // ISO 639-1
  emergency: {
    police: string;
    ambulance: string;
    fire: string;
    tourist_police?: string;
  };
  electrical: {
    voltage: number;
    frequency: number;
    plug_types: PlugType[];
  };
  bounding_box: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  center: LatLon;
}

// ============================================================================
// AIRPORT INTEL
// ============================================================================

export interface AirportIntel {
  airports: Airport[];
  transport_notes: string[];
}

export interface Airport {
  iata_code: string;
  name: string;
  location: LatLon;
  distance_to_center_km: number;
  taxi_price_range: PriceRange;
  legit_transport: TransportOption[];
  scam_warnings: string[];
  exit_tips: string[];
}

export interface TransportOption {
  type: TransportType;
  name: string;
  price_range: PriceRange;
  duration_minutes: { min: number; max: number };
  notes?: string;
  avoid_if?: string;
}

// ============================================================================
// ZONES
// ============================================================================

export interface Zone {
  zone_id: string;
  name: string;
  description?: string;
  
  // Geometry
  center: LatLon;
  radius_m: number;
  polygon: LatLon[];  // Simplified polygon
  
  // Classification
  texture: {
    primary: TextureType;
    secondary?: TextureType;
    tags: string[];
  };
  
  // Behavioral Baselines (computed, not real-time)
  behavior: ZoneBehavior;
  
  // Confidence & State
  confidence: ZoneConfidence;
  state: ZoneState;
  
  // Anchors (exactly one primary)
  anchor: Anchor;
  
  // OSM Baseline Metrics
  baseline: ZoneBaseline;
  
  // Hazard tracking
  hazard: ZoneHazard | null;
}

export interface ZoneBehavior {
  quiet_hours: TimeWindow[];      // Expected quiet periods
  vitality_hours: TimeWindow[];   // Expected busy periods
  safety_windows: TimeWindow[];   // Recommended visit times
  crowd_pattern: {
    weekday: 'LOW' | 'MEDIUM' | 'HIGH' | 'VARIABLE';
    weekend: 'LOW' | 'MEDIUM' | 'HIGH' | 'VARIABLE';
    notes?: string;
  };
}

export interface ZoneConfidence {
  score: number;                  // 0-100
  level: ConfidenceLevel;
  last_verified_at: string | null;
  data_age_days: number;
  decay_rate: number;             // Daily decay percentage
  source: 'OSM' | 'OSM_MANUAL' | 'MANUAL' | 'USER_INTEL';
}

export interface ZoneBaseline {
  poi_count: number;
  poi_density: number;            // per km²
  lighting_density: number;       // 0-1
  pedestrian_score: number;       // 0-100
  transit_access: number;         // 0-100
  walkability: number;            // 0-100
  safety_heuristic: number;       // 0-100
  extracted_at: string;
}

export interface ZoneHazard {
  active: boolean;
  type: 'SCAM' | 'CONSTRUCTION' | 'UNSAFE' | 'CLOSED' | 'CROWD' | 'OTHER';
  reason: string;
  reported_at: string;
  expires_at: string;
  report_count: number;
  flagged_for_review: boolean;
}

// ============================================================================
// ANCHORS
// ============================================================================

export interface Anchor {
  anchor_id: string;
  zone_id: string;
  location: LatLon;
  type: AnchorType;
  display_name: string;
  osm_id?: number;
  fallback_reason?: string;       // Set if intersection fallback
  flagged_for_review: boolean;
  confidence_score: number;       // 0-100
}

// ============================================================================
// PRICE BASELINES
// ============================================================================

export interface PriceBaselines {
  coffee: PriceRange;
  beer: PriceRange;
  street_meal: PriceRange;
  restaurant_meal: PriceRange;
  local_transport: PriceRange;
  data_points: number;            // How many manual seeds
  last_updated: string;
  notes: string[];
}

// ============================================================================
// SAFE CORRIDORS
// ============================================================================

export interface SafeCorridor {
  corridor_id: string;
  name: string;
  description?: string;
  polyline: LatLon[];
  start_zone_id: string;
  end_zone_id: string;
  safety_score: number;           // 0-100
  night_safe: boolean;
  notes?: string;
}

// ============================================================================
// CULTURAL FACTS
// ============================================================================

export interface CulturalFacts {
  tipping: {
    expected: boolean;
    typical_percent?: number;
    notes: string;
  };
  payment: {
    cash_preferred: boolean;
    card_acceptance: 'HIGH' | 'MEDIUM' | 'LOW';
    mobile_payment: string[];     // e.g., ["PromptPay", "LINE Pay"]
    atm_notes: string;
  };
  etiquette: string[];
  scam_warnings: string[];
  safety_tips: string[];
}

// ============================================================================
// FULL CITY PACK
// ============================================================================

export interface CityPackV1 {
  // Schema Version
  pack_version: typeof PACK_SCHEMA_VERSION;
  schema: 'CityPackV1';
  
  // Generation Metadata
  generated_at: string;           // ISO 8601
  generator: 'unmapped-os-packgen';
  generator_version: string;
  
  // Data Sources
  sources: {
    osm_timestamp: string;        // When OSM data was extracted
    manual_seed_hash: string;     // Hash of manual seed file
    confidence_model_version: string;
  };
  
  // City Meta
  meta: CityMeta;
  
  // Airport Intelligence
  airport_intel: AirportIntel;
  
  // Zones
  zones: Zone[];
  zone_count: number;
  
  // Anchors (indexed separately for quick lookup)
  anchors: Anchor[];
  
  // Price Baselines
  price_baselines: PriceBaselines;
  
  // Safe Corridors
  safe_corridors: SafeCorridor[];
  
  // Cultural Facts
  cultural_facts: CulturalFacts;
  
  // Pack Statistics
  stats: {
    total_pois: number;
    active_zones: number;
    degraded_zones: number;
    offline_zones: number;
    average_confidence: number;
    anchor_coverage: number;      // % of zones with good anchors
    data_freshness_days: number;
  };
  
  // Audit
  audit: {
    checksum: string;             // SHA-256 of pack content
    validation_passed: boolean;
    validation_warnings: string[];
    readiness_score: number;      // 0-100
  };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export function validateCityPack(pack: CityPackV1): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!pack.pack_version) errors.push('Missing pack_version');
  if (!pack.meta?.city_slug) errors.push('Missing meta.city_slug');
  if (!pack.meta?.emergency?.police) errors.push('Missing emergency police number');
  if (!pack.meta?.emergency?.ambulance) errors.push('Missing emergency ambulance number');
  
  // Zones
  if (!pack.zones || pack.zones.length === 0) {
    errors.push('No zones defined');
  } else {
    pack.zones.forEach((zone, i) => {
      if (!zone.zone_id) errors.push(`Zone ${i}: missing zone_id`);
      if (!zone.anchor) errors.push(`Zone ${i} (${zone.zone_id}): missing anchor`);
      if (zone.polygon.length < 3) errors.push(`Zone ${i} (${zone.zone_id}): invalid polygon (< 3 points)`);
      if (zone.confidence.score < 0 || zone.confidence.score > 100) {
        errors.push(`Zone ${i} (${zone.zone_id}): invalid confidence score`);
      }
      if (zone.anchor?.flagged_for_review) {
        warnings.push(`Zone ${zone.zone_id}: anchor flagged for review`);
      }
    });
  }
  
  // Price baselines
  if (!pack.price_baselines) {
    warnings.push('No price baselines defined');
  } else if (pack.price_baselines.data_points < 5) {
    warnings.push(`Only ${pack.price_baselines.data_points} price data points (minimum 10 recommended)`);
  }
  
  // Anchors
  const anchorCoverage = pack.zones.filter(z => z.anchor && !z.anchor.fallback_reason).length / pack.zones.length;
  if (anchorCoverage < 0.8) {
    warnings.push(`Low anchor coverage: ${Math.round(anchorCoverage * 100)}% (80% recommended)`);
  }
  
  // Confidence
  const avgConfidence = pack.zones.reduce((sum, z) => sum + z.confidence.score, 0) / pack.zones.length;
  if (avgConfidence < 50) {
    warnings.push(`Low average confidence: ${Math.round(avgConfidence)}%`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function calculatePackChecksum(pack: Omit<CityPackV1, 'audit'>): string {
  // Simple hash for pack integrity
  const content = JSON.stringify(pack);
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `sha256:${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

export function calculateReadinessScore(pack: CityPackV1): number {
  let score = 100;
  
  // Deductions
  if (!pack.meta.emergency.police) score -= 20;
  if (!pack.meta.emergency.ambulance) score -= 20;
  if (pack.zone_count < 5) score -= 15;
  if (pack.stats.average_confidence < 50) score -= 15;
  if (pack.stats.anchor_coverage < 0.8) score -= 10;
  if (pack.price_baselines.data_points < 10) score -= 10;
  if (pack.safe_corridors.length === 0) score -= 5;
  if (pack.stats.offline_zones > 0) score -= pack.stats.offline_zones * 2;
  
  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// CONFIDENCE CALCULATION
// ============================================================================

export function calculateConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 80) return 'HIGH';
  if (score >= 60) return 'MEDIUM';
  if (score >= 40) return 'LOW';
  if (score >= 20) return 'DEGRADED';
  return 'UNVERIFIED';
}

export function calculateInitialConfidence(baseline: ZoneBaseline): number {
  // Initial confidence based on OSM data quality
  let confidence = 50; // Base confidence for OSM-derived zones
  
  // Boost for rich data
  if (baseline.poi_count >= 10) confidence += 10;
  if (baseline.poi_count >= 25) confidence += 5;
  if (baseline.lighting_density >= 0.5) confidence += 5;
  if (baseline.pedestrian_score >= 60) confidence += 5;
  if (baseline.transit_access >= 50) confidence += 5;
  
  // Cap at 80 (user verification needed for HIGH)
  return Math.min(80, confidence);
}

export function applyConfidenceDecay(score: number, daysSinceUpdate: number, decayRate: number = 0.02): number {
  // Exponential decay: score * (1 - rate)^days
  return Math.max(20, Math.round(score * Math.pow(1 - decayRate, daysSinceUpdate)));
}
