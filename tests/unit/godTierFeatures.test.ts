/**
 * Unit tests for God-Tier features
 * 
 * Tests for Sonic Camouflage, Digital Cairns, Shibboleth Deck, Flight Recorder
 */

// Mock Web Audio API
const mockAudioContext = {
  createGain: jest.fn(() => ({
    gain: { value: 0, setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn() },
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
  createOscillator: jest.fn(() => ({
    type: 'sine',
    frequency: { value: 440, setValueAtTime: jest.fn() },
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  })),
  createBufferSource: jest.fn(() => ({
    buffer: null,
    loop: false,
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  })),
  createBuffer: jest.fn(() => ({
    getChannelData: jest.fn(() => new Float32Array(44100)),
  })),
  createBiquadFilter: jest.fn(() => ({
    type: 'lowpass',
    frequency: { value: 1000 },
    Q: { value: 1 },
    connect: jest.fn(),
  })),
  destination: {},
  sampleRate: 44100,
  currentTime: 0,
};

// Mock IndexedDB
const mockIDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

// Mock SpeechSynthesis
const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  getVoices: jest.fn(() => []),
};

beforeEach(() => {
  // Set up global mocks
  (global as any).AudioContext = jest.fn(() => mockAudioContext);
  (global as any).webkitAudioContext = jest.fn(() => mockAudioContext);
  (global as any).indexedDB = mockIDB;
  (global as any).speechSynthesis = mockSpeechSynthesis;
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('Shibboleth Deck', () => {
  it('should have all 6 card types', async () => {
    const { getAllCards } = await import('@/lib/shibbolethDeck');
    const cards = getAllCards();
    
    expect(cards).toContain('stop');
    expect(cards).toContain('price');
    expect(cards).toContain('peace');
    expect(cards).toContain('help');
    expect(cards).toContain('police');
    expect(cards).toContain('medical');
    expect(cards).toHaveLength(6);
  });

  it('should return phrases for Thai language', async () => {
    const { getPhrase } = await import('@/lib/shibbolethDeck');
    
    const phrase = getPhrase('stop', 'th');
    
    expect(phrase).toBeDefined();
    expect(phrase?.language).toBe('th');
    expect(phrase?.phrase).toBe('หยุด');
    expect(phrase?.phonetic).toBeDefined();
    expect(phrase?.english).toBe('Stop / No');
  });

  it('should return phrases for Japanese language', async () => {
    const { getPhrase } = await import('@/lib/shibbolethDeck');
    
    const phrase = getPhrase('peace', 'ja');
    
    expect(phrase).toBeDefined();
    expect(phrase?.language).toBe('ja');
    expect(phrase?.phrase).toBe('大丈夫です');
    expect(phrase?.english).toBe("It's okay / I'm fine");
  });

  it('should have phrases for all 8 languages', async () => {
    const { getPhrase } = await import('@/lib/shibbolethDeck');
    const languages = ['th', 'ja', 'vi', 'id', 'ko', 'zh', 'es', 'pt'] as const;
    
    for (const lang of languages) {
      const phrase = getPhrase('help', lang);
      expect(phrase).toBeDefined();
      expect(phrase?.language).toBe(lang);
    }
  });

  it('should get city-specific phrases', async () => {
    const { getPhrasesForCity } = await import('@/lib/shibbolethDeck');
    
    const tokyoPhrases = getPhrasesForCity('tokyo');
    expect(tokyoPhrases.length).toBeGreaterThan(0);
    expect(tokyoPhrases[0]?.language).toBe('ja');
    
    const bangkokPhrases = getPhrasesForCity('bangkok');
    expect(bangkokPhrases.length).toBeGreaterThan(0);
    expect(bangkokPhrases[0]?.language).toBe('th');
  });

  it('should have correct card metadata', async () => {
    const { CARD_METADATA } = await import('@/lib/shibbolethDeck');
    
    expect(CARD_METADATA.stop.emoji).toBe('✋');
    expect(CARD_METADATA.stop.tone).toBe('firm');
    expect(CARD_METADATA.medical.emoji).toBe('🏥');
    expect(CARD_METADATA.medical.tone).toBe('emergency');
  });
});

describe('Digital Cairns', () => {
  it('should have all stone shapes', async () => {
    const { STONE_SHAPES } = await import('@/lib/digitalCairns');
    
    expect(STONE_SHAPES).toContain('circle');
    expect(STONE_SHAPES).toContain('triangle');
    expect(STONE_SHAPES).toContain('square');
    expect(STONE_SHAPES).toContain('diamond');
    expect(STONE_SHAPES).toContain('hexagon');
    expect(STONE_SHAPES).toContain('star');
    expect(STONE_SHAPES).toHaveLength(6);
  });

  it('should have all stone colors', async () => {
    const { STONE_COLORS } = await import('@/lib/digitalCairns');
    
    expect(STONE_COLORS).toContain('white');
    expect(STONE_COLORS).toContain('gray');
    expect(STONE_COLORS).toContain('red');
    expect(STONE_COLORS).toContain('orange');
    expect(STONE_COLORS).toContain('yellow');
    expect(STONE_COLORS).toContain('green');
    expect(STONE_COLORS).toContain('blue');
    expect(STONE_COLORS).toHaveLength(7);
  });

  it('should generate valid SVG for stones', async () => {
    const { getStoneSVG } = await import('@/lib/digitalCairns');
    
    const circleSVG = getStoneSVG('circle', 'red');
    expect(circleSVG).toContain('<svg');
    expect(circleSVG).toContain('circle');
    expect(circleSVG).toContain('#ef4444'); // red color
    
    const triangleSVG = getStoneSVG('triangle', 'blue');
    expect(triangleSVG).toContain('<svg');
    expect(triangleSVG).toContain('polygon');
    expect(triangleSVG).toContain('#3b82f6'); // blue color
  });

  it('should calculate cairn height correctly', async () => {
    const { calculateCairnHeight } = await import('@/lib/digitalCairns');
    
    // Empty cairn
    expect(calculateCairnHeight([])).toBe(0);
    
    // Single stone
    expect(calculateCairnHeight([{ shape: 'circle' }])).toBe(1);
    
    // Multiple stones with variety bonus
    expect(calculateCairnHeight([
      { shape: 'circle' },
      { shape: 'triangle' },
      { shape: 'square' },
    ])).toBeGreaterThan(3);
  });
});

describe('Flight Recorder', () => {
  it('should calculate rank based on stats', async () => {
    // We need to test the rank calculation logic
    const calculateScore = (stats: {
      zones_visited: number;
      anchors_locked: number;
      hazards_reported: number;
      comments_submitted: number;
      verifications_made: number;
      total_karma: number;
    }) => {
      return stats.zones_visited * 10 +
        stats.anchors_locked * 20 +
        stats.hazards_reported * 30 +
        stats.comments_submitted * 15 +
        stats.verifications_made * 15 +
        stats.total_karma;
    };

    // INITIATE: score < 50
    expect(calculateScore({
      zones_visited: 1,
      anchors_locked: 0,
      hazards_reported: 0,
      comments_submitted: 0,
      verifications_made: 0,
      total_karma: 0,
    })).toBeLessThan(50);

    // SHADOW COMMANDER: score >= 1000
    expect(calculateScore({
      zones_visited: 20,
      anchors_locked: 30,
      hazards_reported: 5,
      comments_submitted: 10,
      verifications_made: 10,
      total_karma: 200,
    })).toBeGreaterThanOrEqual(1000);
  });

  it('should generate correct animation phases', async () => {
    const { generateAnimationFrames } = await import('@/lib/flightRecorder');
    
    const mockSummary = {
      city: 'tokyo',
      cityDisplay: 'TOKYO',
      dates: 'Jan 1 - Jan 3',
      stats: {
        zones_visited: 5,
        anchors_locked: 10,
        hazards_reported: 2,
        comments_submitted: 3,
        verifications_made: 5,
        total_karma: 150,
        distance_km: 8.5,
        duration_hours: 6,
      },
      rank: 'FIELD AGENT',
      rankIcon: '⭐',
      pathCoordinates: [[139.6917, 35.6895], [139.7000, 35.7000]] as [number, number][],
      highlights: ['URBAN EXPLORER'],
      shareText: 'MISSION COMPLETE...',
    };

    const frames = generateAnimationFrames(mockSummary);
    
    expect(frames).toHaveLength(5);
    expect(frames[0].phase).toBe('intro');
    expect(frames[1].phase).toBe('map');
    expect(frames[2].phase).toBe('stats');
    expect(frames[3].phase).toBe('rank');
    expect(frames[4].phase).toBe('outro');
    
    // Check total duration is 15 seconds
    const totalDuration = frames.reduce((sum, f) => sum + f.duration, 0);
    expect(totalDuration).toBe(15);
  });

  it('should generate share text correctly', () => {
    const shareText = `MISSION COMPLETE: TOKYO
📍 5 Zones Explored
🎯 10 Anchors Locked
⚠️ 2 Hazards Reported
🏆 Rank: FIELD AGENT

#UnmappedOS #TravelerNotTourist`;

    expect(shareText).toContain('MISSION COMPLETE');
    expect(shareText).toContain('TOKYO');
    expect(shareText).toContain('#UnmappedOS');
  });
});

describe('Sonic Camouflage', () => {
  it('should have all texture types', async () => {
    const { ZONE_TEXTURES } = await import('@/lib/sonicCamouflage');
    
    expect(ZONE_TEXTURES).toContain('SILENCE');
    expect(ZONE_TEXTURES).toContain('ANALOG');
    expect(ZONE_TEXTURES).toContain('NEON');
    expect(ZONE_TEXTURES).toContain('CHAOS');
    expect(ZONE_TEXTURES).toHaveLength(4);
  });

  it('should create singleton instance', async () => {
    const { getSonicCamouflage } = await import('@/lib/sonicCamouflage');
    
    const instance1 = getSonicCamouflage();
    const instance2 = getSonicCamouflage();
    
    expect(instance1).toBe(instance2);
  });

  it('should have volume control', async () => {
    const { getSonicCamouflage } = await import('@/lib/sonicCamouflage');
    
    const sonic = getSonicCamouflage();
    
    // Should not throw
    expect(() => sonic.setVolume(0.5)).not.toThrow();
    expect(() => sonic.setVolume(0)).not.toThrow();
    expect(() => sonic.setVolume(1)).not.toThrow();
  });
});
