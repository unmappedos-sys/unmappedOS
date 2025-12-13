import centroid from '@turf/centroid';
import distance from '@turf/distance';
import { point, polygon } from '@turf/helpers';
import type {
  GeoJSONPolygon,
  Point,
  AnchorCandidate,
  SelectedAnchor,
  OverpassElement,
  OverpassNode,
  AnchorConfig,
} from './types';
import { queryOverpassRadius } from './overpass';
import { scoreAnchor } from './scoring';

/**
 * Default anchor selection configuration
 */
export const DEFAULT_ANCHOR_CONFIG: AnchorConfig = {
  radii: [50, 100, 150], // meters
  priorityTags: {
    tourism: ['artwork', 'monument', 'attraction', 'museum'],
    amenity: ['fountain', 'clock', 'marketplace'],
    historic: ['memorial', 'monument', 'building', 'castle'],
    leisure: ['park', 'garden'],
    highway: ['pedestrian'],
    railway: ['station', 'halt'],
    public_transport: ['stop_position', 'platform'],
    subway: ['entrance'],
  },
  negativeTags: {
    amenity: ['waste_disposal', 'parking', 'toilets'],
    power: ['substation', 'generator'],
    landuse: ['industrial', 'quarry'],
    construction: ['yes'],
    building: ['shed', 'garage'],
  },
  weights: {
    priority: 100,
    proximity: 50,
    connectivity: 30,
    tagRichness: 20,
  },
};

/**
 * Compute the centroid of a GeoJSON polygon
 */
export function computeCentroid(poly: GeoJSONPolygon): Point {
  const turfPoly = polygon(poly.coordinates);
  const center = centroid(turfPoly);
  return {
    lat: center.geometry.coordinates[1],
    lon: center.geometry.coordinates[0],
  };
}

/**
 * Check if a node has priority tags
 */
function hasPriorityTag(
  tags: Record<string, string>,
  priorityTags: Record<string, string[]>
): boolean {
  for (const [key, values] of Object.entries(priorityTags)) {
    if (tags[key] && values.includes(tags[key])) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a node has negative tags (should be filtered out)
 */
function hasNegativeTag(
  tags: Record<string, string>,
  negativeTags: Record<string, string[]>
): boolean {
  for (const [key, values] of Object.entries(negativeTags)) {
    if (tags[key] && values.includes(tags[key])) {
      return true;
    }
  }
  return false;
}

/**
 * Convert Overpass element to AnchorCandidate
 */
function elementToCandidate(element: OverpassElement): AnchorCandidate | null {
  if (element.type === 'node') {
    const node = element as OverpassNode;
    return {
      id: `node/${node.id}`,
      lat: node.lat,
      lon: node.lon,
      tags: node.tags || {},
    };
  } else if (element.type === 'way' && element.center) {
    return {
      id: `way/${element.id}`,
      lat: element.center.lat,
      lon: element.center.lon,
      tags: element.tags || {},
    };
  }
  return null;
}

/**
 * Generate anchor name from tags or location
 */
function generateAnchorName(candidate: AnchorCandidate, center: Point): string {
  const tags = candidate.tags;

  // Try various name tags
  if (tags.name) return tags.name;
  if (tags['name:en']) return tags['name:en'];
  if (tags.operator) return tags.operator;

  // Generate descriptive name based on tags
  if (tags.tourism) return `${tags.tourism} at ${center.lat.toFixed(4)}, ${center.lon.toFixed(4)}`;
  if (tags.amenity)
    return `${tags.amenity} at ${center.lat.toFixed(4)}, ${center.lon.toFixed(4)}`;
  if (tags.historic)
    return `${tags.historic} at ${center.lat.toFixed(4)}, ${center.lon.toFixed(4)}`;

  // Fallback: intersection or generic
  return `Intersection at ${center.lat.toFixed(4)}, ${center.lon.toFixed(4)}`;
}

/**
 * Select anchor for a zone polygon using Overpass API
 *
 * Algorithm:
 * 1. Compute centroid
 * 2. Expand search radius (50m, 100m, 150m)
 * 3. Query Overpass for priority nodes/ways
 * 4. Filter out negative tags
 * 5. Score by priority, proximity, connectivity, tag richness
 * 6. Return highest scoring anchor
 * 7. Fallback: highest-degree intersection
 */
export async function selectAnchor(
  zonePolygon: GeoJSONPolygon,
  config: AnchorConfig = DEFAULT_ANCHOR_CONFIG,
  overpassEndpoint?: string
): Promise<SelectedAnchor> {
  const center = computeCentroid(zonePolygon);
  const centerPoint = point([center.lon, center.lat]);

  let allCandidates: AnchorCandidate[] = [];

  // Try expanding radii
  for (const radius of config.radii) {
    try {
      const elements = await queryOverpassRadius(center, radius, overpassEndpoint);

      const candidates = elements
        .map(elementToCandidate)
        .filter((c): c is AnchorCandidate => c !== null)
        .filter((c) => !hasNegativeTag(c.tags, config.negativeTags));

      allCandidates.push(...candidates);

      // If we found priority candidates, stop expanding
      const hasPriority = candidates.some((c) => hasPriorityTag(c.tags, config.priorityTags));
      if (hasPriority && candidates.length >= 3) {
        break;
      }
    } catch (error) {
      console.warn(`Overpass query failed for radius ${radius}:`, error);
    }
  }

  // Score candidates
  const scoredCandidates = allCandidates.map((candidate) => {
    const candidatePoint = point([candidate.lon, candidate.lat]);
    const distanceKm = distance(centerPoint, candidatePoint, { units: 'kilometers' });
    const isPriority = hasPriorityTag(candidate.tags, config.priorityTags);

    const score = scoreAnchor({
      candidate,
      distance: distanceKm * 1000, // convert to meters
      isPriority,
      config,
    });

    return { ...candidate, score };
  });

  // Sort by score descending
  scoredCandidates.sort((a, b) => (b.score || 0) - (a.score || 0));

  // Select best candidate
  if (scoredCandidates.length > 0) {
    const best = scoredCandidates[0];
    return {
      ...best,
      name: generateAnchorName(best, center),
      selection_reason: hasPriorityTag(best.tags, config.priorityTags)
        ? 'Priority POI with high score'
        : 'Best available candidate',
    };
  }

  // Fallback: use centroid as anchor (simulated intersection)
  console.warn('No candidates found, using centroid as fallback anchor');
  return {
    id: `synthetic/${center.lat}_${center.lon}`,
    lat: center.lat,
    lon: center.lon,
    tags: { highway: 'crossing', synthetic: 'true' },
    name: generateAnchorName({ id: '', lat: center.lat, lon: center.lon, tags: {} }, center),
    selection_reason: 'Fallback: No suitable POIs found, using zone centroid',
  };
}
