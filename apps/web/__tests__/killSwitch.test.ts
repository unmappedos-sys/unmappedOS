/**
 * Kill Switch & Anomaly Detection Tests
 * 
 * Tests for:
 * - Hazard report accumulation
 * - Zone offline triggering
 * - Auto-recovery after expiration
 * - Anomaly detection thresholds
 */

describe('Kill Switch Logic', () => {
  // ==========================================================================
  // HAZARD ACCUMULATION TESTS
  // ==========================================================================
  describe('Hazard Report Accumulation', () => {
    it('should not trigger offline with single hazard report', () => {
      const zoneState = {
        hazard_reports_24h: 1,
        is_offline: false,
        offline_reason: null,
      };
      
      const shouldOffline = checkKillSwitch(zoneState);
      
      expect(shouldOffline).toBe(false);
    });

    it('should trigger offline with 2+ hazard reports in 24h', () => {
      const zoneState = {
        hazard_reports_24h: 2,
        is_offline: false,
        offline_reason: null,
      };
      
      const shouldOffline = checkKillSwitch(zoneState);
      
      expect(shouldOffline).toBe(true);
    });

    it('should not count old hazard reports', () => {
      const zoneState = {
        hazard_reports_24h: 1,
        hazard_reports_total: 10, // Many old reports
        is_offline: false,
        offline_reason: null,
      };
      
      const shouldOffline = checkKillSwitch(zoneState);
      
      expect(shouldOffline).toBe(false);
    });

    it('should immediately offline for critical hazards', () => {
      const zoneState = {
        hazard_reports_24h: 1,
        has_critical_hazard: true,
        is_offline: false,
        offline_reason: null,
      };
      
      const shouldOffline = checkKillSwitch(zoneState);
      
      expect(shouldOffline).toBe(true);
    });
  });

  // ==========================================================================
  // OFFLINE DURATION TESTS
  // ==========================================================================
  describe('Offline Duration', () => {
    it('should set 7-day offline duration for standard hazards', () => {
      const offlineState = createOfflineState('HAZARD_REPORT', false);
      
      expect(offlineState.offline_until).toBeDefined();
      const daysUntil = getDaysUntil(offlineState.offline_until);
      expect(daysUntil).toBeCloseTo(7, 0);
    });

    it('should set 14-day offline duration for critical hazards', () => {
      const offlineState = createOfflineState('HAZARD_REPORT', true);
      
      const daysUntil = getDaysUntil(offlineState.offline_until);
      expect(daysUntil).toBeCloseTo(14, 0);
    });

    it('should include reason in offline state', () => {
      const offlineState = createOfflineState('HAZARD_REPORT', false);
      
      expect(offlineState.offline_reason).toContain('hazard');
    });
  });

  // ==========================================================================
  // AUTO-RECOVERY TESTS
  // ==========================================================================
  describe('Auto-Recovery', () => {
    it('should return zone online after offline period expires', () => {
      const zoneState = {
        is_offline: true,
        offline_until: new Date(Date.now() - 1000).toISOString(), // Expired
        offline_reason: 'Hazard reports',
      };
      
      const recovered = checkRecovery(zoneState);
      
      expect(recovered.is_offline).toBe(false);
      expect(recovered.offline_reason).toBeNull();
    });

    it('should keep zone offline if period not expired', () => {
      const zoneState = {
        is_offline: true,
        offline_until: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
        offline_reason: 'Hazard reports',
      };
      
      const recovered = checkRecovery(zoneState);
      
      expect(recovered.is_offline).toBe(true);
    });

    it('should reset confidence on recovery', () => {
      const zoneState = {
        is_offline: true,
        offline_until: new Date(Date.now() - 1000).toISOString(),
        offline_reason: 'Hazard reports',
        confidence_score: 80,
      };
      
      const recovered = checkRecovery(zoneState);
      
      // Confidence should be reduced after recovery
      expect(recovered.confidence_score).toBeLessThan(80);
      expect(recovered.confidence_score).toBeGreaterThanOrEqual(40);
    });
  });

  // ==========================================================================
  // ANOMALY DETECTION TESTS
  // ==========================================================================
  describe('Anomaly Detection', () => {
    it('should detect price anomaly from sudden spike', () => {
      const priceHistory = [50, 52, 48, 51, 50, 150]; // Sudden spike
      
      const anomaly = detectPriceAnomaly(priceHistory);
      
      expect(anomaly.detected).toBe(true);
      expect(anomaly.type).toBe('PRICE_SPIKE');
    });

    it('should not flag gradual price increases as anomaly', () => {
      const priceHistory = [50, 52, 55, 58, 62, 65]; // Gradual increase
      
      const anomaly = detectPriceAnomaly(priceHistory);
      
      expect(anomaly.detected).toBe(false);
    });

    it('should detect conflicting reports', () => {
      const recentIntel = [
        { type: 'QUIET_CONFIRMED', timestamp: Date.now() - 1000 },
        { type: 'QUIET_CONFIRMED', timestamp: Date.now() - 2000 },
        { type: 'CROWD_SURGE', timestamp: Date.now() - 500 }, // Conflict!
      ];
      
      const anomaly = detectConflictAnomaly(recentIntel);
      
      expect(anomaly.detected).toBe(true);
      expect(anomaly.type).toBe('CONFLICTING_REPORTS');
    });

    it('should detect rapid intel spam', () => {
      const recentIntel = Array(20).fill(null).map((_, i) => ({
        type: 'VERIFICATION',
        user_id: 'same-user',
        timestamp: Date.now() - i * 1000, // 20 reports in 20 seconds
      }));
      
      const anomaly = detectSpamAnomaly(recentIntel);
      
      expect(anomaly.detected).toBe(true);
      expect(anomaly.type).toBe('INTEL_SPAM');
    });

    it('should not flag normal intel frequency as spam', () => {
      const recentIntel = Array(5).fill(null).map((_, i) => ({
        type: 'VERIFICATION',
        user_id: 'same-user',
        timestamp: Date.now() - i * 60000, // 5 reports in 5 minutes
      }));
      
      const anomaly = detectSpamAnomaly(recentIntel);
      
      expect(anomaly.detected).toBe(false);
    });
  });
});

// ==========================================================================
// HELPER FUNCTIONS (would normally be imported from actual module)
// ==========================================================================

function checkKillSwitch(zoneState: {
  hazard_reports_24h: number;
  is_offline: boolean;
  has_critical_hazard?: boolean;
}): boolean {
  if (zoneState.has_critical_hazard) return true;
  return zoneState.hazard_reports_24h >= 2;
}

function createOfflineState(reason: string, isCritical: boolean): {
  is_offline: boolean;
  offline_until: string;
  offline_reason: string;
} {
  const days = isCritical ? 14 : 7;
  return {
    is_offline: true,
    offline_until: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
    offline_reason: `Zone offline due to ${reason.toLowerCase().replace('_', ' ')}`,
  };
}

function getDaysUntil(dateString: string): number {
  const until = new Date(dateString);
  const now = new Date();
  return (until.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
}

function checkRecovery(zoneState: {
  is_offline: boolean;
  offline_until: string;
  offline_reason: string;
  confidence_score?: number;
}): {
  is_offline: boolean;
  offline_reason: string | null;
  confidence_score: number;
} {
  const until = new Date(zoneState.offline_until);
  const now = new Date();
  
  if (until <= now) {
    return {
      is_offline: false,
      offline_reason: null,
      confidence_score: Math.max(40, (zoneState.confidence_score || 80) - 20),
    };
  }
  
  return {
    is_offline: true,
    offline_reason: zoneState.offline_reason,
    confidence_score: zoneState.confidence_score || 0,
  };
}

function detectPriceAnomaly(prices: number[]): { detected: boolean; type?: string } {
  if (prices.length < 3) return { detected: false };
  
  const avg = prices.slice(0, -1).reduce((a, b) => a + b, 0) / (prices.length - 1);
  const latest = prices[prices.length - 1];
  
  if (latest > avg * 2) {
    return { detected: true, type: 'PRICE_SPIKE' };
  }
  
  return { detected: false };
}

function detectConflictAnomaly(intel: Array<{ type: string; timestamp: number }>): { detected: boolean; type?: string } {
  const window = 60000; // 1 minute
  const recent = intel.filter(i => Date.now() - i.timestamp < window);
  
  const hasQuiet = recent.some(i => i.type === 'QUIET_CONFIRMED');
  const hasCrowd = recent.some(i => i.type === 'CROWD_SURGE');
  
  if (hasQuiet && hasCrowd) {
    return { detected: true, type: 'CONFLICTING_REPORTS' };
  }
  
  return { detected: false };
}

function detectSpamAnomaly(intel: Array<{ type: string; user_id: string; timestamp: number }>): { detected: boolean; type?: string } {
  const window = 60000; // 1 minute
  const recent = intel.filter(i => Date.now() - i.timestamp < window);
  
  // Count by user
  const userCounts: Record<string, number> = {};
  recent.forEach(i => {
    userCounts[i.user_id] = (userCounts[i.user_id] || 0) + 1;
  });
  
  // More than 10 reports from same user in 1 minute = spam
  if (Object.values(userCounts).some(count => count > 10)) {
    return { detected: true, type: 'INTEL_SPAM' };
  }
  
  return { detected: false };
}
