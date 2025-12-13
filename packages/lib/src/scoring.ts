import type { AnchorCandidate, AnchorConfig } from './types';

export interface ScoringInput {
  candidate: AnchorCandidate;
  distance: number; // meters from centroid
  isPriority: boolean;
  config: AnchorConfig;
}

/**
 * Calculate proximity score (inverse of distance)
 * Closer candidates score higher
 */
function calculateProximityScore(distance: number, maxDistance: number = 200): number {
  if (distance > maxDistance) return 0;
  return ((maxDistance - distance) / maxDistance) * 100;
}

/**
 * Calculate connectivity score based on node degree (if available)
 * Higher degree intersections score higher
 */
function calculateConnectivityScore(candidate: AnchorCandidate): number {
  // In a full implementation, this would query OSM way connections
  // For now, we infer from tags
  const tags = candidate.tags;

  if (tags.highway === 'traffic_signals') return 80; // Major intersection
  if (tags.highway === 'crossing') return 60;
  if (tags.railway || tags.public_transport) return 70; // Transit nodes
  if (tags.highway && tags.junction) return 90; // Explicit junction

  return 30; // Default connectivity
}

/**
 * Calculate tag richness score
 * More informative tags = higher score
 */
function calculateTagRichnessScore(candidate: AnchorCandidate): number {
  const tags = candidate.tags;
  const tagCount = Object.keys(tags).length;

  let score = Math.min(tagCount * 10, 100);

  // Bonus for descriptive tags
  if (tags.name) score += 20;
  if (tags['name:en']) score += 10;
  if (tags.description) score += 10;
  if (tags.wikipedia) score += 15;
  if (tags.wikidata) score += 15;

  return Math.min(score, 100);
}

/**
 * Score an anchor candidate
 * Returns a composite score based on multiple factors
 */
export function scoreAnchor(input: ScoringInput): number {
  const { candidate, distance, isPriority, config } = input;

  const priorityScore = isPriority ? config.weights.priority : 0;
  const proximityScore =
    (calculateProximityScore(distance) * config.weights.proximity) / 100;
  const connectivityScore =
    (calculateConnectivityScore(candidate) * config.weights.connectivity) / 100;
  const richnessScore =
    (calculateTagRichnessScore(candidate) * config.weights.tagRichness) / 100;

  const totalScore = priorityScore + proximityScore + connectivityScore + richnessScore;

  return Math.round(totalScore);
}

/**
 * Determine zone texture type based on OSM tags in area
 */
export function determineTextureType(tags: Record<string, string>[]): string {
  const tagCounts: Record<string, number> = {};
  const tagValues: Record<string, Record<string, number>> = {};

  tags.forEach((tag) => {
    Object.entries(tag).forEach(([key, value]) => {
      tagCounts[key] = (tagCounts[key] || 0) + 1;
      
      if (!tagValues[key]) {
        tagValues[key] = {};
      }
      tagValues[key][value] = (tagValues[key][value] || 0) + 1;
    });
  });

  // Simple heuristic based on tag frequencies
  if (tagCounts.shop >= 5 || tagCounts.amenity >= 5) return 'COMMERCIAL_DENSE';
  if (tagCounts.railway || tagCounts.public_transport) return 'TRANSIT_HUB';
  if (tagCounts.tourism >= 3 || tagCounts.historic >= 2) return 'CULTURAL';
  if (tagCounts.waterway || (tagValues.natural && tagValues.natural['water'])) return 'WATERFRONT';
  if (tagValues.landuse && tagValues.landuse['industrial']) return 'INDUSTRIAL';
  if (tagCounts.building >= 10) return 'RESIDENTIAL';

  return 'MIXED';
}

/**
 * Assign neon color based on texture type
 */
export function assignNeonColor(textureType: string): string {
  const colorMap: Record<string, string> = {
    COMMERCIAL_DENSE: '#FF00FF', // Magenta
    RESIDENTIAL: '#00FFFF', // Cyan
    TRANSIT_HUB: '#00FF00', // Green
    CULTURAL: '#9D00FF', // Purple
    WATERFRONT: '#00BFFF', // Deep Sky Blue
    INDUSTRIAL: '#FF6600', // Orange
    MIXED: '#FFFF00', // Yellow
  };

  return colorMap[textureType] || '#FFFFFF';
}
