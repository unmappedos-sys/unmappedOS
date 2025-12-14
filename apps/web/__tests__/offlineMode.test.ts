/**
 * Offline Mode & Graceful Degradation Tests
 *
 * Tests for:
 * - Offline data availability
 * - Stale data handling
 * - UI degradation states
 * - Cache synchronization
 */

describe('Offline Mode', () => {
  // ==========================================================================
  // OFFLINE DATA AVAILABILITY
  // ==========================================================================
  describe('Offline Data Availability', () => {
    it('should load zones from cached city pack when offline', async () => {
      const mockCache = {
        'bangkok-pack': {
          version: '2.0.0',
          generated_at: new Date().toISOString(),
          zones: [{ id: 'zone-1', name: 'Test Zone', confidence: { score: 80 } }],
        },
      };

      const zones = await loadZonesOffline('bangkok', mockCache);

      expect(zones.length).toBe(1);
      expect(zones[0].id).toBe('zone-1');
    });

    it('should return empty array if no cached pack exists', async () => {
      const zones = await loadZonesOffline('bangkok', {});

      expect(zones).toEqual([]);
    });

    it('should indicate data staleness when loading from cache', async () => {
      const oldPack = {
        'bangkok-pack': {
          version: '2.0.0',
          generated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days old
          zones: [{ id: 'zone-1', name: 'Test Zone' }],
        },
      };

      const result = await loadZonesOffline('bangkok', oldPack);

      expect(result.isStale).toBe(true);
      expect(result.staleDays).toBeGreaterThan(25);
    });
  });

  // ==========================================================================
  // STALE DATA HANDLING
  // ==========================================================================
  describe('Stale Data Handling', () => {
    it('should reduce displayed confidence for stale data', () => {
      const zone = {
        confidence: { score: 80, data_age_days: 0 },
      };

      const adjusted = adjustConfidenceForStaleness(zone, 30); // 30 days stale

      expect(adjusted.confidence.score).toBeLessThan(80);
    });

    it('should mark confidence as DEGRADED for very stale data', () => {
      const zone = {
        confidence: { score: 80, level: 'HIGH', data_age_days: 0 },
      };

      const adjusted = adjustConfidenceForStaleness(zone, 90); // 90 days stale

      expect(adjusted.confidence.level).toBe('DEGRADED');
    });

    it('should add staleness warning to zone', () => {
      const zone = {
        confidence: { score: 80 },
        warnings: [],
      };

      const adjusted = adjustConfidenceForStaleness(zone, 30);

      expect(adjusted.warnings).toContain('Data is 30 days old');
    });

    it('should not modify recent data', () => {
      const zone = {
        confidence: { score: 80, level: 'HIGH' },
      };

      const adjusted = adjustConfidenceForStaleness(zone, 1);

      expect(adjusted.confidence.score).toBe(80);
      expect(adjusted.confidence.level).toBe('HIGH');
    });
  });

  // ==========================================================================
  // UI DEGRADATION STATES
  // ==========================================================================
  describe('UI Degradation States', () => {
    it('should show "offline" banner when network unavailable', () => {
      const uiState = getUIState({ isOnline: false, hasCache: true });

      expect(uiState.showOfflineBanner).toBe(true);
      expect(uiState.bannerMessage).toContain('offline');
    });

    it('should show "no data" state when offline without cache', () => {
      const uiState = getUIState({ isOnline: false, hasCache: false });

      expect(uiState.showNoDataState).toBe(true);
    });

    it('should disable intel submission when offline', () => {
      const uiState = getUIState({ isOnline: false, hasCache: true });

      expect(uiState.intelSubmissionEnabled).toBe(false);
    });

    it('should queue intel submissions when offline', () => {
      const queue = createOfflineQueue();

      queue.add({
        type: 'INTEL_SUBMISSION',
        data: { zone_id: 'zone-1', type: 'VERIFICATION' },
      });

      expect(queue.pending).toBe(1);
    });

    it('should show degraded accuracy warning for stale zones', () => {
      const uiState = getZoneUIState({
        confidence: { score: 50, level: 'LOW', data_age_days: 45 },
      });

      expect(uiState.showAccuracyWarning).toBe(true);
      expect(uiState.warningLevel).toBe('HIGH');
    });
  });

  // ==========================================================================
  // CACHE SYNCHRONIZATION
  // ==========================================================================
  describe('Cache Synchronization', () => {
    it('should merge online updates with cached data', () => {
      const cached = {
        zones: [
          { id: 'zone-1', confidence: { score: 70 } },
          { id: 'zone-2', confidence: { score: 60 } },
        ],
      };

      const updates = {
        zones: [
          { id: 'zone-1', confidence: { score: 85 } }, // Updated
        ],
      };

      const merged = mergeCacheWithUpdates(cached, updates);

      expect(merged.zones.find((z) => z.id === 'zone-1').confidence.score).toBe(85);
      expect(merged.zones.find((z) => z.id === 'zone-2').confidence.score).toBe(60);
    });

    it('should add new zones from updates', () => {
      const cached = {
        zones: [{ id: 'zone-1' }],
      };

      const updates = {
        zones: [{ id: 'zone-3' }], // New zone
      };

      const merged = mergeCacheWithUpdates(cached, updates);

      expect(merged.zones.length).toBe(2);
    });

    it('should prioritize more recent data', () => {
      const cached = {
        zones: [{ id: 'zone-1', updated_at: '2024-01-01' }],
      };

      const updates = {
        zones: [{ id: 'zone-1', updated_at: '2024-01-15' }],
      };

      const merged = mergeCacheWithUpdates(cached, updates);

      expect(merged.zones[0].updated_at).toBe('2024-01-15');
    });

    it('should process queued submissions when back online', async () => {
      const queue = createOfflineQueue();
      queue.add({ type: 'INTEL', data: { zone_id: '1' } });
      queue.add({ type: 'INTEL', data: { zone_id: '2' } });

      const mockSubmit = jest.fn().mockResolvedValue({ success: true });

      await queue.processAll(mockSubmit);

      expect(mockSubmit).toHaveBeenCalledTimes(2);
      expect(queue.pending).toBe(0);
    });
  });

  // ==========================================================================
  // SERVICE WORKER INTEGRATION
  // ==========================================================================
  describe('Service Worker Integration', () => {
    it('should register cache routes for city packs', () => {
      const routes = getCacheRoutes();

      expect(routes).toContainEqual(expect.objectContaining({ pattern: /\/api\/packs\/.*\.json/ }));
    });

    it('should use stale-while-revalidate for zone data', () => {
      const strategy = getCacheStrategy('/api/zones/bangkok');

      expect(strategy).toBe('stale-while-revalidate');
    });

    it('should use network-first for intel submissions', () => {
      const strategy = getCacheStrategy('/api/intel/submit');

      expect(strategy).toBe('network-first');
    });
  });
});

// ==========================================================================
// HELPER FUNCTIONS (mock implementations)
// ==========================================================================

async function loadZonesOffline(city: string, cache: Record<string, any>): Promise<any> {
  const packKey = `${city}-pack`;
  const pack = cache[packKey];

  if (!pack) return [];

  const generatedAt = new Date(pack.generated_at);
  const staleDays = Math.floor((Date.now() - generatedAt.getTime()) / (24 * 60 * 60 * 1000));

  if (staleDays > 7) {
    return {
      zones: pack.zones,
      isStale: true,
      staleDays,
    };
  }

  return pack.zones;
}

function adjustConfidenceForStaleness(zone: any, staleDays: number): any {
  if (staleDays <= 7) return zone;

  const decay = Math.min(staleDays * 1, 50); // 1 point per day, max 50
  const newScore = Math.max(20, zone.confidence.score - decay);

  const newLevel = newScore >= 60 ? zone.confidence.level : 'DEGRADED';

  return {
    ...zone,
    confidence: {
      ...zone.confidence,
      score: newScore,
      level: newLevel,
    },
    warnings: [...(zone.warnings || []), `Data is ${staleDays} days old`],
  };
}

function getUIState(context: { isOnline: boolean; hasCache: boolean }): any {
  return {
    showOfflineBanner: !context.isOnline,
    bannerMessage: context.isOnline ? null : 'You are offline - showing cached data',
    showNoDataState: !context.isOnline && !context.hasCache,
    intelSubmissionEnabled: context.isOnline,
  };
}

function getZoneUIState(zone: any): any {
  const isStale = zone.confidence.data_age_days > 30;
  const isLowConfidence = zone.confidence.level === 'LOW' || zone.confidence.level === 'DEGRADED';

  return {
    showAccuracyWarning: isStale || isLowConfidence,
    warningLevel: isStale || isLowConfidence ? 'HIGH' : 'MEDIUM',
  };
}

function createOfflineQueue() {
  const items: any[] = [];

  return {
    add: (item: any) => items.push(item),
    get pending() {
      return items.length;
    },
    processAll: async (handler: (item: any) => Promise<any>) => {
      for (const item of items) {
        await handler(item);
      }
      items.length = 0;
    },
  };
}

function mergeCacheWithUpdates(cached: any, updates: any): any {
  const mergedZones = [...cached.zones];

  for (const updateZone of updates.zones) {
    const existingIdx = mergedZones.findIndex((z) => z.id === updateZone.id);

    if (existingIdx >= 0) {
      // Check which is newer
      if (
        !mergedZones[existingIdx].updated_at ||
        updateZone.updated_at > mergedZones[existingIdx].updated_at
      ) {
        mergedZones[existingIdx] = updateZone;
      }
    } else {
      mergedZones.push(updateZone);
    }
  }

  return { zones: mergedZones };
}

function getCacheRoutes(): Array<{ pattern: RegExp }> {
  return [{ pattern: /\/api\/packs\/.*\.json/ }, { pattern: /\/api\/zones\/.*/ }];
}

function getCacheStrategy(url: string): string {
  if (url.includes('/intel/submit')) return 'network-first';
  return 'stale-while-revalidate';
}
