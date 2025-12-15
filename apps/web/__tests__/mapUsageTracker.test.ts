/**
 * @jest-environment jsdom
 */
import {
  getMapProviderDecision,
  recordMapLoad,
  getMapUsageStats,
  setMapProviderOverride,
  resetMapUsageStats,
  shouldShowUsageWarning,
  // hasAutoSwitched - exported but tested via getMapProviderDecision
} from '../lib/mapUsageTracker';

describe('mapUsageTracker', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset environment
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    delete process.env.NEXT_PUBLIC_MAP_PROVIDER;
  });

  describe('getMapProviderDecision', () => {
    it('should use MapLibre when no Mapbox token is configured', () => {
      const decision = getMapProviderDecision();
      expect(decision.provider).toBe('maplibre');
      expect(decision.reason).toContain('No Mapbox token');
    });

    it('should default to MapLibre even when a Mapbox token exists', () => {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'pk.test_token';
      const decision = getMapProviderDecision();
      expect(decision.provider).toBe('maplibre');
    });

    it('should use Mapbox when explicitly configured', () => {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'pk.test_token';
      process.env.NEXT_PUBLIC_MAP_PROVIDER = 'mapbox';
      const decision = getMapProviderDecision();
      expect(decision.provider).toBe('mapbox');
    });

    it('should respect manual override', () => {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'pk.test_token';
      setMapProviderOverride('maplibre');
      const decision = getMapProviderDecision();
      expect(decision.provider).toBe('maplibre');
      expect(decision.reason).toContain('Manual override');
    });
  });

  describe('recordMapLoad', () => {
    it('should increment mapbox loads', () => {
      recordMapLoad('mapbox');
      recordMapLoad('mapbox');
      const stats = getMapUsageStats();
      expect(stats.mapboxLoads).toBe(2);
    });

    it('should increment maplibre loads', () => {
      recordMapLoad('maplibre');
      const stats = getMapUsageStats();
      expect(stats.maplibreLoads).toBe(1);
    });
  });

  describe('getMapUsageStats', () => {
    it('should return current month stats', () => {
      const stats = getMapUsageStats();
      const currentMonth = new Date().toISOString().slice(0, 7);
      expect(stats.month).toBe(currentMonth);
    });

    it('should calculate usage percent correctly', () => {
      // Simulate some loads
      for (let i = 0; i < 10; i++) {
        recordMapLoad('mapbox');
      }
      const stats = getMapUsageStats();
      expect(stats.usagePercent).toBe(10 / 50000);
      expect(stats.remainingLoads).toBe(50000 - 10);
    });
  });

  describe('auto-switching', () => {
    it('should auto-switch to MapLibre at 90% usage', () => {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'pk.test_token';

      // Simulate being at 90% usage (45,000 loads)
      const stats = getMapUsageStats();
      localStorage.setItem(
        'unmapped_map_usage',
        JSON.stringify({
          ...stats,
          mapboxLoads: 45001,
        })
      );

      const decision = getMapProviderDecision();
      expect(decision.provider).toBe('maplibre');
      expect(decision.isCritical).toBe(true);
      expect(decision.reason).toContain('Auto-switched');
    });

    it('should show warning at 75% usage', () => {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'pk.test_token';

      // Simulate being at 75% usage (37,500 loads)
      const stats = getMapUsageStats();
      localStorage.setItem(
        'unmapped_map_usage',
        JSON.stringify({
          ...stats,
          mapboxLoads: 37500,
        })
      );

      const decision = getMapProviderDecision();
      expect(decision.isWarning).toBe(true);
      expect(decision.isCritical).toBe(false);
    });
  });

  describe('resetMapUsageStats', () => {
    it('should reset all stats to zero', () => {
      recordMapLoad('mapbox');
      recordMapLoad('mapbox');
      recordMapLoad('maplibre');

      resetMapUsageStats();

      const stats = getMapUsageStats();
      expect(stats.mapboxLoads).toBe(0);
      expect(stats.maplibreLoads).toBe(0);
    });
  });

  describe('shouldShowUsageWarning', () => {
    it('should return true at warning threshold but not critical', () => {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'pk.test_token';

      // At 80% - warning but not critical
      const stats = getMapUsageStats();
      localStorage.setItem(
        'unmapped_map_usage',
        JSON.stringify({
          ...stats,
          mapboxLoads: 40000, // 80%
        })
      );

      expect(shouldShowUsageWarning()).toBe(true);
    });

    it('should return false below warning threshold', () => {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'pk.test_token';

      const stats = getMapUsageStats();
      localStorage.setItem(
        'unmapped_map_usage',
        JSON.stringify({
          ...stats,
          mapboxLoads: 10000, // 20%
        })
      );

      expect(shouldShowUsageWarning()).toBe(false);
    });
  });

  describe('month rollover', () => {
    it('should reset stats on new month', () => {
      // Set stats from previous month
      localStorage.setItem(
        'unmapped_map_usage',
        JSON.stringify({
          month: '2024-01', // Old month
          mapboxLoads: 49000,
          maplibreLoads: 1000,
          lastUpdated: Date.now(),
          autoSwitched: true,
          manualOverride: null,
        })
      );

      const stats = getMapUsageStats();
      const currentMonth = new Date().toISOString().slice(0, 7);

      expect(stats.month).toBe(currentMonth);
      expect(stats.mapboxLoads).toBe(0); // Reset
      expect(stats.autoSwitched).toBe(false); // Reset
    });
  });
});
