/**
 * LOCAL SENSE - Calm Map Types
 *
 * Types for the human-centered, calm map experience.
 * No tactical language. No dashboards. Just gentle intelligence.
 */

export interface Position {
  lat: number;
  lon: number;
  timestamp?: number;
}

export interface LocalArea {
  id: string;
  name: string;
  center: Position;
  polygon: GeoJSON.Polygon;

  // Gravity field properties (invisible to user)
  localGravity: number; // 0-1: how much this area "pulls" (high = good)
  pressureLevel: number; // 0-1: tourist/crowd pressure (high = busy)
  confidence: number; // 0-1: how sure we are

  // Contextual hints (never shown as stats)
  priceFeeling: 'stable' | 'elevated' | 'volatile' | 'unknown';
  crowdFeeling: 'quiet' | 'moderate' | 'busy' | 'crowded' | 'unknown';
  timeNote?: string; // e.g., "calmer mornings"
  localNote?: string; // e.g., "locals pass through"
}

export interface Whisper {
  id: string;
  text: string;
  position: { x: number; y: number };
  areaId: string;
}

export interface AdaptiveSentence {
  text: string;
  confidence: 'high' | 'medium' | 'low';
  type: 'direction' | 'time' | 'price' | 'crowd' | 'general';
}

export interface HelpInfo {
  police: string;
  ambulance: string;
  hospital?: { name: string; address: string };
  phrases: Array<{
    local: string;
    english: string;
    context: string;
  }>;
}

export interface LocalSenseState {
  isOnline: boolean;
  isMoving: boolean;
  lastUpdate: number;
  batteryLow: boolean;
}

// Gravity colors - very subtle
export const GRAVITY_PALETTE = {
  pull: {
    // Areas that gently pull (good local spots)
    gradient: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
    glow: 'rgba(16, 185, 129, 0.04)',
  },
  neutral: {
    // Neutral areas
    gradient: 'transparent',
    glow: 'transparent',
  },
  pressure: {
    // Areas with tourist pressure (gentle repel)
    gradient: 'radial-gradient(circle, rgba(251, 191, 36, 0.06) 0%, transparent 70%)',
    glow: 'rgba(251, 191, 36, 0.03)',
  },
};

// Sentence templates for different contexts
export const SENTENCE_TEMPLATES = {
  direction: [
    'Prices stabilize {direction} of here.',
    'Quieter streets {direction}.',
    'Calmer area {direction}.',
  ],
  time: [
    'This area is busier than usual right now.',
    'Usually calmer around this time.',
    'Prices tend to rise after dark here.',
  ],
  price: [
    'Prices feel reasonable around here.',
    'Slightly elevated prices nearby.',
    'Usually better value further in.',
  ],
  crowd: ['Quieter streets nearby.', 'This area gets busy.', 'Locals pass through here.'],
  general: ['Nothing unusual here.', 'Feels like a normal day.'],
  offline: ['Offline — using local memory.'],
  lowConfidence: ['Usually calmer nearby.', 'Prices tend to be stable here.'],
};
