/**
 * Manual Seed Loader v1
 * 
 * Loads controlled manual seed data for city packs.
 * This module handles ONLY data that cannot be derived from OSM:
 * - Emergency numbers
 * - Airport transport prices and options
 * - Price baselines (ranges only)
 * - Cultural facts and safety tips
 * 
 * STRICT LIMITS:
 * - 10-20 data points per city maximum
 * - Ranges only, never single prices
 * - No scraped data
 * - Human-verifiable information only
 */

import * as fs from 'fs';
import * as path from 'path';
import { CurrencyCode } from './schema_v1';

// =============================================================================
// TYPES
// =============================================================================

export interface ManualSeedMeta {
  city_slug: string;
  city_name: string;
  country: string;
  last_updated: string;
  updated_by: string;
  data_points: number;
  notes?: string;
}

export interface EmergencyNumbers {
  police: string;
  ambulance: string;
  fire: string;
  tourist_police?: string | null;
  english_helpline?: string;
}

export interface ElectricalInfo {
  voltage: number;
  frequency: number;
  plug_types: string[];
  notes?: string;
}

export interface PriceRange {
  min: number;
  max: number;
  typical: number;
  currency: string;
  notes?: string;
}

export interface TransportOption {
  type: string;
  name: string;
  price_min: number;
  price_max: number;
  duration_min: number;
  duration_max: number;
  notes?: string;
}

export interface AirportInfo {
  iata_code: string;
  name: string;
  distance_to_center_km: number;
  taxi_to_center: PriceRange;
  legit_transport: TransportOption[];
  scam_warnings: string[];
  exit_tips: string[];
}

export interface TippingInfo {
  expected: boolean;
  typical_percent: number;
  notes?: string;
}

export interface PaymentInfo {
  cash_preferred: boolean;
  card_acceptance: 'LOW' | 'LOW_TO_MEDIUM' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  mobile_payment: string[];
  atm_notes?: string;
}

export interface CulturalFacts {
  tipping: TippingInfo;
  payment: PaymentInfo;
  etiquette: string[];
  scam_warnings: string[];
  safety_tips: string[];
}

export interface PriceBaselines {
  coffee: PriceRange;
  beer: PriceRange;
  street_meal: PriceRange;
  restaurant_meal: PriceRange;
  local_transport: PriceRange;
}

export interface ManualSeed {
  $schema?: string;
  _meta: ManualSeedMeta;
  emergency: EmergencyNumbers;
  electrical: ElectricalInfo;
  airports: AirportInfo[];
  price_baselines: PriceBaselines;
  cultural_facts: CulturalFacts;
}

// =============================================================================
// VALIDATION
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a manual seed file
 */
export function validateManualSeed(seed: ManualSeed): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Meta validation
  if (!seed._meta?.city_slug) {
    errors.push('Missing city_slug in _meta');
  }
  if (!seed._meta?.last_updated) {
    errors.push('Missing last_updated in _meta');
  }

  // Emergency validation
  if (!seed.emergency?.police) {
    errors.push('Missing emergency police number');
  }
  if (!seed.emergency?.ambulance) {
    errors.push('Missing emergency ambulance number');
  }

  // Airport validation
  if (!seed.airports || seed.airports.length === 0) {
    errors.push('At least one airport required');
  } else {
    seed.airports.forEach((airport, idx) => {
      if (!airport.iata_code) {
        errors.push(`Airport ${idx}: missing IATA code`);
      }
      if (!airport.taxi_to_center) {
        errors.push(`Airport ${idx}: missing taxi price range`);
      } else {
        validatePriceRange(airport.taxi_to_center, `Airport ${idx} taxi`, errors, warnings);
      }
      if (!airport.legit_transport || airport.legit_transport.length === 0) {
        warnings.push(`Airport ${airport.iata_code}: no transport options listed`);
      }
    });
  }

  // Price baselines validation
  if (!seed.price_baselines) {
    errors.push('Missing price_baselines');
  } else {
    const required = ['coffee', 'beer', 'street_meal', 'restaurant_meal', 'local_transport'];
    required.forEach(key => {
      const baseline = (seed.price_baselines as any)[key];
      if (!baseline) {
        errors.push(`Missing price baseline: ${key}`);
      } else {
        validatePriceRange(baseline, key, errors, warnings);
      }
    });
  }

  // Data points check
  if (seed._meta?.data_points > 25) {
    warnings.push(`Data points (${seed._meta.data_points}) exceed recommended maximum of 25`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validatePriceRange(
  range: PriceRange,
  context: string,
  errors: string[],
  warnings: string[]
): void {
  if (range.min === undefined || range.max === undefined) {
    errors.push(`${context}: price range must have min and max`);
  }
  if (range.min > range.max) {
    errors.push(`${context}: min price (${range.min}) > max price (${range.max})`);
  }
  if (range.typical && (range.typical < range.min || range.typical > range.max)) {
    warnings.push(`${context}: typical price outside min-max range`);
  }
  if (!range.currency) {
    errors.push(`${context}: missing currency`);
  }
}

// =============================================================================
// LOADER
// =============================================================================

const MANUAL_SEEDS_DIR = path.join(__dirname, '../../data/manual-seeds');

/**
 * Load manual seed for a city
 */
export function loadManualSeed(citySlug: string): ManualSeed | null {
  const filePath = path.join(MANUAL_SEEDS_DIR, `${citySlug}.json`);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`[ManualSeed] No manual seed found for: ${citySlug}`);
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const seed: ManualSeed = JSON.parse(content);
    
    // Validate
    const validation = validateManualSeed(seed);
    if (!validation.valid) {
      console.error(`[ManualSeed] Validation failed for ${citySlug}:`);
      validation.errors.forEach(e => console.error(`  - ${e}`));
      return null;
    }
    
    if (validation.warnings.length > 0) {
      console.warn(`[ManualSeed] Warnings for ${citySlug}:`);
      validation.warnings.forEach(w => console.warn(`  - ${w}`));
    }

    return seed;
  } catch (error) {
    console.error(`[ManualSeed] Error loading ${citySlug}:`, error);
    return null;
  }
}

/**
 * List all available manual seeds
 */
export function listAvailableSeeds(): string[] {
  if (!fs.existsSync(MANUAL_SEEDS_DIR)) {
    return [];
  }
  
  return fs.readdirSync(MANUAL_SEEDS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
}

/**
 * Validate all manual seeds
 */
export function validateAllSeeds(): Map<string, ValidationResult> {
  const results = new Map<string, ValidationResult>();
  const seeds = listAvailableSeeds();
  
  for (const slug of seeds) {
    try {
      const filePath = path.join(MANUAL_SEEDS_DIR, `${slug}.json`);
      const content = fs.readFileSync(filePath, 'utf-8');
      const seed: ManualSeed = JSON.parse(content);
      results.set(slug, validateManualSeed(seed));
    } catch (error) {
      results.set(slug, {
        valid: false,
        errors: [`Failed to parse: ${error}`],
        warnings: [],
      });
    }
  }
  
  return results;
}

// =============================================================================
// TRANSFORMERS - Convert manual seed to pack format
// =============================================================================

/**
 * Convert manual seed airport info to pack format
 */
export function transformAirportIntel(seed: ManualSeed): any {
  const primary = seed.airports[0];
  if (!primary) return null;

  return {
    iata_code: primary.iata_code,
    name: primary.name,
    distance_km: primary.distance_to_center_km,
    taxi_range: {
      min: primary.taxi_to_center.min,
      max: primary.taxi_to_center.max,
      currency: primary.taxi_to_center.currency as CurrencyCode,
      notes: primary.taxi_to_center.notes,
    },
    transport_options: primary.legit_transport.map(t => ({
      type: t.type,
      name: t.name,
      price_range: {
        min: t.price_min,
        max: t.price_max,
        currency: primary.taxi_to_center.currency,
      },
      duration_range: {
        min_minutes: t.duration_min,
        max_minutes: t.duration_max,
      },
      notes: t.notes,
    })),
    scam_warnings: primary.scam_warnings,
    exit_tips: primary.exit_tips,
    confidence: 0.85, // Manual data = medium-high confidence
    last_verified: seed._meta.last_updated,
  };
}

/**
 * Convert manual seed price baselines to pack format
 */
export function transformPriceBaselines(seed: ManualSeed): any {
  const baselines = seed.price_baselines;
  const currency = baselines.coffee.currency as CurrencyCode;

  return {
    currency,
    updated_at: seed._meta.last_updated,
    items: {
      coffee: {
        local_min: baselines.coffee.min,
        local_max: baselines.coffee.max,
        tourist_min: Math.round(baselines.coffee.typical * 1.2),
        tourist_max: baselines.coffee.max,
        scam_threshold: Math.round(baselines.coffee.max * 1.5),
        notes: baselines.coffee.notes,
      },
      beer: {
        local_min: baselines.beer.min,
        local_max: baselines.beer.max,
        tourist_min: Math.round(baselines.beer.typical * 1.2),
        tourist_max: baselines.beer.max,
        scam_threshold: Math.round(baselines.beer.max * 1.5),
        notes: baselines.beer.notes,
      },
      street_meal: {
        local_min: baselines.street_meal.min,
        local_max: baselines.street_meal.max,
        tourist_min: Math.round(baselines.street_meal.typical * 1.2),
        tourist_max: baselines.street_meal.max,
        scam_threshold: Math.round(baselines.street_meal.max * 1.5),
        notes: baselines.street_meal.notes,
      },
      restaurant_meal: {
        local_min: baselines.restaurant_meal.min,
        local_max: baselines.restaurant_meal.max,
        tourist_min: Math.round(baselines.restaurant_meal.typical * 1.3),
        tourist_max: baselines.restaurant_meal.max,
        scam_threshold: Math.round(baselines.restaurant_meal.max * 2),
        notes: baselines.restaurant_meal.notes,
      },
      taxi_per_km: {
        local_min: Math.round(baselines.local_transport.min * 0.5),
        local_max: Math.round(baselines.local_transport.typical),
        tourist_min: baselines.local_transport.typical,
        tourist_max: baselines.local_transport.max,
        scam_threshold: Math.round(baselines.local_transport.max * 2),
        notes: baselines.local_transport.notes,
      },
    },
    confidence: 0.8,
    source: 'manual_seed',
  };
}

/**
 * Convert manual seed cultural facts to pack format
 */
export function transformCulturalFacts(seed: ManualSeed): string[] {
  const facts: string[] = [];
  const cf = seed.cultural_facts;

  // Tipping
  if (cf.tipping) {
    if (!cf.tipping.expected) {
      facts.push(`Tipping is not expected. ${cf.tipping.notes || ''}`);
    } else {
      facts.push(`Tipping ${cf.tipping.typical_percent}% is customary. ${cf.tipping.notes || ''}`);
    }
  }

  // Payment
  if (cf.payment) {
    const pref = cf.payment.cash_preferred ? 'Cash preferred' : 'Cards widely accepted';
    facts.push(`${pref}. ${cf.payment.atm_notes || ''}`);
    if (cf.payment.mobile_payment.length > 0) {
      facts.push(`Mobile payment: ${cf.payment.mobile_payment.join(', ')}`);
    }
  }

  // Add etiquette items
  cf.etiquette?.slice(0, 3).forEach(e => facts.push(e));

  return facts.slice(0, 10); // Max 10 cultural facts
}

/**
 * Extract scam warnings from manual seed
 */
export function extractScamWarnings(seed: ManualSeed): string[] {
  const warnings: string[] = [];
  
  // Airport scam warnings
  seed.airports.forEach(a => {
    warnings.push(...(a.scam_warnings || []));
  });
  
  // Cultural scam warnings
  warnings.push(...(seed.cultural_facts?.scam_warnings || []));
  
  // Dedupe
  return [...new Set(warnings)].slice(0, 15);
}

/**
 * Extract safety tips from manual seed
 */
export function extractSafetyTips(seed: ManualSeed): string[] {
  return seed.cultural_facts?.safety_tips?.slice(0, 10) || [];
}

// =============================================================================
// CLI
// =============================================================================

if (require.main === module) {
  console.log('=== Manual Seed Validator ===\n');
  
  const results = validateAllSeeds();
  let allValid = true;
  
  for (const [slug, result] of results) {
    const status = result.valid ? '✓' : '✗';
    console.log(`${status} ${slug}`);
    
    if (!result.valid) {
      allValid = false;
      result.errors.forEach(e => console.log(`    ERROR: ${e}`));
    }
    
    result.warnings.forEach(w => console.log(`    WARN: ${w}`));
  }
  
  console.log('\n=== Summary ===');
  console.log(`Total seeds: ${results.size}`);
  console.log(`Valid: ${[...results.values()].filter(r => r.valid).length}`);
  console.log(`Invalid: ${[...results.values()].filter(r => !r.valid).length}`);
  
  process.exit(allValid ? 0 : 1);
}
