import { scoreAnchor, determineTextureType, assignNeonColor } from '@unmapped/lib';
import type { AnchorCandidate, AnchorConfig } from '@unmapped/lib';

describe('Scoring Functions', () => {
  const mockConfig: AnchorConfig = {
    radii: [50, 100, 150],
    priorityTags: {
      tourism: ['monument', 'artwork'],
      amenity: ['fountain'],
    },
    negativeTags: {
      amenity: ['waste_disposal'],
    },
    weights: {
      priority: 100,
      proximity: 50,
      connectivity: 30,
      tagRichness: 20,
    },
  };

  test('should score priority candidates higher', () => {
    const priorityCandidate: AnchorCandidate = {
      id: 'node/1',
      lat: 13.0,
      lon: 100.0,
      tags: { tourism: 'monument', name: 'Test Monument' },
    };

    const regularCandidate: AnchorCandidate = {
      id: 'node/2',
      lat: 13.0,
      lon: 100.0,
      tags: { amenity: 'cafe' },
    };

    const priorityScore = scoreAnchor({
      candidate: priorityCandidate,
      distance: 50,
      isPriority: true,
      config: mockConfig,
    });

    const regularScore = scoreAnchor({
      candidate: regularCandidate,
      distance: 50,
      isPriority: false,
      config: mockConfig,
    });

    expect(priorityScore).toBeGreaterThan(regularScore);
  });

  test('should score closer candidates higher', () => {
    const candidate: AnchorCandidate = {
      id: 'node/1',
      lat: 13.0,
      lon: 100.0,
      tags: { amenity: 'cafe' },
    };

    const closeScore = scoreAnchor({
      candidate,
      distance: 30,
      isPriority: false,
      config: mockConfig,
    });

    const farScore = scoreAnchor({
      candidate,
      distance: 150,
      isPriority: false,
      config: mockConfig,
    });

    expect(closeScore).toBeGreaterThan(farScore);
  });

  test('should determine texture type correctly', () => {
    const commercialTags = [
      { shop: 'convenience' },
      { shop: 'clothes' },
      { amenity: 'restaurant' },
      { amenity: 'bar' },
      { amenity: 'cafe' },
      { shop: 'electronics' },
    ];

    const texture = determineTextureType(commercialTags);
    expect(texture).toBe('COMMERCIAL_DENSE');
  });

  test('should assign neon colors correctly', () => {
    expect(assignNeonColor('COMMERCIAL_DENSE')).toBe('#FF00FF');
    expect(assignNeonColor('TRANSIT_HUB')).toBe('#00FF00');
    expect(assignNeonColor('CULTURAL')).toBe('#9D00FF');
    expect(assignNeonColor('WATERFRONT')).toBe('#00BFFF');
  });
});
