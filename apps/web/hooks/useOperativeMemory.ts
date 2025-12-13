import { useEffect, useState, useCallback } from 'react';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { OperativeMemory } from '@unmapped/lib';

interface OperativeMemoryDB extends DBSchema {
  memory: {
    key: string;
    value: OperativeMemory;
  };
}

const DB_NAME = 'unmapped_operative_memory';
const STORE_NAME = 'memory';
const MEMORY_KEY = 'primary';

const DEFAULT_MEMORY: OperativeMemory = {
  visited_zones: [],
  anchors_reached: 0,
  total_distance_km: 0,
  missions_completed: 0,
  preferences: {
    shadow_copy_mode: false,
    sync_memory_to_server: false,
  },
};

/**
 * Operative Memory Hook
 * Manages local-first operative record with optional server sync
 */
export function useOperativeMemory() {
  const [memory, setMemory] = useState<OperativeMemory>(DEFAULT_MEMORY);
  const [loading, setLoading] = useState(true);
  const [db, setDb] = useState<IDBPDatabase<OperativeMemoryDB> | null>(null);

  // Initialize IndexedDB
  useEffect(() => {
    let database: IDBPDatabase<OperativeMemoryDB> | null = null;
    let isMounted = true;

    const initDB = async () => {
      try {
        database = await openDB<OperativeMemoryDB>(DB_NAME, 1, {
          upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME);
            }
          },
        });

        if (!isMounted) {
          database.close();
          return;
        }

        setDb(database);

        // Load existing memory
        const existingMemory = await database.get(STORE_NAME, MEMORY_KEY);
        if (!isMounted) return;
        
        if (existingMemory) {
          setMemory(existingMemory);
        } else {
          // Initialize with defaults
          await database.put(STORE_NAME, DEFAULT_MEMORY, MEMORY_KEY);
        }

        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize Operative Memory DB:', error);
        if (isMounted) setLoading(false);
      }
    };

    initDB();

    return () => {
      isMounted = false;
      // Close database connection on unmount
      database?.close();
    };
  }, []);

  // Save memory to IndexedDB
  const saveMemory = useCallback(
    async (updatedMemory: OperativeMemory) => {
      if (!db) return;

      try {
        await db.put(STORE_NAME, updatedMemory, MEMORY_KEY);
        setMemory(updatedMemory);

        // Optionally sync to server if enabled
        if (updatedMemory.preferences.sync_memory_to_server) {
          // TODO: Implement server sync
          console.log('Server sync enabled but not yet implemented');
        }
      } catch (error) {
        console.error('Failed to save Operative Memory:', error);
      }
    },
    [db]
  );

  // Record zone visit
  const recordZoneVisit = useCallback(
    async (zone_id: string, city: string, anchor_reached: boolean = false) => {
      const visited_at = new Date().toISOString();

      const updatedMemory: OperativeMemory = {
        ...memory,
        visited_zones: [
          ...memory.visited_zones.filter((v) => v.zone_id !== zone_id),
          { zone_id, city, visited_at, anchor_reached },
        ],
        anchors_reached: anchor_reached
          ? memory.anchors_reached + 1
          : memory.anchors_reached,
      };

      await saveMemory(updatedMemory);
    },
    [memory, saveMemory]
  );

  // Update distance traveled
  const addDistance = useCallback(
    async (distanceKm: number) => {
      const updatedMemory: OperativeMemory = {
        ...memory,
        total_distance_km: memory.total_distance_km + distanceKm,
      };

      await saveMemory(updatedMemory);
    },
    [memory, saveMemory]
  );

  // Complete mission
  const completeMission = useCallback(async () => {
    const updatedMemory: OperativeMemory = {
      ...memory,
      missions_completed: memory.missions_completed + 1,
      last_export: new Date().toISOString(),
    };

    await saveMemory(updatedMemory);
  }, [memory, saveMemory]);

  // Toggle Shadow Copy mode
  const toggleShadowCopy = useCallback(
    async (enabled: boolean) => {
      const updatedMemory: OperativeMemory = {
        ...memory,
        preferences: {
          ...memory.preferences,
          shadow_copy_mode: enabled,
        },
      };

      await saveMemory(updatedMemory);
    },
    [memory, saveMemory]
  );

  // Toggle server sync
  const toggleServerSync = useCallback(
    async (enabled: boolean) => {
      const updatedMemory: OperativeMemory = {
        ...memory,
        preferences: {
          ...memory.preferences,
          sync_memory_to_server: enabled,
        },
      };

      await saveMemory(updatedMemory);
    },
    [memory, saveMemory]
  );

  // Export memory as JSON
  const exportMemory = useCallback((): string => {
    return JSON.stringify(memory, null, 2);
  }, [memory]);

  // Import memory from JSON
  const importMemory = useCallback(
    async (jsonData: string) => {
      try {
        const importedMemory: OperativeMemory = JSON.parse(jsonData);
        await saveMemory(importedMemory);
        return true;
      } catch (error) {
        console.error('Failed to import Operative Memory:', error);
        return false;
      }
    },
    [saveMemory]
  );

  // Clear all memory
  const clearMemory = useCallback(async () => {
    await saveMemory(DEFAULT_MEMORY);
  }, [saveMemory]);

  // Get stats
  const stats = {
    zones_visited: memory.visited_zones.length,
    anchors_reached: memory.anchors_reached,
    total_distance_km: memory.total_distance_km,
    missions_completed: memory.missions_completed,
    shadow_copy_enabled: memory.preferences.shadow_copy_mode,
  };

  return {
    memory,
    loading,
    stats,
    recordZoneVisit,
    addDistance,
    completeMission,
    toggleShadowCopy,
    toggleServerSync,
    exportMemory,
    importMemory,
    clearMemory,
  };
}
