import type { Zone } from '@unmapped/lib';
import { computeTouristPressureIndex } from '@/lib/intel/touristPressure';

type PartialZone = Omit<Zone, 'polygon' | 'selected_anchor' | 'cheat_sheet'> & {
  polygon: Zone['polygon'];
  selected_anchor: Zone['selected_anchor'];
  cheat_sheet: Zone['cheat_sheet'];
};

function makeZone(overrides: Partial<PartialZone> & { zone_id: string; city: string }): Zone {
  const zone: Zone = {
    zone_id: overrides.zone_id,
    city: overrides.city,
    polygon:
      overrides.polygon ||
      ({
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0.01, 0],
            [0.01, 0.01],
            [0, 0.01],
            [0, 0],
          ],
        ],
      } as any),
    centroid: overrides.centroid || { lat: 0, lon: 0 },
    texture_type: overrides.texture_type || 'MIXED',
    neon_color: overrides.neon_color || '#00FF00',
    selected_anchor:
      overrides.selected_anchor ||
      ({
        id: `seed:${overrides.zone_id}`,
        lat: overrides.centroid?.lat ?? 0,
        lon: overrides.centroid?.lon ?? 0,
        tags: { source: 'test' },
        name: 'Anchor',
        selection_reason: 'test',
      } as any),
    price_medians: overrides.price_medians || {},
    cheat_sheet:
      overrides.cheat_sheet ||
      ({
        taxi_phrase: '',
        price_estimates: 'Coffee $10 | Beer $12',
        emergency_numbers: { police: '0', ambulance: '0', embassy: '0' },
      } as any),
    status: overrides.status || 'ACTIVE',
    safe_corridors: overrides.safe_corridors,
    intel_markers: overrides.intel_markers,
    mission_whisper: overrides.mission_whisper,
    search_index_tokens: overrides.search_index_tokens,
    top_comments: overrides.top_comments,
    texture_modifiers: overrides.texture_modifiers,
  };

  return zone;
}

describe('Tourist Pressure Index', () => {
  test('flags overpriced zone as COMPROMISED and recommends an extraction', () => {
    const city = 'testcity';

    const cheap = makeZone({
      zone_id: 'Z_001',
      city,
      centroid: { lat: 0, lon: 0 },
      price_medians: { coffee: 10 },
      texture_type: 'RESIDENTIAL',
    });

    const normal = makeZone({
      zone_id: 'Z_002',
      city,
      centroid: { lat: 0, lon: 0.01 },
      price_medians: { coffee: 15 },
      texture_type: 'MIXED',
    });

    const expensive = makeZone({
      zone_id: 'Z_003',
      city,
      centroid: { lat: 0, lon: 0.02 },
      price_medians: { coffee: 30 },
      texture_type: 'TRANSIT_HUB',
      intel_markers: [{ type: 'OVERPRICING', lat: 0, lon: 0, count: 3 }],
    });

    const zones = [cheap, normal, expensive];
    const tpi = computeTouristPressureIndex(expensive, zones);

    expect(tpi.status).toBe('COMPROMISED');
    expect(tpi.reason).toContain('PRICE DELTA');
    expect(tpi.recommendation).toBeDefined();
    expect(tpi.recommendation!.message).toContain('EXTRACT');
  });

  test('uses anomaly-based reason when price medians are missing', () => {
    const city = 'testcity';

    const z1 = makeZone({
      zone_id: 'Z_010',
      city,
      centroid: { lat: 1, lon: 1 },
      price_medians: {},
      intel_markers: [{ type: 'OVERPRICING', lat: 0, lon: 0, count: 5 }],
      texture_type: 'COMMERCIAL_DENSE',
    });

    const z2 = makeZone({
      zone_id: 'Z_011',
      city,
      centroid: { lat: 1, lon: 1.01 },
      price_medians: {},
      intel_markers: [{ type: 'CLEAN', lat: 0, lon: 0, count: 2 }],
      texture_type: 'RESIDENTIAL',
    });

    const tpi = computeTouristPressureIndex(z1, [z1, z2]);

    expect(tpi.price_delta_pct).toBeNull();
    expect(['ANOMALY RATE ELEVATED', 'LOCAL ACTIVITY DEGRADED', 'LOCAL SIGNAL NORMAL']).toContain(
      tpi.reason
    );
  });
});
