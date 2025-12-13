/**
 * Digital Cairns System
 * 
 * Invisible, geo-fenced stacked stones at Anchor Points.
 * Users leave geometric shapes/colors - NO TEXT (avoids toxicity).
 * Creates visual history of community without physical vandalism.
 * 
 * "Like finding a secret message in Dark Souls"
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Stone shapes - simple geometric forms
export type StoneShape = 
  | 'circle'
  | 'triangle'
  | 'square'
  | 'diamond'
  | 'hexagon'
  | 'star';

// Stone colors - limited palette for visual harmony
export type StoneColor =
  | '#00ff88' // Neon green (default)
  | '#ff6b6b' // Coral red
  | '#4ecdc4' // Teal
  | '#ffe66d' // Yellow
  | '#c792ea' // Purple
  | '#82aaff' // Blue
  | '#ffffff' // White
  | '#ef4444' // Red
  | '#3b82f6' // Blue (Tailwind)
  | '#f59e0b'; // Orange

export interface DigitalStone {
  id: string;
  anchor_id: string;
  shape: StoneShape;
  color: StoneColor;
  placed_at: number; // timestamp
  user_hash: string; // anonymized user identifier
  position: number; // vertical position in the cairn (0 = bottom)
}

export interface CairnData {
  anchor_id: string;
  anchor_name: string;
  stones: DigitalStone[];
  total_count: number;
  last_stone_at: number;
}

// Type alias for hooks/components
export type Cairn = CairnData;

// Color name type for test compatibility
export type StoneColorName =
  | 'white'
  | 'gray'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue';

// Color name to hex mapping
export const COLOR_NAME_TO_HEX: Record<StoneColorName, StoneColor> = {
  white: '#ffffff',
  gray: '#82aaff',
  red: '#ef4444',
  orange: '#f59e0b',
  yellow: '#ffe66d',
  green: '#00ff88',
  blue: '#3b82f6',
};

// Constants for UI components
export const STONE_SHAPES: readonly StoneShape[] = [
  'circle',
  'triangle',
  'square',
  'diamond',
  'hexagon',
  'star',
] as const;

// Hex color values (internal use)
export const STONE_COLORS_HEX: readonly StoneColor[] = [
  '#00ff88',
  '#ff6b6b',
  '#4ecdc4',
  '#ffe66d',
  '#c792ea',
  '#82aaff',
  '#ffffff',
] as const;

// Color names for tests and UI
export const STONE_COLORS: readonly StoneColorName[] = [
  'white',
  'gray',
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
] as const;

interface CairnsDB extends DBSchema {
  stones: {
    key: string;
    value: DigitalStone;
    indexes: { 'by-anchor': string };
  };
  placed: {
    key: string; // anchor_id
    value: {
      anchor_id: string;
      placed_at: number;
    };
  };
}

const DB_NAME = 'unmapped_cairns';
const DB_VERSION = 1;

let db: IDBPDatabase<CairnsDB> | null = null;

/**
 * Initialize cairns database
 */
async function initDB(): Promise<IDBPDatabase<CairnsDB>> {
  if (db) return db;

  db = await openDB<CairnsDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      const stoneStore = database.createObjectStore('stones', { keyPath: 'id' });
      stoneStore.createIndex('by-anchor', 'anchor_id');

      database.createObjectStore('placed', { keyPath: 'anchor_id' });
    },
  });

  return db;
}

/**
 * Generate anonymous user hash
 */
function generateUserHash(userId: string): string {
  // Simple hash for anonymization
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}

/**
 * Place a stone at an anchor point
 */
export async function placeStone(
  anchorId: string,
  userId: string,
  shape: StoneShape,
  color: StoneColor
): Promise<{ success: boolean; stone?: DigitalStone; error?: string }> {
  const database = await initDB();

  // Check if user already placed a stone at this anchor
  const existingPlacement = await database.get('placed', anchorId);
  if (existingPlacement) {
    return {
      success: false,
      error: 'You have already placed a stone at this anchor',
    };
  }

  // Get current stone count for positioning
  const existingStones = await database.getAllFromIndex('stones', 'by-anchor', anchorId);
  const position = existingStones.length;

  const stone: DigitalStone = {
    id: `${anchorId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    anchor_id: anchorId,
    shape,
    color,
    placed_at: Date.now(),
    user_hash: generateUserHash(userId),
    position,
  };

  // Save stone
  await database.put('stones', stone);

  // Mark anchor as placed for this user
  await database.put('placed', {
    anchor_id: anchorId,
    placed_at: Date.now(),
  });

  console.log(`[CAIRNS] Stone placed at ${anchorId} (position ${position})`);

  // Sync to server (fire and forget)
  syncStoneToServer(stone).catch(console.error);

  return { success: true, stone };
}

/**
 * Get cairn data for an anchor
 */
export async function getCairn(anchorId: string): Promise<CairnData | null> {
  const database = await initDB();

  // Get local stones
  const localStones = await database.getAllFromIndex('stones', 'by-anchor', anchorId);

  // Fetch server stones
  const serverStones = await fetchCairnFromServer(anchorId);

  // Merge and dedupe
  const allStones = mergeStones(localStones, serverStones);

  if (allStones.length === 0) {
    return null;
  }

  // Sort by position
  allStones.sort((a, b) => a.position - b.position);

  return {
    anchor_id: anchorId,
    anchor_name: '', // Filled by caller
    stones: allStones,
    total_count: allStones.length,
    last_stone_at: Math.max(...allStones.map((s) => s.placed_at)),
  };
}

/**
 * Check if user can place a stone at anchor
 */
export async function canPlaceStone(anchorId: string): Promise<boolean> {
  const database = await initDB();
  const existing = await database.get('placed', anchorId);
  return !existing;
}

/**
 * Merge local and server stones
 */
function mergeStones(local: DigitalStone[], server: DigitalStone[]): DigitalStone[] {
  const merged = new Map<string, DigitalStone>();

  local.forEach((s) => merged.set(s.id, s));
  server.forEach((s) => {
    if (!merged.has(s.id)) {
      merged.set(s.id, s);
    }
  });

  return Array.from(merged.values());
}

/**
 * Sync stone to server
 */
async function syncStoneToServer(stone: DigitalStone): Promise<void> {
  try {
    await fetch('/api/cairns/place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stone),
    });
  } catch (error) {
    console.error('[CAIRNS] Server sync failed:', error);
  }
}

/**
 * Fetch cairn from server
 */
async function fetchCairnFromServer(anchorId: string): Promise<DigitalStone[]> {
  try {
    const response = await fetch(`/api/cairns/${anchorId}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.stones || [];
  } catch {
    return [];
  }
}

/**
 * Generate SVG for a stone shape
 */
export function getStoneSVG(shape: StoneShape, color: StoneColor | StoneColorName, size: number = 24): string {
  // Convert color name to hex if needed
  const hexColor: StoneColor = color.startsWith('#') 
    ? color as StoneColor 
    : COLOR_NAME_TO_HEX[color as StoneColorName];
  
  const half = size / 2;
  const glow = `filter: drop-shadow(0 0 ${size / 6}px ${hexColor});`;

  switch (shape) {
    case 'circle':
      return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${half}" cy="${half}" r="${half * 0.8}" fill="${hexColor}" style="${glow}" />
      </svg>`;

    case 'triangle':
      const triTop = size * 0.1;
      const triBottom = size * 0.9;
      const triLeft = size * 0.1;
      const triRight = size * 0.9;
      return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <polygon points="${half},${triTop} ${triRight},${triBottom} ${triLeft},${triBottom}" fill="${hexColor}" style="${glow}" />
      </svg>`;

    case 'square':
      const pad = size * 0.15;
      return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <rect x="${pad}" y="${pad}" width="${size - pad * 2}" height="${size - pad * 2}" fill="${hexColor}" style="${glow}" />
      </svg>`;

    case 'diamond':
      return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <polygon points="${half},${size * 0.1} ${size * 0.9},${half} ${half},${size * 0.9} ${size * 0.1},${half}" fill="${hexColor}" style="${glow}" />
      </svg>`;

    case 'hexagon':
      const hex = [
        [half, size * 0.1],
        [size * 0.9, size * 0.3],
        [size * 0.9, size * 0.7],
        [half, size * 0.9],
        [size * 0.1, size * 0.7],
        [size * 0.1, size * 0.3],
      ].map((p) => p.join(',')).join(' ');
      return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <polygon points="${hex}" fill="${hexColor}" style="${glow}" />
      </svg>`;

    case 'star':
      const starPoints = [];
      for (let i = 0; i < 5; i++) {
        const outerAngle = (i * 72 - 90) * (Math.PI / 180);
        const innerAngle = ((i * 72) + 36 - 90) * (Math.PI / 180);
        starPoints.push(`${half + half * 0.8 * Math.cos(outerAngle)},${half + half * 0.8 * Math.sin(outerAngle)}`);
        starPoints.push(`${half + half * 0.4 * Math.cos(innerAngle)},${half + half * 0.4 * Math.sin(innerAngle)}`);
      }
      return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <polygon points="${starPoints.join(' ')}" fill="${hexColor}" style="${glow}" />
      </svg>`;

    default:
      return '';
  }
}

/**
 * Get available shapes
 */
export function getAvailableShapes(): StoneShape[] {
  return ['circle', 'triangle', 'square', 'diamond', 'hexagon', 'star'];
}

/**
 * Get available colors
 */
export function getAvailableColors(): StoneColor[] {
  return ['#00ff88', '#ff6b6b', '#4ecdc4', '#ffe66d', '#c792ea', '#82aaff', '#ffffff'];
}

/**
 * Calculate cairn height for rendering (simple count-based)
 */
export function getCairnHeight(stoneCount: number): number {
  // Each stone adds diminishing height (like a real cairn)
  let height = 0;
  for (let i = 0; i < stoneCount; i++) {
    height += Math.max(8, 20 - i * 0.5); // Stones get smaller toward top
  }
  return height;
}

/**
 * Calculate cairn height from array of stones (with variety bonus)
 * @param stones - Array of stones with shape properties
 * @returns Height value (with bonus for shape variety)
 */
export function calculateCairnHeight(stones: { shape: StoneShape }[]): number {
  if (!stones || stones.length === 0) return 0;
  
  // Base height from stone count
  const baseHeight = stones.length;
  
  // Variety bonus: unique shapes add extra height
  const uniqueShapes = new Set(stones.map(s => s.shape));
  const varietyBonus = uniqueShapes.size > 1 ? (uniqueShapes.size - 1) * 0.5 : 0;
  
  return baseHeight + varietyBonus;
}

/**
 * Get user's placed stones (for profile)
 */
export async function getUserPlacedStones(): Promise<{ anchor_id: string; placed_at: number }[]> {
  const database = await initDB();
  return database.getAll('placed');
}
/**
 * Get user's stone at a specific anchor
 */
export async function getUserStone(
  anchorId: string,
  userId: string
): Promise<{ shape: StoneShape; color: StoneColor } | null> {
  const database = await initDB();
  const stones = await database.getAllFromIndex('stones', 'by-anchor', anchorId);
  const userHash = generateUserHash(userId);
  const userStone = stones.find((s) => s.user_hash === userHash);
  
  if (!userStone) return null;
  
  return {
    shape: userStone.shape,
    color: userStone.color,
  };
}

/**
 * Get cairns near a location (placeholder for geo-based query)
 */
export async function getCairnsNear(
  _lat: number,
  _lng: number,
  _radiusMeters: number = 1000
): Promise<Cairn[]> {
  // TODO: Implement geo-based cairn discovery
  // For now, return empty array - would query server for nearby anchors with cairns
  return [];
}