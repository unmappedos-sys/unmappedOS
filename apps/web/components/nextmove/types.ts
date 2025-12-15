/**
 * NEXT MOVE — Decision Engine Types
 *
 * Every type here serves one purpose:
 * Help the user decide what to do in the next 15 minutes.
 */

export interface Position {
  lat: number;
  lon: number;
  timestamp: number;
}

export interface Recommendation {
  id: string;

  // The ONE thing to do
  action: string;

  // Single line of context (prices, crowds, timing)
  context: string;

  // Why this recommendation exists (shown on tap)
  reason: string;

  // Where to go (if applicable)
  destination?: {
    lat: number;
    lon: number;
    name: string;
    distance: number; // meters
    direction:
      | 'north'
      | 'south'
      | 'east'
      | 'west'
      | 'northeast'
      | 'northwest'
      | 'southeast'
      | 'southwest';
  };

  // Confidence (internal, not shown to user)
  confidence: number;

  // When this recommendation was generated
  generatedAt: number;

  // What triggered this recommendation
  trigger: 'price' | 'crowd' | 'time' | 'safety' | 'general';
}

export interface FeedbackResponse {
  recommendationId: string;
  helpful: boolean;
  timestamp: number;
}

export interface HeuristicFactors {
  // Time-based
  currentHour: number;
  isWeekend: boolean;

  // Location-based
  nearbyZoneCount: number;
  averageNearbyPrice: number;
  cheapestNearbyPrice: number;
  priceGap: number; // difference between current and nearby

  // Crowd indicators
  crowdLevel: 'low' | 'medium' | 'high';
  touristDensity: number;

  // Safety
  safetyScore: number;

  // User history (from feedback)
  userPreferences: {
    prefersWalking: boolean;
    priceSensitivity: 'low' | 'medium' | 'high';
  };
}

export interface ZoneData {
  id: string;
  name: string;
  center: { lat: number; lon: number };

  // Price info
  averagePrice?: number;
  priceLevel: 'budget' | 'normal' | 'tourist' | 'premium';

  // Crowd info
  crowdLevel: 'low' | 'medium' | 'high';
  peakHours: number[];

  // Timing
  bestTime?: string;
  avoidTime?: string;

  // Safety
  safetyScore: number;

  // Distance from user
  distance?: number;
}

export interface HelpInfo {
  police: string;
  ambulance: string;
  hospital?: {
    name: string;
    lat: number;
    lon: number;
  };
  taxiPhrase?: string;
  emergencyPhrase?: string;
}
