/**
 * Dynamic Texture System
 * 
 * Adapts zone texture/atmosphere based on:
 * - Time of day
 * - Weather conditions
 * - Crowd density
 * - User behavior patterns
 * 
 * SILENCE → NEON → ANALOG → CHAOS spectrum
 */

export type TextureType = 
  | 'SILENCE'        // Empty, industrial, warehouses
  | 'ANALOG'         // Local shops, markets, residential
  | 'NEON'           // Commercial, nightlife, tourist
  | 'CHAOS';         // Crowded transit, festivals, peak tourism

export interface TextureModifier {
  type: 'time' | 'weather' | 'crowd' | 'activity';
  impact: number;       // -1.0 to 1.0
  reason: string;
}

export interface DynamicTexture {
  base_texture: TextureType;
  current_texture: TextureType;
  modifiers: TextureModifier[];
  confidence: number;
  last_updated: string;
}

// Base texture characteristics
export const TEXTURE_CHARACTERISTICS: Record<TextureType, {
  typical_hours: [number, number];
  crowd_level: 'low' | 'medium' | 'high' | 'variable';
  noise_level: 'quiet' | 'moderate' | 'loud';
  vitality_baseline: number;
  recommended_modes: string[];
}> = {
  SILENCE: {
    typical_hours: [2, 7],
    crowd_level: 'low',
    noise_level: 'quiet',
    vitality_baseline: 40,
    recommended_modes: ['SAFE_OPS', 'DEEP_OPS'],
  },
  ANALOG: {
    typical_hours: [7, 19],
    crowd_level: 'medium',
    noise_level: 'moderate',
    vitality_baseline: 70,
    recommended_modes: ['STANDARD', 'DEEP_OPS'],
  },
  NEON: {
    typical_hours: [19, 2],
    crowd_level: 'high',
    noise_level: 'loud',
    vitality_baseline: 85,
    recommended_modes: ['FAST_OPS', 'STANDARD'],
  },
  CHAOS: {
    typical_hours: [8, 22],
    crowd_level: 'variable',
    noise_level: 'loud',
    vitality_baseline: 60,
    recommended_modes: ['FAST_OPS'],
  },
};

/**
 * Calculate texture shift based on context
 */
export function calculateTextureShift(
  baseTexture: TextureType,
  context: {
    hour: number;
    dayOfWeek: number;
    weather?: 'clear' | 'rain' | 'cloudy';
    recentReports?: number;
    crowdDensity?: number;
  }
): DynamicTexture {
  const modifiers: TextureModifier[] = [];
  let shiftScore = 0;

  // Time of day modifier
  if (context.hour >= 0 && context.hour < 6) {
    // Late night → push toward SILENCE
    modifiers.push({
      type: 'time',
      impact: -0.5,
      reason: 'LATE_NIGHT // LOW ACTIVITY',
    });
    shiftScore -= 0.5;
  } else if (context.hour >= 6 && context.hour < 10) {
    // Morning → ANALOG bias
    modifiers.push({
      type: 'time',
      impact: -0.2,
      reason: 'MORNING // LOCALS ACTIVE',
    });
    shiftScore -= 0.2;
  } else if (context.hour >= 18 && context.hour < 24) {
    // Evening → push toward NEON
    modifiers.push({
      type: 'time',
      impact: 0.4,
      reason: 'EVENING // NIGHTLIFE ACTIVE',
    });
    shiftScore += 0.4;
  }

  // Weather modifier
  if (context.weather === 'rain') {
    modifiers.push({
      type: 'weather',
      impact: -0.3,
      reason: 'RAIN // REDUCED FOOT TRAFFIC',
    });
    shiftScore -= 0.3;
  } else if (context.weather === 'clear' && context.hour >= 18) {
    modifiers.push({
      type: 'weather',
      impact: 0.2,
      reason: 'CLEAR NIGHT // HIGH VITALITY',
    });
    shiftScore += 0.2;
  }

  // Crowd density modifier
  if (context.crowdDensity !== undefined) {
    if (context.crowdDensity > 0.8) {
      modifiers.push({
        type: 'crowd',
        impact: 0.6,
        reason: 'HIGH DENSITY // CHAOS THRESHOLD',
      });
      shiftScore += 0.6;
    } else if (context.crowdDensity < 0.2) {
      modifiers.push({
        type: 'crowd',
        impact: -0.4,
        reason: 'LOW DENSITY // SILENCE MODE',
      });
      shiftScore -= 0.4;
    }
  }

  // Recent activity modifier
  if (context.recentReports !== undefined && context.recentReports > 5) {
    modifiers.push({
      type: 'activity',
      impact: 0.3,
      reason: `${context.recentReports} REPORTS // HIGH ACTIVITY`,
    });
    shiftScore += 0.3;
  }

  // Determine shifted texture
  const textureOrder: TextureType[] = ['SILENCE', 'ANALOG', 'NEON', 'CHAOS'];
  const baseIndex = textureOrder.indexOf(baseTexture);
  let targetIndex = baseIndex;

  if (shiftScore > 0.5) {
    targetIndex = Math.min(textureOrder.length - 1, baseIndex + 1);
  } else if (shiftScore < -0.5) {
    targetIndex = Math.max(0, baseIndex - 1);
  }

  const currentTexture = textureOrder[targetIndex];
  const confidence = 1 - Math.abs(shiftScore) * 0.3;

  return {
    base_texture: baseTexture,
    current_texture: currentTexture,
    modifiers,
    confidence: Math.max(0.5, Math.min(1.0, confidence)),
    last_updated: new Date().toISOString(),
  };
}

/**
 * Get texture-specific UI adjustments
 */
export function getTextureUIConfig(texture: TextureType): {
  neonColor: string;
  pulseSpeed: string;
  hudOpacity: number;
  mapBrightness: number;
  whisperDensity: 'low' | 'medium' | 'high';
} {
  switch (texture) {
    case 'SILENCE':
      return {
        neonColor: '#4a9eff', // Cool blue
        pulseSpeed: 'slow',
        hudOpacity: 0.85,
        mapBrightness: 0.6,
        whisperDensity: 'low',
      };
    case 'ANALOG':
      return {
        neonColor: '#00ff88', // Green
        pulseSpeed: 'normal',
        hudOpacity: 0.9,
        mapBrightness: 0.8,
        whisperDensity: 'medium',
      };
    case 'NEON':
      return {
        neonColor: '#ff00ff', // Magenta
        pulseSpeed: 'fast',
        hudOpacity: 1.0,
        mapBrightness: 1.0,
        whisperDensity: 'high',
      };
    case 'CHAOS':
      return {
        neonColor: '#ff4444', // Red
        pulseSpeed: 'very-fast',
        hudOpacity: 0.95,
        mapBrightness: 0.9,
        whisperDensity: 'high',
      };
  }
}

/**
 * Calculate vitality score for a zone based on texture
 */
export function calculateVitality(
  texture: DynamicTexture,
  context: {
    safetyReports: number;
    priceStability: number;
    userRating?: number;
  }
): number {
  const baseVitality = TEXTURE_CHARACTERISTICS[texture.current_texture].vitality_baseline;
  
  let vitality = baseVitality;

  // Safety penalty
  if (context.safetyReports > 2) {
    vitality -= 20;
  }

  // Price stability bonus
  if (context.priceStability > 0.8) {
    vitality += 10;
  }

  // User rating adjustment
  if (context.userRating) {
    vitality += (context.userRating - 3) * 5; // ±10 based on 1-5 rating
  }

  // Modifier confidence adjustment
  vitality *= texture.confidence;

  return Math.max(0, Math.min(100, vitality));
}

/**
 * Get recommended operative mode based on texture
 */
export function getRecommendedMode(texture: TextureType): string {
  return TEXTURE_CHARACTERISTICS[texture].recommended_modes[0];
}

/**
 * Check if texture shift warrants a whisper alert
 */
export function shouldAlertTextureShift(
  previous: TextureType,
  current: TextureType
): { alert: boolean; message?: string } {
  const order: TextureType[] = ['SILENCE', 'ANALOG', 'NEON', 'CHAOS'];
  const prevIndex = order.indexOf(previous);
  const currIndex = order.indexOf(current);
  const shift = currIndex - prevIndex;

  if (shift >= 2) {
    return {
      alert: true,
      message: `TEXTURE SHIFT: ${previous} → ${current} // ATMOSPHERE VOLATILE`,
    };
  } else if (shift <= -2) {
    return {
      alert: true,
      message: `TEXTURE SHIFT: ${previous} → ${current} // ZONE QUIETING`,
    };
  }

  return { alert: false };
}
