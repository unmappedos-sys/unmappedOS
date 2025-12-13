/**
 * Ghost Beacon System
 * 
 * Detects interesting micro-areas without explicit pins.
 * Provides haptic + HUD cues for exploration.
 * 
 * No permanent markers - ephemeral discovery only.
 */

// Type alias for beacon types - used by hooks/components
export type GhostBeaconType = 'local_gem' | 'historic' | 'viewpoint' | 'transit_hub' | 'mystery';

// Proximity alert interface for hook consumers
export interface ProximityAlert {
  beacon: GhostBeacon;
  distance: number;
  direction: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
  hapticPattern: number[];
}

export interface GhostBeacon {
  id: string;
  location: {
    lat: number;
    lon: number;
  };
  interest_score: number;      // 0-10
  discovery_hint: string;
  beacon_type: GhostBeaconType;
  radius: number;               // Detection radius in meters
  triggered: boolean;
  triggered_at?: Date;
  expires_at: Date;
}

export interface BeaconTriggerEvent {
  beacon: GhostBeacon;
  distance: number;
  direction: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
  haptic_pattern: number[];
}

/**
 * Generate ghost beacons for a zone based on OSM data
 */
export function generateGhostBeacons(
  zoneData: {
    zone_id: string;
    centroid: { lat: number; lon: number };
    anchors: Array<{ lat: number; lon: number; tags: Record<string, string> }>;
    pois: Array<{ lat: number; lon: number; tags: Record<string, string> }>;
  }
): GhostBeacon[] {
  const beacons: GhostBeacon[] = [];

  // Process POIs that aren't anchors
  for (const poi of zoneData.pois) {
    const score = calculateInterestScore(poi.tags);
    
    if (score >= 7) {
      const beacon: GhostBeacon = {
        id: `beacon_${zoneData.zone_id}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        location: {
          lat: poi.lat,
          lon: poi.lon,
        },
        interest_score: score,
        discovery_hint: generateDiscoveryHint(poi.tags),
        beacon_type: classifyBeaconType(poi.tags),
        radius: 50, // 50m detection radius
        triggered: false,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };
      
      beacons.push(beacon);
    }
  }

  // Limit to top 5 beacons per zone
  return beacons
    .sort((a, b) => b.interest_score - a.interest_score)
    .slice(0, 5);
}

/**
 * Calculate interest score (0-10) based on POI tags
 */
function calculateInterestScore(tags: Record<string, string>): number {
  let score = 5; // Base score

  // High-value tags
  if (tags.historic || tags.heritage) score += 3;
  if (tags.artwork || tags.memorial) score += 2;
  if (tags.viewpoint || tags.natural === 'peak') score += 2;
  if (tags.craft || tags.shop === 'antiques') score += 2;
  if (tags.amenity === 'cafe' && tags.cuisine) score += 1;
  if (tags.tourism === 'gallery' || tags.tourism === 'museum') score += 2;
  
  // Penalize common/commercial
  if (tags.shop === 'convenience' || tags.amenity === 'atm') score -= 2;
  if (tags.chain || tags.brand) score -= 1;

  // Boost for unique/quirky
  if (tags.name && tags.name.length < 20) score += 1;
  if (tags.operator && !tags.chain) score += 1;

  return Math.max(0, Math.min(10, score));
}

/**
 * Classify beacon type from tags
 */
function classifyBeaconType(tags: Record<string, string>): GhostBeaconType {
  if (tags.historic || tags.heritage) return 'historic';
  if (tags.viewpoint || tags.natural) return 'viewpoint';
  if (tags.railway || tags.bus === 'yes') return 'transit_hub';
  if (tags.amenity === 'cafe' || tags.craft) return 'local_gem';
  
  return 'mystery';
}

/**
 * Generate cryptic discovery hint
 */
function generateDiscoveryHint(tags: Record<string, string>): string {
  const hints: string[] = [];

  if (tags.historic) hints.push('ECHOES OF THE PAST');
  if (tags.viewpoint) hints.push('ELEVATED PERSPECTIVE');
  if (tags.craft) hints.push('ARTISAN QUARTERS');
  if (tags.amenity === 'cafe') hints.push('LOCAL GATHERING POINT');
  if (tags.memorial) hints.push('REMEMBRANCE SITE');
  if (tags.natural) hints.push('NATURAL FEATURE');
  if (tags.artwork) hints.push('STREET ART DETECTED');
  
  if (hints.length === 0) {
    hints.push('POINT OF INTEREST');
  }

  return hints[0];
}

/**
 * Check if user is near a ghost beacon
 */
export function checkBeaconProximity(
  userLocation: { lat: number; lon: number },
  beacons: GhostBeacon[]
): BeaconTriggerEvent | null {
  const now = Date.now();

  for (const beacon of beacons) {
    // Skip expired or already triggered
    if (now > beacon.expires_at.getTime() || beacon.triggered) {
      continue;
    }

    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lon,
      beacon.location.lat,
      beacon.location.lon
    );

    if (distance <= beacon.radius) {
      const direction = calculateDirection(
        userLocation.lat,
        userLocation.lon,
        beacon.location.lat,
        beacon.location.lon
      );

      const hapticPattern = getHapticPattern(beacon.beacon_type);

      return {
        beacon,
        distance,
        direction,
        haptic_pattern: hapticPattern,
      };
    }
  }

  return null;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(
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
 * Calculate compass direction from point A to point B
 */
function calculateDirection(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' {
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  
  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  bearing = (bearing + 360) % 360;

  const directions: Array<'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'> = [
    'N',
    'NE',
    'E',
    'SE',
    'S',
    'SW',
    'W',
    'NW',
  ];
  
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Get haptic pattern for beacon type
 */
function getHapticPattern(beaconType: GhostBeacon['beacon_type']): number[] {
  switch (beaconType) {
    case 'local_gem':
      return [100, 50, 100]; // Double tap
    case 'historic':
      return [200, 100, 200]; // Slow double tap
    case 'viewpoint':
      return [300]; // Long single pulse
    case 'transit_hub':
      return [50, 50, 50, 50, 50]; // Rapid flutter
    case 'mystery':
      return [100, 100, 100, 100, 100]; // Mystery rhythm
    default:
      return [100];
  }
}

/**
 * Mark beacon as triggered
 */
export function triggerBeacon(beacon: GhostBeacon): GhostBeacon {
  return {
    ...beacon,
    triggered: true,
    triggered_at: new Date(),
  };
}

/**
 * Get beacon UI display data
 */
export function getBeaconDisplayData(beacon: GhostBeacon): {
  icon: string;
  color: string;
  pulse: boolean;
  message: string;
} {
  const typeData = {
    local_gem: { icon: '💎', color: '#00ff88', pulse: true, suffix: 'LOCAL FAVORITE' },
    historic: { icon: '🏛️', color: '#ffaa00', pulse: false, suffix: 'HISTORIC SITE' },
    viewpoint: { icon: '🔭', color: '#00aaff', pulse: true, suffix: 'VIEWPOINT' },
    transit_hub: { icon: '🚇', color: '#ff00ff', pulse: false, suffix: 'TRANSIT' },
    mystery: { icon: '❓', color: '#ff4444', pulse: true, suffix: 'UNKNOWN' },
  };

  const data = typeData[beacon.beacon_type];

  return {
    icon: data.icon,
    color: data.color,
    pulse: data.pulse,
    message: `${beacon.discovery_hint} // ${data.suffix}`,
  };
}

/**
 * Clean up expired beacons
 */
export function cleanupExpiredBeacons(beacons: GhostBeacon[]): GhostBeacon[] {
  const now = Date.now();
  return beacons.filter((b) => now <= b.expires_at.getTime());
}

/**
 * Get beacon statistics for debugging
 */
export function getBeaconStats(beacons: GhostBeacon[]): {
  total: number;
  triggered: number;
  expired: number;
  by_type: Record<string, number>;
} {
  const now = Date.now();
  const stats = {
    total: beacons.length,
    triggered: beacons.filter((b) => b.triggered).length,
    expired: beacons.filter((b) => now > b.expires_at.getTime()).length,
    by_type: {} as Record<string, number>,
  };

  for (const beacon of beacons) {
    const type = beacon.beacon_type;
    stats.by_type[type] = (stats.by_type[type] || 0) + 1;
  }

  return stats;
}
/**
 * Decay a beacon's interest score over time (for gradual fading)
 */
export function decayBeacon(beacon: GhostBeacon, decayRate: number = 0.1): GhostBeacon {
  const newScore = Math.max(0, beacon.interest_score - decayRate);
  return {
    ...beacon,
    interest_score: newScore,
  };
}