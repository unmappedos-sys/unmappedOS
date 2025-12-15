import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { CityPack } from '@unmapped/lib';

export function normalizeCityKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export type CityPackRecord = {
  city: string;
  pack: CityPack;
  downloadedAt: string;
};

interface CityPackDB extends DBSchema {
  packs: {
    key: string;
    value: {
      city: string;
      pack: CityPack;
      downloadedAt: string;
    };
  };
  settings: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<CityPackDB>> | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  try {
    if (typeof window === 'undefined') return null;
    if (!('BroadcastChannel' in window)) return null;
    return new BroadcastChannel('unmapped-city-packs');
  } catch {
    return null;
  }
}

function broadcastPackUpdate(message: { type: 'updated' | 'deleted'; city: string }) {
  const channel = getBroadcastChannel();
  if (!channel) return;
  try {
    channel.postMessage({ ...message, ts: Date.now() });
  } finally {
    channel.close();
  }
}

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<CityPackDB>('unmapped-os', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('packs')) {
          db.createObjectStore('packs', { keyPath: 'city' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

export async function downloadCityPack(city: string): Promise<void> {
  try {
    const cityKey = normalizeCityKey(city);
    if (!cityKey) throw new Error('Invalid city key');

    // Fetch pack from API or static file
    const response = await fetch(`/api/packs/${encodeURIComponent(cityKey)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch pack: ${response.statusText}`);
    }

    const pack: CityPack = await response.json();

    // Store in IndexedDB
    const db = await getDB();
    await db.put('packs', {
      city: cityKey,
      pack,
      downloadedAt: new Date().toISOString(),
    });

    broadcastPackUpdate({ type: 'updated', city: cityKey });

    console.log(`✓ ${cityKey} pack downloaded and cached`);
  } catch (error) {
    console.error('downloadCityPack error:', error);
    throw error;
  }
}

export async function getCityPack(city: string): Promise<CityPack | null> {
  try {
    const cityKey = normalizeCityKey(city);
    if (!cityKey) return null;
    const db = await getDB();
    const record = await db.get('packs', cityKey);
    return record?.pack || null;
  } catch (error) {
    console.error('getCityPack error:', error);
    return null;
  }
}

export async function getCityPackRecord(city: string): Promise<CityPackRecord | null> {
  try {
    const cityKey = normalizeCityKey(city);
    if (!cityKey) return null;
    const db = await getDB();
    const record = await db.get('packs', cityKey);
    return record ?? null;
  } catch (error) {
    console.error('getCityPackRecord error:', error);
    return null;
  }
}

export async function getAllCityPackRecords(): Promise<CityPackRecord[]> {
  try {
    const db = await getDB();
    const records = await db.getAll('packs');
    return records as CityPackRecord[];
  } catch (error) {
    console.error('getAllCityPackRecords error:', error);
    return [];
  }
}

export async function getDownloadedPacks(): Promise<string[]> {
  try {
    const db = await getDB();
    const keys = await db.getAllKeys('packs');
    return keys as string[];
  } catch (error) {
    console.error('getDownloadedPacks error:', error);
    return [];
  }
}

export async function deleteCityPack(city: string): Promise<void> {
  try {
    const cityKey = normalizeCityKey(city);
    if (!cityKey) return;
    const db = await getDB();
    await db.delete('packs', cityKey);
    broadcastPackUpdate({ type: 'deleted', city: cityKey });
    console.log(`✓ ${cityKey} pack deleted`);
  } catch (error) {
    console.error('deleteCityPack error:', error);
    throw error;
  }
}
