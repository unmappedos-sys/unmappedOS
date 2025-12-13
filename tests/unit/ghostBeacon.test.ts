/**
 * Ghost Beacon Tests
 */

import {
  GhostBeacon,
  GhostBeaconType,
  generateGhostBeacons,
  checkBeaconProximity,
  triggerBeacon,
  cleanupExpiredBeacons,
} from '@/lib/ghostBeacon';

describe('Ghost Beacon System', () => {
  describe('generateGhostBeacons', () => {
    it('should generate beacons for zone data', () => {
      const zoneData = {
        zone_id: 'test-zone-1',
        centroid: { lat: 13.7563, lon: 100.5018 },
        anchors: [
          { lat: 13.7560, lon: 100.5020, tags: { historic: 'yes' } },
          { lat: 13.7565, lon: 100.5015, tags: { amenity: 'cafe', craft: 'yes' } },
        ],
        pois: [
          { lat: 13.7570, lon: 100.5010, tags: { viewpoint: 'yes' } },
          { lat: 13.7555, lon: 100.5025, tags: { historic: 'castle', heritage: 'yes' } },
        ],
      };

      const beacons = generateGhostBeacons(zoneData);

      // Should generate beacons from high-interest POIs
      expect(Array.isArray(beacons)).toBe(true);
      beacons.forEach((beacon: GhostBeacon) => {
        expect(beacon.id).toBeDefined();
        expect(beacon.interest_score).toBeGreaterThanOrEqual(0);
        expect(beacon.interest_score).toBeLessThanOrEqual(10);
        expect(beacon.triggered).toBe(false);
      });
    });

    it('should include valid beacon types', () => {
      const zoneData = {
        zone_id: 'test-zone',
        centroid: { lat: 35.6895, lon: 139.6917 },
        anchors: [],
        pois: [
          { lat: 35.6890, lon: 139.6920, tags: { historic: 'monument' } },
          { lat: 35.6900, lon: 139.6915, tags: { amenity: 'cafe', craft: 'pottery' } },
          { lat: 35.6885, lon: 139.6925, tags: { viewpoint: 'yes' } },
          { lat: 35.6905, lon: 139.6910, tags: { railway: 'station' } },
        ],
      };

      const beacons = generateGhostBeacons(zoneData);

      const validTypes: GhostBeaconType[] = [
        'local_gem',
        'historic',
        'viewpoint',
        'transit_hub',
        'mystery',
      ];

      beacons.forEach((beacon: GhostBeacon) => {
        expect(validTypes).toContain(beacon.beacon_type);
      });
    });
  });

  describe('checkBeaconProximity', () => {
    it('should detect when user is within radius', () => {
      const beacons: GhostBeacon[] = [
        {
          id: 'beacon-1',
          location: { lat: 13.7563, lon: 100.5018 }, // Bangkok center
          interest_score: 8,
          discovery_hint: 'Test beacon',
          beacon_type: 'local_gem',
          radius: 50,
          triggered: false,
          expires_at: new Date(Date.now() + 86400000),
        },
      ];

      const userLocation = {
        lat: 13.7564,
        lon: 100.5019, // Very close
      };

      const alert = checkBeaconProximity(userLocation, beacons);

      expect(alert).not.toBeNull();
      if (alert) {
        expect(alert.distance).toBeLessThan(50);
      }
    });

    it('should not alert when user is outside radius', () => {
      const beacons: GhostBeacon[] = [
        {
          id: 'beacon-2',
          location: { lat: 13.7563, lon: 100.5018 },
          interest_score: 7,
          discovery_hint: 'Far beacon',
          beacon_type: 'viewpoint',
          radius: 50,
          triggered: false,
          expires_at: new Date(Date.now() + 86400000),
        },
      ];

      const userLocation = {
        lat: 13.7600, // Far away
        lon: 100.5100,
      };

      const alert = checkBeaconProximity(userLocation, beacons);

      expect(alert).toBeNull();
    });
  });

  describe('triggerBeacon', () => {
    it('should mark beacon as triggered', () => {
      const beacon: GhostBeacon = {
        id: 'beacon-3',
        location: { lat: 13.7563, lon: 100.5018 },
        interest_score: 9,
        discovery_hint: 'Mystery spot',
        beacon_type: 'mystery',
        radius: 50,
        triggered: false,
        expires_at: new Date(Date.now() + 86400000),
      };

      const triggered = triggerBeacon(beacon);

      expect(triggered.triggered).toBe(true);
      expect(triggered.triggered_at).toBeDefined();
    });
  });

  describe('cleanupExpiredBeacons', () => {
    it('should remove expired beacons', () => {
      const now = Date.now();

      const beacons: GhostBeacon[] = [
        {
          id: 'beacon-4',
          location: { lat: 13.7563, lon: 100.5018 },
          interest_score: 7,
          discovery_hint: 'Expired beacon',
          beacon_type: 'local_gem',
          radius: 50,
          triggered: false,
          expires_at: new Date(now - 1000), // Expired
        },
        {
          id: 'beacon-5',
          location: { lat: 13.7570, lon: 100.5020 },
          interest_score: 8,
          discovery_hint: 'Active beacon',
          beacon_type: 'historic',
          radius: 50,
          triggered: false,
          expires_at: new Date(now + 86400000), // Not expired
        },
      ];

      const cleaned = cleanupExpiredBeacons(beacons);

      expect(cleaned).toHaveLength(1);
      expect(cleaned[0].id).toBe('beacon-5');
    });
  });
});

