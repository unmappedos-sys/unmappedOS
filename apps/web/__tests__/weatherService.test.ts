/**
 * Weather Integration Tests
 * 
 * Tests for:
 * - Weather API fetching
 * - Weather modifier calculations
 * - Zone impact from weather
 */

import {
  fetchWeather,
  calculateWeatherModifiers,
  applyWeatherToZone,
  getWeatherConditions,
  WEATHER_THRESHOLDS,
} from '../../lib/intel/weatherService';

// Mock fetch
global.fetch = jest.fn();

describe('Weather Service', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  // ==========================================================================
  // WEATHER FETCHING TESTS
  // ==========================================================================
  describe('fetchWeather', () => {
    it('should fetch weather from Open-Meteo API', async () => {
      const mockResponse = {
        current: {
          temperature_2m: 28,
          relative_humidity_2m: 75,
          precipitation: 0,
          weather_code: 0, // Clear sky
          wind_speed_10m: 10,
        },
        hourly: {
          precipitation_probability: [10, 15, 20, 25],
        },
      };
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      
      const weather = await fetchWeather({ lat: 13.7563, lng: 100.5018 });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.open-meteo.com')
      );
      expect(weather.temperature).toBe(28);
      expect(weather.conditions).toBe('clear');
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });
      
      const weather = await fetchWeather({ lat: 13.7563, lng: 100.5018 });
      
      // Should return default/fallback weather
      expect(weather).toBeDefined();
      expect(weather.conditions).toBe('unknown');
    });

    it('should cache weather data for same location', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          current: { temperature_2m: 30, weather_code: 0 },
          hourly: { precipitation_probability: [0] },
        }),
      });
      
      // First call
      await fetchWeather({ lat: 13.7563, lng: 100.5018 });
      // Second call (should use cache)
      await fetchWeather({ lat: 13.7563, lng: 100.5018 });
      
      // Should only fetch once due to caching
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should round coordinates for cache key', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          current: { temperature_2m: 30, weather_code: 0 },
          hourly: { precipitation_probability: [0] },
        }),
      });
      
      // Slightly different coordinates (same area)
      await fetchWeather({ lat: 13.7563, lng: 100.5018 });
      await fetchWeather({ lat: 13.7565, lng: 100.5020 });
      
      // Should use same cache entry
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // WEATHER MODIFIERS TESTS
  // ==========================================================================
  describe('calculateWeatherModifiers', () => {
    it('should return neutral modifiers for good weather', () => {
      const weather = {
        temperature: 25,
        humidity: 50,
        precipitation_probability: 10,
        conditions: 'clear' as const,
        wind_speed: 5,
      };
      
      const modifiers = calculateWeatherModifiers(weather);
      
      expect(modifiers.walkability_modifier).toBeGreaterThanOrEqual(0);
      expect(modifiers.safety_modifier).toBeGreaterThanOrEqual(0);
    });

    it('should penalize walkability in rain', () => {
      const weather = {
        temperature: 28,
        humidity: 90,
        precipitation_probability: 80,
        conditions: 'rain' as const,
        wind_speed: 15,
      };
      
      const modifiers = calculateWeatherModifiers(weather);
      
      expect(modifiers.walkability_modifier).toBeLessThan(0);
    });

    it('should penalize walkability in extreme heat', () => {
      const weather = {
        temperature: 38,
        humidity: 70,
        precipitation_probability: 0,
        conditions: 'clear' as const,
        wind_speed: 5,
      };
      
      const modifiers = calculateWeatherModifiers(weather);
      
      expect(modifiers.walkability_modifier).toBeLessThan(0);
    });

    it('should boost indoor textures in bad weather', () => {
      const weather = {
        temperature: 28,
        humidity: 95,
        precipitation_probability: 90,
        conditions: 'thunderstorm' as const,
        wind_speed: 25,
      };
      
      const modifiers = calculateWeatherModifiers(weather);
      
      expect(modifiers.texture_weights['modern-mall']).toBeGreaterThan(1);
      expect(modifiers.texture_weights['park']).toBeLessThan(1);
    });

    it('should handle thunderstorms with safety modifier', () => {
      const weather = {
        temperature: 28,
        humidity: 90,
        precipitation_probability: 95,
        conditions: 'thunderstorm' as const,
        wind_speed: 30,
      };
      
      const modifiers = calculateWeatherModifiers(weather);
      
      expect(modifiers.safety_modifier).toBeLessThan(0);
    });
  });

  // ==========================================================================
  // ZONE WEATHER IMPACT TESTS
  // ==========================================================================
  describe('applyWeatherToZone', () => {
    const baseZone = {
      id: 'zone-1',
      name: 'Test Zone',
      texture: {
        primary: 'night-market',
        walkability: 8,
        time_tags: ['evening', 'night'],
      },
      confidence: { score: 80 },
    };

    it('should adjust walkability based on weather', () => {
      const badWeather = {
        walkability_modifier: -3,
        safety_modifier: 0,
        texture_weights: {},
      };
      
      const adjusted = applyWeatherToZone(baseZone, badWeather);
      
      expect(adjusted.texture.walkability).toBe(5); // 8 - 3
    });

    it('should not reduce walkability below 1', () => {
      const terribleWeather = {
        walkability_modifier: -10,
        safety_modifier: 0,
        texture_weights: {},
      };
      
      const adjusted = applyWeatherToZone(baseZone, terribleWeather);
      
      expect(adjusted.texture.walkability).toBeGreaterThanOrEqual(1);
    });

    it('should add weather warning for severe conditions', () => {
      const severeWeather = {
        walkability_modifier: -5,
        safety_modifier: -3,
        texture_weights: {},
        warnings: ['Heavy rain expected'],
      };
      
      const adjusted = applyWeatherToZone(baseZone, severeWeather);
      
      expect(adjusted.weather_warnings).toContain('Heavy rain expected');
    });

    it('should not modify original zone object', () => {
      const weather = {
        walkability_modifier: -3,
        safety_modifier: 0,
        texture_weights: {},
      };
      
      const adjusted = applyWeatherToZone(baseZone, weather);
      
      expect(baseZone.texture.walkability).toBe(8); // Original unchanged
      expect(adjusted.texture.walkability).toBe(5);
    });
  });

  // ==========================================================================
  // WEATHER CONDITIONS MAPPING TESTS
  // ==========================================================================
  describe('getWeatherConditions', () => {
    it('should map weather codes to conditions', () => {
      expect(getWeatherConditions(0)).toBe('clear');
      expect(getWeatherConditions(1)).toBe('clear');
      expect(getWeatherConditions(2)).toBe('cloudy');
      expect(getWeatherConditions(61)).toBe('rain');
      expect(getWeatherConditions(95)).toBe('thunderstorm');
    });

    it('should return unknown for invalid codes', () => {
      expect(getWeatherConditions(-1)).toBe('unknown');
      expect(getWeatherConditions(999)).toBe('unknown');
    });
  });

  // ==========================================================================
  // THRESHOLD TESTS
  // ==========================================================================
  describe('Weather Thresholds', () => {
    it('should have defined heat threshold', () => {
      expect(WEATHER_THRESHOLDS.EXTREME_HEAT).toBeGreaterThan(30);
    });

    it('should have defined rain probability threshold', () => {
      expect(WEATHER_THRESHOLDS.RAIN_LIKELY).toBeGreaterThanOrEqual(50);
    });

    it('should have defined wind threshold', () => {
      expect(WEATHER_THRESHOLDS.HIGH_WIND).toBeGreaterThan(20);
    });
  });
});
