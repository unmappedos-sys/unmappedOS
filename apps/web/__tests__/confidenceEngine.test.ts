/**
 * Confidence Engine Tests
 *
 * Tests for:
 * - Time decay calculations
 * - Intel boost calculations
 * - Confidence level thresholds
 * - Daily decay application
 * - Conflict detection
 */

import {
  calculateTimeDecay,
  calculateIntelBoost,
  calculateConfidenceUpdate,
  applyDailyDecay,
  getConfidenceLevel,
  CONFIDENCE_CONFIG,
} from '../lib/intel/confidenceEngine';

describe('Confidence Engine', () => {
  // ==========================================================================
  // TIME DECAY TESTS
  // ==========================================================================
  describe('calculateTimeDecay', () => {
    it('should return 0 decay within grace period', () => {
      const now = new Date();
      const recentIntel = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago

      const decay = calculateTimeDecay(recentIntel);

      expect(decay).toBe(0);
    });

    it('should apply decay after grace period', () => {
      const now = new Date();
      const oldIntel = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

      const decay = calculateTimeDecay(oldIntel);

      // Should have some decay (2% per day * ~2 days past grace)
      expect(decay).toBeGreaterThan(0);
      expect(decay).toBeLessThan(10);
    });

    it('should cap decay at maximum', () => {
      const veryOldIntel = new Date('2020-01-01');

      const decay = calculateTimeDecay(veryOldIntel);

      expect(decay).toBeLessThanOrEqual(CONFIDENCE_CONFIG.MAX_DECAY);
    });

    it('should increase decay with age', () => {
      const now = new Date();
      const intel7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const intel30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const decay7 = calculateTimeDecay(intel7Days);
      const decay30 = calculateTimeDecay(intel30Days);

      expect(decay30).toBeGreaterThan(decay7);
    });
  });

  // ==========================================================================
  // INTEL BOOST TESTS
  // ==========================================================================
  describe('calculateIntelBoost', () => {
    it('should calculate boost for verification intel', () => {
      const boost = calculateIntelBoost('VERIFICATION', 50);

      // Verification gives +15 base
      expect(boost).toBeGreaterThanOrEqual(15);
    });

    it('should calculate boost for price submission', () => {
      const boost = calculateIntelBoost('PRICE_SUBMISSION', 50);

      // Price submission gives +8 base
      expect(boost).toBeGreaterThanOrEqual(8);
    });

    it('should apply karma multiplier for high karma users', () => {
      const lowKarmaBoost = calculateIntelBoost('VERIFICATION', 10);
      const highKarmaBoost = calculateIntelBoost('VERIFICATION', 500);

      expect(highKarmaBoost).toBeGreaterThan(lowKarmaBoost);
    });

    it('should cap boost at maximum', () => {
      const boost = calculateIntelBoost('VERIFICATION', 10000);

      expect(boost).toBeLessThanOrEqual(CONFIDENCE_CONFIG.MAX_INTEL_BOOST_PER_24H);
    });

    it('should reduce boost for hazard reports', () => {
      const hazardBoost = calculateIntelBoost('HAZARD_REPORT', 50);

      // Hazard reports actually decrease confidence
      expect(hazardBoost).toBeLessThan(0);
    });
  });

  // ==========================================================================
  // CONFIDENCE UPDATE TESTS
  // ==========================================================================
  describe('calculateConfidenceUpdate', () => {
    it('should increase confidence with positive intel', () => {
      const current = {
        score: 70,
        last_intel: null,
        intel_count_24h: 0,
        has_conflicts: false,
      };

      const updated = calculateConfidenceUpdate(
        current,
        'VERIFICATION',
        100, // high karma user
        {}
      );

      expect(updated.score).toBeGreaterThan(current.score);
    });

    it('should decrease confidence with hazard report', () => {
      const current = {
        score: 80,
        last_intel: null,
        intel_count_24h: 0,
        has_conflicts: false,
      };

      const updated = calculateConfidenceUpdate(current, 'HAZARD_REPORT', 50, { severity: 'HIGH' });

      expect(updated.score).toBeLessThan(current.score);
    });

    it('should clamp score between 0 and 100', () => {
      const highScore = {
        score: 99,
        last_intel: null,
        intel_count_24h: 0,
        has_conflicts: false,
      };

      const updated = calculateConfidenceUpdate(highScore, 'VERIFICATION', 1000, {});

      expect(updated.score).toBeLessThanOrEqual(100);
    });

    it('should track intel count within 24h', () => {
      const current = {
        score: 70,
        last_intel: new Date().toISOString(),
        intel_count_24h: 5,
        has_conflicts: false,
      };

      const updated = calculateConfidenceUpdate(current, 'QUIET_CONFIRMED', 50, {});

      expect(updated.intel_count_24h).toBe(6);
    });

    it('should detect conflicts from contradictory reports', () => {
      const current = {
        score: 80,
        last_intel: new Date().toISOString(),
        intel_count_24h: 3,
        has_conflicts: false,
        recent_intel_types: ['QUIET_CONFIRMED', 'QUIET_CONFIRMED'],
      };

      // Crowd surge after quiet reports = conflict
      const updated = calculateConfidenceUpdate(current, 'CROWD_SURGE', 50, { level: 'CROWDED' });

      expect(updated.has_conflicts).toBe(true);
    });
  });

  // ==========================================================================
  // DAILY DECAY TESTS
  // ==========================================================================
  describe('applyDailyDecay', () => {
    it('should apply base decay rate', () => {
      const zones = [
        {
          id: '1',
          score: 80,
          last_intel: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          score: 60,
          last_intel: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        },
      ];

      const decayed = applyDailyDecay(zones);

      expect(decayed[0].score).toBeLessThan(80);
      expect(decayed[1].score).toBeLessThan(60);
    });

    it('should not decay zones with recent intel', () => {
      const zones = [{ id: '1', score: 80, last_intel: new Date().toISOString() }];

      const decayed = applyDailyDecay(zones);

      // Should have minimal or no decay
      expect(decayed[0].score).toBeGreaterThanOrEqual(78);
    });

    it('should never decay below minimum score', () => {
      const zones = [{ id: '1', score: 5, last_intel: new Date('2020-01-01').toISOString() }];

      const decayed = applyDailyDecay(zones);

      expect(decayed[0].score).toBeGreaterThanOrEqual(CONFIDENCE_CONFIG.MIN_SCORE);
    });

    it('should maintain zone order', () => {
      const zones = [
        { id: 'first', score: 80, last_intel: null },
        { id: 'second', score: 60, last_intel: null },
        { id: 'third', score: 40, last_intel: null },
      ];

      const decayed = applyDailyDecay(zones);

      expect(decayed[0].id).toBe('first');
      expect(decayed[1].id).toBe('second');
      expect(decayed[2].id).toBe('third');
    });
  });

  // ==========================================================================
  // CONFIDENCE LEVEL TESTS
  // ==========================================================================
  describe('getConfidenceLevel', () => {
    it('should return HIGH for scores >= 80', () => {
      expect(getConfidenceLevel(80)).toBe('HIGH');
      expect(getConfidenceLevel(95)).toBe('HIGH');
      expect(getConfidenceLevel(100)).toBe('HIGH');
    });

    it('should return MEDIUM for scores 60-79', () => {
      expect(getConfidenceLevel(60)).toBe('MEDIUM');
      expect(getConfidenceLevel(70)).toBe('MEDIUM');
      expect(getConfidenceLevel(79)).toBe('MEDIUM');
    });

    it('should return LOW for scores 40-59', () => {
      expect(getConfidenceLevel(40)).toBe('LOW');
      expect(getConfidenceLevel(50)).toBe('LOW');
      expect(getConfidenceLevel(59)).toBe('LOW');
    });

    it('should return DEGRADED for scores < 40', () => {
      expect(getConfidenceLevel(39)).toBe('DEGRADED');
      expect(getConfidenceLevel(20)).toBe('DEGRADED');
      expect(getConfidenceLevel(0)).toBe('DEGRADED');
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle null last_intel gracefully', () => {
      const decay = calculateTimeDecay(null);
      expect(decay).toBe(CONFIDENCE_CONFIG.MAX_DECAY);
    });

    it('should handle future dates (clock skew)', () => {
      const futureDate = new Date(Date.now() + 1000000);
      const decay = calculateTimeDecay(futureDate);
      expect(decay).toBe(0);
    });

    it('should handle negative karma gracefully', () => {
      const boost = calculateIntelBoost('VERIFICATION', -10);
      expect(boost).toBeGreaterThanOrEqual(0);
    });

    it('should handle unknown intel types', () => {
      const boost = calculateIntelBoost('UNKNOWN_TYPE' as any, 50);
      expect(boost).toBe(0);
    });
  });
});
