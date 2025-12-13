/**
 * Safe Corridors System (Phase 2.4)
 * 
 * Calculates vitality-based safe pathways through zones.
 * Especially useful at night or in unfamiliar areas.
 * 
 * Uses:
 * - Zone vitality scores
 * - Time of day
 * - Recent incident reports
 * - Lighting heuristics
 * - Street connectivity
 */

import { TextureType, calculateVitality } from './textureSystem';

export interface CorridorSegment {
  id: string;
  from_zone_id: string;
  to_zone_id: string;
  waypoints: [number, number][]; // [lng, lat] pairs
  vitality_score: number; // 0-10
  safety_rating: 'high' | 'medium' | 'low';
  estimated_minutes: number;
  recommended_hours: number[]; // Hours when this route is safest
  warnings: string[];
  texture_transitions: {
    zone_id: string;
    texture: TextureType;
    vitality: number;
  }[];
}

export interface SafeCorridorOptions {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  hour: number;
  prefer_vitality?: number; // Minimum vitality threshold
  avoid_textures?: TextureType[];
  max_detour_minutes?: number;
}

export interface CorridorRecommendation {
  primary_route: CorridorSegment;
  alternative_routes: CorridorSegment[];
  overall_safety: 'high' | 'medium' | 'low';
  warnings: string[];
  night_mode_active: boolean;
}

/**
 * Calculate safe corridor between two points
 */
export async function calculateSafeCorridor(
  options: SafeCorridorOptions
): Promise<CorridorRecommendation> {
  const {
    origin,
    destination,
    hour,
    prefer_vitality = 5,
    avoid_textures = [],
    max_detour_minutes = 15,
  } = options;

  const isNight = hour >= 22 || hour < 6;

  // 1. Get zones between origin and destination
  const zones = await getZonesBetweenPoints(origin, destination);

  if (zones.length === 0) {
    throw new Error('No zones found between origin and destination');
  }

  // 2. Calculate vitality for each zone
  const zoneVitality = await Promise.all(
    zones.map(async (zone) => {
      const reports = await getRecentReports(zone.id, 24);
      // Create a dynamic texture object for vitality calculation
      const dynamicTexture = {
        base_texture: zone.base_texture as TextureType,
        current_texture: zone.base_texture as TextureType,
        modifiers: [],
        confidence: 1.0,
        last_updated: new Date().toISOString(),
      };
      const vitality = calculateVitality(dynamicTexture, {
        safetyReports: reports.length,
        priceStability: 0.8, // Default value
        userRating: zone.user_rating || undefined,
      });

      return {
        zone_id: zone.id,
        texture: zone.base_texture,
        vitality,
        reports_count: reports.length,
      };
    })
  );

  // 3. Build corridor segments
  const segments: CorridorSegment[] = [];

  for (let i = 0; i < zones.length - 1; i++) {
    const from = zones[i];
    const to = zones[i + 1];
    const fromVitality = zoneVitality[i];
    const toVitality = zoneVitality[i + 1];

    const segment: CorridorSegment = {
      id: `${from.id}-${to.id}`,
      from_zone_id: from.id,
      to_zone_id: to.id,
      waypoints: [
        [from.center_lng, from.center_lat],
        [to.center_lng, to.center_lat],
      ],
      vitality_score: (fromVitality.vitality + toVitality.vitality) / 2,
      safety_rating: getSafetyRating(
        (fromVitality.vitality + toVitality.vitality) / 2,
        isNight
      ),
      estimated_minutes: estimateTravelTime(from, to),
      recommended_hours: getRecommendedHours(fromVitality.vitality),
      warnings: [],
      texture_transitions: [
        {
          zone_id: from.id,
          texture: fromVitality.texture,
          vitality: fromVitality.vitality,
        },
        {
          zone_id: to.id,
          texture: toVitality.texture,
          vitality: toVitality.vitality,
        },
      ],
    };

    // Add warnings
    if (fromVitality.vitality < prefer_vitality) {
      segment.warnings.push(`Low vitality in ${from.name}`);
    }

    if (avoid_textures.includes(fromVitality.texture)) {
      segment.warnings.push(`Passing through ${fromVitality.texture} zone`);
    }

    if (isNight && fromVitality.vitality < 4) {
      segment.warnings.push(`Not recommended at night: ${from.name}`);
    }

    segments.push(segment);
  }

  // 4. Find primary route (highest average vitality)
  const sortedSegments = [...segments].sort(
    (a, b) => b.vitality_score - a.vitality_score
  );

  const primary = sortedSegments[0];
  const alternatives = sortedSegments.slice(1, 3);

  // 5. Overall safety assessment
  const avgVitality =
    segments.reduce((sum, s) => sum + s.vitality_score, 0) / segments.length;

  const overall_safety = getSafetyRating(avgVitality, isNight);

  const warnings: string[] = [];
  if (isNight && avgVitality < 5) {
    warnings.push('This route may be less safe at night. Consider alternative transportation.');
  }

  if (avoid_textures.length > 0) {
    const foundTextures = segments.flatMap((s) =>
      s.texture_transitions.filter((t) => avoid_textures.includes(t.texture))
    );
    if (foundTextures.length > 0) {
      warnings.push(`Route passes through avoided zone types`);
    }
  }

  return {
    primary_route: primary,
    alternative_routes: alternatives,
    overall_safety,
    warnings,
    night_mode_active: isNight,
  };
}

/**
 * Get vitality-based route overlay for map display
 */
export function getCorridorOverlay(
  corridor: CorridorRecommendation
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  // Primary route
  features.push({
    type: 'Feature',
    properties: {
      type: 'primary',
      vitality: corridor.primary_route.vitality_score,
      safety: corridor.primary_route.safety_rating,
      color: getCorridorColor(corridor.primary_route.safety_rating),
      width: 6,
    },
    geometry: {
      type: 'LineString',
      coordinates: corridor.primary_route.waypoints,
    },
  });

  // Alternative routes
  corridor.alternative_routes.forEach((route, idx) => {
    features.push({
      type: 'Feature',
      properties: {
        type: 'alternative',
        vitality: route.vitality_score,
        safety: route.safety_rating,
        color: getCorridorColor(route.safety_rating, 0.5),
        width: 4,
      },
      geometry: {
        type: 'LineString',
        coordinates: route.waypoints,
      },
    });
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Heuristic: Recommended hours based on vitality
 */
function getRecommendedHours(vitality: number): number[] {
  if (vitality >= 7) {
    return Array.from({ length: 24 }, (_, i) => i); // All hours
  } else if (vitality >= 5) {
    return [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]; // Daytime + evening
  } else {
    return [9, 10, 11, 12, 13, 14, 15, 16, 17]; // Midday only
  }
}

/**
 * Safety rating based on vitality and time
 */
function getSafetyRating(
  vitality: number,
  isNight: boolean
): 'high' | 'medium' | 'low' {
  if (isNight) {
    if (vitality >= 7) return 'high';
    if (vitality >= 5) return 'medium';
    return 'low';
  } else {
    if (vitality >= 6) return 'high';
    if (vitality >= 4) return 'medium';
    return 'low';
  }
}

/**
 * Color for map overlay
 */
function getCorridorColor(
  safety: 'high' | 'medium' | 'low',
  opacity = 1
): string {
  switch (safety) {
    case 'high':
      return `rgba(34, 197, 94, ${opacity})`; // Green
    case 'medium':
      return `rgba(234, 179, 8, ${opacity})`; // Yellow
    case 'low':
      return `rgba(239, 68, 68, ${opacity})`; // Red
  }
}

/**
 * Estimate travel time between zones (simple heuristic)
 */
function estimateTravelTime(
  from: { center_lat: number; center_lng: number },
  to: { center_lat: number; center_lng: number }
): number {
  const distance = haversineDistance(
    from.center_lat,
    from.center_lng,
    to.center_lat,
    to.center_lng
  );

  // Assume 5 km/h walking speed
  return Math.ceil((distance / 5000) * 60);
}

/**
 * Haversine distance in meters
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Get zones between two points (simplified - in production, use routing API)
 */
async function getZonesBetweenPoints(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<any[]> {
  // In production, this would query Supabase with PostGIS
  // For now, return mock zones
  console.log('[SAFE CORRIDORS] Fetching zones between points', origin, destination);

  // TODO: Implement actual zone fetching with PostGIS
  // SELECT * FROM zones 
  // WHERE ST_Intersects(
  //   geom, 
  //   ST_MakeLine(ST_Point(origin.lng, origin.lat), ST_Point(destination.lng, destination.lat))
  // )

  return [];
}

/**
 * Get recent incident reports for a zone
 */
async function getRecentReports(zoneId: string, hours: number): Promise<any[]> {
  try {
    const response = await fetch(
      `/api/zones/${zoneId}/reports?hours=${hours}`
    );
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}
