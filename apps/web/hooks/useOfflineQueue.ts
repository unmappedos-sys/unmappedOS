/**
 * useOfflineQueue Hook - Queue actions for sync when online
 * Implements offline-first comment/report submission with sync
 */

import { useState, useEffect, useCallback } from 'react';

export type QueuedAction = {
  id: string;
  type: 'comment' | 'report' | 'verification' | 'price';
  data: any;
  timestamp: number;
  retryCount: number;
};

const QUEUE_STORAGE_KEY = 'unmapped_offline_queue';
const MAX_RETRIES = 3;

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Load queue from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as QueuedAction[];
        setQueue(parsed);
      } catch (e) {
        console.warn('[OfflineQueue] Failed to parse stored queue:', e);
      }
    }
  }, []);

  // Persist queue to localStorage
  const persistQueue = useCallback((newQueue: QueuedAction[]) => {
    setQueue(newQueue);
    if (typeof window !== 'undefined') {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(newQueue));
    }
  }, []);

  // Monitor online status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when online
  useEffect(() => {
    if (isOnline && queue.length > 0 && !syncing) {
      syncQueue();
    }
  }, [isOnline, queue.length]);

  // Add action to queue
  const enqueue = useCallback(
    (type: QueuedAction['type'], data: any) => {
      const action: QueuedAction = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: Date.now(),
        retryCount: 0,
      };
      persistQueue([...queue, action]);
      return action.id;
    },
    [queue, persistQueue]
  );

  // Sync queue
  const syncQueue = useCallback(async () => {
    if (!isOnline || queue.length === 0 || syncing) return;

    setSyncing(true);
    const remainingQueue: QueuedAction[] = [];

    for (const action of queue) {
      let success = false;

      try {
        // Route to appropriate API endpoint
        let endpoint = '';
        let method = 'POST';

        switch (action.type) {
          case 'comment':
            endpoint = '/api/comments';
            break;
          case 'report':
            endpoint = '/api/reports';
            break;
          case 'verification':
            endpoint = '/api/comments/verify';
            break;
          case 'price':
            endpoint = '/api/prices';
            break;
        }

        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data),
        });

        success = response.ok;
      } catch (error) {
        console.warn(`[OfflineQueue] Sync failed for action ${action.id}:`, error);
      }

      if (!success) {
        // Retry if under max retries
        if (action.retryCount < MAX_RETRIES) {
          remainingQueue.push({
            ...action,
            retryCount: action.retryCount + 1,
          });
        } else {
          console.error(`[OfflineQueue] Max retries reached for action ${action.id}`);
        }
      }
    }

    persistQueue(remainingQueue);
    setSyncing(false);
  }, [isOnline, queue, syncing, persistQueue]);

  // Clear queue
  const clearQueue = useCallback(() => {
    persistQueue([]);
  }, [persistQueue]);

  return {
    queue,
    queueLength: queue.length,
    syncing,
    isOnline,
    enqueue,
    syncQueue,
    clearQueue,
  };
}
