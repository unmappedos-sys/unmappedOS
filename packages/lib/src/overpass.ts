import type { Point, OverpassElement, OverpassResponse } from './types';

const DEFAULT_OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

/**
 * Build Overpass QL query for nodes/ways within radius of a point
 */
export function buildOverpassQuery(center: Point, radius: number): string {
  const { lat, lon } = center;

  // Query for priority nodes and ways within radius
  // Includes: tourism, amenities, historic, transit, etc.
  return `
    [out:json][timeout:10];
    (
      node["tourism"](around:${radius},${lat},${lon});
      node["amenity"]["amenity"!="parking"]["amenity"!="waste_disposal"](around:${radius},${lat},${lon});
      node["historic"](around:${radius},${lat},${lon});
      node["leisure"]["leisure"="park"](around:${radius},${lat},${lon});
      node["railway"]["railway"="station"](around:${radius},${lat},${lon});
      node["public_transport"](around:${radius},${lat},${lon});
      node["subway"]["subway"="entrance"](around:${radius},${lat},${lon});
      way["tourism"](around:${radius},${lat},${lon});
      way["historic"](around:${radius},${lat},${lon});
      way["highway"]["highway"="pedestrian"](around:${radius},${lat},${lon});
    );
    out center;
  `.trim();
}

/**
 * Query Overpass API with exponential backoff
 */
export async function queryOverpass(
  query: string,
  endpoint: string = DEFAULT_OVERPASS_ENDPOINT,
  maxRetries: number = 3
): Promise<OverpassElement[]> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited, wait with exponential backoff
          const waitTime = Math.pow(2, attempt) * 1000;
          console.warn(`Overpass rate limited, waiting ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
      }

      const data: OverpassResponse = await response.json();
      return data.elements || [];
    } catch (error) {
      lastError = error as Error;
      console.warn(`Overpass query attempt ${attempt + 1} failed:`, error);

      if (attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError || new Error('Overpass query failed after retries');
}

/**
 * Query Overpass for elements within radius of a point
 */
export async function queryOverpassRadius(
  center: Point,
  radius: number,
  endpoint?: string
): Promise<OverpassElement[]> {
  const query = buildOverpassQuery(center, radius);
  return queryOverpass(query, endpoint);
}

/**
 * Query Overpass for elements within a bounding box
 */
export function buildOverpassBBoxQuery(bbox: {
  south: number;
  west: number;
  north: number;
  east: number;
}): string {
  const { south, west, north, east } = bbox;

  return `
    [out:json][timeout:25];
    (
      node["tourism"](${south},${west},${north},${east});
      node["amenity"]["amenity"!="parking"](${south},${west},${north},${east});
      node["historic"](${south},${west},${north},${east});
      node["leisure"](${south},${west},${north},${east});
      node["railway"](${south},${west},${north},${east});
      node["public_transport"](${south},${west},${north},${east});
      way["tourism"](${south},${west},${north},${east});
      way["historic"](${south},${west},${north},${east});
      way["highway"]["highway"="pedestrian"](${south},${west},${north},${east});
    );
    out center;
  `.trim();
}
