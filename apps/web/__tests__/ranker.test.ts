/**
 * Recommendation Ranker Tests
 *
 * Tests for:
 * - Texture matching
 * - Time-of-day scoring
 * - Weather impact
 * - Confidence weighting
 * - Explainable outputs
 */

import {
  rankZones,
  calculateTextureScore,
  calculateTimeScore,
  calculateWeatherImpact,
  applyDistancePenalty,
  RANKING_WEIGHTS,
} from '../lib/intel/ranker';

// Mock zone data
const mockZones = [
  {
    id: 'zone-1',
    name: 'Night Market Zone',
    texture: {
      primary: 'night-market',
      secondary: ['street-food', 'local-market'],
      tourist_density: 'MEDIUM' as const,
      hassle_factor: 4,
      walkability: 8,
      time_tags: ['evening', 'night'],
    },
    confidence: {
      score: 85,
      level: 'HIGH' as const,
      data_age_days: 2,
      last_intel: new Date().toISOString(),
      intel_count_24h: 5,
      has_conflicts: false,
      is_offline: false,
    },
    pricing: {
      coffee_local: 40,
      beer_local: 80,
      meal_street: 60,
      currency: 'THB',
    },
    center: { lat: 13.7563, lng: 100.5018 },
  },
  {
    id: 'zone-2',
    name: 'Temple District',
    texture: {
      primary: 'cultural',
      secondary: ['temple-area', 'park'],
      tourist_density: 'HIGH' as const,
      hassle_factor: 6,
      walkability: 7,
      time_tags: ['morning', 'afternoon'],
    },
    confidence: {
      score: 70,
      level: 'MEDIUM' as const,
      data_age_days: 10,
      last_intel: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      intel_count_24h: 1,
      has_conflicts: false,
      is_offline: false,
    },
    pricing: {
      coffee_tourist: 120,
      meal_restaurant: 300,
      currency: 'THB',
    },
    center: { lat: 13.751, lng: 100.4927 },
  },
  {
    id: 'zone-3',
    name: 'Degraded Zone',
    texture: {
      primary: 'residential',
      secondary: [],
      tourist_density: 'LOW' as const,
      hassle_factor: 2,
      walkability: 6,
      time_tags: [],
    },
    confidence: {
      score: 25,
      level: 'DEGRADED' as const,
      data_age_days: 60,
      last_intel: null,
      intel_count_24h: 0,
      has_conflicts: true,
      is_offline: false,
    },
    pricing: {
      currency: 'THB',
    },
    center: { lat: 13.76, lng: 100.51 },
  },
];

describe('Recommendation Ranker', () => {
  // ==========================================================================
  // TEXTURE SCORE TESTS
  // ==========================================================================
  describe('calculateTextureScore', () => {
    it('should give high score for matching primary texture', () => {
      const score = calculateTextureScore(mockZones[0].texture, {
        preferred_textures: ['night-market', 'street-food'],
      });

      expect(score).toBeGreaterThan(0.7);
    });

    it('should give partial score for matching secondary texture', () => {
      const score = calculateTextureScore(
        mockZones[0].texture,
        { preferred_textures: ['local-market'] } // matches secondary
      );

      expect(score).toBeGreaterThan(0.3);
      expect(score).toBeLessThan(0.8);
    });

    it('should give low score for non-matching textures', () => {
      const score = calculateTextureScore(mockZones[0].texture, {
        preferred_textures: ['cultural', 'temple-area'],
      });

      expect(score).toBeLessThan(0.5);
    });

    it('should penalize high hassle factor for low-hassle preference', () => {
      const lowHassleScore = calculateTextureScore(
        { ...mockZones[0].texture, hassle_factor: 2 },
        { preferred_textures: [], hassle_tolerance: 'LOW' }
      );

      const highHassleScore = calculateTextureScore(
        { ...mockZones[0].texture, hassle_factor: 8 },
        { preferred_textures: [], hassle_tolerance: 'LOW' }
      );

      expect(lowHassleScore).toBeGreaterThan(highHassleScore);
    });

    it('should factor in walkability preference', () => {
      const highWalkScore = calculateTextureScore(
        { ...mockZones[0].texture, walkability: 9 },
        { preferred_textures: [], min_walkability: 8 }
      );

      const lowWalkScore = calculateTextureScore(
        { ...mockZones[0].texture, walkability: 4 },
        { preferred_textures: [], min_walkability: 8 }
      );

      expect(highWalkScore).toBeGreaterThan(lowWalkScore);
    });
  });

  // ==========================================================================
  // TIME SCORE TESTS
  // ==========================================================================
  describe('calculateTimeScore', () => {
    it('should give high score when time tags match current time', () => {
      // Test evening zone at 8 PM
      const eveningDate = new Date();
      eveningDate.setHours(20, 0, 0, 0);

      const score = calculateTimeScore(mockZones[0].texture.time_tags, eveningDate);

      expect(score).toBeGreaterThan(0.7);
    });

    it('should give low score when time tags do not match', () => {
      // Test evening zone at 9 AM
      const morningDate = new Date();
      morningDate.setHours(9, 0, 0, 0);

      const score = calculateTimeScore(
        mockZones[0].texture.time_tags, // evening, night
        morningDate
      );

      expect(score).toBeLessThan(0.5);
    });

    it('should give neutral score for zones without time tags', () => {
      const score = calculateTimeScore([], new Date());

      expect(score).toBe(0.5);
    });

    it('should handle morning zones correctly', () => {
      const morningDate = new Date();
      morningDate.setHours(9, 0, 0, 0);

      const score = calculateTimeScore(['morning', 'afternoon'], morningDate);

      expect(score).toBeGreaterThan(0.7);
    });
  });

  // ==========================================================================
  // WEATHER IMPACT TESTS
  // ==========================================================================
  describe('calculateWeatherImpact', () => {
    it('should penalize outdoor zones in rain', () => {
      const weather = {
        precipitation_probability: 80,
        temperature: 28,
        conditions: 'rain' as const,
      };

      const outdoorImpact = calculateWeatherImpact(
        { ...mockZones[0].texture, primary: 'park' },
        weather
      );

      expect(outdoorImpact).toBeLessThan(1);
    });

    it('should not penalize indoor zones in rain', () => {
      const weather = {
        precipitation_probability: 80,
        temperature: 28,
        conditions: 'rain' as const,
      };

      const indoorImpact = calculateWeatherImpact(
        { ...mockZones[0].texture, primary: 'modern-mall' },
        weather
      );

      expect(indoorImpact).toBeGreaterThanOrEqual(0.9);
    });

    it('should factor in temperature for outdoor activities', () => {
      const hotWeather = {
        precipitation_probability: 0,
        temperature: 38,
        conditions: 'clear' as const,
      };

      const impact = calculateWeatherImpact(mockZones[0].texture, hotWeather);

      // High temp should reduce score somewhat
      expect(impact).toBeLessThan(1);
    });

    it('should boost zones in good weather', () => {
      const goodWeather = {
        precipitation_probability: 0,
        temperature: 25,
        conditions: 'clear' as const,
      };

      const impact = calculateWeatherImpact(mockZones[0].texture, goodWeather);

      expect(impact).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // DISTANCE PENALTY TESTS
  // ==========================================================================
  describe('applyDistancePenalty', () => {
    it('should not penalize nearby zones', () => {
      const penalty = applyDistancePenalty(0.5); // 500m
      expect(penalty).toBeGreaterThan(0.9);
    });

    it('should moderately penalize medium distances', () => {
      const penalty = applyDistancePenalty(3); // 3km
      expect(penalty).toBeGreaterThan(0.5);
      expect(penalty).toBeLessThan(0.9);
    });

    it('should heavily penalize far distances', () => {
      const penalty = applyDistancePenalty(10); // 10km
      expect(penalty).toBeLessThan(0.5);
    });

    it('should return minimum for very far distances', () => {
      const penalty = applyDistancePenalty(50); // 50km
      expect(penalty).toBeGreaterThanOrEqual(0.1);
    });
  });

  // ==========================================================================
  // FULL RANKING TESTS
  // ==========================================================================
  describe('rankZones', () => {
    it('should rank zones with higher confidence higher', () => {
      const results = rankZones(mockZones, {
        user_location: { lat: 13.7563, lng: 100.5018 },
        preferences: {},
      });

      // Zone 1 has highest confidence (85)
      expect(results[0].zone.id).toBe('zone-1');
    });

    it('should filter out offline zones', () => {
      const zonesWithOffline = [
        ...mockZones,
        {
          ...mockZones[0],
          id: 'offline-zone',
          confidence: { ...mockZones[0].confidence, is_offline: true },
        },
      ];

      const results = rankZones(zonesWithOffline, {
        user_location: { lat: 13.7563, lng: 100.5018 },
        preferences: {},
      });

      expect(results.find((r) => r.zone.id === 'offline-zone')).toBeUndefined();
    });

    it('should include warnings for degraded zones', () => {
      const results = rankZones(mockZones, {
        user_location: { lat: 13.7563, lng: 100.5018 },
        preferences: {},
      });

      const degradedResult = results.find((r) => r.zone.id === 'zone-3');
      expect(degradedResult?.warnings.length).toBeGreaterThan(0);
    });

    it('should respect texture preferences', () => {
      const results = rankZones(mockZones, {
        user_location: { lat: 13.7563, lng: 100.5018 },
        preferences: {
          preferred_textures: ['cultural', 'temple-area'],
        },
      });

      // Temple district should rank higher with cultural preference
      const nightMarketRank = results.findIndex((r) => r.zone.id === 'zone-1');
      const templeRank = results.findIndex((r) => r.zone.id === 'zone-2');

      expect(templeRank).toBeLessThan(nightMarketRank);
    });

    it('should provide explainable reasons', () => {
      const results = rankZones(mockZones, {
        user_location: { lat: 13.7563, lng: 100.5018 },
        preferences: { preferred_textures: ['night-market'] },
      });

      const topResult = results[0];
      expect(topResult.reasons.length).toBeGreaterThan(0);
      expect(topResult.reasons.some((r) => r.includes('texture') || r.includes('confidence'))).toBe(
        true
      );
    });

    it('should handle empty zones array', () => {
      const results = rankZones([], {
        user_location: { lat: 13.7563, lng: 100.5018 },
        preferences: {},
      });

      expect(results).toEqual([]);
    });

    it('should calculate scores consistently', () => {
      const results1 = rankZones(mockZones, {
        user_location: { lat: 13.7563, lng: 100.5018 },
        preferences: {},
      });

      const results2 = rankZones(mockZones, {
        user_location: { lat: 13.7563, lng: 100.5018 },
        preferences: {},
      });

      expect(results1[0].score).toBe(results2[0].score);
    });
  });

  // ==========================================================================
  // WEIGHT VERIFICATION TESTS
  // ==========================================================================
  describe('Ranking Weights', () => {
    it('should have weights that sum to 1', () => {
      const sum = Object.values(RANKING_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 2);
    });

    it('should have confidence as significant factor', () => {
      expect(RANKING_WEIGHTS.CONFIDENCE).toBeGreaterThanOrEqual(0.2);
    });

    it('should have texture as most important factor', () => {
      const maxWeight = Math.max(...Object.values(RANKING_WEIGHTS));
      expect(RANKING_WEIGHTS.TEXTURE).toBe(maxWeight);
    });
  });
});
