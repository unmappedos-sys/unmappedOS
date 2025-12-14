/**
 * Zone Confidence Engine
 * 
 * Core intelligence system for Unmapped OS.
 * Replaces fake "real-time" with honest, adaptive confidence scoring.
 * 
 * Confidence changes based on:
 * - Time decay (zones become less reliable over time)
 * - User intel (fresh reports boost confidence)
 * - Conflict reports (contradictory intel lowers confidence)
 * - Hazard reports (safety concerns trigger degradation)
 * - Price anomalies (unusual price reports flag review)
 */

// ============================================================================
// TYPES
// ============================================================================

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'DEGRADED' | 'UNKNOWN';
export type ZoneState = 'ACTIVE' | 'DEGRADED' | 'OFFLINE' | 'UNKNOWN';
export type IntelType = 
  | 'PRICE_SUBMISSION'
  | 'HASSLE_REPORT'
  | 'CONSTRUCTION'
  | 'CROWD_SURGE'
  | 'QUIET_CONFIRMED'
  | 'HAZARD_REPORT'
  | 'VERIFICATION';

export interface IntelSubmission {
  id: string;
  zone_id: string;
  user_id: string;
  type: IntelType;
  data: Record<string, unknown>;
  trust_weight: number; // 0-1, based on user karma
  created_at: string;
}

export interface ZoneConfidenceState {
  zone_id: string;
  score: number;
  level: ConfidenceLevel;
  state: ZoneState;
  last_verified_at: string | null;
  last_intel_at: string | null;
  verification_count: number;
  intel_count_24h: number;
  conflict_count: number;
  hazard_active: boolean;
  hazard_expires_at: string | null;
  anomaly_detected: boolean;
  anomaly_reason: string | null;
  updated_at: string;
}

export interface ConfidenceFactors {
  base_score: number;
  time_decay: number;
  intel_boost: number;
  conflict_penalty: number;
  hazard_penalty: number;
  anomaly_penalty: number;
  final_score: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export const CONFIDENCE_CONFIG = {
  // Decay settings
  DECAY_RATE_PER_DAY: 0.02,        // 2% per day
  DECAY_FLOOR: 20,                  // Never go below 20
  DECAY_GRACE_PERIOD_HOURS: 24,     // No decay for 24h after intel

  // Intel boost settings
  INTEL_BOOST_BASE: 5,              // Base points per intel
  INTEL_BOOST_MAX: 15,              // Max boost per intel
  INTEL_BOOST_CAP_24H: 30,          // Max total boost in 24h
  
  // Trust weighting
  MIN_TRUST_WEIGHT: 0.3,            // Minimum weight for any user
  MAX_TRUST_WEIGHT: 1.5,            // Maximum weight for trusted users
  
  // Conflict detection
  CONFLICT_THRESHOLD: 3,            // Conflicting reports to trigger
  CONFLICT_WINDOW_HOURS: 6,         // Window to detect conflicts
  CONFLICT_PENALTY: 15,             // Score penalty for conflicts
  
  // Hazard settings
  HAZARD_THRESHOLD_REPORTS: 2,      // Reports to trigger hazard
  HAZARD_WINDOW_HOURS: 24,          // Window for hazard aggregation
  HAZARD_DURATION_DAYS: 7,          // Default hazard duration
  HAZARD_PENALTY: 30,               // Score penalty for active hazard
  
  // Anomaly detection
  PRICE_ANOMALY_THRESHOLD: 0.5,     // 50% deviation triggers anomaly
  CROWD_ANOMALY_THRESHOLD: 3,       // 3 surge reports in 1h
  ANOMALY_PENALTY: 10,              // Score penalty for anomaly
  
  // Score thresholds
  HIGH_THRESHOLD: 80,
  MEDIUM_THRESHOLD: 60,
  LOW_THRESHOLD: 40,
  DEGRADED_THRESHOLD: 20,
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Convert numeric score to confidence level
 */
export function scoreToLevel(score: number): ConfidenceLevel {
  const { HIGH_THRESHOLD, MEDIUM_THRESHOLD, LOW_THRESHOLD, DEGRADED_THRESHOLD } = CONFIDENCE_CONFIG;
  
  if (score >= HIGH_THRESHOLD) return 'HIGH';
  if (score >= MEDIUM_THRESHOLD) return 'MEDIUM';
  if (score >= LOW_THRESHOLD) return 'LOW';
  if (score >= DEGRADED_THRESHOLD) return 'DEGRADED';
  return 'UNKNOWN';
}

/**
 * Determine zone state from confidence and hazard status
 */
export function determineZoneState(
  score: number,
  hazardActive: boolean,
  anomalyDetected: boolean
): ZoneState {
  if (hazardActive) return 'OFFLINE';
  if (score < CONFIDENCE_CONFIG.DEGRADED_THRESHOLD) return 'DEGRADED';
  if (anomalyDetected) return 'DEGRADED';
  return 'ACTIVE';
}

/**
 * Calculate time-based decay
 */
export function calculateTimeDecay(
  currentScore: number,
  lastIntelAt: string | null
): number {
  if (!lastIntelAt) {
    // No intel ever - apply full decay
    return CONFIDENCE_CONFIG.DECAY_RATE_PER_DAY;
  }
  
  const lastIntel = new Date(lastIntelAt);
  const now = new Date();
  const hoursSinceIntel = (now.getTime() - lastIntel.getTime()) / (1000 * 60 * 60);
  
  // Grace period - no decay
  if (hoursSinceIntel < CONFIDENCE_CONFIG.DECAY_GRACE_PERIOD_HOURS) {
    return 0;
  }
  
  // Calculate days since grace period ended
  const daysOfDecay = (hoursSinceIntel - CONFIDENCE_CONFIG.DECAY_GRACE_PERIOD_HOURS) / 24;
  return Math.min(
    currentScore - CONFIDENCE_CONFIG.DECAY_FLOOR,
    daysOfDecay * CONFIDENCE_CONFIG.DECAY_RATE_PER_DAY * 100
  );
}

/**
 * Calculate intel boost based on submission
 */
export function calculateIntelBoost(
  intelType: IntelType,
  trustWeight: number,
  recentIntelCount: number
): number {
  // Base boost varies by type
  const typeMultipliers: Record<IntelType, number> = {
    VERIFICATION: 1.5,
    PRICE_SUBMISSION: 1.0,
    QUIET_CONFIRMED: 0.8,
    CROWD_SURGE: 0.7,
    HASSLE_REPORT: 0.6,
    CONSTRUCTION: 0.5,
    HAZARD_REPORT: 0, // Hazards don't boost confidence
  };
  
  const baseBoost = CONFIDENCE_CONFIG.INTEL_BOOST_BASE * (typeMultipliers[intelType] || 1);
  const weightedBoost = baseBoost * Math.max(
    CONFIDENCE_CONFIG.MIN_TRUST_WEIGHT,
    Math.min(CONFIDENCE_CONFIG.MAX_TRUST_WEIGHT, trustWeight)
  );
  
  // Diminishing returns for multiple intel in 24h
  const diminishingFactor = Math.max(0.2, 1 - (recentIntelCount * 0.15));
  const finalBoost = weightedBoost * diminishingFactor;
  
  return Math.min(CONFIDENCE_CONFIG.INTEL_BOOST_MAX, finalBoost);
}

/**
 * Detect price anomaly
 */
export function detectPriceAnomaly(
  newPrice: number,
  averagePrice: number,
  priceCount: number
): boolean {
  if (priceCount < 3) return false; // Need baseline
  
  const deviation = Math.abs(newPrice - averagePrice) / averagePrice;
  return deviation > CONFIDENCE_CONFIG.PRICE_ANOMALY_THRESHOLD;
}

/**
 * Calculate full confidence update
 */
export function calculateConfidenceUpdate(
  current: ZoneConfidenceState,
  intel: IntelSubmission | null,
  recentIntel: IntelSubmission[],
  hazardReports24h: number,
  priceAnomaly: boolean
): { newState: ZoneConfidenceState; factors: ConfidenceFactors } {
  const now = new Date().toISOString();
  
  // Start with current score
  let factors: ConfidenceFactors = {
    base_score: current.score,
    time_decay: 0,
    intel_boost: 0,
    conflict_penalty: 0,
    hazard_penalty: 0,
    anomaly_penalty: 0,
    final_score: current.score,
  };
  
  // 1. Apply time decay
  factors.time_decay = calculateTimeDecay(current.score, current.last_intel_at);
  
  // 2. Calculate intel boost if new intel
  if (intel && intel.type !== 'HAZARD_REPORT') {
    factors.intel_boost = calculateIntelBoost(
      intel.type,
      intel.trust_weight,
      current.intel_count_24h
    );
  }
  
  // 3. Detect conflicts (contradictory reports)
  const conflictCount = detectConflicts(recentIntel);
  if (conflictCount >= CONFIDENCE_CONFIG.CONFLICT_THRESHOLD) {
    factors.conflict_penalty = CONFIDENCE_CONFIG.CONFLICT_PENALTY;
  }
  
  // 4. Check hazard threshold
  let hazardActive = current.hazard_active;
  let hazardExpiresAt = current.hazard_expires_at;
  
  if (hazardReports24h >= CONFIDENCE_CONFIG.HAZARD_THRESHOLD_REPORTS) {
    hazardActive = true;
    hazardExpiresAt = new Date(
      Date.now() + CONFIDENCE_CONFIG.HAZARD_DURATION_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    factors.hazard_penalty = CONFIDENCE_CONFIG.HAZARD_PENALTY;
  } else if (hazardActive && hazardExpiresAt && new Date(hazardExpiresAt) < new Date()) {
    // Hazard expired
    hazardActive = false;
    hazardExpiresAt = null;
  }
  
  // 5. Check anomalies
  let anomalyDetected = priceAnomaly;
  let anomalyReason: string | null = null;
  
  if (priceAnomaly) {
    anomalyDetected = true;
    anomalyReason = 'PRICE_DEVIATION';
    factors.anomaly_penalty = CONFIDENCE_CONFIG.ANOMALY_PENALTY;
  }
  
  // Calculate final score
  factors.final_score = Math.max(
    CONFIDENCE_CONFIG.DECAY_FLOOR,
    Math.min(100,
      factors.base_score
      - factors.time_decay
      + factors.intel_boost
      - factors.conflict_penalty
      - factors.hazard_penalty
      - factors.anomaly_penalty
    )
  );
  
  // Build new state
  const newState: ZoneConfidenceState = {
    zone_id: current.zone_id,
    score: Math.round(factors.final_score * 10) / 10,
    level: scoreToLevel(factors.final_score),
    state: determineZoneState(factors.final_score, hazardActive, anomalyDetected),
    last_verified_at: intel?.type === 'VERIFICATION' ? now : current.last_verified_at,
    last_intel_at: intel ? now : current.last_intel_at,
    verification_count: intel?.type === 'VERIFICATION' 
      ? current.verification_count + 1 
      : current.verification_count,
    intel_count_24h: intel 
      ? current.intel_count_24h + 1 
      : current.intel_count_24h,
    conflict_count: conflictCount,
    hazard_active: hazardActive,
    hazard_expires_at: hazardExpiresAt,
    anomaly_detected: anomalyDetected,
    anomaly_reason: anomalyReason,
    updated_at: now,
  };
  
  return { newState, factors };
}

/**
 * Detect conflicting intel reports
 */
function detectConflicts(recentIntel: IntelSubmission[]): number {
  // Check for conflicting reports (e.g., QUIET_CONFIRMED vs CROWD_SURGE)
  const conflictPairs: [IntelType, IntelType][] = [
    ['QUIET_CONFIRMED', 'CROWD_SURGE'],
    ['QUIET_CONFIRMED', 'HASSLE_REPORT'],
  ];
  
  let conflicts = 0;
  for (const [type1, type2] of conflictPairs) {
    const hasType1 = recentIntel.some(i => i.type === type1);
    const hasType2 = recentIntel.some(i => i.type === type2);
    if (hasType1 && hasType2) conflicts++;
  }
  
  return conflicts;
}

/**
 * Apply daily decay to all zones (for cron job)
 */
export function applyDailyDecay(zones: ZoneConfidenceState[]): ZoneConfidenceState[] {
  const now = new Date().toISOString();
  
  return zones.map(zone => {
    const decay = calculateTimeDecay(zone.score, zone.last_intel_at);
    const newScore = Math.max(
      CONFIDENCE_CONFIG.DECAY_FLOOR,
      zone.score - decay
    );
    
    // Check if hazard expired
    let hazardActive = zone.hazard_active;
    let hazardExpiresAt = zone.hazard_expires_at;
    
    if (hazardActive && hazardExpiresAt && new Date(hazardExpiresAt) < new Date()) {
      hazardActive = false;
      hazardExpiresAt = null;
    }
    
    return {
      ...zone,
      score: Math.round(newScore * 10) / 10,
      level: scoreToLevel(newScore),
      state: determineZoneState(newScore, hazardActive, zone.anomaly_detected),
      hazard_active: hazardActive,
      hazard_expires_at: hazardExpiresAt,
      intel_count_24h: 0, // Reset daily counter
      updated_at: now,
    };
  });
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Format confidence for display
 */
export function formatConfidenceDisplay(state: ZoneConfidenceState): {
  label: string;
  color: string;
  icon: string;
  description: string;
} {
  const displays: Record<ConfidenceLevel, { label: string; color: string; icon: string; description: string }> = {
    HIGH: {
      label: 'HIGH CONFIDENCE',
      color: '#22c55e', // green
      icon: '◉',
      description: 'Recently verified, reliable intel',
    },
    MEDIUM: {
      label: 'MEDIUM CONFIDENCE',
      color: '#eab308', // yellow
      icon: '◎',
      description: 'Some recent intel, generally reliable',
    },
    LOW: {
      label: 'LOW CONFIDENCE',
      color: '#f97316', // orange
      icon: '○',
      description: 'Limited recent intel, verify on ground',
    },
    DEGRADED: {
      label: 'DEGRADED',
      color: '#ef4444', // red
      icon: '⊘',
      description: 'Stale data or active concerns',
    },
    UNKNOWN: {
      label: 'UNKNOWN',
      color: '#6b7280', // gray
      icon: '?',
      description: 'No intel available',
    },
  };
  
  return displays[state.level];
}

/**
 * Format last verified time
 */
export function formatLastVerified(lastVerifiedAt: string | null): string {
  if (!lastVerifiedAt) return 'NEVER VERIFIED';
  
  const verified = new Date(lastVerifiedAt);
  const now = new Date();
  const hoursAgo = Math.floor((now.getTime() - verified.getTime()) / (1000 * 60 * 60));
  
  if (hoursAgo < 1) return 'VERIFIED < 1H AGO';
  if (hoursAgo < 24) return `VERIFIED ${hoursAgo}H AGO`;
  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo === 1) return 'VERIFIED 1 DAY AGO';
  if (daysAgo < 7) return `VERIFIED ${daysAgo} DAYS AGO`;
  return `VERIFIED ${Math.floor(daysAgo / 7)} WEEKS AGO`;
}

/**
 * Get zone status message
 */
export function getZoneStatusMessage(state: ZoneConfidenceState): string | null {
  if (state.hazard_active) {
    return `⚠️ ZONE OFFLINE: Safety concern reported. Expires ${formatLastVerified(state.hazard_expires_at)}`;
  }
  if (state.anomaly_detected) {
    return `⚡ ANOMALY DETECTED: ${state.anomaly_reason || 'Unusual activity'}. Intel may be unreliable.`;
  }
  if (state.state === 'DEGRADED') {
    return '📉 DEGRADED: Limited recent intel. Verify conditions on ground.';
  }
  return null;
}
