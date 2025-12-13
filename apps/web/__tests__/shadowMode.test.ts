/**
 * Shadow Mode Tests
 * 
 * Tests for privacy/shadow mode functionality.
 */

import {
  isActionAllowedInShadowMode,
  isFeatureLocalOnly,
  filterPayloadForShadowMode,
  coarsenCoordinates,
  generateAnonymousId,
} from '@/lib/shadowMode';

describe('Shadow Mode', () => {
  describe('isActionAllowedInShadowMode', () => {
    it('should allow viewing actions', () => {
      expect(isActionAllowedInShadowMode('view_map')).toBe(true);
      expect(isActionAllowedInShadowMode('view_zones')).toBe(true);
      expect(isActionAllowedInShadowMode('view_prices')).toBe(true);
    });

    it('should allow crisis mode for safety', () => {
      expect(isActionAllowedInShadowMode('crisis_mode')).toBe(true);
    });

    it('should block write actions', () => {
      expect(isActionAllowedInShadowMode('submit_price')).toBe(false);
      expect(isActionAllowedInShadowMode('submit_report')).toBe(false);
    });
  });

  describe('isFeatureLocalOnly', () => {
    it('should identify local-only features', () => {
      expect(isFeatureLocalOnly('operative_replay')).toBe(true);
      expect(isFeatureLocalOnly('texture_fingerprint')).toBe(true);
      expect(isFeatureLocalOnly('movement_history')).toBe(true);
    });

    it('should identify non-local features', () => {
      expect(isFeatureLocalOnly('submit_report')).toBe(false);
      expect(isFeatureLocalOnly('view_leaderboard')).toBe(false);
    });
  });

  describe('filterPayloadForShadowMode', () => {
    it('should remove sensitive keys', () => {
      const payload = {
        zone_id: 'zone_001',
        coordinates: { lat: 13.7563, lng: 100.5018 },
        message: 'Test message',
        location: 'Bangkok',
      };

      const filtered = filterPayloadForShadowMode(payload);

      expect(filtered.zone_id).toBe('zone_001');
      expect(filtered.message).toBe('Test message');
      expect(filtered.coordinates).toBeUndefined();
      expect(filtered.location).toBeUndefined();
    });

    it('should handle nested objects', () => {
      const payload = {
        data: {
          zone: 'zone_001',
          lat: 13.7563,
        },
      };

      const filtered = filterPayloadForShadowMode(payload);

      expect(filtered.data.zone).toBe('zone_001');
      expect(filtered.data.lat).toBeUndefined();
    });
  });

  describe('coarsenCoordinates', () => {
    it('should reduce precision to ~1km', () => {
      const result = coarsenCoordinates(13.756331, 100.501765, 2);

      expect(result.lat).toBe(13.76);
      expect(result.lon).toBe(100.50);
    });

    it('should handle negative coordinates', () => {
      const result = coarsenCoordinates(-33.8688, 151.2093, 2);

      expect(result.lat).toBe(-33.87);
      expect(result.lon).toBe(151.21);
    });
  });

  describe('generateAnonymousId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateAnonymousId();
      const id2 = generateAnonymousId();

      expect(id1).not.toBe(id2);
    });

    it('should start with anon_ prefix', () => {
      const id = generateAnonymousId();
      expect(id.startsWith('anon_')).toBe(true);
    });

    it('should be a reasonable length', () => {
      const id = generateAnonymousId();
      expect(id.length).toBeGreaterThan(10);
      expect(id.length).toBeLessThan(30);
    });
  });
});
