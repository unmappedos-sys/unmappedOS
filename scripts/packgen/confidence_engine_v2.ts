/**
 * Confidence Engine v2 - City Seeding Edition
 * 
 * Manages data freshness, confidence decay, and verification across city packs.
 * This is the core system for HONEST data quality indicators.
 * 
 * DESIGN PRINCIPLES:
 * - All data starts with < 100% confidence (we never claim perfection)
 * - Confidence decays over time based on data type volatility
 * - Verification boosts confidence (with diminishing returns)
 * - Anomalies trigger warnings, not silent failures
 * - Full audit trail for all confidence changes
 */

// =============================================================================
// TYPES
// =============================================================================

export type DataSource = 
  | 'OSM_STRUCTURAL'      // OpenStreetMap - slow-moving truth
  | 'OSM_DERIVED'         // Derived from OSM (textures, baselines)
  | 'MANUAL_SEED'         // Human-entered controlled data
  | 'USER_INTEL'          // Crowd-sourced user submissions
  | 'API_WEATHER'         // Weather API (real-time)
  | 'COMPUTED'            // Algorithm-generated
  | 'LEGACY';             // Old data, unknown source

export type DataVolatility = 
  | 'STATIC'              // Rarely changes (streets, buildings)
  | 'SLOW'                // Changes over months (businesses, hours)
  | 'MODERATE'            // Changes over weeks (prices, conditions)
  | 'FAST'                // Changes daily (events, crowds)
  | 'REALTIME';           // Changes hourly (weather, traffic)

export interface ConfidenceConfig {
  source: DataSource;
  volatility: DataVolatility;
  initial_confidence: number;       // 0-1, starting confidence
  decay_rate_per_day: number;       // Daily decay multiplier
  min_confidence: number;           // Floor (never goes below)
  verification_boost: number;       // Per verification
  max_verifications_counted: number; // Diminishing returns cap
}

export interface ConfidenceRecord {
  entity_type: string;              // 'zone' | 'anchor' | 'price' | 'corridor' | etc.
  entity_id: string;
  source: DataSource;
  initial_confidence: number;
  current_confidence: number;
  created_at: string;
  last_updated: string;
  last_verified: string | null;
  verification_count: number;
  decay_applied_at: string;
  anomaly_flags: string[];
  audit_log: AuditEntry[];
}

export interface AuditEntry {
  timestamp: string;
  action: 'CREATED' | 'DECAY' | 'VERIFIED' | 'ANOMALY' | 'RESET' | 'BOOST' | 'KILL';
  confidence_before: number;
  confidence_after: number;
  reason: string;
  actor?: string;  // 'system' | user_id | 'admin'
}

export interface FreshnessIndicator {
  status: 'FRESH' | 'RECENT' | 'AGING' | 'STALE' | 'EXPIRED';
  confidence_percent: number;
  days_since_update: number;
  days_since_verification: number | null;
  verification_count: number;
  warning: string | null;
  recommendation: string;
}

// =============================================================================
// CONFIGURATION - Volatility-based decay rates
// =============================================================================

export const SOURCE_CONFIGS: Record<DataSource, ConfidenceConfig> = {
  OSM_STRUCTURAL: {
    source: 'OSM_STRUCTURAL',
    volatility: 'STATIC',
    initial_confidence: 0.95,        // OSM data is generally reliable
    decay_rate_per_day: 0.0001,      // 0.01% per day (~3% per year)
    min_confidence: 0.7,
    verification_boost: 0.02,
    max_verifications_counted: 5,
  },
  
  OSM_DERIVED: {
    source: 'OSM_DERIVED',
    volatility: 'SLOW',
    initial_confidence: 0.8,         // Derived = some uncertainty
    decay_rate_per_day: 0.001,       // 0.1% per day (~30% per year)
    min_confidence: 0.5,
    verification_boost: 0.03,
    max_verifications_counted: 10,
  },
  
  MANUAL_SEED: {
    source: 'MANUAL_SEED',
    volatility: 'MODERATE',
    initial_confidence: 0.85,        // Human-entered, carefully curated
    decay_rate_per_day: 0.002,       // 0.2% per day
    min_confidence: 0.4,
    verification_boost: 0.05,
    max_verifications_counted: 10,
  },
  
  USER_INTEL: {
    source: 'USER_INTEL',
    volatility: 'FAST',
    initial_confidence: 0.6,         // Single user = needs verification
    decay_rate_per_day: 0.01,        // 1% per day
    min_confidence: 0.2,
    verification_boost: 0.1,
    max_verifications_counted: 20,
  },
  
  API_WEATHER: {
    source: 'API_WEATHER',
    volatility: 'REALTIME',
    initial_confidence: 0.9,         // API data is usually accurate
    decay_rate_per_day: 1.0,         // Expires within the day
    min_confidence: 0,
    verification_boost: 0,           // Can't verify weather
    max_verifications_counted: 0,
  },
  
  COMPUTED: {
    source: 'COMPUTED',
    volatility: 'SLOW',
    initial_confidence: 0.7,         // Algorithms have uncertainty
    decay_rate_per_day: 0.0005,
    min_confidence: 0.5,
    verification_boost: 0.04,
    max_verifications_counted: 15,
  },
  
  LEGACY: {
    source: 'LEGACY',
    volatility: 'MODERATE',
    initial_confidence: 0.5,         // Unknown source = low trust
    decay_rate_per_day: 0.005,
    min_confidence: 0.2,
    verification_boost: 0.05,
    max_verifications_counted: 10,
  },
};

// Freshness thresholds
const FRESHNESS_THRESHOLDS = {
  FRESH:   { max_days: 7,   min_confidence: 0.8 },
  RECENT:  { max_days: 30,  min_confidence: 0.6 },
  AGING:   { max_days: 90,  min_confidence: 0.4 },
  STALE:   { max_days: 180, min_confidence: 0.2 },
  EXPIRED: { max_days: Infinity, min_confidence: 0 },
};

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Create a new confidence record for an entity
 */
export function createConfidenceRecord(
  entityType: string,
  entityId: string,
  source: DataSource
): ConfidenceRecord {
  const config = SOURCE_CONFIGS[source];
  const now = new Date().toISOString();
  
  return {
    entity_type: entityType,
    entity_id: entityId,
    source,
    initial_confidence: config.initial_confidence,
    current_confidence: config.initial_confidence,
    created_at: now,
    last_updated: now,
    last_verified: null,
    verification_count: 0,
    decay_applied_at: now,
    anomaly_flags: [],
    audit_log: [{
      timestamp: now,
      action: 'CREATED',
      confidence_before: 0,
      confidence_after: config.initial_confidence,
      reason: `Initial creation from ${source}`,
      actor: 'system',
    }],
  };
}

/**
 * Apply time-based decay to a confidence record
 */
export function applyDecay(record: ConfidenceRecord): ConfidenceRecord {
  const config = SOURCE_CONFIGS[record.source];
  const now = new Date();
  const lastDecay = new Date(record.decay_applied_at);
  
  const daysSinceDecay = (now.getTime() - lastDecay.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceDecay < 1) {
    return record; // No decay needed yet
  }
  
  const decayFactor = Math.pow(1 - config.decay_rate_per_day, daysSinceDecay);
  const newConfidence = Math.max(
    config.min_confidence,
    record.current_confidence * decayFactor
  );
  
  const nowIso = now.toISOString();
  
  return {
    ...record,
    current_confidence: newConfidence,
    decay_applied_at: nowIso,
    audit_log: [
      ...record.audit_log,
      {
        timestamp: nowIso,
        action: 'DECAY',
        confidence_before: record.current_confidence,
        confidence_after: newConfidence,
        reason: `Time decay: ${daysSinceDecay.toFixed(1)} days since last decay`,
        actor: 'system',
      },
    ],
  };
}

/**
 * Boost confidence from verification
 */
export function applyVerification(
  record: ConfidenceRecord,
  verifierId: string = 'anonymous'
): ConfidenceRecord {
  const config = SOURCE_CONFIGS[record.source];
  const now = new Date().toISOString();
  
  // Check if we've hit max verifications
  if (record.verification_count >= config.max_verifications_counted) {
    return {
      ...record,
      last_verified: now,
      audit_log: [
        ...record.audit_log,
        {
          timestamp: now,
          action: 'VERIFIED',
          confidence_before: record.current_confidence,
          confidence_after: record.current_confidence,
          reason: `Verification by ${verifierId} (max verifications reached, no boost)`,
          actor: verifierId,
        },
      ],
    };
  }
  
  // Diminishing returns formula
  const boostMultiplier = 1 / (1 + record.verification_count * 0.1);
  const actualBoost = config.verification_boost * boostMultiplier;
  
  const newConfidence = Math.min(
    config.initial_confidence, // Never exceed initial confidence through verification
    record.current_confidence + actualBoost
  );
  
  return {
    ...record,
    current_confidence: newConfidence,
    last_verified: now,
    verification_count: record.verification_count + 1,
    audit_log: [
      ...record.audit_log,
      {
        timestamp: now,
        action: 'VERIFIED',
        confidence_before: record.current_confidence,
        confidence_after: newConfidence,
        reason: `Verification by ${verifierId} (+${(actualBoost * 100).toFixed(1)}%)`,
        actor: verifierId,
      },
    ],
  };
}

/**
 * Apply anomaly flag (reduces confidence)
 */
export function flagAnomaly(
  record: ConfidenceRecord,
  anomalyType: string,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
): ConfidenceRecord {
  const now = new Date().toISOString();
  
  const penaltyMap = {
    LOW: 0.05,
    MEDIUM: 0.15,
    HIGH: 0.3,
    CRITICAL: 0.5,
  };
  
  const penalty = penaltyMap[severity];
  const config = SOURCE_CONFIGS[record.source];
  
  const newConfidence = Math.max(
    config.min_confidence,
    record.current_confidence * (1 - penalty)
  );
  
  return {
    ...record,
    current_confidence: newConfidence,
    anomaly_flags: [...record.anomaly_flags, `${anomalyType}:${severity}:${now}`],
    audit_log: [
      ...record.audit_log,
      {
        timestamp: now,
        action: 'ANOMALY',
        confidence_before: record.current_confidence,
        confidence_after: newConfidence,
        reason: `Anomaly detected: ${anomalyType} (${severity})`,
        actor: 'system',
      },
    ],
  };
}

/**
 * Kill switch - set confidence to minimum
 */
export function killConfidence(
  record: ConfidenceRecord,
  reason: string,
  actor: string = 'system'
): ConfidenceRecord {
  const config = SOURCE_CONFIGS[record.source];
  const now = new Date().toISOString();
  
  return {
    ...record,
    current_confidence: config.min_confidence,
    anomaly_flags: [...record.anomaly_flags, `KILLED:${now}`],
    audit_log: [
      ...record.audit_log,
      {
        timestamp: now,
        action: 'KILL',
        confidence_before: record.current_confidence,
        confidence_after: config.min_confidence,
        reason: `Kill switch: ${reason}`,
        actor,
      },
    ],
  };
}

// =============================================================================
// FRESHNESS INDICATORS
// =============================================================================

/**
 * Calculate freshness indicator for display
 */
export function calculateFreshness(record: ConfidenceRecord): FreshnessIndicator {
  const now = new Date();
  const lastUpdate = new Date(record.last_updated);
  const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
  
  let daysSinceVerification: number | null = null;
  if (record.last_verified) {
    const lastVerified = new Date(record.last_verified);
    daysSinceVerification = (now.getTime() - lastVerified.getTime()) / (1000 * 60 * 60 * 24);
  }
  
  // Determine status
  let status: FreshnessIndicator['status'] = 'EXPIRED';
  for (const [statusName, thresholds] of Object.entries(FRESHNESS_THRESHOLDS)) {
    if (daysSinceUpdate <= thresholds.max_days && record.current_confidence >= thresholds.min_confidence) {
      status = statusName as FreshnessIndicator['status'];
      break;
    }
  }
  
  // Generate warning
  let warning: string | null = null;
  if (record.anomaly_flags.length > 0) {
    warning = `${record.anomaly_flags.length} anomaly flag(s) detected`;
  } else if (status === 'STALE' || status === 'EXPIRED') {
    warning = 'Data may be outdated';
  }
  
  // Generate recommendation
  let recommendation: string;
  switch (status) {
    case 'FRESH':
      recommendation = 'Data is recent and reliable';
      break;
    case 'RECENT':
      recommendation = 'Data is reasonably current';
      break;
    case 'AGING':
      recommendation = 'Consider verifying before relying on this data';
      break;
    case 'STALE':
      recommendation = 'Data needs verification - may not reflect current conditions';
      break;
    case 'EXPIRED':
      recommendation = 'Data is outdated - do not rely on this without verification';
      break;
  }
  
  return {
    status,
    confidence_percent: Math.round(record.current_confidence * 100),
    days_since_update: Math.round(daysSinceUpdate),
    days_since_verification: daysSinceVerification !== null ? Math.round(daysSinceVerification) : null,
    verification_count: record.verification_count,
    warning,
    recommendation,
  };
}

/**
 * Format freshness for display
 */
export function formatFreshness(indicator: FreshnessIndicator): string {
  const statusEmoji = {
    FRESH: '🟢',
    RECENT: '🟡',
    AGING: '🟠',
    STALE: '🔴',
    EXPIRED: '⚫',
  };
  
  let result = `${statusEmoji[indicator.status]} ${indicator.status} (${indicator.confidence_percent}% confidence)`;
  
  if (indicator.days_since_update > 0) {
    result += ` • ${indicator.days_since_update}d ago`;
  }
  
  if (indicator.verification_count > 0) {
    result += ` • ${indicator.verification_count} verifications`;
  }
  
  return result;
}

// =============================================================================
// PACK-LEVEL CONFIDENCE
// =============================================================================

export interface PackConfidenceSummary {
  overall_confidence: number;
  zone_confidence_avg: number;
  anchor_confidence_avg: number;
  price_confidence_avg: number;
  oldest_data_days: number;
  newest_data_days: number;
  total_verifications: number;
  anomaly_count: number;
  freshness_status: FreshnessIndicator['status'];
  readiness_score: number;  // 0-100
}

/**
 * Calculate pack-level confidence summary
 */
export function calculatePackConfidence(
  records: ConfidenceRecord[]
): PackConfidenceSummary {
  if (records.length === 0) {
    return {
      overall_confidence: 0,
      zone_confidence_avg: 0,
      anchor_confidence_avg: 0,
      price_confidence_avg: 0,
      oldest_data_days: Infinity,
      newest_data_days: 0,
      total_verifications: 0,
      anomaly_count: 0,
      freshness_status: 'EXPIRED',
      readiness_score: 0,
    };
  }
  
  const now = new Date();
  
  // Group by entity type
  const zones = records.filter(r => r.entity_type === 'zone');
  const anchors = records.filter(r => r.entity_type === 'anchor');
  const prices = records.filter(r => r.entity_type === 'price');
  
  const avg = (arr: ConfidenceRecord[]) => 
    arr.length > 0 ? arr.reduce((s, r) => s + r.current_confidence, 0) / arr.length : 0;
  
  const overall = avg(records);
  const zoneAvg = avg(zones);
  const anchorAvg = avg(anchors);
  const priceAvg = avg(prices);
  
  // Calculate age range
  const ages = records.map(r => 
    (now.getTime() - new Date(r.last_updated).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const oldest = Math.max(...ages);
  const newest = Math.min(...ages);
  
  // Count verifications and anomalies
  const totalVerifications = records.reduce((s, r) => s + r.verification_count, 0);
  const anomalyCount = records.reduce((s, r) => s + r.anomaly_flags.length, 0);
  
  // Determine overall freshness
  let freshnessStatus: FreshnessIndicator['status'] = 'FRESH';
  if (overall < 0.2 || oldest > 180) freshnessStatus = 'EXPIRED';
  else if (overall < 0.4 || oldest > 90) freshnessStatus = 'STALE';
  else if (overall < 0.6 || oldest > 30) freshnessStatus = 'AGING';
  else if (overall < 0.8 || oldest > 7) freshnessStatus = 'RECENT';
  
  // Calculate readiness score (0-100)
  // Weighted: 40% zones, 30% anchors, 20% prices, 10% coverage
  const coverage = Math.min(1, records.length / 50); // Expect ~50 entities per pack
  const readiness = Math.round(
    (zoneAvg * 40 + anchorAvg * 30 + priceAvg * 20 + coverage * 10) * 
    (1 - anomalyCount * 0.02) // Penalty for anomalies
  );
  
  return {
    overall_confidence: overall,
    zone_confidence_avg: zoneAvg,
    anchor_confidence_avg: anchorAvg,
    price_confidence_avg: priceAvg,
    oldest_data_days: oldest,
    newest_data_days: newest,
    total_verifications: totalVerifications,
    anomaly_count: anomalyCount,
    freshness_status: freshnessStatus,
    readiness_score: Math.max(0, Math.min(100, readiness)),
  };
}

// =============================================================================
// CONFIDENCE DISPLAY HELPERS
// =============================================================================

/**
 * Get user-facing confidence description
 */
export function getConfidenceDescription(confidence: number): string {
  if (confidence >= 0.9) return 'Very High';
  if (confidence >= 0.75) return 'High';
  if (confidence >= 0.6) return 'Moderate';
  if (confidence >= 0.4) return 'Low';
  if (confidence >= 0.2) return 'Very Low';
  return 'Insufficient';
}

/**
 * Get color for confidence display
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return '#22c55e'; // green-500
  if (confidence >= 0.6) return '#eab308'; // yellow-500
  if (confidence >= 0.4) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}

/**
 * Generate honest disclosure message
 */
export function generateDisclosure(summary: PackConfidenceSummary): string {
  const parts: string[] = [];
  
  // Main status
  parts.push(`Data confidence: ${Math.round(summary.overall_confidence * 100)}%`);
  
  // Age disclosure
  if (summary.oldest_data_days > 90) {
    parts.push(`Some data is ${Math.round(summary.oldest_data_days)} days old`);
  }
  
  // Verification status
  if (summary.total_verifications > 0) {
    parts.push(`${summary.total_verifications} user verifications`);
  } else {
    parts.push('Not yet verified by users');
  }
  
  // Anomaly warning
  if (summary.anomaly_count > 0) {
    parts.push(`${summary.anomaly_count} data anomalies detected`);
  }
  
  return parts.join(' • ');
}

// =============================================================================
// CLI TEST
// =============================================================================

if (require.main === module) {
  console.log('=== Confidence Engine Test ===\n');
  
  // Create test record
  let record = createConfidenceRecord('zone', 'zone_sukhumvit_123', 'OSM_DERIVED');
  console.log('Initial:', formatFreshness(calculateFreshness(record)));
  
  // Simulate time passing (modify decay_applied_at for testing)
  record = {
    ...record,
    decay_applied_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
  record = applyDecay(record);
  console.log('After 30 days:', formatFreshness(calculateFreshness(record)));
  
  // Verify
  record = applyVerification(record, 'user_123');
  console.log('After verification:', formatFreshness(calculateFreshness(record)));
  
  // Anomaly
  record = flagAnomaly(record, 'price_spike', 'MEDIUM');
  console.log('After anomaly:', formatFreshness(calculateFreshness(record)));
  
  // Kill
  record = killConfidence(record, 'Multiple hazard reports');
  console.log('After kill:', formatFreshness(calculateFreshness(record)));
  
  // Show audit log
  console.log('\nAudit Log:');
  record.audit_log.forEach(entry => {
    console.log(`  ${entry.action}: ${entry.confidence_before.toFixed(2)} → ${entry.confidence_after.toFixed(2)} - ${entry.reason}`);
  });
}
