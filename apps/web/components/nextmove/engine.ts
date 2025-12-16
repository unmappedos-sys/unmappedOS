/**
 * NEXT MOVE — Decision Engine
 *
 * Core logic that answers: "What should I do right now?"
 *
 * This engine:
 * - Analyzes nearby zones
 * - Considers time of day
 * - Factors in crowd levels
 * - Compares prices
 * - Returns ONE actionable recommendation
 */

import type { Zone, CityPack } from '@unmapped/lib';
import type { Recommendation, Position, ZoneData, HeuristicFactors } from './types';

// ============================================================================
// ZONE CONVERSION
// ============================================================================

export function convertZoneToData(zone: Zone, userPos?: Position): ZoneData {
  const center = {
    lat: zone.centroid?.lat ?? zone.selected_anchor?.lat ?? 0,
    lon: zone.centroid?.lon ?? zone.selected_anchor?.lon ?? 0,
  };

  // Calculate distance if user position available
  let distance: number | undefined;
  if (userPos) {
    distance = calculateDistance(userPos.lat, userPos.lon, center.lat, center.lon);
  }

  // Determine price level from zone data
  const priceLevel = determinePriceLevel(zone);

  // Determine crowd level from zone data
  const crowdLevel = determineCrowdLevel(zone);

  // Extract peak hours (default peak hours)
  const peakHours = [12, 13, 18, 19, 20];

  // Generate zone name from anchor or ID
  const zoneName = zone.selected_anchor?.name || zone.zone_id.replace(/_/g, ' ');

  return {
    id: zone.zone_id,
    name: zoneName,
    center,
    averagePrice: zone.price_medians?.coffee,
    priceLevel,
    crowdLevel,
    peakHours,
    bestTime: undefined,
    avoidTime: undefined,
    safetyScore: 8, // Default good safety
    distance,
  };
}

function determinePriceLevel(zone: Zone): ZoneData['priceLevel'] {
  const price = zone.price_medians?.coffee;
  if (!price) return 'normal';

  // These thresholds should be city-specific, but defaults work for SEA
  if (price < 50) return 'budget';
  if (price < 100) return 'normal';
  if (price < 200) return 'tourist';
  return 'premium';
}

function determineCrowdLevel(_zone: Zone): ZoneData['crowdLevel'] {
  const hour = new Date().getHours();
  const peakHours = [12, 13, 18, 19, 20];

  if (peakHours.includes(hour)) return 'high';
  if (peakHours.includes(hour - 1) || peakHours.includes(hour + 1)) return 'medium';
  return 'low';
}

// ============================================================================
// DISTANCE & DIRECTION
// ============================================================================

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function getDirection(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest' {
  const dLat = toLat - fromLat;
  const dLon = toLon - fromLon;

  const angle = Math.atan2(dLon, dLat) * (180 / Math.PI);

  if (angle >= -22.5 && angle < 22.5) return 'north';
  if (angle >= 22.5 && angle < 67.5) return 'northeast';
  if (angle >= 67.5 && angle < 112.5) return 'east';
  if (angle >= 112.5 && angle < 157.5) return 'southeast';
  if (angle >= 157.5 || angle < -157.5) return 'south';
  if (angle >= -157.5 && angle < -112.5) return 'southwest';
  if (angle >= -112.5 && angle < -67.5) return 'west';
  return 'northwest';
}

function formatDistance(meters: number): string {
  if (meters < 100) return `${Math.round(meters / 10) * 10}m`;
  if (meters < 1000) return `${Math.round(meters / 50) * 50}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

// ============================================================================
// HEURISTIC FACTORS
// ============================================================================

function gatherHeuristics(zones: ZoneData[], _userPos?: Position): HeuristicFactors {
  const now = new Date();
  const currentHour = now.getHours();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;

  // Nearby zones (within 500m)
  const nearbyZones = zones.filter((z) => z.distance && z.distance < 500);

  // Price analysis
  const prices = nearbyZones.map((z) => z.averagePrice).filter((p): p is number => p !== undefined);

  const averageNearbyPrice =
    prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const cheapestNearbyPrice = prices.length > 0 ? Math.min(...prices) : 0;

  // Current zone price (closest)
  const currentZone = zones.find((z) => z.distance && z.distance < 100);
  const currentPrice = currentZone?.averagePrice ?? averageNearbyPrice;
  const priceGap = currentPrice - cheapestNearbyPrice;

  // Crowd level
  const crowdLevels = nearbyZones.map((z) => z.crowdLevel);
  const highCrowdCount = crowdLevels.filter((c) => c === 'high').length;
  const crowdLevel: HeuristicFactors['crowdLevel'] =
    highCrowdCount > nearbyZones.length / 2 ? 'high' : highCrowdCount > 0 ? 'medium' : 'low';

  // Tourist density (rough estimate)
  const touristZones = nearbyZones.filter(
    (z) => z.priceLevel === 'tourist' || z.priceLevel === 'premium'
  );
  const touristDensity = nearbyZones.length > 0 ? touristZones.length / nearbyZones.length : 0;

  // Safety (average of nearby)
  const safetyScore =
    nearbyZones.length > 0
      ? nearbyZones.reduce((sum, z) => sum + z.safetyScore, 0) / nearbyZones.length
      : 8;

  return {
    currentHour,
    isWeekend,
    nearbyZoneCount: nearbyZones.length,
    averageNearbyPrice,
    cheapestNearbyPrice,
    priceGap,
    crowdLevel,
    touristDensity,
    safetyScore,
    userPreferences: {
      prefersWalking: true, // Default, can be learned
      priceSensitivity: 'medium',
    },
  };
}

// ============================================================================
// RECOMMENDATION GENERATION
// ============================================================================

export function generateRecommendation(
  pack: CityPack,
  userPos?: Position,
  isOffline: boolean = false
): Recommendation {
  // Convert zones to analyzable data
  const zones = pack.zones.map((z) => convertZoneToData(z, userPos));

  // If no zones, return fallback
  if (zones.length === 0) {
    return generateNoDataRecommendation(pack.city, isOffline);
  }

  // Gather heuristics
  const factors = gatherHeuristics(zones, userPos);

  // WITHOUT GPS: Provide useful recommendations based on time and zone data
  if (!userPos) {
    return generateNoGpsRecommendation(zones, factors, pack.city, isOffline);
  }

  // WITH GPS: Full location-aware recommendations
  // Priority: Safety > Price > Crowd > General

  // 1. Safety check
  if (factors.safetyScore < 5) {
    return generateSafetyRecommendation(zones, factors, userPos);
  }

  // 2. Price opportunity
  if (factors.priceGap > 30 && factors.cheapestNearbyPrice > 0) {
    return generatePriceRecommendation(zones, factors, userPos);
  }

  // 3. Crowd avoidance
  if (factors.crowdLevel === 'high') {
    return generateCrowdRecommendation(zones, factors, userPos);
  }

  // 4. Time-based recommendation
  if (factors.currentHour >= 17 && factors.currentHour <= 20) {
    return generateTimeRecommendation(zones, factors, userPos);
  }

  // 5. General recommendation
  return generateGeneralRecommendation(zones, factors, userPos, isOffline);
}

// ============================================================================
// NO GPS RECOMMENDATIONS
// ============================================================================

function generateNoGpsRecommendation(
  zones: ZoneData[],
  factors: HeuristicFactors,
  cityName: string,
  isOffline: boolean
): Recommendation {
  const hour = factors.currentHour;

  // Find zones - all zones are usable since price data may not be available
  const allZones = zones.filter((z) => z.center.lat !== 0 && z.center.lon !== 0);

  // Pick a random zone to recommend (variety)
  const recommendedZone =
    allZones.length > 0 ? allZones[Math.floor(Math.random() * allZones.length)] : null;

  // Format zone name nicely
  const formatZoneName = (zone: ZoneData | null): string => {
    if (!zone) return 'nearby';
    // If zone name is generic like "ZONE 1", make it more human
    if (zone.name.startsWith('ZONE ')) {
      return `Area ${zone.name.replace('ZONE ', '')}`;
    }
    return zone.name;
  };

  // Morning (6-11)
  if (hour >= 6 && hour < 11) {
    if (recommendedZone) {
      const zoneName = formatZoneName(recommendedZone);
      const priceContext = recommendedZone.averagePrice
        ? `Coffee ~${recommendedZone.averagePrice}฿.`
        : `Local breakfast spots.`;
      return {
        id: `nogps-morning-${Date.now()}`,
        action: `Head to ${zoneName} for breakfast.`,
        context: `${priceContext} Less crowded in mornings.`,
        reason: `Mornings are ideal for exploring. Tourist areas aren't fully active yet, so you'll get better service and fairer prices.`,
        destination: {
          lat: recommendedZone.center.lat,
          lon: recommendedZone.center.lon,
          name: zoneName,
          distance: 0,
          direction: 'north',
        },
        confidence: 0.7,
        generatedAt: Date.now(),
        trigger: 'time',
      };
    }
    return {
      id: `nogps-morning-${Date.now()}`,
      action: `Good morning to explore ${cityName}.`,
      context: `Cooler temperatures. Fewer crowds.`,
      reason: `Mornings are ideal for walking around. Most tourist traps aren't fully active yet.`,
      confidence: 0.6,
      generatedAt: Date.now(),
      trigger: 'time',
    };
  }

  // Lunch rush (11-14)
  if (hour >= 11 && hour < 14) {
    if (recommendedZone) {
      const zoneName = formatZoneName(recommendedZone);
      return {
        id: `nogps-lunch-${Date.now()}`,
        action: `Try ${zoneName} for lunch.`,
        context: `Avoid main tourist streets for food right now.`,
        reason: `Lunch hour. Popular streets get crowded and expensive. Side streets often have better food for less.`,
        destination: {
          lat: recommendedZone.center.lat,
          lon: recommendedZone.center.lon,
          name: zoneName,
          distance: 0,
          direction: 'north',
        },
        confidence: 0.75,
        generatedAt: Date.now(),
        trigger: 'price',
      };
    }
    return {
      id: `nogps-lunch-${Date.now()}`,
      action: `Avoid tourist streets for lunch.`,
      context: `Prices spike during lunch hour on main roads.`,
      reason: `Walk one block off the main strip. Same food, half the price.`,
      confidence: 0.7,
      generatedAt: Date.now(),
      trigger: 'price',
    };
  }

  // Afternoon (14-17)
  if (hour >= 14 && hour < 17) {
    if (recommendedZone) {
      const zoneName = formatZoneName(recommendedZone);
      return {
        id: `nogps-afternoon-${Date.now()}`,
        action: `Explore ${zoneName}. Good time to walk around.`,
        context: `Post-lunch lull. Crowds thinning.`,
        reason: `Between peak hours. Less pressure from touts, better prices, more breathing room.`,
        destination: {
          lat: recommendedZone.center.lat,
          lon: recommendedZone.center.lon,
          name: zoneName,
          distance: 0,
          direction: 'north',
        },
        confidence: 0.65,
        generatedAt: Date.now(),
        trigger: 'general',
      };
    }
    return {
      id: `nogps-afternoon-${Date.now()}`,
      action: `Good time to explore. Prices are stable.`,
      context: `Post-lunch lull. Crowds thinning.`,
      reason: `Between peak hours. Most places aren't trying to rip you off right now.`,
      confidence: 0.65,
      generatedAt: Date.now(),
      trigger: 'general',
    };
  }

  // Evening (17-21)
  if (hour >= 17 && hour < 21) {
    if (recommendedZone) {
      const zoneName = formatZoneName(recommendedZone);
      return {
        id: `nogps-evening-${Date.now()}`,
        action: `Check out ${zoneName} for dinner.`,
        context: `Evening prices rise on main streets.`,
        reason: `After sunset, popular areas inflate prices. Less touristy spots stay consistent.`,
        destination: {
          lat: recommendedZone.center.lat,
          lon: recommendedZone.center.lon,
          name: zoneName,
          distance: 0,
          direction: 'north',
        },
        confidence: 0.7,
        generatedAt: Date.now(),
        trigger: 'price',
      };
    }
    return {
      id: `nogps-evening-${Date.now()}`,
      action: `Prices rise after sunset. Be selective.`,
      context: `Tourist areas charge more at night.`,
      reason: `This is when scams peak. Stick to places with posted prices.`,
      confidence: 0.75,
      generatedAt: Date.now(),
      trigger: 'price',
    };
  }

  // Night (21+)
  if (hour >= 21 || hour < 6) {
    if (recommendedZone) {
      const zoneName = formatZoneName(recommendedZone);
      return {
        id: `nogps-night-${Date.now()}`,
        action: `Late night in ${cityName}. Stay alert.`,
        context: `Prices vary wildly after midnight.`,
        reason: `Night markets can be fun but watch for inflated tourist prices. Always ask before ordering.`,
        destination: {
          lat: recommendedZone.center.lat,
          lon: recommendedZone.center.lon,
          name: zoneName,
          distance: 0,
          direction: 'north',
        },
        confidence: 0.65,
        generatedAt: Date.now(),
        trigger: 'safety',
      };
    }
    return {
      id: `nogps-night-${Date.now()}`,
      action: `Late night. Stay alert, prices vary wildly.`,
      context: `Some places overcharge after midnight.`,
      reason: `Night markets can be fun but watch for inflated tourist prices. Always ask before ordering.`,
      confidence: 0.7,
      generatedAt: Date.now(),
      trigger: 'safety',
    };
  }

  // Default fallback
  return {
    id: `nogps-default-${Date.now()}`,
    action: isOffline
      ? `Offline mode. Using cached data.`
      : `Enable location for personalized tips.`,
    context: isOffline ? `${cityName} data available.` : `Tap here to see the map.`,
    reason: isOffline
      ? `You're offline but can still browse areas.`
      : `With your location, I can tell you exactly where to go for better prices.`,
    confidence: 0.5,
    generatedAt: Date.now(),
    trigger: 'general',
  };
}

function generateNoDataRecommendation(cityName: string, isOffline: boolean): Recommendation {
  return {
    id: `nodata-${Date.now()}`,
    action: isOffline ? `Offline. No data for ${cityName}.` : `No local data yet.`,
    context: isOffline ? `Connect to download.` : `Download the city pack first.`,
    reason: `I need local data to give you recommendations. Download the ${cityName} pack to get started.`,
    confidence: 0.3,
    generatedAt: Date.now(),
    trigger: 'general',
  };
}

function generateSafetyRecommendation(
  zones: ZoneData[],
  factors: HeuristicFactors,
  userPos?: Position
): Recommendation {
  // Find safest nearby zone
  const safeZone = zones
    .filter((z) => z.safetyScore >= 7 && z.distance && z.distance < 1000)
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))[0];

  if (safeZone && userPos) {
    return {
      id: `safety-${Date.now()}`,
      action: `Move to ${safeZone.name}. Safer area nearby.`,
      context: `Current area has lower safety rating.`,
      reason: `This area has reported incidents. ${safeZone.name} is ${formatDistance(safeZone.distance ?? 0)} away with better conditions.`,
      destination: {
        lat: safeZone.center.lat,
        lon: safeZone.center.lon,
        name: safeZone.name,
        distance: safeZone.distance ?? 0,
        direction: getDirection(userPos.lat, userPos.lon, safeZone.center.lat, safeZone.center.lon),
      },
      confidence: 0.9,
      generatedAt: Date.now(),
      trigger: 'safety',
    };
  }

  return {
    id: `safety-${Date.now()}`,
    action: `Stay aware of your surroundings.`,
    context: `This area requires extra attention.`,
    reason: `Lower safety ratings in this zone. Keep valuables secure.`,
    confidence: 0.7,
    generatedAt: Date.now(),
    trigger: 'safety',
  };
}

function generatePriceRecommendation(
  zones: ZoneData[],
  factors: HeuristicFactors,
  userPos?: Position
): Recommendation {
  // Find cheapest nearby zone
  const cheapZone = zones
    .filter((z) => z.distance && z.distance < 500 && z.averagePrice)
    .sort((a, b) => (a.averagePrice ?? Infinity) - (b.averagePrice ?? Infinity))[0];

  if (cheapZone && userPos && cheapZone.averagePrice) {
    const direction = getDirection(
      userPos.lat,
      userPos.lon,
      cheapZone.center.lat,
      cheapZone.center.lon
    );
    const distance = formatDistance(cheapZone.distance ?? 0);

    return {
      id: `price-${Date.now()}`,
      action: `Walk ${distance} ${direction} for normal prices.`,
      context: `Here ~${Math.round(factors.averageNearbyPrice)}฿. There ~${Math.round(cheapZone.averagePrice)}฿.`,
      reason: `Prices on this street are ${Math.round((factors.priceGap / factors.cheapestNearbyPrice) * 100)}% higher than nearby. ${cheapZone.name} has local pricing.`,
      destination: {
        lat: cheapZone.center.lat,
        lon: cheapZone.center.lon,
        name: cheapZone.name,
        distance: cheapZone.distance ?? 0,
        direction,
      },
      confidence: 0.85,
      generatedAt: Date.now(),
      trigger: 'price',
    };
  }

  return {
    id: `price-${Date.now()}`,
    action: `Prices here are elevated. Consider moving.`,
    context: `Tourist pricing in effect.`,
    reason: `This area typically charges higher prices to visitors.`,
    confidence: 0.7,
    generatedAt: Date.now(),
    trigger: 'price',
  };
}

function generateCrowdRecommendation(
  zones: ZoneData[],
  factors: HeuristicFactors,
  userPos?: Position
): Recommendation {
  // Find less crowded nearby zone
  const quietZone = zones
    .filter((z) => z.crowdLevel !== 'high' && z.distance && z.distance < 500)
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))[0];

  if (quietZone && userPos) {
    const direction = getDirection(
      userPos.lat,
      userPos.lon,
      quietZone.center.lat,
      quietZone.center.lon
    );
    const distance = formatDistance(quietZone.distance ?? 0);

    return {
      id: `crowd-${Date.now()}`,
      action: `${distance} ${direction} is quieter right now.`,
      context: `Current area: busy. ${quietZone.name}: calmer.`,
      reason: `Peak hours here. ${quietZone.name} has fewer people and often better service.`,
      destination: {
        lat: quietZone.center.lat,
        lon: quietZone.center.lon,
        name: quietZone.name,
        distance: quietZone.distance ?? 0,
        direction,
      },
      confidence: 0.8,
      generatedAt: Date.now(),
      trigger: 'crowd',
    };
  }

  return {
    id: `crowd-${Date.now()}`,
    action: `Wait 15–20 minutes. Crowds are thinning.`,
    context: `Peak hour traffic. Will ease soon.`,
    reason: `This is a busy time. Waiting briefly often improves service and reduces hassle.`,
    confidence: 0.75,
    generatedAt: Date.now(),
    trigger: 'crowd',
  };
}

function generateTimeRecommendation(
  zones: ZoneData[],
  factors: HeuristicFactors,
  userPos?: Position
): Recommendation {
  const hour = factors.currentHour;

  // Evening recommendations
  if (hour >= 17 && hour <= 20) {
    const goodZone = zones
      .filter((z) => z.priceLevel !== 'tourist' && z.distance && z.distance < 500)
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))[0];

    if (goodZone && userPos) {
      return {
        id: `time-${Date.now()}`,
        action: `Head to ${goodZone.name} before dinner rush.`,
        context: `Prices rise after sunset on main streets.`,
        reason: `Tourist areas increase prices 20–40% after dark. ${goodZone.name} maintains consistent pricing.`,
        destination: {
          lat: goodZone.center.lat,
          lon: goodZone.center.lon,
          name: goodZone.name,
          distance: goodZone.distance ?? 0,
          direction: getDirection(
            userPos.lat,
            userPos.lon,
            goodZone.center.lat,
            goodZone.center.lon
          ),
        },
        confidence: 0.8,
        generatedAt: Date.now(),
        trigger: 'time',
      };
    }
  }

  return {
    id: `time-${Date.now()}`,
    action: `Good time to explore. No rush.`,
    context: `Off-peak hours. Relaxed pricing.`,
    reason: `Between peak times. Most places have normal prices and shorter waits.`,
    confidence: 0.7,
    generatedAt: Date.now(),
    trigger: 'time',
  };
}

function generateGeneralRecommendation(
  zones: ZoneData[],
  factors: HeuristicFactors,
  userPos?: Position,
  isOffline: boolean = false
): Recommendation {
  // Find best overall zone
  const bestZone = zones
    .filter((z) => z.distance && z.distance < 500)
    .sort((a, b) => {
      // Score: safety + price level + crowd
      const scoreA =
        a.safetyScore +
        (a.priceLevel === 'budget' ? 3 : a.priceLevel === 'normal' ? 2 : 0) +
        (a.crowdLevel === 'low' ? 2 : a.crowdLevel === 'medium' ? 1 : 0);
      const scoreB =
        b.safetyScore +
        (b.priceLevel === 'budget' ? 3 : b.priceLevel === 'normal' ? 2 : 0) +
        (b.crowdLevel === 'low' ? 2 : b.crowdLevel === 'medium' ? 1 : 0);
      return scoreB - scoreA;
    })[0];

  // Check if current location is already good
  const currentZone = zones.find((z) => z.distance && z.distance < 100);

  if (currentZone && currentZone.priceLevel !== 'tourist' && currentZone.crowdLevel !== 'high') {
    return {
      id: `general-${Date.now()}`,
      action: `Stay here. Prices are fair right now.`,
      context: `Good area. No need to move.`,
      reason: `${currentZone.name} has reasonable prices and isn't overcrowded. You're in a good spot.`,
      confidence: 0.85,
      generatedAt: Date.now(),
      trigger: 'general',
    };
  }

  if (bestZone && userPos) {
    const direction = getDirection(
      userPos.lat,
      userPos.lon,
      bestZone.center.lat,
      bestZone.center.lon
    );
    const distance = formatDistance(bestZone.distance ?? 0);

    return {
      id: `general-${Date.now()}`,
      action: `${bestZone.name} is ${distance} ${direction}. Good prices.`,
      context: `${bestZone.crowdLevel === 'low' ? 'Quiet' : 'Moderate'} crowds. ${bestZone.priceLevel === 'budget' ? 'Budget' : 'Fair'} prices.`,
      reason: `Based on current conditions, ${bestZone.name} offers the best balance of price, safety, and crowd levels.`,
      destination: {
        lat: bestZone.center.lat,
        lon: bestZone.center.lon,
        name: bestZone.name,
        distance: bestZone.distance ?? 0,
        direction,
      },
      confidence: 0.75,
      generatedAt: Date.now(),
      trigger: 'general',
    };
  }

  // Fallback - try to include a destination anyway
  const anyZone = zones.find((z) => z.center.lat !== 0 && z.center.lon !== 0);

  const fallback: Recommendation = {
    id: `general-${Date.now()}`,
    action: isOffline ? `Offline — using local memory.` : `Explore the area. Fair conditions.`,
    context: isOffline ? `Recommendations based on cached data.` : `No immediate concerns.`,
    reason: isOffline
      ? `You're offline. Recommendations are based on previously downloaded data.`
      : `Current conditions are typical. No strong reason to move or wait.`,
    confidence: 0.6,
    generatedAt: Date.now(),
    trigger: 'general',
  };

  // Add destination if we have any valid zone
  if (anyZone) {
    fallback.destination = {
      lat: anyZone.center.lat,
      lon: anyZone.center.lon,
      name: anyZone.name.startsWith('ZONE ')
        ? `Area ${anyZone.name.replace('ZONE ', '')}`
        : anyZone.name,
      distance: anyZone.distance ?? 0,
      direction: userPos
        ? getDirection(userPos.lat, userPos.lon, anyZone.center.lat, anyZone.center.lon)
        : 'north',
    };
  }

  return fallback;
}

// ============================================================================
// FEEDBACK PROCESSING
// ============================================================================

const FEEDBACK_KEY = 'unmapped_feedback';

export function recordFeedback(recommendationId: string, helpful: boolean): void {
  try {
    const stored = localStorage.getItem(FEEDBACK_KEY);
    const feedback = stored ? JSON.parse(stored) : [];

    feedback.push({
      recommendationId,
      helpful,
      timestamp: Date.now(),
    });

    // Keep only last 100 feedback entries
    if (feedback.length > 100) {
      feedback.splice(0, feedback.length - 100);
    }

    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedback));
  } catch {
    // Silently fail
  }
}

export function getFeedbackStats(): { total: number; helpful: number; ratio: number } {
  try {
    const stored = localStorage.getItem(FEEDBACK_KEY);
    if (!stored) return { total: 0, helpful: 0, ratio: 0 };

    const feedback = JSON.parse(stored);
    const helpful = feedback.filter((f: { helpful: boolean }) => f.helpful).length;

    return {
      total: feedback.length,
      helpful,
      ratio: feedback.length > 0 ? helpful / feedback.length : 0,
    };
  } catch {
    return { total: 0, helpful: 0, ratio: 0 };
  }
}
