import { selectAnchor, DEFAULT_ANCHOR_CONFIG, computeCentroid } from '@unmapped/lib';
import type { GeoJSONPolygon, OverpassElement } from '@unmapped/lib';

// Mock Overpass module
jest.mock('@unmapped/lib/src/overpass', () => ({
  queryOverpassRadius: jest.fn(),
}));

import { queryOverpassRadius } from '@unmapped/lib/src/overpass';

describe('Anchor Selection Algorithm', () => {
  const mockQueryOverpass = queryOverpassRadius as jest.MockedFunction<
    typeof queryOverpassRadius
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should compute centroid correctly', () => {
    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [
        [
          [100.0, 13.0],
          [100.1, 13.0],
          [100.1, 13.1],
          [100.0, 13.1],
          [100.0, 13.0],
        ],
      ],
    };

    const centroid = computeCentroid(polygon);
    expect(centroid.lat).toBeCloseTo(13.05, 2);
    expect(centroid.lon).toBeCloseTo(100.05, 2);
  });

  test('should select priority anchor when available', async () => {
    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [
        [
          [100.0, 13.0],
          [100.01, 13.0],
          [100.01, 13.01],
          [100.0, 13.01],
          [100.0, 13.0],
        ],
      ],
    };

    const mockElements: OverpassElement[] = [
      {
        type: 'node',
        id: 123,
        lat: 13.005,
        lon: 100.005,
        tags: { tourism: 'monument', name: 'Test Monument' },
      },
      {
        type: 'node',
        id: 124,
        lat: 13.006,
        lon: 100.006,
        tags: { amenity: 'cafe', name: 'Test Cafe' },
      },
    ];

    mockQueryOverpass.mockResolvedValue(mockElements);

    const anchor = await selectAnchor(polygon, DEFAULT_ANCHOR_CONFIG);

    expect(anchor.name).toBe('Test Monument');
    expect(anchor.tags.tourism).toBe('monument');
    expect(anchor.selection_reason).toContain('Priority');
  });

  test('should filter out negative tags', async () => {
    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [
        [
          [100.0, 13.0],
          [100.01, 13.0],
          [100.01, 13.01],
          [100.0, 13.01],
          [100.0, 13.0],
        ],
      ],
    };

    const mockElements: OverpassElement[] = [
      {
        type: 'node',
        id: 123,
        lat: 13.005,
        lon: 100.005,
        tags: { amenity: 'waste_disposal' }, // Should be filtered out
      },
      {
        type: 'node',
        id: 124,
        lat: 13.006,
        lon: 100.006,
        tags: { tourism: 'artwork', name: 'Test Artwork' },
      },
    ];

    mockQueryOverpass.mockResolvedValue(mockElements);

    const anchor = await selectAnchor(polygon, DEFAULT_ANCHOR_CONFIG);

    expect(anchor.name).toBe('Test Artwork');
    expect(anchor.tags.tourism).toBe('artwork');
  });

  test('should fallback to centroid when no candidates found', async () => {
    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [
        [
          [100.0, 13.0],
          [100.01, 13.0],
          [100.01, 13.01],
          [100.0, 13.01],
          [100.0, 13.0],
        ],
      ],
    };

    mockQueryOverpass.mockResolvedValue([]);

    const anchor = await selectAnchor(polygon, DEFAULT_ANCHOR_CONFIG);

    expect(anchor.selection_reason).toContain('Fallback');
    expect(anchor.tags.synthetic).toBe('true');
  });

  test('should score by proximity', async () => {
    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [
        [
          [100.0, 13.0],
          [100.01, 13.0],
          [100.01, 13.01],
          [100.0, 13.01],
          [100.0, 13.0],
        ],
      ],
    };

    const mockElements: OverpassElement[] = [
      {
        type: 'node',
        id: 123,
        lat: 13.005, // Closer to centroid
        lon: 100.005,
        tags: { amenity: 'cafe', name: 'Close Cafe' },
      },
      {
        type: 'node',
        id: 124,
        lat: 13.009, // Farther from centroid
        lon: 100.009,
        tags: { amenity: 'cafe', name: 'Far Cafe' },
      },
    ];

    mockQueryOverpass.mockResolvedValue(mockElements);

    const anchor = await selectAnchor(polygon, DEFAULT_ANCHOR_CONFIG);

    // Should select the closer one
    expect(anchor.name).toBe('Close Cafe');
  });
});
