/**
 * Safe Return Path System
 * 
 * Predictive safe return path calculation using:
 * - Safe corridors
 * - Vitality levels
 * - Time constraints
 * - Zone status
 */

export interface SafeReturnPath {
  waypoints: Array<{ lat: number; lon: number }>;
  total_distance_meters: number;
  estimated_time_minutes: number;
  vitality_safe: boolean;
  corridors_used: string[];
  warnings: string[];
}

export interface SafeCorridor {
  id: string;
  zone_id: string;
  geometry: {
    type: 'LineString';
    coordinates: Array<[number, number]>;
  };
  vitality_score: number;
  lighting_score: number;
  foot_traffic_score: number;
}

interface ReturnPathOptions {
  current_location: { lat: number; lon: number };
  destination?: { lat: number; lon: number };
  vitality_level: number;
  time_constraint_minutes?: number;
  prefer_lit_routes: boolean;
  avoid_offline_zones: boolean;
}

// Average walking speed in km/h
const WALKING_SPEED_KMH = 4.5;

// Minimum vitality to recommend longer routes
const MIN_VITALITY_FOR_LONG_ROUTE = 30;

/**
 * Calculate safe return path
 */
export function calculateSafeReturnPath(
  options: ReturnPathOptions,
  corridors: SafeCorridor[],
  offlineZones: string[] = []
): SafeReturnPath {
  const {
    current_location,
    destination,
    vitality_level,
    time_constraint_minutes,
    prefer_lit_routes,
    avoid_offline_zones,
  } = options;

  const warnings: string[] = [];
  const corridorsUsed: string[] = [];

  // If no destination, find nearest safe point (simplified)
  const target = destination || findNearestSafePoint(current_location, corridors);

  // Filter corridors based on preferences
  let availableCorridors = corridors;

  if (avoid_offline_zones) {
    availableCorridors = corridors.filter(
      (c) => !offlineZones.includes(c.zone_id)
    );
  }

  if (prefer_lit_routes) {
    availableCorridors = availableCorridors.filter(
      (c) => c.lighting_score >= 0.5
    );
  }

  // Sort corridors by combined safety score
  const scoredCorridors = availableCorridors.map((c) => ({
    ...c,
    combined_score: c.vitality_score * 0.4 + c.lighting_score * 0.3 + c.foot_traffic_score * 0.3,
  })).sort((a, b) => b.combined_score - a.combined_score);

  // Simple path construction (in production, use proper routing)
  const waypoints: Array<{ lat: number; lon: number }> = [current_location];

  // Add intermediate waypoints from best corridors
  for (const corridor of scoredCorridors.slice(0, 3)) {
    if (corridor.geometry.coordinates.length > 0) {
      const midpoint = corridor.geometry.coordinates[
        Math.floor(corridor.geometry.coordinates.length / 2)
      ];
      waypoints.push({ lat: midpoint[1], lon: midpoint[0] });
      corridorsUsed.push(corridor.id);
    }
  }

  waypoints.push(target);

  // Calculate total distance
  const totalDistance = calculatePathDistance(waypoints);
  
  // Calculate estimated time
  const estimatedTime = (totalDistance / 1000 / WALKING_SPEED_KMH) * 60;

  // Check vitality constraints
  const vitalitySafe = vitality_level >= MIN_VITALITY_FOR_LONG_ROUTE || totalDistance < 500;

  // Generate warnings
  if (vitality_level < 30) {
    warnings.push('LOW VITALITY // RECOMMEND REST STOPS');
  }

  if (time_constraint_minutes && estimatedTime > time_constraint_minutes) {
    warnings.push(`ETA EXCEEDS CONSTRAINT // ${Math.round(estimatedTime - time_constraint_minutes)}MIN OVER`);
  }

  if (scoredCorridors.length === 0) {
    warnings.push('NO SAFE CORRIDORS AVAILABLE // PROCEED WITH CAUTION');
  }

  if (offlineZones.length > 0 && avoid_offline_zones) {
    warnings.push(`${offlineZones.length} OFFLINE ZONES AVOIDED`);
  }

  return {
    waypoints,
    total_distance_meters: Math.round(totalDistance),
    estimated_time_minutes: Math.round(estimatedTime),
    vitality_safe: vitalitySafe,
    corridors_used: corridorsUsed,
    warnings,
  };
}

/**
 * Find nearest safe point from corridors
 */
function findNearestSafePoint(
  location: { lat: number; lon: number },
  corridors: SafeCorridor[]
): { lat: number; lon: number } {
  let nearest = location;
  let minDistance = Infinity;

  for (const corridor of corridors) {
    if (corridor.vitality_score < 0.6) continue;

    for (const coord of corridor.geometry.coordinates) {
      const distance = haversineDistance(
        location.lat,
        location.lon,
        coord[1],
        coord[0]
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearest = { lat: coord[1], lon: coord[0] };
      }
    }
  }

  return nearest;
}

/**
 * Calculate total path distance
 */
function calculatePathDistance(waypoints: Array<{ lat: number; lon: number }>): number {
  let total = 0;

  for (let i = 1; i < waypoints.length; i++) {
    total += haversineDistance(
      waypoints[i - 1].lat,
      waypoints[i - 1].lon,
      waypoints[i].lat,
      waypoints[i].lon
    );
  }

  return total;
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
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Format safe return path for HUD display
 */
export function formatSafeReturnMessage(path: SafeReturnPath): string {
  const distance = path.total_distance_meters >= 1000
    ? `${(path.total_distance_meters / 1000).toFixed(1)}KM`
    : `${path.total_distance_meters}M`;

  return `RECOMMENDED EXTRACTION ROUTE // ${distance} // ETA ${path.estimated_time_minutes} MIN`;
}

/**
 * Check if user is deviating from safe path
 */
export function checkPathDeviation(
  userLocation: { lat: number; lon: number },
  waypoints: Array<{ lat: number; lon: number }>,
  maxDeviationMeters: number = 100
): { isDeviating: boolean; deviationMeters: number; nearestWaypointIndex: number } {
  let minDistance = Infinity;
  let nearestIndex = 0;

  for (let i = 0; i < waypoints.length; i++) {
    const distance = haversineDistance(
      userLocation.lat,
      userLocation.lon,
      waypoints[i].lat,
      waypoints[i].lon
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = i;
    }
  }

  return {
    isDeviating: minDistance > maxDeviationMeters,
    deviationMeters: Math.round(minDistance),
    nearestWaypointIndex: nearestIndex,
  };
}
