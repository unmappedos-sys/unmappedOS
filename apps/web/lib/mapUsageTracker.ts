/**
 * Map Usage Tracker - Monitors Mapbox API usage and auto-switches to MapLibre
 * to stay within free tier limits (50K loads/month)
 */

const STORAGE_KEY = 'unmapped_map_usage';
const MAPBOX_FREE_TIER_LIMIT = 50000;
const SAFETY_THRESHOLD = 0.9; // Switch at 90% of limit (45K loads)
const WARNING_THRESHOLD = 0.75; // Warn at 75% (37.5K loads)

export interface MapUsageStats {
  month: string; // Format: YYYY-MM
  mapboxLoads: number;
  maplibreLoads: number;
  lastUpdated: number;
  autoSwitched: boolean;
  manualOverride: 'mapbox' | 'maplibre' | null;
}

export interface MapProviderDecision {
  provider: 'mapbox' | 'maplibre';
  reason: string;
  usagePercent: number;
  remainingLoads: number;
  isWarning: boolean;
  isCritical: boolean;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getUsageStats(): MapUsageStats {
  if (typeof window === 'undefined') {
    return createEmptyStats();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return createEmptyStats();
    }

    const stats: MapUsageStats = JSON.parse(stored);
    
    // Reset if new month
    if (stats.month !== getCurrentMonth()) {
      const newStats = createEmptyStats();
      saveUsageStats(newStats);
      return newStats;
    }

    return stats;
  } catch {
    return createEmptyStats();
  }
}

function createEmptyStats(): MapUsageStats {
  return {
    month: getCurrentMonth(),
    mapboxLoads: 0,
    maplibreLoads: 0,
    lastUpdated: Date.now(),
    autoSwitched: false,
    manualOverride: null,
  };
}

function saveUsageStats(stats: MapUsageStats): void {
  if (typeof window === 'undefined') return;
  
  try {
    stats.lastUpdated = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    console.warn('[MapUsage] Failed to save usage stats');
  }
}

/**
 * Record a map load event
 */
export function recordMapLoad(provider: 'mapbox' | 'maplibre'): void {
  const stats = getUsageStats();
  
  if (provider === 'mapbox') {
    stats.mapboxLoads++;
  } else {
    stats.maplibreLoads++;
  }
  
  saveUsageStats(stats);
}

/**
 * Determine which map provider to use based on usage and configuration
 */
export function getMapProviderDecision(): MapProviderDecision {
  const stats = getUsageStats();
  const configuredProvider = process.env.NEXT_PUBLIC_MAP_PROVIDER as 'mapbox' | 'maplibre' | undefined;
  const hasMapboxToken = !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  
  const usagePercent = stats.mapboxLoads / MAPBOX_FREE_TIER_LIMIT;
  const remainingLoads = MAPBOX_FREE_TIER_LIMIT - stats.mapboxLoads;
  const isWarning = usagePercent >= WARNING_THRESHOLD;
  const isCritical = usagePercent >= SAFETY_THRESHOLD;

  // Manual override takes precedence
  if (stats.manualOverride) {
    return {
      provider: stats.manualOverride,
      reason: `Manual override: ${stats.manualOverride}`,
      usagePercent,
      remainingLoads,
      isWarning,
      isCritical,
    };
  }

  // No Mapbox token = use MapLibre
  if (!hasMapboxToken) {
    return {
      provider: 'maplibre',
      reason: 'No Mapbox token configured',
      usagePercent: 0,
      remainingLoads: MAPBOX_FREE_TIER_LIMIT,
      isWarning: false,
      isCritical: false,
    };
  }

  // Auto-switch to MapLibre if approaching limit
  if (isCritical) {
    if (!stats.autoSwitched) {
      stats.autoSwitched = true;
      saveUsageStats(stats);
      console.warn(`[MapUsage] Auto-switched to MapLibre. Mapbox usage at ${(usagePercent * 100).toFixed(1)}%`);
    }
    
    return {
      provider: 'maplibre',
      reason: `Auto-switched: Mapbox at ${(usagePercent * 100).toFixed(1)}% of free tier`,
      usagePercent,
      remainingLoads,
      isWarning: true,
      isCritical: true,
    };
  }

  // Use configured provider (default to mapbox if token exists)
  const provider = configuredProvider || 'mapbox';
  
  return {
    provider,
    reason: isWarning 
      ? `Using ${provider} (warning: ${(usagePercent * 100).toFixed(1)}% of free tier used)`
      : `Using configured provider: ${provider}`,
    usagePercent,
    remainingLoads,
    isWarning,
    isCritical,
  };
}

/**
 * Get current usage statistics
 */
export function getMapUsageStats(): MapUsageStats & { 
  usagePercent: number; 
  remainingLoads: number;
  freeLimit: number;
} {
  const stats = getUsageStats();
  return {
    ...stats,
    usagePercent: stats.mapboxLoads / MAPBOX_FREE_TIER_LIMIT,
    remainingLoads: MAPBOX_FREE_TIER_LIMIT - stats.mapboxLoads,
    freeLimit: MAPBOX_FREE_TIER_LIMIT,
  };
}

/**
 * Manually override the map provider
 */
export function setMapProviderOverride(provider: 'mapbox' | 'maplibre' | null): void {
  const stats = getUsageStats();
  stats.manualOverride = provider;
  saveUsageStats(stats);
}

/**
 * Reset usage stats (for testing or new billing cycle)
 */
export function resetMapUsageStats(): void {
  const newStats = createEmptyStats();
  saveUsageStats(newStats);
}

/**
 * Check if we should show a usage warning to the user
 */
export function shouldShowUsageWarning(): boolean {
  const decision = getMapProviderDecision();
  return decision.isWarning && !decision.isCritical;
}

/**
 * Check if we've auto-switched due to usage
 */
export function hasAutoSwitched(): boolean {
  const stats = getUsageStats();
  return stats.autoSwitched;
}
