/**
 * Operative Mode System
 * 
 * Manages three global operative states:
 * - FAST OPS: Low battery, moving fast - minimal HUD, essential info only
 * - DEEP OPS: Idle inside zone - full intel, exploration mode
 * - SAFE OPS: Night + low vitality - safety-focused, extraction routes
 * - CRISIS: Emergency mode - full-screen safety UI
 * - STANDARD: Default balanced mode
 */

export type OperativeMode = 'FAST_OPS' | 'DEEP_OPS' | 'SAFE_OPS' | 'CRISIS' | 'STANDARD';

export interface ModeConditions {
  batteryLevel: number;
  isMoving: boolean;
  movementSpeed: number; // km/h
  isNightTime: boolean;
  vitalityLevel: number;
  isInsideZone: boolean;
  idleTimeMinutes: number;
  manualOverride?: OperativeMode;
}

export interface ModeConfig {
  mode: OperativeMode;
  hudDensity: 'minimal' | 'standard' | 'full';
  refreshRate: number; // ms
  gpsAccuracy: 'low' | 'medium' | 'high';
  showSafeCorridors: boolean;
  showGhostBeacons: boolean;
  showPriceDeltas: boolean;
  showWhispers: boolean;
  vibrationEnabled: boolean;
  audioEnabled: boolean;
  description: string;
}

const MODE_CONFIGS: Record<OperativeMode, Omit<ModeConfig, 'mode'>> = {
  FAST_OPS: {
    hudDensity: 'minimal',
    refreshRate: 5000,
    gpsAccuracy: 'low',
    showSafeCorridors: false,
    showGhostBeacons: false,
    showPriceDeltas: false,
    showWhispers: false,
    vibrationEnabled: true,
    audioEnabled: false,
    description: 'Battery conservation mode. Essential navigation only.',
  },
  DEEP_OPS: {
    hudDensity: 'full',
    refreshRate: 2000,
    gpsAccuracy: 'high',
    showSafeCorridors: true,
    showGhostBeacons: true,
    showPriceDeltas: true,
    showWhispers: true,
    vibrationEnabled: true,
    audioEnabled: true,
    description: 'Full exploration mode. All intel systems active.',
  },
  SAFE_OPS: {
    hudDensity: 'standard',
    refreshRate: 3000,
    gpsAccuracy: 'high',
    showSafeCorridors: true,
    showGhostBeacons: false,
    showPriceDeltas: false,
    showWhispers: true,
    vibrationEnabled: true,
    audioEnabled: true,
    description: 'Safety-focused mode. Extraction routes prioritized.',
  },
  CRISIS: {
    hudDensity: 'minimal',
    refreshRate: 1000,
    gpsAccuracy: 'high',
    showSafeCorridors: true,
    showGhostBeacons: false,
    showPriceDeltas: false,
    showWhispers: false,
    vibrationEnabled: true,
    audioEnabled: true,
    description: 'EMERGENCY MODE. Safety systems only.',
  },
  STANDARD: {
    hudDensity: 'standard',
    refreshRate: 3000,
    gpsAccuracy: 'medium',
    showSafeCorridors: true,
    showGhostBeacons: true,
    showPriceDeltas: true,
    showWhispers: true,
    vibrationEnabled: true,
    audioEnabled: true,
    description: 'Standard operative mode. Balanced systems.',
  },
};

/**
 * Determine the optimal operative mode based on conditions
 */
export function determineOperativeMode(conditions: ModeConditions): OperativeMode {
  // Manual override takes precedence
  if (conditions.manualOverride) {
    return conditions.manualOverride;
  }

  // CRISIS mode - very low battery or vitality
  if (conditions.batteryLevel < 5 || conditions.vitalityLevel < 10) {
    return 'CRISIS';
  }

  // FAST OPS - low battery OR moving fast
  if (conditions.batteryLevel < 20 || conditions.movementSpeed > 15) {
    return 'FAST_OPS';
  }

  // SAFE OPS - night time AND low vitality
  if (conditions.isNightTime && conditions.vitalityLevel < 50) {
    return 'SAFE_OPS';
  }

  // DEEP OPS - idle inside zone for extended period
  if (conditions.isInsideZone && conditions.idleTimeMinutes > 5 && !conditions.isMoving) {
    return 'DEEP_OPS';
  }

  return 'STANDARD';
}

/**
 * Get configuration for a specific mode
 */
export function getModeConfig(mode: OperativeMode): ModeConfig {
  return {
    mode,
    ...MODE_CONFIGS[mode],
  };
}

/**
 * Check if it's night time (between 10 PM and 6 AM)
 */
export function isNightTime(date: Date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= 22 || hour < 6;
}

/**
 * Calculate movement speed from GPS history
 */
export function calculateMovementSpeed(
  positions: Array<{ lat: number; lon: number; timestamp: number }>
): number {
  if (positions.length < 2) return 0;

  const latest = positions[positions.length - 1];
  const previous = positions[positions.length - 2];

  const distanceKm = haversineDistance(
    previous.lat,
    previous.lon,
    latest.lat,
    latest.lon
  );

  const timeHours = (latest.timestamp - previous.timestamp) / (1000 * 60 * 60);

  if (timeHours === 0) return 0;

  return distanceKm / timeHours; // km/h
}

/**
 * Haversine distance calculation
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
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
 * Mode transition messages for HUD display
 */
export const MODE_TRANSITIONS: Record<OperativeMode, string[]> = {
  FAST_OPS: [
    'SWITCHING TO FAST OPS...',
    'REDUCING HUD DENSITY...',
    'BATTERY CONSERVATION ACTIVE',
  ],
  DEEP_OPS: [
    'ENTERING DEEP OPS MODE...',
    'ACTIVATING FULL INTEL...',
    'EXPLORATION SYSTEMS ONLINE',
  ],
  SAFE_OPS: [
    'SAFE OPS ENGAGED...',
    'PRIORITIZING EXTRACTION ROUTES...',
    'VITALITY MONITORING ACTIVE',
  ],
  CRISIS: [
    'CRISIS MODE ACTIVATED',
    'EMERGENCY PROTOCOLS ENGAGED',
    'SAFETY SYSTEMS PRIORITY',
  ],
  STANDARD: [
    'STANDARD MODE RESTORED',
    'ALL SYSTEMS NOMINAL',
    'READY FOR OPERATIONS',
  ],
};
