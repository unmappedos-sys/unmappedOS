/**
 * Weather Modifier System v1
 * 
 * Integrates Open-Meteo API for runtime weather impact on zones.
 * Free API, no key required, ethical data source.
 * 
 * DESIGN PRINCIPLES:
 * - Weather affects texture interpretation, not raw data
 * - No caching of weather data beyond 1 hour
 * - Clear disclosure: "weather conditions may affect recommendations"
 * - Graceful degradation if API unavailable
 */

// =============================================================================
// TYPES
// =============================================================================

export type WeatherCondition = 
  | 'CLEAR'
  | 'PARTLY_CLOUDY'
  | 'CLOUDY'
  | 'FOG'
  | 'DRIZZLE'
  | 'RAIN'
  | 'HEAVY_RAIN'
  | 'THUNDERSTORM'
  | 'SNOW'
  | 'SLEET';

export type TemperatureComfort =
  | 'FREEZING'      // < 0°C
  | 'COLD'          // 0-10°C
  | 'COOL'          // 10-18°C
  | 'COMFORTABLE'   // 18-26°C
  | 'WARM'          // 26-32°C
  | 'HOT'           // 32-38°C
  | 'EXTREME_HEAT'; // > 38°C

export interface WeatherData {
  condition: WeatherCondition;
  temperature_c: number;
  feels_like_c: number;
  humidity_percent: number;
  wind_speed_kmh: number;
  precipitation_mm: number;
  visibility_km: number;
  uv_index: number;
  is_day: boolean;
  comfort: TemperatureComfort;
  fetched_at: string;
  expires_at: string;
}

export interface WeatherImpact {
  texture_modifier: number;      // -1 to +1 (affects chaos/silence perception)
  outdoor_viability: number;     // 0 to 1 (can you comfortably be outside?)
  walking_penalty: number;       // 0 to 1 (how much harder is walking?)
  safety_factor: number;         // 0 to 1 (weather-related safety)
  recommended_duration_factor: number; // Multiplier for suggested exploration time
  warnings: string[];
  tips: string[];
}

export interface WeatherModifierConfig {
  latitude: number;
  longitude: number;
  timezone: string;
}

// =============================================================================
// OPEN-METEO API
// =============================================================================

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

// In-memory cache (per-city)
const weatherCache = new Map<string, WeatherData>();

/**
 * Fetch current weather from Open-Meteo API
 */
export async function fetchWeather(
  config: WeatherModifierConfig
): Promise<WeatherData | null> {
  const cacheKey = `${config.latitude.toFixed(4)}_${config.longitude.toFixed(4)}`;
  
  // Check cache
  const cached = weatherCache.get(cacheKey);
  if (cached && new Date(cached.expires_at) > new Date()) {
    return cached;
  }

  try {
    const url = new URL(OPEN_METEO_BASE);
    url.searchParams.set('latitude', config.latitude.toString());
    url.searchParams.set('longitude', config.longitude.toString());
    url.searchParams.set('current', [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'visibility',
      'uv_index',
      'is_day'
    ].join(','));
    url.searchParams.set('timezone', config.timezone);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error(`[Weather] API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const current = data.current;

    const weather: WeatherData = {
      condition: mapWeatherCode(current.weather_code),
      temperature_c: current.temperature_2m,
      feels_like_c: current.apparent_temperature,
      humidity_percent: current.relative_humidity_2m,
      wind_speed_kmh: current.wind_speed_10m,
      precipitation_mm: current.precipitation,
      visibility_km: (current.visibility || 10000) / 1000,
      uv_index: current.uv_index || 0,
      is_day: current.is_day === 1,
      comfort: classifyTemperature(current.apparent_temperature),
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + CACHE_DURATION_MS).toISOString(),
    };

    // Cache
    weatherCache.set(cacheKey, weather);
    
    return weather;
  } catch (error) {
    console.error('[Weather] Fetch failed:', error);
    return null;
  }
}

/**
 * Map WMO weather codes to our condition types
 * https://open-meteo.com/en/docs
 */
function mapWeatherCode(code: number): WeatherCondition {
  if (code === 0) return 'CLEAR';
  if (code === 1 || code === 2) return 'PARTLY_CLOUDY';
  if (code === 3) return 'CLOUDY';
  if (code === 45 || code === 48) return 'FOG';
  if (code >= 51 && code <= 55) return 'DRIZZLE';
  if (code >= 56 && code <= 57) return 'SLEET';
  if (code >= 61 && code <= 63) return 'RAIN';
  if (code >= 65 && code <= 67) return 'HEAVY_RAIN';
  if (code >= 71 && code <= 77) return 'SNOW';
  if (code >= 80 && code <= 82) return 'RAIN';
  if (code >= 85 && code <= 86) return 'SNOW';
  if (code >= 95 && code <= 99) return 'THUNDERSTORM';
  
  return 'CLOUDY'; // Default fallback
}

/**
 * Classify temperature into comfort zones
 */
function classifyTemperature(tempC: number): TemperatureComfort {
  if (tempC < 0) return 'FREEZING';
  if (tempC < 10) return 'COLD';
  if (tempC < 18) return 'COOL';
  if (tempC < 26) return 'COMFORTABLE';
  if (tempC < 32) return 'WARM';
  if (tempC < 38) return 'HOT';
  return 'EXTREME_HEAT';
}

// =============================================================================
// IMPACT CALCULATION
// =============================================================================

/**
 * Calculate weather impact on zone exploration
 */
export function calculateWeatherImpact(weather: WeatherData): WeatherImpact {
  const warnings: string[] = [];
  const tips: string[] = [];

  // Base values
  let textureModifier = 0;     // Affects chaos/silence perception
  let outdoorViability = 1.0;  // Can you be outside comfortably?
  let walkingPenalty = 0;      // How much harder is walking?
  let safetyFactor = 1.0;      // Weather-related safety concerns
  let durationFactor = 1.0;    // Multiplier for exploration time

  // === PRECIPITATION EFFECTS ===
  switch (weather.condition) {
    case 'DRIZZLE':
      outdoorViability *= 0.8;
      walkingPenalty = 0.1;
      tips.push('Light rain - consider umbrella');
      break;
    
    case 'RAIN':
      outdoorViability *= 0.5;
      walkingPenalty = 0.3;
      durationFactor = 0.7;
      textureModifier = -0.2; // Rain dampens chaos
      tips.push('Rain expected - waterproof gear recommended');
      tips.push('Indoor alternatives may be preferable');
      break;
    
    case 'HEAVY_RAIN':
      outdoorViability *= 0.2;
      walkingPenalty = 0.6;
      durationFactor = 0.4;
      safetyFactor = 0.7;
      textureModifier = -0.4;
      warnings.push('Heavy rain - outdoor exploration not recommended');
      tips.push('Seek indoor shelter');
      break;
    
    case 'THUNDERSTORM':
      outdoorViability = 0.1;
      walkingPenalty = 0.8;
      durationFactor = 0.2;
      safetyFactor = 0.4;
      textureModifier = -0.5;
      warnings.push('THUNDERSTORM - Seek shelter immediately');
      warnings.push('Avoid open areas, tall structures, water');
      break;
    
    case 'SNOW':
      outdoorViability *= 0.6;
      walkingPenalty = 0.4;
      durationFactor = 0.6;
      safetyFactor = 0.8;
      textureModifier = -0.3; // Snow quiets everything
      tips.push('Snow conditions - wear appropriate footwear');
      tips.push('Watch for slippery surfaces');
      break;
    
    case 'FOG':
      outdoorViability *= 0.7;
      safetyFactor = 0.85;
      textureModifier = -0.2; // Fog muffles sounds
      tips.push('Low visibility - stay aware of surroundings');
      tips.push('Navigation may be more difficult');
      break;
  }

  // === TEMPERATURE EFFECTS ===
  switch (weather.comfort) {
    case 'FREEZING':
      outdoorViability *= 0.4;
      durationFactor = 0.5;
      safetyFactor *= 0.7;
      warnings.push(`Freezing temperatures (${weather.feels_like_c}°C) - hypothermia risk`);
      tips.push('Dress in layers, limit outdoor exposure');
      break;
    
    case 'COLD':
      outdoorViability *= 0.7;
      durationFactor = 0.7;
      tips.push('Cold weather - warm clothing essential');
      break;
    
    case 'COOL':
      outdoorViability *= 0.9;
      tips.push('Cool weather - light layers recommended');
      break;
    
    case 'COMFORTABLE':
      // Perfect conditions - no modifier
      tips.push('Great weather for exploring');
      break;
    
    case 'WARM':
      outdoorViability *= 0.85;
      durationFactor = 0.85;
      tips.push('Warm weather - stay hydrated');
      break;
    
    case 'HOT':
      outdoorViability *= 0.6;
      durationFactor = 0.6;
      safetyFactor *= 0.85;
      warnings.push(`High temperatures (${weather.feels_like_c}°C) - heat exhaustion risk`);
      tips.push('Avoid midday sun, seek shade');
      tips.push('Carry water, take frequent breaks');
      break;
    
    case 'EXTREME_HEAT':
      outdoorViability = 0.3;
      durationFactor = 0.3;
      safetyFactor = 0.5;
      warnings.push(`EXTREME HEAT (${weather.feels_like_c}°C) - Heat stroke danger`);
      warnings.push('Avoid outdoor activity during hottest hours');
      tips.push('Stay in air-conditioned spaces');
      tips.push('If outdoors, carry water, wear hat, seek shade');
      break;
  }

  // === WIND EFFECTS ===
  if (weather.wind_speed_kmh > 50) {
    outdoorViability *= 0.5;
    safetyFactor *= 0.7;
    warnings.push(`High winds (${weather.wind_speed_kmh} km/h) - falling debris risk`);
    tips.push('Avoid areas with loose structures');
  } else if (weather.wind_speed_kmh > 30) {
    outdoorViability *= 0.8;
    tips.push('Windy conditions - secure loose items');
  }

  // === UV INDEX ===
  if (weather.uv_index >= 11) {
    safetyFactor *= 0.8;
    warnings.push(`Extreme UV (${weather.uv_index}) - severe sunburn risk`);
    tips.push('Sunscreen mandatory, protective clothing advised');
  } else if (weather.uv_index >= 8) {
    tips.push(`High UV (${weather.uv_index}) - wear sunscreen`);
  } else if (weather.uv_index >= 6) {
    tips.push('Moderate UV - sunscreen recommended');
  }

  // === VISIBILITY ===
  if (weather.visibility_km < 1) {
    safetyFactor *= 0.7;
    warnings.push('Very low visibility - navigation hazardous');
  } else if (weather.visibility_km < 3) {
    tips.push('Reduced visibility - be extra cautious');
  }

  // === HUMIDITY ===
  if (weather.humidity_percent > 90 && weather.temperature_c > 25) {
    outdoorViability *= 0.8;
    durationFactor *= 0.8;
    tips.push('High humidity - sweating will not cool you effectively');
    tips.push('Take more breaks than usual');
  }

  // === DAY/NIGHT ===
  if (!weather.is_day) {
    safetyFactor *= 0.9;
    textureModifier += 0.1; // Night increases perceived chaos slightly
    tips.push('After dark - stay in well-lit areas');
  }

  // Clamp values
  return {
    texture_modifier: Math.max(-1, Math.min(1, textureModifier)),
    outdoor_viability: Math.max(0, Math.min(1, outdoorViability)),
    walking_penalty: Math.max(0, Math.min(1, walkingPenalty)),
    safety_factor: Math.max(0, Math.min(1, safetyFactor)),
    recommended_duration_factor: Math.max(0.2, Math.min(1.5, durationFactor)),
    warnings,
    tips: tips.slice(0, 5), // Max 5 tips
  };
}

// =============================================================================
// ZONE MODIFIERS
// =============================================================================

/**
 * Apply weather impact to a zone's texture score
 */
export function applyWeatherToTexture(
  baseTexture: number,
  weatherImpact: WeatherImpact
): number {
  // Texture score 0 = SILENCE, 100 = CHAOS
  // Weather modifier affects perception
  const modified = baseTexture + (weatherImpact.texture_modifier * 20);
  return Math.max(0, Math.min(100, modified));
}

/**
 * Adjust recommended exploration duration based on weather
 */
export function adjustExplorationDuration(
  baseDurationMinutes: number,
  weatherImpact: WeatherImpact
): number {
  return Math.round(baseDurationMinutes * weatherImpact.recommended_duration_factor);
}

/**
 * Generate weather-aware recommendation
 */
export function generateWeatherRecommendation(
  weather: WeatherData,
  impact: WeatherImpact
): string {
  if (impact.outdoor_viability < 0.3) {
    return 'Current conditions are not suitable for outdoor exploration. Consider indoor alternatives.';
  }
  
  if (impact.outdoor_viability < 0.6) {
    return 'Weather conditions may limit outdoor activities. Plan for shorter exploration periods with breaks.';
  }
  
  if (weather.comfort === 'COMFORTABLE' && weather.condition === 'CLEAR') {
    return 'Excellent conditions for exploring. Make the most of it!';
  }
  
  if (impact.warnings.length > 0) {
    return `Weather advisory: ${impact.warnings[0]}`;
  }
  
  return 'Acceptable conditions for exploring with appropriate preparation.';
}

// =============================================================================
// CITY CONFIGS - Coordinates for Open-Meteo
// =============================================================================

export const WEATHER_CITY_CONFIGS: Record<string, WeatherModifierConfig> = {
  bangkok: {
    latitude: 13.7563,
    longitude: 100.5018,
    timezone: 'Asia/Bangkok',
  },
  tokyo: {
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: 'Asia/Tokyo',
  },
  singapore: {
    latitude: 1.3521,
    longitude: 103.8198,
    timezone: 'Asia/Singapore',
  },
  hong_kong: {
    latitude: 22.3193,
    longitude: 114.1694,
    timezone: 'Asia/Hong_Kong',
  },
  seoul: {
    latitude: 37.5665,
    longitude: 126.9780,
    timezone: 'Asia/Seoul',
  },
  bali: {
    latitude: -8.4095,
    longitude: 115.1889,
    timezone: 'Asia/Makassar',
  },
  kuala_lumpur: {
    latitude: 3.1390,
    longitude: 101.6869,
    timezone: 'Asia/Kuala_Lumpur',
  },
  hanoi: {
    latitude: 21.0285,
    longitude: 105.8542,
    timezone: 'Asia/Ho_Chi_Minh',
  },
  ho_chi_minh: {
    latitude: 10.8231,
    longitude: 106.6297,
    timezone: 'Asia/Ho_Chi_Minh',
  },
  taipei: {
    latitude: 25.0330,
    longitude: 121.5654,
    timezone: 'Asia/Taipei',
  },
};

// =============================================================================
// HIGH-LEVEL API
// =============================================================================

/**
 * Get weather impact for a city
 */
export async function getWeatherImpactForCity(
  citySlug: string
): Promise<{ weather: WeatherData; impact: WeatherImpact } | null> {
  const config = WEATHER_CITY_CONFIGS[citySlug];
  
  if (!config) {
    console.warn(`[Weather] No config for city: ${citySlug}`);
    return null;
  }

  const weather = await fetchWeather(config);
  
  if (!weather) {
    return null;
  }

  const impact = calculateWeatherImpact(weather);
  
  return { weather, impact };
}

/**
 * Get weather summary string for display
 */
export function formatWeatherSummary(weather: WeatherData): string {
  const parts: string[] = [];
  
  // Condition
  const conditionMap: Record<WeatherCondition, string> = {
    CLEAR: '☀️ Clear',
    PARTLY_CLOUDY: '⛅ Partly Cloudy',
    CLOUDY: '☁️ Cloudy',
    FOG: '🌫️ Foggy',
    DRIZZLE: '🌧️ Drizzle',
    RAIN: '🌧️ Rain',
    HEAVY_RAIN: '⛈️ Heavy Rain',
    THUNDERSTORM: '⛈️ Thunderstorm',
    SNOW: '❄️ Snow',
    SLEET: '🌨️ Sleet',
  };
  parts.push(conditionMap[weather.condition] || weather.condition);
  
  // Temperature
  parts.push(`${Math.round(weather.temperature_c)}°C`);
  
  if (Math.abs(weather.feels_like_c - weather.temperature_c) > 3) {
    parts.push(`(feels like ${Math.round(weather.feels_like_c)}°C)`);
  }
  
  return parts.join(' • ');
}

// =============================================================================
// CLI TEST
// =============================================================================

if (require.main === module) {
  (async () => {
    console.log('=== Weather Modifier System Test ===\n');
    
    for (const citySlug of Object.keys(WEATHER_CITY_CONFIGS)) {
      console.log(`\n--- ${citySlug.toUpperCase()} ---`);
      
      const result = await getWeatherImpactForCity(citySlug);
      
      if (!result) {
        console.log('  Failed to fetch weather');
        continue;
      }
      
      const { weather, impact } = result;
      
      console.log(`  ${formatWeatherSummary(weather)}`);
      console.log(`  Humidity: ${weather.humidity_percent}%`);
      console.log(`  Wind: ${weather.wind_speed_kmh} km/h`);
      console.log(`  UV Index: ${weather.uv_index}`);
      console.log(`  Outdoor Viability: ${(impact.outdoor_viability * 100).toFixed(0)}%`);
      console.log(`  Safety Factor: ${(impact.safety_factor * 100).toFixed(0)}%`);
      console.log(`  Duration Factor: ${impact.recommended_duration_factor}x`);
      
      if (impact.warnings.length > 0) {
        console.log(`  ⚠️ Warnings:`);
        impact.warnings.forEach(w => console.log(`    - ${w}`));
      }
      
      if (impact.tips.length > 0) {
        console.log(`  💡 Tips:`);
        impact.tips.slice(0, 2).forEach(t => console.log(`    - ${t}`));
      }
    }
  })();
}
