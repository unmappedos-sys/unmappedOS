/**
 * IndexedDB wrapper for offline city pack storage
 * Provides type-safe interface for storing and retrieving city intelligence packs
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database schema definition
interface UnmappedDB extends DBSchema {
  'city-packs': {
    key: string; // city name as key
    value: CityPack;
    indexes: { 'by-version': string; 'by-date': number };
  };
  'user-data': {
    key: string;
    value: any;
  };
  'offline-queue': {
    key: number;
    value: OfflineAction;
    indexes: { 'by-type': string; 'by-timestamp': number };
  };
}

export interface CityPack {
  city: string;
  generated_at: string;
  version: string;
  zones: Zone[];
  metadata?: {
    total_anchors: number;
    total_zones: number;
    avg_anchor_confidence: number;
  };
}

export interface Zone {
  zone_id: string;
  name: string;
  polygon: GeoJSON.Polygon;
  centroid: [number, number];
  texture_type: string;
  neon_color: string;
  anchor_candidates: AnchorCandidate[];
  selected_anchor: Anchor;
  price_medians: PriceMedians;
  cheat_sheet: CheatSheet;
  emergency_numbers: EmergencyNumbers;
  status: 'ACTIVE' | 'OFFLINE' | 'CAUTION';
}

export interface AnchorCandidate {
  osm_id: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
  score: number;
  distance_from_centroid: number;
  priority_level: number;
}

export interface Anchor {
  osm_id: string;
  lat: number;
  lon: number;
  name: string;
  description: string;
  tags: Record<string, string>;
  confidence: number;
  visual_cues: string[];
}

export interface PriceMedians {
  meal_cheap: number;
  meal_mid: number;
  coffee: number;
  beer: number;
  water_bottle: number;
  transit_single: number;
  currency: string;
}

export interface CheatSheet {
  getting_there: string[];
  key_landmarks: string[];
  local_intel: string[];
  hazards: string[];
}

export interface EmergencyNumbers {
  police: string;
  ambulance: string;
  fire: string;
  tourist_police?: string;
}

export interface OfflineAction {
  id?: number;
  type: 'price_report' | 'hazard_report' | 'zone_verify' | 'karma_action';
  timestamp: number;
  payload: any;
  synced: boolean;
}

// Database initialization
let dbInstance: IDBPDatabase<UnmappedDB> | null = null;

async function getDB(): Promise<IDBPDatabase<UnmappedDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<UnmappedDB>('unmapped-os', 1, {
    upgrade(db) {
      // Create city-packs store
      if (!db.objectStoreNames.contains('city-packs')) {
        const packStore = db.createObjectStore('city-packs', { keyPath: 'city' });
        packStore.createIndex('by-version', 'version');
        packStore.createIndex('by-date', 'generated_at');
      }

      // Create user-data store
      if (!db.objectStoreNames.contains('user-data')) {
        db.createObjectStore('user-data');
      }

      // Create offline-queue store
      if (!db.objectStoreNames.contains('offline-queue')) {
        const queueStore = db.createObjectStore('offline-queue', {
          keyPath: 'id',
          autoIncrement: true,
        });
        queueStore.createIndex('by-type', 'type');
        queueStore.createIndex('by-timestamp', 'timestamp');
      }
    },
  });

  return dbInstance;
}

// City Pack Operations
export async function saveCityPack(pack: CityPack): Promise<void> {
  const db = await getDB();
  await db.put('city-packs', pack);
  console.log(`[IDB] City pack saved: ${pack.city} v${pack.version}`);
}

export async function getCityPack(cityName: string): Promise<CityPack | undefined> {
  const db = await getDB();
  return await db.get('city-packs', cityName);
}

export async function getAllCityPacks(): Promise<CityPack[]> {
  const db = await getDB();
  return await db.getAll('city-packs');
}

export async function deleteCityPack(cityName: string): Promise<void> {
  const db = await getDB();
  await db.delete('city-packs', cityName);
  console.log(`[IDB] City pack deleted: ${cityName}`);
}

export async function hasCityPack(cityName: string): Promise<boolean> {
  const db = await getDB();
  const pack = await db.get('city-packs', cityName);
  return pack !== undefined;
}

// User Data Operations
export async function setUserData(key: string, value: any): Promise<void> {
  const db = await getDB();
  await db.put('user-data', value, key);
}

export async function getUserData(key: string): Promise<any> {
  const db = await getDB();
  return await db.get('user-data', key);
}

// Offline Queue Operations
export async function addToOfflineQueue(action: Omit<OfflineAction, 'id'>): Promise<number> {
  const db = await getDB();
  const id = await db.add('offline-queue', { ...action, synced: false } as OfflineAction);
  console.log(`[IDB] Added to offline queue: ${action.type} #${id}`);
  return id;
}

export async function getOfflineQueue(): Promise<OfflineAction[]> {
  const db = await getDB();
  return await db.getAll('offline-queue');
}

export async function getUnsyncedActions(): Promise<OfflineAction[]> {
  const db = await getDB();
  const all = await db.getAll('offline-queue');
  return all.filter((action) => !action.synced);
}

export async function markActionSynced(id: number): Promise<void> {
  const db = await getDB();
  const action = await db.get('offline-queue', id);
  if (action) {
    action.synced = true;
    await db.put('offline-queue', action);
    console.log(`[IDB] Marked action #${id} as synced`);
  }
}

export async function clearSyncedActions(): Promise<void> {
  const db = await getDB();
  const all = await db.getAll('offline-queue');
  const synced = all.filter((action) => action.synced);
  
  for (const action of synced) {
    if (action.id) {
      await db.delete('offline-queue', action.id);
    }
  }
  
  console.log(`[IDB] Cleared ${synced.length} synced actions`);
}

// Database stats
export async function getDatabaseStats() {
  const db = await getDB();
  const packs = await db.getAll('city-packs');
  const queue = await db.getAll('offline-queue');
  const unsynced = queue.filter((a) => !a.synced);

  // Calculate total storage size (rough estimate)
  const packsSize = JSON.stringify(packs).length;
  const queueSize = JSON.stringify(queue).length;

  return {
    city_packs: packs.length,
    cities_cached: packs.map((p) => p.city),
    total_zones: packs.reduce((sum, p) => sum + p.zones.length, 0),
    offline_queue_size: queue.length,
    unsynced_actions: unsynced.length,
    estimated_storage_kb: Math.round((packsSize + queueSize) / 1024),
  };
}

// Clear all data (for testing/reset)
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  
  await db.clear('city-packs');
  await db.clear('user-data');
  await db.clear('offline-queue');
  
  console.log('[IDB] All data cleared');
}

// Export for debugging
if (typeof window !== 'undefined') {
  (window as any).unmappedIDB = {
    getDB,
    saveCityPack,
    getCityPack,
    getAllCityPacks,
    getDatabaseStats,
    clearAllData,
  };
}
