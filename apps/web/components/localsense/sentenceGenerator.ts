/**
 * LOCAL SENSE - Sentence Generator
 *
 * Generates human-language sentences based on local context.
 * Never numbers. Never commands. Just gentle suggestions.
 */

import type { LocalArea, AdaptiveSentence, Position } from './types';

function getDirection(from: Position, to: Position): string {
  const latDiff = to.lat - from.lat;
  const lonDiff = to.lon - from.lon;

  const absLat = Math.abs(latDiff);
  const absLon = Math.abs(lonDiff);

  if (absLat < 0.001 && absLon < 0.001) return 'nearby';

  if (absLat > absLon) {
    return latDiff > 0 ? 'north' : 'south';
  } else {
    return lonDiff > 0 ? 'east' : 'west';
  }
}

export function generateSentence(
  areas: LocalArea[],
  userPosition: Position | null,
  isOffline: boolean
): AdaptiveSentence {
  // Offline state
  if (isOffline) {
    return {
      text: 'Offline — using local memory.',
      confidence: 'medium',
      type: 'general',
    };
  }

  // No areas
  if (areas.length === 0) {
    return {
      text: 'Exploring the area.',
      confidence: 'low',
      type: 'general',
    };
  }

  // Find current area
  const currentArea = userPosition ? findNearestArea(areas, userPosition) : areas[0];

  // Find best nearby area (highest gravity, lowest pressure)
  const bestNearby = areas
    .filter((a) => a.id !== currentArea?.id)
    .sort((a, b) => {
      const scoreA = a.localGravity - a.pressureLevel;
      const scoreB = b.localGravity - b.pressureLevel;
      return scoreB - scoreA;
    })[0];

  // Generate sentence based on context
  const sentences: AdaptiveSentence[] = [];

  // Price-based sentences
  if (currentArea?.priceFeeling === 'elevated' && bestNearby) {
    const direction = userPosition ? getDirection(userPosition, bestNearby.center) : 'nearby';
    sentences.push({
      text: `Prices stabilize ${direction} of here.`,
      confidence: currentArea.confidence > 0.6 ? 'high' : 'medium',
      type: 'price',
    });
  }

  if (currentArea?.priceFeeling === 'stable') {
    sentences.push({
      text: 'Prices feel reasonable around here.',
      confidence: currentArea.confidence > 0.6 ? 'high' : 'medium',
      type: 'price',
    });
  }

  // Crowd-based sentences
  if (currentArea?.crowdFeeling === 'busy' || currentArea?.crowdFeeling === 'crowded') {
    sentences.push({
      text: 'This area is busier than usual right now.',
      confidence: currentArea.confidence > 0.5 ? 'high' : 'medium',
      type: 'crowd',
    });
  }

  if (bestNearby && bestNearby.crowdFeeling === 'quiet') {
    const direction = userPosition ? getDirection(userPosition, bestNearby.center) : 'nearby';
    sentences.push({
      text: `Quieter streets ${direction}.`,
      confidence: bestNearby.confidence > 0.5 ? 'high' : 'medium',
      type: 'direction',
    });
  }

  // Local feel sentences
  if (currentArea && currentArea.localGravity > 0.7 && currentArea.pressureLevel < 0.3) {
    sentences.push({
      text: 'Locals pass through here.',
      confidence: currentArea.confidence > 0.6 ? 'high' : 'medium',
      type: 'general',
    });
  }

  // Time-based sentences
  if (currentArea?.timeNote) {
    sentences.push({
      text: currentArea.timeNote,
      confidence: 'medium',
      type: 'time',
    });
  }

  // Low confidence fallback
  if (sentences.length === 0 || (currentArea && currentArea.confidence < 0.4)) {
    return {
      text: 'Usually calmer nearby.',
      confidence: 'low',
      type: 'general',
    };
  }

  // Return most relevant sentence
  return sentences[0];
}

export function generateWhisper(area: LocalArea): string {
  const whispers: string[] = [];

  // Price whispers
  if (area.priceFeeling === 'stable') {
    whispers.push('Prices feel fair here.');
  } else if (area.priceFeeling === 'elevated') {
    whispers.push('Prices rise after dark.');
  } else if (area.priceFeeling === 'volatile') {
    whispers.push('Prices vary here.');
  }

  // Crowd whispers
  if (area.crowdFeeling === 'quiet') {
    whispers.push('A quiet corner.');
  } else if (area.crowdFeeling === 'busy') {
    whispers.push('Gets busy.');
  }

  // Local whispers
  if (area.localGravity > 0.7) {
    whispers.push('Locals pass through here.');
  }

  // Time whispers
  if (area.timeNote) {
    whispers.push(area.timeNote);
  }

  // Local note whispers
  if (area.localNote) {
    whispers.push(area.localNote);
  }

  // Fallback
  if (whispers.length === 0) {
    whispers.push('Nothing unusual here.');
  }

  // Return random whisper
  return whispers[Math.floor(Math.random() * whispers.length)];
}

function findNearestArea(areas: LocalArea[], position: Position): LocalArea | undefined {
  let nearest: LocalArea | undefined;
  let minDist = Infinity;

  for (const area of areas) {
    const dist = Math.sqrt(
      Math.pow(area.center.lat - position.lat, 2) + Math.pow(area.center.lon - position.lon, 2)
    );
    if (dist < minDist) {
      minDist = dist;
      nearest = area;
    }
  }

  return nearest;
}

export function convertZoneToLocalArea(zone: {
  zone_id: string;
  centroid: { lat: number; lon: number };
  polygon: GeoJSON.Polygon;
  texture_type: string;
  status: string;
  price_medians?: { coffee?: number; beer?: number };
}): LocalArea {
  // Determine local gravity based on texture
  const textureGravity: Record<string, number> = {
    SILENCE: 0.9,
    ANALOG: 0.8,
    RESIDENTIAL: 0.85,
    MIXED: 0.6,
    NEON: 0.4,
    COMMERCIAL_DENSE: 0.3,
    TRANSIT_HUB: 0.35,
    CHAOS: 0.2,
  };

  const texturePressure: Record<string, number> = {
    SILENCE: 0.1,
    ANALOG: 0.2,
    RESIDENTIAL: 0.15,
    MIXED: 0.4,
    NEON: 0.6,
    COMMERCIAL_DENSE: 0.7,
    TRANSIT_HUB: 0.65,
    CHAOS: 0.8,
  };

  const localGravity = textureGravity[zone.texture_type] ?? 0.5;
  const pressureLevel = texturePressure[zone.texture_type] ?? 0.5;

  // Determine price feeling
  let priceFeeling: LocalArea['priceFeeling'] = 'unknown';
  if (zone.price_medians?.coffee) {
    const coffeePrice = zone.price_medians.coffee;
    if (coffeePrice < 3) priceFeeling = 'stable';
    else if (coffeePrice < 5) priceFeeling = 'elevated';
    else priceFeeling = 'volatile';
  }

  // Determine crowd feeling based on texture
  const crowdFeelingMap: Record<string, LocalArea['crowdFeeling']> = {
    SILENCE: 'quiet',
    ANALOG: 'moderate',
    RESIDENTIAL: 'quiet',
    MIXED: 'moderate',
    NEON: 'busy',
    COMMERCIAL_DENSE: 'crowded',
    TRANSIT_HUB: 'busy',
    CHAOS: 'crowded',
  };

  return {
    id: zone.zone_id,
    name: zone.zone_id,
    center: { lat: zone.centroid.lat, lon: zone.centroid.lon },
    polygon: zone.polygon,
    localGravity,
    pressureLevel,
    confidence: zone.status === 'ACTIVE' ? 0.8 : 0.4,
    priceFeeling,
    crowdFeeling: crowdFeelingMap[zone.texture_type] ?? 'unknown',
  };
}
