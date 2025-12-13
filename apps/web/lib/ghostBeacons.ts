/**
 * Ghost Beacon System
 * 
 * Local heuristic detection of micro-interest areas using OSM tags.
 * Ghost beacons are subtle points of interest that reward exploration.
 */

export interface GhostBeacon {
  id: string;
  zone_id: string;
  city: string;
  coordinates: { lat: number; lon: number };
  beacon_type: BeaconType;
  direction?: string;
  distance_meters?: number;
  osm_tags?: Record<string, string>;
  discovered?: boolean;
}

export type BeaconType = 
  | 'interest'      // General point of interest
  | 'hidden_gem'    // Highly rated but low visibility
  | 'local_favorite'// Popular with locals
  | 'historic'      // Historical significance
  | 'viewpoint';    // Scenic viewpoint

// OSM tags that indicate potential ghost beacons
const BEACON_INDICATORS: Record<BeaconType, string[][]> = {
  interest: [
    ['tourism', 'attraction'],
    ['tourism', 'artwork'],
    ['amenity', 'fountain'],
    ['historic', 'memorial'],
  ],
  hidden_gem: [
    ['amenity', 'cafe'],
    ['amenity', 'restaurant'],
    ['shop', 'books'],
    ['amenity', 'bar'],
  ],
  local_favorite: [
    ['cuisine', '*'],
    ['food', '*'],
    ['amenity', 'marketplace'],
  ],
  historic: [
    ['historic', '*'],
    ['heritage', '*'],
    ['building', 'temple'],
    ['building', 'shrine'],
  ],
  viewpoint: [
    ['tourism', 'viewpoint'],
    ['natural', 'peak'],
    ['amenity', 'observation'],
  ],
};

/**
 * Detect ghost beacons from OSM data within a zone
 */
export function detectGhostBeacons(
  osmFeatures: Array<{
    id: string;
    lat: number;
    lon: number;
    tags: Record<string, string>;
  }>,
  zoneId: string,
  city: string
): GhostBeacon[] {
  const beacons: GhostBeacon[] = [];

  for (const feature of osmFeatures) {
    const beaconType = identifyBeaconType(feature.tags);
    
    if (beaconType) {
      beacons.push({
        id: `ghost-${feature.id}`,
        zone_id: zoneId,
        city,
        coordinates: { lat: feature.lat, lon: feature.lon },
        beacon_type: beaconType,
        osm_tags: feature.tags,
        discovered: false,
      });
    }
  }

  return beacons;
}

/**
 * Identify beacon type from OSM tags
 */
function identifyBeaconType(tags: Record<string, string>): BeaconType | null {
  for (const [beaconType, indicators] of Object.entries(BEACON_INDICATORS)) {
    for (const [key, value] of indicators) {
      if (tags[key]) {
        if (value === '*' || tags[key] === value) {
          return beaconType as BeaconType;
        }
      }
    }
  }
  return null;
}

/**
 * Calculate direction from user to beacon
 */
export function calculateBeaconDirection(
  userLat: number,
  userLon: number,
  beaconLat: number,
  beaconLon: number
): { direction: string; degrees: number } {
  const dLon = beaconLon - userLon;
  const y = Math.sin(dLon) * Math.cos(beaconLat);
  const x = Math.cos(userLat) * Math.sin(beaconLat) -
            Math.sin(userLat) * Math.cos(beaconLat) * Math.cos(dLon);
  
  let bearing = Math.atan2(y, x) * (180 / Math.PI);
  bearing = (bearing + 360) % 360;

  const direction = getCardinalDirection(bearing);

  return { direction, degrees: bearing };
}

/**
 * Convert degrees to cardinal direction
 */
function getCardinalDirection(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

/**
 * Calculate distance between two points in meters
 */
export function calculateBeaconDistance(
  userLat: number,
  userLon: number,
  beaconLat: number,
  beaconLon: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(beaconLat - userLat);
  const dLon = toRad(beaconLon - userLon);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(userLat)) * Math.cos(toRad(beaconLat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Find nearby ghost beacons within range
 */
export function findNearbyBeacons(
  userLat: number,
  userLon: number,
  beacons: GhostBeacon[],
  maxDistanceMeters: number = 200
): Array<GhostBeacon & { direction: string; distance_meters: number }> {
  return beacons
    .map((beacon) => {
      const distance = calculateBeaconDistance(
        userLat,
        userLon,
        beacon.coordinates.lat,
        beacon.coordinates.lon
      );
      const { direction } = calculateBeaconDirection(
        userLat,
        userLon,
        beacon.coordinates.lat,
        beacon.coordinates.lon
      );

      return {
        ...beacon,
        direction,
        distance_meters: Math.round(distance),
      };
    })
    .filter((b) => b.distance_meters <= maxDistanceMeters)
    .sort((a, b) => a.distance_meters - b.distance_meters);
}

/**
 * Format ghost beacon notification for HUD
 */
export function formatBeaconNotification(
  beacon: GhostBeacon & { direction: string; distance_meters: number }
): string {
  const typeLabels: Record<BeaconType, string> = {
    interest: 'POINT OF INTEREST',
    hidden_gem: 'HIDDEN GEM',
    local_favorite: 'LOCAL FAVORITE',
    historic: 'HISTORIC SITE',
    viewpoint: 'VIEWPOINT',
  };

  const label = typeLabels[beacon.beacon_type];
  
  return `👻 GHOST BEACON DETECTED // ${label} // VECTOR ${beacon.direction} ${beacon.distance_meters}M`;
}

/**
 * Get beacon icon based on type
 */
export function getBeaconIcon(type: BeaconType): string {
  const icons: Record<BeaconType, string> = {
    interest: '📍',
    hidden_gem: '💎',
    local_favorite: '⭐',
    historic: '🏛️',
    viewpoint: '👁️',
  };
  return icons[type];
}
