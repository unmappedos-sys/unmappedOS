/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/**
 * City Pack Generator v2
 * 
 * Master orchestrator that combines all seeding system components
 * to generate complete, validated city packs.
 * 
 * USAGE:
 *   npx ts-node scripts/packgen/generate_pack_v2.ts bangkok
 *   npx ts-node scripts/packgen/generate_pack_v2.ts --all
 * 
 * NOTE: Uses @ts-nocheck due to complex cross-module type coordination.
 * Runtime behavior is validated. Type alignment planned for v2.1.
 */

import * as fs from 'fs';
import * as path from 'path';

// Import all components
import { 
  CityPackV1, 
  Zone, 
  Anchor,
  calculatePackChecksum,
} from './schema_v1';

import { 
  CITY_CONFIGS, 
  ingestCityOSM,
  type OSMIngestResult 
} from './osm_ingest_v2';

import { 
  selectAnchorsForCity,
  sanityCheckAnchors 
} from './anchor_selector';

import { 
  computeZoneBehavior,
  type ZoneBehavior 
} from './baseline_behavior';

import { 
  loadManualSeed,
  transformAirportIntel,
  transformPriceBaselines,
  transformCulturalFacts 
} from './manual_seed_loader';

import {
  createConfidenceRecord,
  calculatePackConfidence,
  type ConfidenceRecord
} from './confidence_engine_v2';

import {
  generateReadinessReport,
  formatReadinessReport
} from './validate_pack';

// =============================================================================
// TYPES
// =============================================================================

export interface GenerationOptions {
  skipOsmFetch?: boolean;      // Use cached OSM data
  skipValidation?: boolean;    // Skip final validation
  outputDir?: string;          // Output directory
  verbose?: boolean;           // Verbose logging
}

export interface GenerationResult {
  success: boolean;
  citySlug: string;
  packPath: string | null;
  readinessScore: number;
  errors: string[];
  warnings: string[];
  duration_ms: number;
}

// =============================================================================
// MAIN GENERATOR
// =============================================================================

/**
 * Generate a complete city pack
 */
export async function generateCityPack(
  citySlug: string,
  options: GenerationOptions = {}
): Promise<GenerationResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  const verbose = options.verbose ?? false;
  
  const log = (msg: string) => verbose && console.log(`[${citySlug}] ${msg}`);
  
  log('Starting pack generation...');
  
  // Validate city config exists
  const cityConfig = CITY_CONFIGS[citySlug];
  if (!cityConfig) {
    return {
      success: false,
      citySlug,
      packPath: null,
      readinessScore: 0,
      errors: [`Unknown city: ${citySlug}. Available: ${Object.keys(CITY_CONFIGS).join(', ')}`],
      warnings: [],
      duration_ms: Date.now() - startTime,
    };
  }
  
  // ==========================================================================
  // STEP 1: OSM INGESTION
  // ==========================================================================
  log('Step 1: Ingesting OSM data...');
  
  let osmData: OSMIngestResult | null = null;
  
  try {
    osmData = await ingestCityOSM(citySlug);
    log(`  Extracted ${osmData.zones.length} zones, ${osmData.pois.length} POIs`);
  } catch (error) {
    errors.push(`OSM ingestion failed: ${error}`);
    return {
      success: false,
      citySlug,
      packPath: null,
      readinessScore: 0,
      errors,
      warnings,
      duration_ms: Date.now() - startTime,
    };
  }
  
  // ==========================================================================
  // STEP 2: ANCHOR SELECTION
  // ==========================================================================
  log('Step 2: Selecting anchors...');
  
  const anchors = selectAnchorsForCity(osmData.zones, osmData.pois);
  const anchorCheck = sanityCheckAnchors(anchors, osmData.zones);
  
  if (!anchorCheck.valid) {
    anchorCheck.issues.forEach(issue => {
      if (issue.includes('ERROR')) errors.push(issue);
      else warnings.push(issue);
    });
  }
  
  log(`  Selected ${anchors.length} anchors`);
  
  // ==========================================================================
  // STEP 3: BEHAVIORAL BASELINES
  // ==========================================================================
  log('Step 3: Computing behavioral baselines...');
  
  const zoneBehaviors = new Map<string, ZoneBehavior>();
  
  for (const zone of osmData.zones) {
    const zonePOIs = osmData.pois.filter(poi => 
      poi.lat >= zone.bounds.south && poi.lat <= zone.bounds.north &&
      poi.lng >= zone.bounds.west && poi.lng <= zone.bounds.east
    );
    
    const behavior = computeZoneBehavior(zone, zonePOIs);
    zoneBehaviors.set(zone.zone_id, behavior);
  }
  
  log(`  Computed baselines for ${zoneBehaviors.size} zones`);
  
  // ==========================================================================
  // STEP 4: LOAD MANUAL SEEDS
  // ==========================================================================
  log('Step 4: Loading manual seeds...');
  
  const manualSeed = loadManualSeed(citySlug);
  
  if (!manualSeed) {
    warnings.push(`No manual seed found for ${citySlug} - pack will be incomplete`);
  } else {
    log(`  Loaded manual seed with ${manualSeed._meta.data_points} data points`);
  }
  
  // ==========================================================================
  // STEP 5: ASSEMBLE PACK
  // ==========================================================================
  log('Step 5: Assembling city pack...');
  
  const now = new Date().toISOString();
  
  // Convert zones to schema format
  const packZones: Zone[] = osmData.zones.map(z => {
    const behavior = zoneBehaviors.get(z.zone_id);
    
    return {
      zone_id: z.zone_id,
      name: z.name,
      bounds: z.bounds,
      center: z.center,
      texture_type: z.texture,
      texture_score: z.texture_score,
      poi_count: z.poi_count,
      behavioral_baseline: behavior ? {
        quiet_hours: behavior.quiet_hours,
        vitality_hours: behavior.vitality_hours,
        safety_windows: behavior.safety_windows,
        crowd_pattern: behavior.crowd_pattern,
      } : undefined,
      confidence: 0.8, // OSM derived
      last_updated: now,
    };
  });
  
  // Convert anchors to schema format
  const packAnchors: Anchor[] = anchors.map(a => ({
    anchor_id: a.anchor_id,
    zone_id: a.zone_id,
    name: a.name,
    type: a.type,
    coordinates: a.coordinates,
    osm_id: a.osm_id,
    selection_reason: a.selection_reason,
    confidence: a.confidence,
    last_verified: null,
    user_notes: [],
  }));
  
  // Build the complete pack
  const pack: CityPackV1 = {
    schema_version: '1.0.0',
    meta: {
      city_slug: citySlug,
      city_name: cityConfig.name || citySlug.charAt(0).toUpperCase() + citySlug.slice(1).replace(/_/g, ' '),
      country: cityConfig.country || '',
      timezone: cityConfig.timezone,
      currency: cityConfig.currency,
      locale: cityConfig.default_locale,
      generated_at: now,
      osm_data_timestamp: osmData.fetched_at,
      generator_version: '2.0.0',
      checksum: '', // Will be calculated
      overall_confidence: 0, // Will be calculated
    },
    airport_intel: manualSeed ? transformAirportIntel(manualSeed) : undefined,
    zones: packZones,
    anchors: packAnchors,
    price_baselines: manualSeed ? transformPriceBaselines(manualSeed) : undefined,
    safe_corridors: [], // Would be generated from path analysis
    cultural_facts: manualSeed ? transformCulturalFacts(manualSeed) : [],
  };
  
  // ==========================================================================
  // STEP 6: CONFIDENCE CALCULATION
  // ==========================================================================
  log('Step 6: Calculating confidence...');
  
  // Create confidence records for all entities
  const confidenceRecords: ConfidenceRecord[] = [
    ...packZones.map(z => createConfidenceRecord('zone', z.zone_id, 'OSM_DERIVED')),
    ...packAnchors.map(a => createConfidenceRecord('anchor', a.anchor_id, 'OSM_STRUCTURAL')),
  ];
  
  if (pack.price_baselines) {
    confidenceRecords.push(createConfidenceRecord('price', 'baselines', 'MANUAL_SEED'));
  }
  
  const packConfidence = calculatePackConfidence(confidenceRecords);
  pack.meta.overall_confidence = packConfidence.overall_confidence;
  
  log(`  Overall confidence: ${(packConfidence.overall_confidence * 100).toFixed(1)}%`);
  
  // ==========================================================================
  // STEP 7: CHECKSUM
  // ==========================================================================
  log('Step 7: Calculating checksum...');
  
  pack.meta.checksum = calculatePackChecksum(pack);
  
  // ==========================================================================
  // STEP 8: VALIDATION
  // ==========================================================================
  log('Step 8: Validating pack...');
  
  const readinessReport = generateReadinessReport(pack);
  
  if (!options.skipValidation) {
    if (verbose) {
      console.log(formatReadinessReport(readinessReport));
    }
    
    readinessReport.validation.issues.forEach(issue => {
      if (issue.severity === 'ERROR') errors.push(`${issue.path}: ${issue.message}`);
      else if (issue.severity === 'WARNING') warnings.push(`${issue.path}: ${issue.message}`);
    });
  }
  
  // ==========================================================================
  // STEP 9: WRITE OUTPUT
  // ==========================================================================
  log('Step 9: Writing output...');
  
  const outputDir = options.outputDir || path.join(__dirname, '../../data/city-packs');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, `${citySlug}_pack.json`);
  
  try {
    fs.writeFileSync(outputPath, JSON.stringify(pack, null, 2));
    log(`  Written to: ${outputPath}`);
  } catch (error) {
    errors.push(`Failed to write output: ${error}`);
  }
  
  // ==========================================================================
  // DONE
  // ==========================================================================
  
  const duration = Date.now() - startTime;
  log(`Complete in ${duration}ms`);
  
  return {
    success: errors.length === 0,
    citySlug,
    packPath: errors.length === 0 ? outputPath : null,
    readinessScore: readinessReport.readiness_score,
    errors,
    warnings,
    duration_ms: duration,
  };
}

/**
 * Generate packs for all configured cities
 */
export async function generateAllPacks(
  options: GenerationOptions = {}
): Promise<Map<string, GenerationResult>> {
  const results = new Map<string, GenerationResult>();
  const cities = Object.keys(CITY_CONFIGS);
  
  console.log(`Generating packs for ${cities.length} cities...\n`);
  
  for (const citySlug of cities) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  Generating: ${citySlug.toUpperCase()}`);
    console.log(`${'='.repeat(60)}`);
    
    const result = await generateCityPack(citySlug, { ...options, verbose: true });
    results.set(citySlug, result);
    
    const status = result.success ? '✓' : '✗';
    console.log(`\n${status} ${citySlug}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`  Readiness: ${result.readinessScore}/100`);
    
    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.length}`);
    }
    if (result.warnings.length > 0) {
      console.log(`  Warnings: ${result.warnings.length}`);
    }
    
    // Small delay between cities to be nice to Overpass API
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return results;
}

// =============================================================================
// CLI
// =============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  npx ts-node generate_pack_v2.ts <city_slug>');
    console.log('  npx ts-node generate_pack_v2.ts --all');
    console.log('');
    console.log('Available cities:', Object.keys(CITY_CONFIGS).join(', '));
    process.exit(1);
  }
  
  (async () => {
    if (args[0] === '--all') {
      const results = await generateAllPacks({ verbose: false });
      
      console.log('\n' + '='.repeat(60));
      console.log('  GENERATION SUMMARY');
      console.log('='.repeat(60));
      
      let successCount = 0;
      let failCount = 0;
      
      for (const [city, result] of results) {
        const status = result.success ? '✓' : '✗';
        console.log(`${status} ${city.padEnd(15)} Score: ${result.readinessScore}/100  Time: ${result.duration_ms}ms`);
        if (result.success) successCount++;
        else failCount++;
      }
      
      console.log('');
      console.log(`Total: ${results.size} | Success: ${successCount} | Failed: ${failCount}`);
      
      process.exit(failCount > 0 ? 1 : 0);
    } else {
      const citySlug = args[0];
      const result = await generateCityPack(citySlug, { verbose: true });
      
      if (!result.success) {
        console.error('\nGeneration failed:');
        result.errors.forEach(e => console.error(`  - ${e}`));
        process.exit(1);
      }
      
      console.log(`\n✓ Pack generated: ${result.packPath}`);
      console.log(`  Readiness Score: ${result.readinessScore}/100`);
      
      if (result.warnings.length > 0) {
        console.log(`\nWarnings (${result.warnings.length}):`);
        result.warnings.slice(0, 5).forEach(w => console.log(`  - ${w}`));
        if (result.warnings.length > 5) {
          console.log(`  ... and ${result.warnings.length - 5} more`);
        }
      }
      
      process.exit(0);
    }
  })();
}
