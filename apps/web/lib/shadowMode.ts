/**
 * Shadow Copy Mode
 * 
 * Read-only mode for privacy-sensitive users.
 * When enabled, user actions are not persisted to server.
 */

export interface ShadowModeConfig {
  enabled: boolean;
  allowedActions: string[];
  localOnlyFeatures: string[];
}

// Actions that are allowed even in shadow mode
export const SHADOW_MODE_ALLOWED_ACTIONS = [
  'view_map',
  'view_zones',
  'view_prices', // Read only
  'view_reports', // Read only
  'download_pack',
  'crisis_mode', // Safety critical
];

// Features that are always local-only
export const LOCAL_ONLY_FEATURES = [
  'operative_replay',
  'texture_fingerprint',
  'ghost_beacon_discovery',
  'movement_history',
];

/**
 * Check if an action is allowed in shadow mode
 */
export function isActionAllowedInShadowMode(action: string): boolean {
  return SHADOW_MODE_ALLOWED_ACTIONS.includes(action);
}

/**
 * Check if a feature is local-only
 */
export function isFeatureLocalOnly(feature: string): boolean {
  return LOCAL_ONLY_FEATURES.includes(feature);
}

/**
 * Get shadow mode status message
 */
export function getShadowModeMessage(): string {
  return '🔒 SHADOW MODE ACTIVE // DATA NOT SYNCED // LOCAL OPS ONLY';
}

/**
 * Filter payload for shadow mode (remove sensitive data)
 */
export function filterPayloadForShadowMode(payload: Record<string, any>): Record<string, any> {
  const sensitiveKeys = [
    'coordinates',
    'location',
    'lat',
    'lon',
    'latitude',
    'longitude',
    'device_id',
    'fingerprint',
  ];

  const filtered: Record<string, any> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (!sensitiveKeys.includes(key.toLowerCase())) {
      if (typeof value === 'object' && value !== null) {
        filtered[key] = filterPayloadForShadowMode(value);
      } else {
        filtered[key] = value;
      }
    }
  }

  return filtered;
}

/**
 * Coarsen coordinates for privacy (reduce precision)
 */
export function coarsenCoordinates(
  lat: number,
  lon: number,
  precision: number = 2 // ~1km precision
): { lat: number; lon: number } {
  return {
    lat: parseFloat(lat.toFixed(precision)),
    lon: parseFloat(lon.toFixed(precision)),
  };
}

/**
 * Generate anonymous user identifier
 */
export function generateAnonymousId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `anon_${timestamp}_${random}`;
}
