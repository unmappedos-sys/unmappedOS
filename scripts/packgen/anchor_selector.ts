/**
 * Anchor Selection System
 * 
 * Deterministic algorithm to select ONE anchor per zone.
 * Anchors are stable geographic points that help users orient.
 * 
 * SELECTION PRIORITY:
 * 1. tourism=artwork (statues, murals, sculptures)
 * 2. amenity=fountain
 * 3. historic=memorial/monument
 * 4. place=square / pedestrian plazas
 * 5. Named intersections (fallback)
 * 
 * AVOIDANCE LIST:
 * - amenity=parking
 * - amenity=waste_disposal
 * - power=*
 * - construction sites
 * - highway=motorway junctions
 */

import type { LatLon, Anchor, AnchorType } from './schema_v1';
import type { MicroZone, POIData } from './osm_ingest_v2';

// ============================================================================
// TYPES
// ============================================================================

export interface AnchorCandidate {
  poi: POIData;
  type: AnchorType;
  score: number;
  distance_from_center: number;
  reasons: string[];
}

export interface AnchorSelectionResult {
  anchor: Anchor;
  candidates_evaluated: number;
  fallback_used: boolean;
  flagged_for_review: boolean;
  review_reason?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const ANCHOR_PRIORITY: Record<string, { type: AnchorType; base_score: number }> = {
  'artwork': { type: 'ARTWORK', base_score: 100 },
  'fountain': { type: 'FOUNTAIN', base_score: 95 },
  'memorial': { type: 'MEMORIAL', base_score: 90 },
  'plaza': { type: 'PLAZA', base_score: 85 },
  'temple': { type: 'TEMPLE', base_score: 80 },
  'landmark': { type: 'LANDMARK', base_score: 75 },
  'transit_stop': { type: 'STATION', base_score: 60 },
  'park': { type: 'PARK_ENTRANCE', base_score: 55 },
  'museum': { type: 'LANDMARK', base_score: 70 },
};

const AVOIDANCE_TAGS = [
  'amenity=parking',
  'amenity=waste_disposal',
  'power=*',
  'landuse=construction',
  'highway=motorway_junction',
  'man_made=wastewater_plant',
  'amenity=prison',
  'military=*',
];

const MAX_SEARCH_RADIUS_M = 500;
const SEARCH_INCREMENT_M = 50;
const MIN_ANCHOR_SCORE = 30;

// ============================================================================
// ANCHOR SELECTION ALGORITHM
// ============================================================================

export function selectAnchor(zone: MicroZone): AnchorSelectionResult {
  const candidates: AnchorCandidate[] = [];
  
  // Expand search radius from center
  for (let radius = SEARCH_INCREMENT_M; radius <= MAX_SEARCH_RADIUS_M; radius += SEARCH_INCREMENT_M) {
    const nearbyPois = zone.pois.filter(poi => 
      haversineDistance(zone.center, { lat: poi.lat, lon: poi.lon }) <= radius
    );
    
    for (const poi of nearbyPois) {
      // Skip if already evaluated
      if (candidates.some(c => c.poi.id === poi.id)) continue;
      
      // Skip avoided types
      if (shouldAvoid(poi)) continue;
      
      // Score candidate
      const candidate = scoreCandidate(poi, zone);
      if (candidate) {
        candidates.push(candidate);
      }
    }
    
    // If we have good candidates, stop expanding
    const goodCandidates = candidates.filter(c => c.score >= 70);
    if (goodCandidates.length >= 3) break;
  }
  
  // Sort by score (descending)
  candidates.sort((a, b) => b.score - a.score);
  
  // Select best candidate or use fallback
  if (candidates.length > 0 && candidates[0].score >= MIN_ANCHOR_SCORE) {
    const best = candidates[0];
    return {
      anchor: createAnchor(best, zone.zone_id),
      candidates_evaluated: candidates.length,
      fallback_used: false,
      flagged_for_review: best.score < 50,
      review_reason: best.score < 50 ? 'Low anchor score' : undefined,
    };
  }
  
  // Fallback: Use intersection or zone center
  const fallbackAnchor = createFallbackAnchor(zone);
  return {
    anchor: fallbackAnchor,
    candidates_evaluated: candidates.length,
    fallback_used: true,
    flagged_for_review: true,
    review_reason: 'No suitable anchor found, using intersection fallback',
  };
}

function scoreCandidate(poi: POIData, zone: MicroZone): AnchorCandidate | null {
  const priority = ANCHOR_PRIORITY[poi.type];
  if (!priority) return null;
  
  const reasons: string[] = [];
  let score = priority.base_score;
  
  // Distance penalty (prefer central anchors)
  const distance = haversineDistance(zone.center, { lat: poi.lat, lon: poi.lon });
  const distancePenalty = Math.min(20, distance / 25); // -1 point per 25m, max -20
  score -= distancePenalty;
  reasons.push(`Distance: ${Math.round(distance)}m`);
  
  // Name bonus (named anchors are better)
  if (poi.name && poi.name.length > 3 && !poi.name.startsWith('osm_')) {
    score += 15;
    reasons.push('Has name');
  }
  
  // Lighting bonus (lit anchors are safer meeting points)
  if (poi.has_lighting) {
    score += 5;
    reasons.push('Well lit');
  }
  
  // Wheelchair accessibility bonus
  if (poi.wheelchair === 'yes') {
    score += 3;
    reasons.push('Accessible');
  }
  
  // Tourist landmark bonus (easier to find)
  if (poi.tags?.tourism) {
    score += 10;
    reasons.push('Tourist landmark');
  }
  
  return {
    poi,
    type: priority.type,
    score: Math.max(0, Math.min(100, score)),
    distance_from_center: distance,
    reasons,
  };
}

function shouldAvoid(poi: POIData): boolean {
  const tags = poi.tags || {};
  
  for (const avoidTag of AVOIDANCE_TAGS) {
    const [key, value] = avoidTag.split('=');
    if (value === '*') {
      if (tags[key]) return true;
    } else {
      if (tags[key] === value) return true;
    }
  }
  
  // Avoid unnamed parking or industrial
  if (poi.type === 'other' && !poi.name) return true;
  
  return false;
}

function createAnchor(candidate: AnchorCandidate, zone_id: string): Anchor {
  return {
    anchor_id: `anchor_${zone_id}`,
    zone_id,
    location: { lat: candidate.poi.lat, lon: candidate.poi.lon },
    type: candidate.type,
    display_name: formatAnchorName(candidate.poi),
    osm_id: candidate.poi.osm_id,
    flagged_for_review: false,
    confidence_score: candidate.score,
  };
}

function createFallbackAnchor(zone: MicroZone): Anchor {
  // Try to find named intersection from streets
  const namedStreets = zone.streets
    .filter(s => s.name)
    .map(s => s.name!)
    .filter((name, i, arr) => arr.indexOf(name) === i);
  
  let displayName: string;
  if (namedStreets.length >= 2) {
    displayName = `${namedStreets[0]} & ${namedStreets[1]}`;
  } else if (namedStreets.length === 1) {
    displayName = `Near ${namedStreets[0]}`;
  } else {
    displayName = `Zone ${zone.zone_id} Center`;
  }
  
  return {
    anchor_id: `anchor_${zone.zone_id}`,
    zone_id: zone.zone_id,
    location: zone.center,
    type: 'INTERSECTION',
    display_name: displayName,
    fallback_reason: 'No suitable landmark found',
    flagged_for_review: true,
    confidence_score: 25,
  };
}

function formatAnchorName(poi: POIData): string {
  if (poi.name && !poi.name.startsWith('osm_')) {
    return poi.name;
  }
  
  // Generate descriptive name based on type
  const typeNames: Record<string, string> = {
    'artwork': 'Public Artwork',
    'fountain': 'Fountain',
    'memorial': 'Memorial',
    'plaza': 'Plaza',
    'temple': 'Temple',
    'landmark': 'Landmark',
    'transit_stop': 'Station',
    'park': 'Park Entrance',
    'museum': 'Museum',
  };
  
  return typeNames[poi.type] || 'Landmark';
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

export interface AnchorBatchResult {
  anchors: Anchor[];
  stats: {
    total_zones: number;
    anchors_found: number;
    fallbacks_used: number;
    flagged_for_review: number;
    average_confidence: number;
  };
  flagged_zones: string[];
}

export function selectAnchorsForCity(zones: MicroZone[]): AnchorBatchResult {
  const anchors: Anchor[] = [];
  const flaggedZones: string[] = [];
  let fallbackCount = 0;
  let flaggedCount = 0;
  let totalConfidence = 0;
  
  console.log(`[ANCHOR] Selecting anchors for ${zones.length} zones...`);
  
  for (const zone of zones) {
    const result = selectAnchor(zone);
    anchors.push(result.anchor);
    totalConfidence += result.anchor.confidence_score;
    
    if (result.fallback_used) fallbackCount++;
    if (result.flagged_for_review) {
      flaggedCount++;
      flaggedZones.push(zone.zone_id);
    }
  }
  
  const stats = {
    total_zones: zones.length,
    anchors_found: zones.length - fallbackCount,
    fallbacks_used: fallbackCount,
    flagged_for_review: flaggedCount,
    average_confidence: Math.round(totalConfidence / zones.length),
  };
  
  console.log(`[ANCHOR] Results:`);
  console.log(`  - Good anchors: ${stats.anchors_found}`);
  console.log(`  - Fallbacks: ${stats.fallbacks_used}`);
  console.log(`  - Flagged for review: ${stats.flagged_for_review}`);
  console.log(`  - Avg confidence: ${stats.average_confidence}%`);
  
  return { anchors, stats, flagged_zones: flaggedZones };
}

// ============================================================================
// SANITY CHECKS
// ============================================================================

export interface AnchorSanityResult {
  passed: boolean;
  issues: string[];
  warnings: string[];
}

export function sanityCheckAnchors(anchors: Anchor[], zones: MicroZone[]): AnchorSanityResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // Check 1: Every zone has an anchor
  const zoneIds = new Set(zones.map(z => z.zone_id));
  const anchorZoneIds = new Set(anchors.map(a => a.zone_id));
  for (const zoneId of zoneIds) {
    if (!anchorZoneIds.has(zoneId)) {
      issues.push(`Zone ${zoneId} has no anchor`);
    }
  }
  
  // Check 2: No duplicate anchors
  const anchorLocations = new Map<string, string>();
  for (const anchor of anchors) {
    const key = `${anchor.location.lat.toFixed(5)},${anchor.location.lon.toFixed(5)}`;
    if (anchorLocations.has(key)) {
      warnings.push(`Duplicate anchor location: ${anchor.zone_id} and ${anchorLocations.get(key)}`);
    }
    anchorLocations.set(key, anchor.zone_id);
  }
  
  // Check 3: Anchor confidence distribution
  const lowConfidence = anchors.filter(a => a.confidence_score < 40);
  if (lowConfidence.length > anchors.length * 0.3) {
    warnings.push(`${lowConfidence.length} anchors have low confidence (< 40%)`);
  }
  
  // Check 4: Fallback ratio
  const fallbacks = anchors.filter(a => a.fallback_reason);
  if (fallbacks.length > anchors.length * 0.2) {
    warnings.push(`High fallback ratio: ${fallbacks.length}/${anchors.length}`);
  }
  
  // Check 5: Anchors within zone bounds
  for (const anchor of anchors) {
    const zone = zones.find(z => z.zone_id === anchor.zone_id);
    if (zone) {
      const distance = haversineDistance(zone.center, anchor.location);
      if (distance > zone.radius_m * 1.5) {
        issues.push(`Anchor for ${anchor.zone_id} is ${Math.round(distance)}m from zone center (max: ${zone.radius_m * 1.5}m)`);
      }
    }
  }
  
  return {
    passed: issues.length === 0,
    issues,
    warnings,
  };
}

// ============================================================================
// GEO UTILS
// ============================================================================

function haversineDistance(a: LatLon, b: LatLon): number {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  
  const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  
  return R * c;
}

