/**
 * Gamification Unit Tests
 * 
 * Tests for karma, streaks, badges, and fingerprint systems.
 */

import { getStreakMessage, getStreakExpiryHours } from '@/lib/streakManager';
import { 
  BADGE_CRITERIA, 
  getBadgeUnlockMessage,
  type Badge,
  type UserStats 
} from '@/lib/badgeSystem';
import {
  updateTextureFingerprint,
  generateFingerprintWhispers,
  calculateFingerprintSimilarity,
  type TextureFingerprint,
} from '@/lib/textureFingerprint';

describe('Streak Manager', () => {
  describe('getStreakMessage', () => {
    it('should return at-risk message when streak is at risk', () => {
      const message = getStreakMessage({
        current_streak: 5,
        longest_streak: 10,
        last_active_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        streak_status: 'at_risk',
      });

      expect(message).toContain('STREAK AT RISK');
    });

    it('should return veteran message for 7+ day streak', () => {
      const message = getStreakMessage({
        current_streak: 7,
        longest_streak: 7,
        last_active_date: new Date().toISOString().split('T')[0],
        streak_status: 'active',
      });

      expect(message).toContain('FIELD VETERAN');
    });

    it('should return start message for new streak', () => {
      const message = getStreakMessage({
        current_streak: 1,
        longest_streak: 1,
        last_active_date: new Date().toISOString().split('T')[0],
        streak_status: 'active',
      });

      expect(message).toContain('STREAK STARTED');
    });
  });

  describe('getStreakExpiryHours', () => {
    it('should return 0 for null date', () => {
      expect(getStreakExpiryHours(null)).toBe(0);
    });

    it('should return positive hours for recent activity', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const hours = getStreakExpiryHours(yesterday.toISOString());
      expect(hours).toBeGreaterThan(0);
      expect(hours).toBeLessThanOrEqual(48);
    });
  });
});

describe('Badge System', () => {
  describe('BADGE_CRITERIA', () => {
    const baseStats: UserStats = {
      total_reports: 0,
      total_anchors: 0,
      prices_today: 0,
      current_streak: 0,
      unique_zones: 0,
      crises_resolved: 0,
      beacons_discovered: 0,
      night_ops: 0,
      morning_ops: 0,
      total_karma: 0,
      level: 1,
    };

    it('should unlock first_intel badge after 1 report', () => {
      const stats = { ...baseStats, total_reports: 1 };
      expect(BADGE_CRITERIA.first_intel(stats)).toBe(true);
    });

    it('should not unlock first_intel badge with 0 reports', () => {
      expect(BADGE_CRITERIA.first_intel(baseStats)).toBe(false);
    });

    it('should unlock streak_5 badge after 5 day streak', () => {
      const stats = { ...baseStats, current_streak: 5 };
      expect(BADGE_CRITERIA.streak_5(stats)).toBe(true);
    });

    it('should unlock zone_explorer_10 after visiting 10 zones', () => {
      const stats = { ...baseStats, unique_zones: 10 };
      expect(BADGE_CRITERIA.zone_explorer_10(stats)).toBe(true);
    });

    it('should unlock karma_100 at 100 karma', () => {
      const stats = { ...baseStats, total_karma: 100 };
      expect(BADGE_CRITERIA.karma_100(stats)).toBe(true);
    });

    it('should unlock crisis_survivor after resolving a crisis', () => {
      const stats = { ...baseStats, crises_resolved: 1 };
      expect(BADGE_CRITERIA.crisis_survivor(stats)).toBe(true);
    });
  });

  describe('getBadgeUnlockMessage', () => {
    it('should format badge unlock message correctly', () => {
      const badge: Badge = {
        id: 'test_badge',
        name: 'Test Badge',
        description: 'A test badge',
        icon: '🎖️',
        rarity: 'rare',
        category: 'test',
        unlock_criteria: {},
      };

      const message = getBadgeUnlockMessage(badge);
      expect(message).toContain('BADGE UNLOCKED');
      expect(message).toContain('TEST BADGE');
      expect(message).toContain('🥇'); // Rare emoji
    });
  });
});

describe('Texture Fingerprint', () => {
  describe('generateFingerprintWhispers', () => {
    it('should generate texture match whisper for high score', () => {
      const fingerprint: TextureFingerprint = {
        texture_preferences: { market: 0.8 },
        time_preferences: {},
        activity_patterns: {},
        computed_at: null,
      };

      const whispers = generateFingerprintWhispers(fingerprint, 'market');
      expect(whispers.some(w => w.includes('TEXTURE MATCH'))).toBe(true);
    });

    it('should generate texture mismatch whisper for low score', () => {
      const fingerprint: TextureFingerprint = {
        texture_preferences: { market: 0.2 },
        time_preferences: {},
        activity_patterns: {},
        computed_at: null,
      };

      const whispers = generateFingerprintWhispers(fingerprint, 'market');
      expect(whispers.some(w => w.includes('TEXTURE MISMATCH'))).toBe(true);
    });
  });

  describe('calculateFingerprintSimilarity', () => {
    it('should return 1 for identical fingerprints', () => {
      const fp: TextureFingerprint = {
        texture_preferences: { market: 0.8, nightlife: 0.5 },
        time_preferences: {},
        activity_patterns: {},
        computed_at: null,
      };

      expect(calculateFingerprintSimilarity(fp, fp)).toBe(1);
    });

    it('should return 0 for completely opposite fingerprints', () => {
      const fp1: TextureFingerprint = {
        texture_preferences: { market: 1.0 },
        time_preferences: {},
        activity_patterns: {},
        computed_at: null,
      };

      const fp2: TextureFingerprint = {
        texture_preferences: { market: 0.0 },
        time_preferences: {},
        activity_patterns: {},
        computed_at: null,
      };

      expect(calculateFingerprintSimilarity(fp1, fp2)).toBe(0);
    });

    it('should return 0 for empty fingerprints', () => {
      const emptyFp: TextureFingerprint = {
        texture_preferences: {},
        time_preferences: {},
        activity_patterns: {},
        computed_at: null,
      };

      expect(calculateFingerprintSimilarity(emptyFp, emptyFp)).toBe(0);
    });
  });
});
