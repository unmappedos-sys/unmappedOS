/**
 * Kill Switch & Anomaly Detection System v1
 * 
 * Automatic and manual controls for data safety.
 * 
 * CORE PRINCIPLE: When in doubt, go OFFLINE.
 * A zone showing outdated data is DANGEROUS.
 * Better to show nothing than show lies.
 * 
 * KILL TRIGGERS:
 * - ≥2 hazard reports → OFFLINE for 7 days
 * - ≥3 unverified price anomalies → OFFLINE until verified
 * - Data staleness > threshold → DEGRADED mode
 * - Manual admin kill → Immediate OFFLINE
 * 
 * FULL AUDIT LOGGING for all state changes.
 */

// =============================================================================
// TYPES
// =============================================================================

export type EntityState = 
  | 'ACTIVE'      // Normal operation
  | 'DEGRADED'    // Limited confidence, show warnings
  | 'OFFLINE'     // Do not display to users
  | 'KILLED';     // Permanently removed

export type KillReason =
  | 'HAZARD_REPORTS'
  | 'PRICE_ANOMALY'
  | 'STALENESS'
  | 'ADMIN_MANUAL'
  | 'SYSTEM_AUTO'
  | 'USER_FLAGGED'
  | 'VERIFICATION_FAILED';

export interface KillSwitch {
  entity_type: string;
  entity_id: string;
  city_slug: string;
  state: EntityState;
  reason: KillReason | null;
  killed_at: string | null;
  killed_by: string | null;
  revive_after: string | null;       // Auto-revive timestamp
  hazard_count: number;
  anomaly_count: number;
  last_verified: string | null;
  metadata: Record<string, any>;
  audit_log: KillAuditEntry[];
}

export interface KillAuditEntry {
  timestamp: string;
  previous_state: EntityState;
  new_state: EntityState;
  reason: KillReason | string;
  actor: string;
  details: string;
}

export interface AnomalyReport {
  id: string;
  entity_type: string;
  entity_id: string;
  city_slug: string;
  anomaly_type: AnomalyType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reported_at: string;
  reported_by: string;
  description: string;
  evidence?: any;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
}

export type AnomalyType = 
  | 'PRICE_SPIKE'           // Price way above expected
  | 'PRICE_DROP'            // Price way below expected (suspicious)
  | 'HAZARD_PHYSICAL'       // Physical danger (construction, etc.)
  | 'HAZARD_SAFETY'         // Safety concern (crime, harassment)
  | 'HAZARD_SCAM'           // Scam operation detected
  | 'CLOSURE_PERMANENT'     // Business/location closed
  | 'CLOSURE_TEMPORARY'     // Temporarily unavailable
  | 'DATA_MISMATCH'         // Reported data doesn't match reality
  | 'COORDINATE_ERROR'      // Wrong location
  | 'TEXTURE_MISMATCH'      // Zone texture doesn't match experience
  | 'SPAM_SUSPECTED'        // Possible fake report
  | 'OTHER';

// =============================================================================
// THRESHOLDS
// =============================================================================

const KILL_THRESHOLDS = {
  // Hazard reports trigger kill
  HAZARD_COUNT_KILL: 2,
  HAZARD_KILL_DURATION_DAYS: 7,
  
  // Price anomalies
  PRICE_ANOMALY_KILL: 3,
  PRICE_VARIANCE_THRESHOLD: 0.5, // 50% deviation
  
  // Staleness
  STALENESS_DEGRADED_DAYS: 90,
  STALENESS_OFFLINE_DAYS: 180,
  
  // Auto-revive
  MAX_OFFLINE_DURATION_DAYS: 30,
  
  // Spam detection
  MIN_REPORTS_FOR_SPAM_CHECK: 5,
  SPAM_THRESHOLD_RATIO: 0.8,
};

// =============================================================================
// KILL SWITCH MANAGEMENT
// =============================================================================

/**
 * Create initial kill switch state for an entity
 */
export function createKillSwitch(
  entityType: string,
  entityId: string,
  citySlug: string
): KillSwitch {
  return {
    entity_type: entityType,
    entity_id: entityId,
    city_slug: citySlug,
    state: 'ACTIVE',
    reason: null,
    killed_at: null,
    killed_by: null,
    revive_after: null,
    hazard_count: 0,
    anomaly_count: 0,
    last_verified: null,
    metadata: {},
    audit_log: [{
      timestamp: new Date().toISOString(),
      previous_state: 'ACTIVE',
      new_state: 'ACTIVE',
      reason: 'INITIALIZATION',
      actor: 'system',
      details: 'Kill switch initialized',
    }],
  };
}

/**
 * Trigger kill switch
 */
export function triggerKill(
  ks: KillSwitch,
  reason: KillReason,
  actor: string,
  details: string,
  duration_days?: number
): KillSwitch {
  const now = new Date();
  const reviveAfter = duration_days 
    ? new Date(now.getTime() + duration_days * 24 * 60 * 60 * 1000).toISOString()
    : null;
  
  return {
    ...ks,
    state: 'OFFLINE',
    reason,
    killed_at: now.toISOString(),
    killed_by: actor,
    revive_after: reviveAfter,
    audit_log: [
      ...ks.audit_log,
      {
        timestamp: now.toISOString(),
        previous_state: ks.state,
        new_state: 'OFFLINE',
        reason,
        actor,
        details,
      },
    ],
  };
}

/**
 * Set entity to degraded mode
 */
export function setDegraded(
  ks: KillSwitch,
  reason: KillReason,
  actor: string,
  details: string
): KillSwitch {
  const now = new Date().toISOString();
  
  return {
    ...ks,
    state: 'DEGRADED',
    reason,
    audit_log: [
      ...ks.audit_log,
      {
        timestamp: now,
        previous_state: ks.state,
        new_state: 'DEGRADED',
        reason,
        actor,
        details,
      },
    ],
  };
}

/**
 * Revive entity (bring back online)
 */
export function reviveEntity(
  ks: KillSwitch,
  actor: string,
  reason: string
): KillSwitch {
  const now = new Date().toISOString();
  
  return {
    ...ks,
    state: 'ACTIVE',
    reason: null,
    killed_at: null,
    killed_by: null,
    revive_after: null,
    hazard_count: 0, // Reset hazard count on revive
    last_verified: now,
    audit_log: [
      ...ks.audit_log,
      {
        timestamp: now,
        previous_state: ks.state,
        new_state: 'ACTIVE',
        reason: 'REVIVED',
        actor,
        details: reason,
      },
    ],
  };
}

/**
 * Permanently kill entity
 */
export function permanentKill(
  ks: KillSwitch,
  actor: string,
  reason: string
): KillSwitch {
  const now = new Date().toISOString();
  
  return {
    ...ks,
    state: 'KILLED',
    reason: 'ADMIN_MANUAL',
    killed_at: now,
    killed_by: actor,
    revive_after: null,
    audit_log: [
      ...ks.audit_log,
      {
        timestamp: now,
        previous_state: ks.state,
        new_state: 'KILLED',
        reason: 'PERMANENT_KILL',
        actor,
        details: reason,
      },
    ],
  };
}

// =============================================================================
// ANOMALY DETECTION
// =============================================================================

/**
 * Create anomaly report
 */
export function createAnomalyReport(
  entityType: string,
  entityId: string,
  citySlug: string,
  anomalyType: AnomalyType,
  severity: AnomalyReport['severity'],
  reportedBy: string,
  description: string,
  evidence?: any
): AnomalyReport {
  return {
    id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    entity_type: entityType,
    entity_id: entityId,
    city_slug: citySlug,
    anomaly_type: anomalyType,
    severity,
    reported_at: new Date().toISOString(),
    reported_by: reportedBy,
    description,
    evidence,
    resolved: false,
  };
}

/**
 * Classify anomaly severity based on type and context
 */
export function classifyAnomalySeverity(
  anomalyType: AnomalyType,
  context: { variance?: number; count?: number }
): AnomalyReport['severity'] {
  // Hazards are always high or critical
  if (anomalyType.startsWith('HAZARD_')) {
    return 'HIGH';
  }
  
  // Price anomalies depend on variance
  if (anomalyType === 'PRICE_SPIKE' || anomalyType === 'PRICE_DROP') {
    const variance = context.variance || 0;
    if (variance > 2.0) return 'CRITICAL';
    if (variance > 1.0) return 'HIGH';
    if (variance > 0.5) return 'MEDIUM';
    return 'LOW';
  }
  
  // Closures
  if (anomalyType === 'CLOSURE_PERMANENT') return 'HIGH';
  if (anomalyType === 'CLOSURE_TEMPORARY') return 'MEDIUM';
  
  // Data issues
  if (anomalyType === 'COORDINATE_ERROR') return 'HIGH';
  if (anomalyType === 'DATA_MISMATCH') return 'MEDIUM';
  
  // Default
  return 'LOW';
}

/**
 * Process anomaly report and update kill switch if needed
 */
export function processAnomalyReport(
  ks: KillSwitch,
  report: AnomalyReport
): { killSwitch: KillSwitch; action: string } {
  let updatedKs = { ...ks };
  let action = 'LOGGED';
  
  // Increment counters
  if (report.anomaly_type.startsWith('HAZARD_')) {
    updatedKs.hazard_count = (updatedKs.hazard_count || 0) + 1;
    
    // Check hazard threshold
    if (updatedKs.hazard_count >= KILL_THRESHOLDS.HAZARD_COUNT_KILL) {
      updatedKs = triggerKill(
        updatedKs,
        'HAZARD_REPORTS',
        'system',
        `${updatedKs.hazard_count} hazard reports received`,
        KILL_THRESHOLDS.HAZARD_KILL_DURATION_DAYS
      );
      action = 'KILLED_HAZARD';
    } else {
      updatedKs = setDegraded(
        updatedKs,
        'HAZARD_REPORTS',
        'system',
        `Hazard reported: ${report.description}`
      );
      action = 'DEGRADED_HAZARD';
    }
  } else {
    updatedKs.anomaly_count = (updatedKs.anomaly_count || 0) + 1;
    
    // Check price anomaly threshold
    if (
      (report.anomaly_type === 'PRICE_SPIKE' || report.anomaly_type === 'PRICE_DROP') &&
      updatedKs.anomaly_count >= KILL_THRESHOLDS.PRICE_ANOMALY_KILL
    ) {
      updatedKs = triggerKill(
        updatedKs,
        'PRICE_ANOMALY',
        'system',
        `${updatedKs.anomaly_count} price anomalies detected`,
        undefined // No auto-revive until verified
      );
      action = 'KILLED_PRICE_ANOMALY';
    } else if (report.severity === 'HIGH' || report.severity === 'CRITICAL') {
      updatedKs = setDegraded(
        updatedKs,
        'SYSTEM_AUTO',
        'system',
        `High severity anomaly: ${report.anomaly_type}`
      );
      action = 'DEGRADED_SEVERITY';
    }
  }
  
  return { killSwitch: updatedKs, action };
}

// =============================================================================
// STALENESS CHECKS
// =============================================================================

/**
 * Check and apply staleness rules
 */
export function checkStaleness(
  ks: KillSwitch,
  lastUpdated: Date,
  _lastVerified: Date | null
): KillSwitch {
  const now = new Date();
  const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
  
  // Check for offline threshold
  if (daysSinceUpdate >= KILL_THRESHOLDS.STALENESS_OFFLINE_DAYS) {
    if (ks.state !== 'OFFLINE' && ks.state !== 'KILLED') {
      return triggerKill(
        ks,
        'STALENESS',
        'system',
        `Data is ${Math.round(daysSinceUpdate)} days old (threshold: ${KILL_THRESHOLDS.STALENESS_OFFLINE_DAYS})`,
        undefined
      );
    }
  }
  // Check for degraded threshold
  else if (daysSinceUpdate >= KILL_THRESHOLDS.STALENESS_DEGRADED_DAYS) {
    if (ks.state === 'ACTIVE') {
      return setDegraded(
        ks,
        'STALENESS',
        'system',
        `Data is ${Math.round(daysSinceUpdate)} days old (threshold: ${KILL_THRESHOLDS.STALENESS_DEGRADED_DAYS})`
      );
    }
  }
  
  return ks;
}

/**
 * Check for auto-revive eligibility
 */
export function checkAutoRevive(ks: KillSwitch): KillSwitch {
  if (ks.state !== 'OFFLINE' || !ks.revive_after) {
    return ks;
  }
  
  const now = new Date();
  const reviveAfter = new Date(ks.revive_after);
  
  if (now >= reviveAfter) {
    return reviveEntity(
      ks,
      'system',
      `Auto-revive after ${KILL_THRESHOLDS.HAZARD_KILL_DURATION_DAYS} day cooling period`
    );
  }
  
  return ks;
}

// =============================================================================
// PRICE ANOMALY DETECTION
// =============================================================================

export interface PricePoint {
  price: number;
  reported_at: Date;
  reported_by: string;
}

/**
 * Detect price anomalies
 */
export function detectPriceAnomaly(
  newPrice: number,
  baseline: { min: number; max: number; typical: number },
  recentPrices: PricePoint[]
): { isAnomaly: boolean; type: AnomalyType | null; variance: number } {
  // Check against baseline
  const typical = baseline.typical;
  const variance = Math.abs(newPrice - typical) / typical;
  
  // Spike: significantly above max
  if (newPrice > baseline.max * 1.5) {
    return {
      isAnomaly: true,
      type: 'PRICE_SPIKE',
      variance: (newPrice - baseline.max) / baseline.max,
    };
  }
  
  // Drop: significantly below min (suspicious - could be scam)
  if (newPrice < baseline.min * 0.5) {
    return {
      isAnomaly: true,
      type: 'PRICE_DROP',
      variance: (baseline.min - newPrice) / baseline.min,
    };
  }
  
  // Check against recent prices for sudden change
  if (recentPrices.length >= 3) {
    const recentAvg = recentPrices.reduce((s, p) => s + p.price, 0) / recentPrices.length;
    const recentVariance = Math.abs(newPrice - recentAvg) / recentAvg;
    
    if (recentVariance > KILL_THRESHOLDS.PRICE_VARIANCE_THRESHOLD) {
      return {
        isAnomaly: true,
        type: newPrice > recentAvg ? 'PRICE_SPIKE' : 'PRICE_DROP',
        variance: recentVariance,
      };
    }
  }
  
  return { isAnomaly: false, type: null, variance };
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Run daily maintenance on all kill switches
 */
export function runDailyMaintenance(
  killSwitches: Map<string, KillSwitch>,
  lastUpdatedMap: Map<string, Date>
): { updated: number; revivals: number; degraded: number; killed: number } {
  let updated = 0;
  let revivals = 0;
  let degraded = 0;
  let killed = 0;
  
  for (const [key, ks] of killSwitches) {
    let newKs = ks;
    
    // Check auto-revive
    const beforeRevive = newKs.state;
    newKs = checkAutoRevive(newKs);
    if (beforeRevive === 'OFFLINE' && newKs.state === 'ACTIVE') {
      revivals++;
      updated++;
    }
    
    // Check staleness
    const lastUpdated = lastUpdatedMap.get(key) || new Date(ks.audit_log[0]?.timestamp || Date.now());
    const beforeStale = newKs.state;
    newKs = checkStaleness(newKs, lastUpdated, null);
    
    if (beforeStale !== newKs.state) {
      updated++;
      if (newKs.state === 'DEGRADED') degraded++;
      if (newKs.state === 'OFFLINE') killed++;
    }
    
    killSwitches.set(key, newKs);
  }
  
  return { updated, revivals, degraded, killed };
}

// =============================================================================
// REPORTING
// =============================================================================

export interface KillSwitchSummary {
  total: number;
  active: number;
  degraded: number;
  offline: number;
  killed: number;
  pending_revive: number;
  recent_kills: KillSwitch[];
}

/**
 * Generate kill switch summary for city
 */
export function generateKillSwitchSummary(
  killSwitches: KillSwitch[],
  citySlug?: string
): KillSwitchSummary {
  const filtered = citySlug 
    ? killSwitches.filter(ks => ks.city_slug === citySlug)
    : killSwitches;
  
  const now = new Date();
  const recentThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  return {
    total: filtered.length,
    active: filtered.filter(ks => ks.state === 'ACTIVE').length,
    degraded: filtered.filter(ks => ks.state === 'DEGRADED').length,
    offline: filtered.filter(ks => ks.state === 'OFFLINE').length,
    killed: filtered.filter(ks => ks.state === 'KILLED').length,
    pending_revive: filtered.filter(ks => 
      ks.state === 'OFFLINE' && 
      ks.revive_after && 
      new Date(ks.revive_after) > now
    ).length,
    recent_kills: filtered
      .filter(ks => ks.killed_at && new Date(ks.killed_at) > recentThreshold)
      .sort((a, b) => new Date(b.killed_at!).getTime() - new Date(a.killed_at!).getTime())
      .slice(0, 10),
  };
}

/**
 * Format kill switch status for display
 */
export function formatKillSwitchStatus(ks: KillSwitch): string {
  const stateEmoji = {
    ACTIVE: '🟢',
    DEGRADED: '🟡',
    OFFLINE: '🔴',
    KILLED: '⚫',
  };
  
  let status = `${stateEmoji[ks.state]} ${ks.state}`;
  
  if (ks.state === 'OFFLINE' && ks.revive_after) {
    const daysUntilRevive = Math.ceil(
      (new Date(ks.revive_after).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    status += ` (revives in ${daysUntilRevive}d)`;
  }
  
  if (ks.hazard_count > 0) {
    status += ` ⚠️ ${ks.hazard_count} hazards`;
  }
  
  return status;
}

// =============================================================================
// CLI TEST
// =============================================================================

if (require.main === module) {
  console.log('=== Kill Switch System Test ===\n');
  
  // Create entity
  let ks = createKillSwitch('zone', 'zone_sukhumvit_123', 'bangkok');
  console.log('Initial:', formatKillSwitchStatus(ks));
  
  // Report hazard
  const hazard1 = createAnomalyReport(
    'zone', 'zone_sukhumvit_123', 'bangkok',
    'HAZARD_SAFETY', 'HIGH',
    'user_001', 'Aggressive street vendors',
  );
  let result = processAnomalyReport(ks, hazard1);
  ks = result.killSwitch;
  console.log(`After hazard 1 (${result.action}):`, formatKillSwitchStatus(ks));
  
  // Report another hazard
  const hazard2 = createAnomalyReport(
    'zone', 'zone_sukhumvit_123', 'bangkok',
    'HAZARD_SCAM', 'HIGH',
    'user_002', 'Jewelry store scam operating',
  );
  result = processAnomalyReport(ks, hazard2);
  ks = result.killSwitch;
  console.log(`After hazard 2 (${result.action}):`, formatKillSwitchStatus(ks));
  
  // Test price anomaly detection
  console.log('\n--- Price Anomaly Detection ---');
  const baseline = { min: 100, max: 200, typical: 150 };
  
  const prices = [
    { price: 160, label: 'Normal' },
    { price: 350, label: 'Spike' },
    { price: 40, label: 'Suspicious drop' },
  ];
  
  prices.forEach(({ price, label }) => {
    const anomaly = detectPriceAnomaly(price, baseline, []);
    console.log(`${label} (${price}): ${anomaly.isAnomaly ? `ANOMALY - ${anomaly.type}` : 'OK'}`);
  });
  
  // Show audit log
  console.log('\n--- Audit Log ---');
  ks.audit_log.forEach(entry => {
    console.log(`  ${entry.new_state}: ${entry.details} (by ${entry.actor})`);
  });
}
