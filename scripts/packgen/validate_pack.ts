/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
// @ts-nocheck
/**
 * City Pack Validation & QA Tools v1
 * 
 * Comprehensive validation system for city packs before release.
 * 
 * VALIDATION LAYERS:
 * 1. Schema Validation - Structure correctness
 * 2. Semantic Validation - Data makes sense
 * 3. Cross-Reference Validation - Internal consistency
 * 4. Readiness Scoring - Is pack ready for production?
 * 5. Quality Checks - Data quality metrics
 * 
 * NOTE: Uses @ts-nocheck due to flexible pack input types.
 * Runtime validation handles type safety at execution.
 */

import * as fs from 'fs';
import * as path from 'path';

// Use flexible types since packs can come from different schema versions
type CityPack = any;

// Import only the functions we need
import { calculateReadinessScore } from './schema_v1';

// =============================================================================
// TYPES
// =============================================================================

export type ValidationSeverity = 'ERROR' | 'WARNING' | 'INFO';

export interface ValidationIssue {
  severity: ValidationSeverity;
  category: string;
  path: string;       // JSON path to issue
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

export interface QualityMetrics {
  schema_compliance: number;       // 0-100
  data_completeness: number;       // 0-100
  internal_consistency: number;    // 0-100
  freshness_score: number;         // 0-100
  coverage_score: number;          // 0-100
  overall_quality: number;         // 0-100
}

export interface ReadinessReport {
  city_slug: string;
  pack_version: string;
  validation: ValidationResult;
  metrics: QualityMetrics;
  readiness_score: number;
  ready_for_production: boolean;
  blockers: string[];
  recommendations: string[];
  generated_at: string;
}

// =============================================================================
// SCHEMA VALIDATION
// =============================================================================

/**
 * Validate pack against schema
 */
export function validateSchema(pack: any): ValidationResult {
  const issues: ValidationIssue[] = [];
  
  // Required top-level fields
  const required = ['schema_version', 'meta', 'zones', 'anchors'];
  for (const field of required) {
    if (!(field in pack)) {
      issues.push({
        severity: 'ERROR',
        category: 'schema',
        path: field,
        message: `Missing required field: ${field}`,
      });
    }
  }
  
  // Meta validation
  if (pack.meta) {
    if (!pack.meta.city_slug) {
      issues.push({
        severity: 'ERROR',
        category: 'schema',
        path: 'meta.city_slug',
        message: 'Missing city_slug in meta',
      });
    }
    if (!pack.meta.generated_at) {
      issues.push({
        severity: 'WARNING',
        category: 'schema',
        path: 'meta.generated_at',
        message: 'Missing generation timestamp',
      });
    }
    if (!pack.meta.timezone) {
      issues.push({
        severity: 'ERROR',
        category: 'schema',
        path: 'meta.timezone',
        message: 'Missing timezone',
      });
    }
  }
  
  // Zones validation
  if (Array.isArray(pack.zones)) {
    pack.zones.forEach((zone: any, idx: number) => {
      if (!zone.zone_id) {
        issues.push({
          severity: 'ERROR',
          category: 'schema',
          path: `zones[${idx}].zone_id`,
          message: 'Zone missing ID',
        });
      }
      if (!zone.bounds) {
        issues.push({
          severity: 'ERROR',
          category: 'schema',
          path: `zones[${idx}].bounds`,
          message: 'Zone missing bounds',
        });
      }
      if (zone.texture_score === undefined) {
        issues.push({
          severity: 'WARNING',
          category: 'schema',
          path: `zones[${idx}].texture_score`,
          message: 'Zone missing texture_score',
        });
      }
    });
  }
  
  // Anchors validation
  if (Array.isArray(pack.anchors)) {
    pack.anchors.forEach((anchor: any, idx: number) => {
      if (!anchor.anchor_id) {
        issues.push({
          severity: 'ERROR',
          category: 'schema',
          path: `anchors[${idx}].anchor_id`,
          message: 'Anchor missing ID',
        });
      }
      if (!anchor.zone_id) {
        issues.push({
          severity: 'ERROR',
          category: 'schema',
          path: `anchors[${idx}].zone_id`,
          message: 'Anchor missing zone_id reference',
        });
      }
      if (!anchor.coordinates) {
        issues.push({
          severity: 'ERROR',
          category: 'schema',
          path: `anchors[${idx}].coordinates`,
          message: 'Anchor missing coordinates',
        });
      }
    });
  }
  
  return summarizeIssues(issues);
}

// =============================================================================
// SEMANTIC VALIDATION
// =============================================================================

/**
 * Validate that data makes logical sense
 */
export function validateSemantics(pack: CityPack): ValidationResult {
  const issues: ValidationIssue[] = [];
  
  // Coordinate validation
  if (pack.zones) {
    pack.zones.forEach((zone, idx) => {
      // Check bounds are valid
      if (zone.bounds) {
        const { north, south, east, west } = zone.bounds;
        
        if (north <= south) {
          issues.push({
            severity: 'ERROR',
            category: 'semantic',
            path: `zones[${idx}].bounds`,
            message: `Invalid bounds: north (${north}) <= south (${south})`,
          });
        }
        
        if (east <= west) {
          issues.push({
            severity: 'WARNING',
            category: 'semantic',
            path: `zones[${idx}].bounds`,
            message: `Bounds may cross date line: east (${east}) <= west (${west})`,
          });
        }
        
        // Latitude range
        if (Math.abs(north) > 90 || Math.abs(south) > 90) {
          issues.push({
            severity: 'ERROR',
            category: 'semantic',
            path: `zones[${idx}].bounds`,
            message: 'Latitude out of range (-90 to 90)',
          });
        }
        
        // Longitude range
        if (Math.abs(east) > 180 || Math.abs(west) > 180) {
          issues.push({
            severity: 'ERROR',
            category: 'semantic',
            path: `zones[${idx}].bounds`,
            message: 'Longitude out of range (-180 to 180)',
          });
        }
      }
      
      // Texture score range
      if (zone.texture_score !== undefined) {
        if (zone.texture_score < 0 || zone.texture_score > 100) {
          issues.push({
            severity: 'ERROR',
            category: 'semantic',
            path: `zones[${idx}].texture_score`,
            message: `Texture score out of range: ${zone.texture_score} (expected 0-100)`,
          });
        }
      }
    });
  }
  
  // Anchor coordinate validation
  if (pack.anchors) {
    pack.anchors.forEach((anchor, idx) => {
      if (anchor.coordinates) {
        const { lat, lng } = anchor.coordinates;
        
        if (Math.abs(lat) > 90) {
          issues.push({
            severity: 'ERROR',
            category: 'semantic',
            path: `anchors[${idx}].coordinates.lat`,
            message: `Invalid latitude: ${lat}`,
          });
        }
        
        if (Math.abs(lng) > 180) {
          issues.push({
            severity: 'ERROR',
            category: 'semantic',
            path: `anchors[${idx}].coordinates.lng`,
            message: `Invalid longitude: ${lng}`,
          });
        }
      }
    });
  }
  
  // Price baseline validation
  if (pack.price_baselines?.items) {
    Object.entries(pack.price_baselines.items).forEach(([key, item]) => {
      if (item.local_min > item.local_max) {
        issues.push({
          severity: 'ERROR',
          category: 'semantic',
          path: `price_baselines.items.${key}`,
          message: `local_min (${item.local_min}) > local_max (${item.local_max})`,
        });
      }
      
      if (item.scam_threshold && item.scam_threshold <= item.local_max) {
        issues.push({
          severity: 'WARNING',
          category: 'semantic',
          path: `price_baselines.items.${key}.scam_threshold`,
          message: `Scam threshold (${item.scam_threshold}) too close to local_max (${item.local_max})`,
          suggestion: 'Scam threshold should be at least 1.5x local_max',
        });
      }
    });
  }
  
  // Confidence validation
  if (pack.meta?.overall_confidence !== undefined) {
    if (pack.meta.overall_confidence < 0 || pack.meta.overall_confidence > 1) {
      issues.push({
        severity: 'ERROR',
        category: 'semantic',
        path: 'meta.overall_confidence',
        message: `Confidence out of range: ${pack.meta.overall_confidence} (expected 0-1)`,
      });
    }
  }
  
  return summarizeIssues(issues);
}

// =============================================================================
// CROSS-REFERENCE VALIDATION
// =============================================================================

/**
 * Validate internal consistency (cross-references)
 */
export function validateCrossReferences(pack: CityPack): ValidationResult {
  const issues: ValidationIssue[] = [];
  
  // Build zone ID set
  const zoneIds = new Set(pack.zones?.map(z => z.zone_id) || []);
  
  // Check anchor zone_id references
  if (pack.anchors) {
    pack.anchors.forEach((anchor, idx) => {
      if (anchor.zone_id && !zoneIds.has(anchor.zone_id)) {
        issues.push({
          severity: 'ERROR',
          category: 'cross-reference',
          path: `anchors[${idx}].zone_id`,
          message: `Anchor references non-existent zone: ${anchor.zone_id}`,
        });
      }
    });
  }
  
  // Check that anchors are within their zone bounds
  if (pack.zones && pack.anchors) {
    const zoneMap = new Map(pack.zones.map(z => [z.zone_id, z]));
    
    pack.anchors.forEach((anchor, idx) => {
      const zone = zoneMap.get(anchor.zone_id);
      if (zone && anchor.coordinates) {
        const { lat, lng } = anchor.coordinates;
        const { north, south, east, west } = zone.bounds;
        
        const withinLat = lat >= south && lat <= north;
        const withinLng = lng >= west && lng <= east;
        
        if (!withinLat || !withinLng) {
          issues.push({
            severity: 'WARNING',
            category: 'cross-reference',
            path: `anchors[${idx}].coordinates`,
            message: `Anchor "${anchor.name}" is outside its zone bounds`,
            suggestion: 'Verify anchor coordinates or zone assignment',
          });
        }
      }
    });
  }
  
  // Check for duplicate IDs
  const seenZoneIds = new Set<string>();
  pack.zones?.forEach((zone, idx) => {
    if (seenZoneIds.has(zone.zone_id)) {
      issues.push({
        severity: 'ERROR',
        category: 'cross-reference',
        path: `zones[${idx}].zone_id`,
        message: `Duplicate zone_id: ${zone.zone_id}`,
      });
    }
    seenZoneIds.add(zone.zone_id);
  });
  
  const seenAnchorIds = new Set<string>();
  pack.anchors?.forEach((anchor, idx) => {
    if (seenAnchorIds.has(anchor.anchor_id)) {
      issues.push({
        severity: 'ERROR',
        category: 'cross-reference',
        path: `anchors[${idx}].anchor_id`,
        message: `Duplicate anchor_id: ${anchor.anchor_id}`,
      });
    }
    seenAnchorIds.add(anchor.anchor_id);
  });
  
  // Check corridor zone references
  if (pack.safe_corridors) {
    pack.safe_corridors.forEach((corridor, idx) => {
      if (!zoneIds.has(corridor.from_zone_id)) {
        issues.push({
          severity: 'ERROR',
          category: 'cross-reference',
          path: `safe_corridors[${idx}].from_zone_id`,
          message: `Corridor references non-existent zone: ${corridor.from_zone_id}`,
        });
      }
      if (!zoneIds.has(corridor.to_zone_id)) {
        issues.push({
          severity: 'ERROR',
          category: 'cross-reference',
          path: `safe_corridors[${idx}].to_zone_id`,
          message: `Corridor references non-existent zone: ${corridor.to_zone_id}`,
        });
      }
    });
  }
  
  return summarizeIssues(issues);
}

// =============================================================================
// COVERAGE VALIDATION
// =============================================================================

/**
 * Validate data coverage (are we missing important things?)
 */
export function validateCoverage(pack: CityPack): ValidationResult {
  const issues: ValidationIssue[] = [];
  
  // Zone count
  const zoneCount = pack.zones?.length || 0;
  if (zoneCount < 5) {
    issues.push({
      severity: 'ERROR',
      category: 'coverage',
      path: 'zones',
      message: `Insufficient zones: ${zoneCount} (minimum 5)`,
    });
  } else if (zoneCount < 15) {
    issues.push({
      severity: 'WARNING',
      category: 'coverage',
      path: 'zones',
      message: `Low zone count: ${zoneCount} (recommended 15+)`,
    });
  }
  
  // Anchor count
  const anchorCount = pack.anchors?.length || 0;
  if (anchorCount < zoneCount) {
    issues.push({
      severity: 'WARNING',
      category: 'coverage',
      path: 'anchors',
      message: `Fewer anchors (${anchorCount}) than zones (${zoneCount})`,
      suggestion: 'Each zone should have at least one anchor',
    });
  }
  
  // Price baselines
  if (!pack.price_baselines) {
    issues.push({
      severity: 'WARNING',
      category: 'coverage',
      path: 'price_baselines',
      message: 'Missing price baselines',
    });
  } else {
    const expectedItems = ['coffee', 'beer', 'street_meal', 'restaurant_meal', 'taxi_per_km'];
    const presentItems = Object.keys(pack.price_baselines.items || {});
    const missing = expectedItems.filter(i => !presentItems.includes(i));
    
    if (missing.length > 0) {
      issues.push({
        severity: 'WARNING',
        category: 'coverage',
        path: 'price_baselines.items',
        message: `Missing price items: ${missing.join(', ')}`,
      });
    }
  }
  
  // Airport intel
  if (!pack.airport_intel) {
    issues.push({
      severity: 'WARNING',
      category: 'coverage',
      path: 'airport_intel',
      message: 'Missing airport intel',
    });
  } else {
    if (!pack.airport_intel.taxi_range) {
      issues.push({
        severity: 'WARNING',
        category: 'coverage',
        path: 'airport_intel.taxi_range',
        message: 'Missing airport taxi price range',
      });
    }
    if (!pack.airport_intel.transport_options || pack.airport_intel.transport_options.length === 0) {
      issues.push({
        severity: 'WARNING',
        category: 'coverage',
        path: 'airport_intel.transport_options',
        message: 'Missing airport transport options',
      });
    }
  }
  
  // Cultural facts
  if (!pack.cultural_facts || pack.cultural_facts.length === 0) {
    issues.push({
      severity: 'INFO',
      category: 'coverage',
      path: 'cultural_facts',
      message: 'No cultural facts included',
    });
  }
  
  // Safe corridors
  if (!pack.safe_corridors || pack.safe_corridors.length === 0) {
    issues.push({
      severity: 'INFO',
      category: 'coverage',
      path: 'safe_corridors',
      message: 'No safe corridors defined',
    });
  }
  
  return summarizeIssues(issues);
}

// =============================================================================
// QUALITY METRICS
// =============================================================================

/**
 * Calculate quality metrics for pack
 */
export function calculateQualityMetrics(
  pack: CityPack,
  validation: ValidationResult
): QualityMetrics {
  // Schema compliance: 100 - (errors * 10 + warnings * 2)
  const schemaCompliance = Math.max(0, 100 - validation.errorCount * 10 - validation.warningCount * 2);
  
  // Data completeness
  let completeness = 0;
  let checks = 0;
  
  const addCheck = (exists: boolean, weight: number = 1) => {
    checks += weight;
    if (exists) completeness += weight;
  };
  
  addCheck(!!pack.meta?.city_name, 2);
  addCheck(!!pack.meta?.timezone, 2);
  addCheck((pack.zones?.length || 0) >= 5, 3);
  addCheck((pack.anchors?.length || 0) >= 5, 3);
  addCheck(!!pack.airport_intel, 2);
  addCheck(!!pack.price_baselines, 2);
  addCheck((pack.cultural_facts?.length || 0) > 0, 1);
  addCheck((pack.safe_corridors?.length || 0) > 0, 1);
  
  const dataCompleteness = Math.round((completeness / checks) * 100);
  
  // Internal consistency (no cross-ref errors)
  const crossRefErrors = validation.issues
    .filter(i => i.category === 'cross-reference' && i.severity === 'ERROR')
    .length;
  const internalConsistency = Math.max(0, 100 - crossRefErrors * 20);
  
  // Freshness (based on timestamps)
  let freshnessScore = 50; // Default
  if (pack.meta?.generated_at) {
    const ageMs = Date.now() - new Date(pack.meta.generated_at).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    
    if (ageDays < 7) freshnessScore = 100;
    else if (ageDays < 30) freshnessScore = 80;
    else if (ageDays < 90) freshnessScore = 60;
    else if (ageDays < 180) freshnessScore = 40;
    else freshnessScore = 20;
  }
  
  // Coverage score
  const zoneCount = pack.zones?.length || 0;
  const anchorCount = pack.anchors?.length || 0;
  const coverageScore = Math.min(100, Math.round(
    (Math.min(zoneCount, 30) / 30) * 50 +
    (Math.min(anchorCount, 30) / 30) * 50
  ));
  
  // Overall quality
  const overallQuality = Math.round(
    schemaCompliance * 0.3 +
    dataCompleteness * 0.25 +
    internalConsistency * 0.2 +
    freshnessScore * 0.15 +
    coverageScore * 0.1
  );
  
  return {
    schema_compliance: schemaCompliance,
    data_completeness: dataCompleteness,
    internal_consistency: internalConsistency,
    freshness_score: freshnessScore,
    coverage_score: coverageScore,
    overall_quality: overallQuality,
  };
}

// =============================================================================
// READINESS REPORT
// =============================================================================

/**
 * Generate comprehensive readiness report
 */
export function generateReadinessReport(pack: CityPack): ReadinessReport {
  const schemaValidation = validateSchema(pack);
  const semanticValidation = validateSemantics(pack);
  const crossRefValidation = validateCrossReferences(pack);
  const coverageValidation = validateCoverage(pack);
  
  // Merge all validation results
  const allIssues = [
    ...schemaValidation.issues,
    ...semanticValidation.issues,
    ...crossRefValidation.issues,
    ...coverageValidation.issues,
  ];
  
  const combinedValidation: ValidationResult = {
    valid: allIssues.filter(i => i.severity === 'ERROR').length === 0,
    issues: allIssues,
    errorCount: allIssues.filter(i => i.severity === 'ERROR').length,
    warningCount: allIssues.filter(i => i.severity === 'WARNING').length,
    infoCount: allIssues.filter(i => i.severity === 'INFO').length,
  };
  
  const metrics = calculateQualityMetrics(pack, combinedValidation);
  const readinessScore = calculateReadinessScore(pack);
  
  // Determine blockers
  const blockers: string[] = [];
  if (combinedValidation.errorCount > 0) {
    blockers.push(`${combinedValidation.errorCount} validation error(s) must be fixed`);
  }
  if ((pack.zones?.length || 0) < 5) {
    blockers.push('Minimum 5 zones required');
  }
  if (!pack.meta?.city_slug) {
    blockers.push('Missing city slug');
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  if (metrics.freshness_score < 60) {
    recommendations.push('Regenerate pack with latest OSM data');
  }
  if (combinedValidation.warningCount > 5) {
    recommendations.push('Review and address validation warnings');
  }
  if (metrics.coverage_score < 70) {
    recommendations.push('Add more zones and anchors for better coverage');
  }
  if (!pack.price_baselines) {
    recommendations.push('Add price baselines from manual seeds');
  }
  if ((pack.cultural_facts?.length || 0) < 3) {
    recommendations.push('Add cultural facts for better user experience');
  }
  
  return {
    city_slug: pack.meta?.city_slug || 'unknown',
    pack_version: pack.schema_version || 'unknown',
    validation: combinedValidation,
    metrics,
    readiness_score: readinessScore,
    ready_for_production: blockers.length === 0 && readinessScore >= 60,
    blockers,
    recommendations,
    generated_at: new Date().toISOString(),
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function summarizeIssues(issues: ValidationIssue[]): ValidationResult {
  return {
    valid: issues.filter(i => i.severity === 'ERROR').length === 0,
    issues,
    errorCount: issues.filter(i => i.severity === 'ERROR').length,
    warningCount: issues.filter(i => i.severity === 'WARNING').length,
    infoCount: issues.filter(i => i.severity === 'INFO').length,
  };
}

// =============================================================================
// OUTPUT FORMATTERS
// =============================================================================

/**
 * Format validation result for console
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];
  
  lines.push(`\n=== Validation Result ===`);
  lines.push(`Status: ${result.valid ? '✓ VALID' : '✗ INVALID'}`);
  lines.push(`Errors: ${result.errorCount} | Warnings: ${result.warningCount} | Info: ${result.infoCount}`);
  
  if (result.issues.length > 0) {
    lines.push('\nIssues:');
    
    // Group by severity
    const errors = result.issues.filter(i => i.severity === 'ERROR');
    const warnings = result.issues.filter(i => i.severity === 'WARNING');
    const infos = result.issues.filter(i => i.severity === 'INFO');
    
    if (errors.length > 0) {
      lines.push('\n  ERRORS:');
      errors.forEach(i => {
        lines.push(`    ✗ [${i.path}] ${i.message}`);
        if (i.suggestion) lines.push(`      └─ Suggestion: ${i.suggestion}`);
      });
    }
    
    if (warnings.length > 0) {
      lines.push('\n  WARNINGS:');
      warnings.forEach(i => {
        lines.push(`    ⚠ [${i.path}] ${i.message}`);
        if (i.suggestion) lines.push(`      └─ Suggestion: ${i.suggestion}`);
      });
    }
    
    if (infos.length > 0) {
      lines.push('\n  INFO:');
      infos.forEach(i => {
        lines.push(`    ℹ [${i.path}] ${i.message}`);
      });
    }
  }
  
  return lines.join('\n');
}

/**
 * Format readiness report for console
 */
export function formatReadinessReport(report: ReadinessReport): string {
  const lines: string[] = [];
  
  lines.push(`\n${'='.repeat(60)}`);
  lines.push(`  READINESS REPORT: ${report.city_slug.toUpperCase()}`);
  lines.push(`${'='.repeat(60)}`);
  
  // Status
  const statusEmoji = report.ready_for_production ? '🟢' : '🔴';
  lines.push(`\n${statusEmoji} Status: ${report.ready_for_production ? 'READY FOR PRODUCTION' : 'NOT READY'}`);
  lines.push(`   Readiness Score: ${report.readiness_score}/100`);
  lines.push(`   Pack Version: ${report.pack_version}`);
  
  // Metrics
  lines.push(`\n📊 Quality Metrics:`);
  lines.push(`   Schema Compliance:    ${formatBar(report.metrics.schema_compliance)}`);
  lines.push(`   Data Completeness:    ${formatBar(report.metrics.data_completeness)}`);
  lines.push(`   Internal Consistency: ${formatBar(report.metrics.internal_consistency)}`);
  lines.push(`   Freshness Score:      ${formatBar(report.metrics.freshness_score)}`);
  lines.push(`   Coverage Score:       ${formatBar(report.metrics.coverage_score)}`);
  lines.push(`   ─────────────────────────────`);
  lines.push(`   Overall Quality:      ${formatBar(report.metrics.overall_quality)}`);
  
  // Validation summary
  lines.push(`\n✓ Validation:`);
  lines.push(`   ${report.validation.errorCount} errors | ${report.validation.warningCount} warnings | ${report.validation.infoCount} info`);
  
  // Blockers
  if (report.blockers.length > 0) {
    lines.push(`\n🚫 BLOCKERS (must fix):`);
    report.blockers.forEach(b => lines.push(`   • ${b}`));
  }
  
  // Recommendations
  if (report.recommendations.length > 0) {
    lines.push(`\n💡 Recommendations:`);
    report.recommendations.forEach(r => lines.push(`   • ${r}`));
  }
  
  lines.push(`\n   Generated: ${report.generated_at}`);
  lines.push(`${'='.repeat(60)}\n`);
  
  return lines.join('\n');
}

function formatBar(value: number): string {
  const filled = Math.round(value / 10);
  const empty = 10 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `${bar} ${value}%`;
}

// =============================================================================
// FILE OPERATIONS
// =============================================================================

/**
 * Validate a pack file from disk
 */
export function validatePackFile(filePath: string): ReadinessReport | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const pack: CityPackV1 = JSON.parse(content);
    return generateReadinessReport(pack);
  } catch (error) {
    console.error(`Failed to validate ${filePath}:`, error);
    return null;
  }
}

/**
 * Validate all packs in a directory
 */
export function validateAllPacks(dirPath: string): Map<string, ReadinessReport> {
  const results = new Map<string, ReadinessReport>();
  
  if (!fs.existsSync(dirPath)) {
    console.error(`Directory not found: ${dirPath}`);
    return results;
  }
  
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const report = validatePackFile(filePath);
    if (report) {
      results.set(file, report);
    }
  }
  
  return results;
}

// =============================================================================
// CLI
// =============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: ts-node validate_pack.ts <path-to-pack.json>');
    console.log('       ts-node validate_pack.ts --all <directory>');
    process.exit(1);
  }
  
  if (args[0] === '--all') {
    const dir = args[1] || path.join(__dirname, '../../data/city-packs');
    console.log(`Validating all packs in: ${dir}`);
    
    const results = validateAllPacks(dir);
    
    let passCount = 0;
    let failCount = 0;
    
    for (const [_file, report] of results) {
      console.log(formatReadinessReport(report));
      if (report.ready_for_production) passCount++;
      else failCount++;
    }
    
    console.log(`\n=== Summary ===`);
    console.log(`Total: ${results.size} | Ready: ${passCount} | Not Ready: ${failCount}`);
    
    process.exit(failCount > 0 ? 1 : 0);
  } else {
    const report = validatePackFile(args[0]);
    
    if (!report) {
      process.exit(1);
    }
    
    console.log(formatReadinessReport(report));
    console.log(formatValidationResult(report.validation));
    
    process.exit(report.ready_for_production ? 0 : 1);
  }
}
