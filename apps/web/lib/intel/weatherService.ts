/**
 * Weather Integration Service
 * 
 * Uses Open-Meteo API (free, no API key required)
 * 
 * Weather modifies:
 * - Walkability scores
 * - Safety scores
 * - Texture weighting
 * 
 * Weather is NOT stored per place — only applied at runtime.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface WeatherCondition {
  code: number;
  description: string;
  category: WeatherCategory;
}

export type WeatherCategory = 
  | 'CLEAR'
  | 'PARTLY_CLOUDY'
  | 'CLOUDY'
  | 'FOG'
  | 'DRIZZLE'
  | 'RAIN'
  | 'HEAVY_RAIN'
  | 'SNOW'
  | 'THUNDERSTORM';

export interface CurrentWeather {
  temperature: number;        // Celsius
  apparent_temperature: number;
  humidity: number;           // Percentage
  precipitation: number;      // mm
  wind_speed: number;         // km/h
  wind_gusts: number;         // km/h
  weather_code: number;
  category: WeatherCategory;
  is_day: boolean;
  timestamp: string;
}

export interface WeatherModifiers {
  walkability_modifier: number;   // -30 to +10
  safety_modifier: number;        // -20 to +5
  texture_weight: TextureWeatherWeight;
  warning: string | null;
  recommendation: string | null;
}

export interface TextureWeatherWeight {
  outdoor_penalty: number;        // 0-1, how much to penalize outdoor venues
  indoor_bonus: number;           // 0-1, how much to boost indoor venues
  cafe_boost: number;             // Extra weight for cafes in bad weather
  park_penalty: number;           // Penalty for parks in bad weather
}

// ============================================================================
// OPEN-METEO API
// ============================================================================

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    is_day: number;
  };
}

/**
 * Fetch current weather from Open-Meteo (free API)
 */
export async function fetchWeather(
  lat: number,
  lon: number
): Promise<CurrentWeather | null> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: [
        'temperature_2m',
        'relative_humidity_2m',
        'apparent_temperature',
        'precipitation',
        'weather_code',
        'wind_speed_10m',
        'wind_gusts_10m',
        'is_day',
      ].join(','),
      timezone: 'auto',
    });

    const response = await fetch(`${OPEN_METEO_BASE}?${params}`, {
      next: { revalidate: 900 }, // Cache for 15 minutes
    });

    if (!response.ok) {
      console.error('Open-Meteo error:', response.status);
      return null;
    }

    const data: OpenMeteoResponse = await response.json();
    const current = data.current;

    return {
      temperature: current.temperature_2m,
      apparent_temperature: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      precipitation: current.precipitation,
      wind_speed: current.wind_speed_10m,
      wind_gusts: current.wind_gusts_10m,
      weather_code: current.weather_code,
      category: weatherCodeToCategory(current.weather_code),
      is_day: current.is_day === 1,
      timestamp: current.time,
    };
  } catch (error) {
    console.error('Weather fetch error:', error);
    return null;
  }
}

// ============================================================================
// WEATHER CODE MAPPING
// ============================================================================

/**
 * WMO Weather interpretation codes
 * https://open-meteo.com/en/docs
 */
function weatherCodeToCategory(code: number): WeatherCategory {
  // Clear
  if (code === 0) return 'CLEAR';
  
  // Partly cloudy
  if (code >= 1 && code <= 2) return 'PARTLY_CLOUDY';
  
  // Overcast
  if (code === 3) return 'CLOUDY';
  
  // Fog
  if (code >= 45 && code <= 48) return 'FOG';
  
  // Drizzle
  if (code >= 51 && code <= 55) return 'DRIZZLE';
  
  // Rain
  if (code >= 61 && code <= 65) return 'RAIN';
  
  // Heavy rain / freezing rain
  if (code >= 66 && code <= 67) return 'HEAVY_RAIN';
  if (code >= 80 && code <= 82) return 'RAIN';
  
  // Snow
  if (code >= 71 && code <= 77) return 'SNOW';
  if (code >= 85 && code <= 86) return 'SNOW';
  
  // Thunderstorm
  if (code >= 95 && code <= 99) return 'THUNDERSTORM';
  
  return 'CLOUDY';
}

export function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  
  return descriptions[code] || 'Unknown';
}

// ============================================================================
// WEATHER MODIFIERS
// ============================================================================

/**
 * Calculate weather modifiers for zone scoring
 */
export function calculateWeatherModifiers(weather: CurrentWeather): WeatherModifiers {
  let walkability_modifier = 0;
  let safety_modifier = 0;
  let warning: string | null = null;
  let recommendation: string | null = null;

  const textureWeight: TextureWeatherWeight = {
    outdoor_penalty: 0,
    indoor_bonus: 0,
    cafe_boost: 0,
    park_penalty: 0,
  };

  // Temperature extremes
  if (weather.apparent_temperature > 35) {
    walkability_modifier -= 20;
    safety_modifier -= 10;
    warning = 'EXTREME HEAT: Limit outdoor exposure';
    textureWeight.outdoor_penalty = 0.5;
    textureWeight.indoor_bonus = 0.3;
    textureWeight.cafe_boost = 0.4;
    textureWeight.park_penalty = 0.6;
    recommendation = 'Seek air-conditioned venues. Stay hydrated.';
  } else if (weather.apparent_temperature > 32) {
    walkability_modifier -= 10;
    textureWeight.outdoor_penalty = 0.3;
    textureWeight.indoor_bonus = 0.2;
    textureWeight.cafe_boost = 0.3;
    textureWeight.park_penalty = 0.3;
    recommendation = 'Hot conditions. Consider indoor alternatives.';
  } else if (weather.apparent_temperature < 5) {
    walkability_modifier -= 10;
    textureWeight.outdoor_penalty = 0.2;
    textureWeight.indoor_bonus = 0.2;
    textureWeight.cafe_boost = 0.3;
    recommendation = 'Cold conditions. Dress warmly.';
  } else if (weather.apparent_temperature < 0) {
    walkability_modifier -= 20;
    safety_modifier -= 10;
    warning = 'FREEZING: Watch for ice';
    textureWeight.outdoor_penalty = 0.4;
    textureWeight.indoor_bonus = 0.3;
  }

  // Precipitation
  switch (weather.category) {
    case 'HEAVY_RAIN':
    case 'THUNDERSTORM':
      walkability_modifier -= 30;
      safety_modifier -= 20;
      warning = warning || 'SEVERE WEATHER: Seek shelter';
      textureWeight.outdoor_penalty = 0.8;
      textureWeight.indoor_bonus = 0.5;
      textureWeight.cafe_boost = 0.5;
      textureWeight.park_penalty = 0.9;
      recommendation = recommendation || 'Wait for conditions to improve before exploring.';
      break;

    case 'RAIN':
      walkability_modifier -= 15;
      safety_modifier -= 5;
      textureWeight.outdoor_penalty = 0.4;
      textureWeight.indoor_bonus = 0.3;
      textureWeight.cafe_boost = 0.4;
      textureWeight.park_penalty = 0.5;
      recommendation = recommendation || 'Rain gear recommended. Indoor venues preferred.';
      break;

    case 'DRIZZLE':
      walkability_modifier -= 5;
      textureWeight.outdoor_penalty = 0.2;
      textureWeight.indoor_bonus = 0.1;
      textureWeight.cafe_boost = 0.2;
      textureWeight.park_penalty = 0.2;
      break;

    case 'SNOW':
      walkability_modifier -= 20;
      safety_modifier -= 10;
      textureWeight.outdoor_penalty = 0.5;
      textureWeight.indoor_bonus = 0.3;
      textureWeight.park_penalty = 0.4;
      recommendation = recommendation || 'Snowy conditions. Watch footing.';
      break;

    case 'FOG':
      walkability_modifier -= 5;
      safety_modifier -= 10;
      textureWeight.outdoor_penalty = 0.1;
      warning = warning || 'LOW VISIBILITY: Exercise caution';
      break;

    case 'CLEAR':
    case 'PARTLY_CLOUDY':
      // Good weather bonus
      walkability_modifier += 5;
      safety_modifier += 5;
      textureWeight.park_penalty = -0.2; // Boost parks in good weather
      break;
  }

  // High wind
  if (weather.wind_gusts > 50) {
    walkability_modifier -= 15;
    safety_modifier -= 10;
    warning = warning || 'HIGH WINDS: Secure loose items';
    textureWeight.outdoor_penalty = Math.max(textureWeight.outdoor_penalty, 0.3);
  } else if (weather.wind_speed > 30) {
    walkability_modifier -= 5;
    textureWeight.outdoor_penalty = Math.max(textureWeight.outdoor_penalty, 0.1);
  }

  // Night time slight penalty for walkability
  if (!weather.is_day) {
    walkability_modifier -= 5;
    safety_modifier -= 5;
  }

  return {
    walkability_modifier: Math.max(-30, Math.min(10, walkability_modifier)),
    safety_modifier: Math.max(-20, Math.min(5, safety_modifier)),
    texture_weight: textureWeight,
    warning,
    recommendation,
  };
}

// ============================================================================
// APPLY TO ZONES
// ============================================================================

export interface ZoneWithWeather {
  walkability: number;
  safety_score: number;
  weather_adjusted_walkability: number;
  weather_adjusted_safety: number;
  weather_warning: string | null;
  weather_recommendation: string | null;
}

/**
 * Apply weather modifiers to zone scores
 */
export function applyWeatherToZone(
  baseWalkability: number,
  baseSafety: number,
  modifiers: WeatherModifiers
): ZoneWithWeather {
  return {
    walkability: baseWalkability,
    safety_score: baseSafety,
    weather_adjusted_walkability: Math.max(0, Math.min(100,
      baseWalkability + modifiers.walkability_modifier
    )),
    weather_adjusted_safety: Math.max(0, Math.min(100,
      baseSafety + modifiers.safety_modifier
    )),
    weather_warning: modifiers.warning,
    weather_recommendation: modifiers.recommendation,
  };
}

/**
 * Get weather icon for display
 */
export function getWeatherIcon(category: WeatherCategory): string {
  const icons: Record<WeatherCategory, string> = {
    CLEAR: '☀️',
    PARTLY_CLOUDY: '⛅',
    CLOUDY: '☁️',
    FOG: '🌫️',
    DRIZZLE: '🌦️',
    RAIN: '🌧️',
    HEAVY_RAIN: '⛈️',
    SNOW: '❄️',
    THUNDERSTORM: '⛈️',
  };
  return icons[category];
}

// ============================================================================
// CACHING
// ============================================================================

// Simple in-memory cache for weather data
const weatherCache = new Map<string, { data: CurrentWeather; expires: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Get weather with caching
 */
export async function getWeatherCached(
  lat: number,
  lon: number
): Promise<CurrentWeather | null> {
  // Round coordinates to reduce cache entries
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLon = Math.round(lon * 100) / 100;
  const cacheKey = `${roundedLat},${roundedLon}`;

  const cached = weatherCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const weather = await fetchWeather(roundedLat, roundedLon);
  if (weather) {
    weatherCache.set(cacheKey, {
      data: weather,
      expires: Date.now() + CACHE_TTL,
    });
  }

  return weather;
}

// Cleanup old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of weatherCache.entries()) {
    if (value.expires < now) {
      weatherCache.delete(key);
    }
  }
}, 60 * 1000); // Every minute
