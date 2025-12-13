import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { CityPack } from '@unmapped/lib';

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
    // Fetch pack from API or static file
    const response = await fetch(`/api/packs/${city}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch pack: ${response.statusText}`);
    }

    const pack: CityPack = await response.json();

    // Store in IndexedDB
    const db = await getDB();
    await db.put('packs', {
      city,
      pack,
      downloadedAt: new Date().toISOString(),
    });

    console.log(`✓ ${city} pack downloaded and cached`);
  } catch (error) {
    console.error('downloadCityPack error:', error);
    throw error;
  }
}

export async function getCityPack(city: string): Promise<CityPack | null> {
  try {
    const db = await getDB();
    const record = await db.get('packs', city);
    return record?.pack || null;
  } catch (error) {
    console.error('getCityPack error:', error);
    return null;
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
    const db = await getDB();
    await db.delete('packs', city);
    console.log(`✓ ${city} pack deleted`);
  } catch (error) {
    console.error('deleteCityPack error:', error);
    throw error;
  }
}
