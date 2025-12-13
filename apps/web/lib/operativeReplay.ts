/**
 * Operative Replay System
 * 
 * Local-only storage of movement timeline:
 * - Zone entries/exits
 * - Anchor reaches
 * - Distance walked
 * - Activity timeline
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface ReplayEvent {
  id: string;
  timestamp: number;
  type: ReplayEventType;
  zone_id?: string;
  anchor_id?: string;
  coordinates?: { lat: number; lon: number };
  metadata?: Record<string, any>;
}

export type ReplayEventType =
  | 'zone_enter'
  | 'zone_exit'
  | 'anchor_reached'
  | 'position_update'
  | 'mode_change'
  | 'crisis_activated'
  | 'crisis_resolved';

export interface ReplaySession {
  id: string;
  date: string;
  city: string;
  events: ReplayEvent[];
  stats: ReplayStats;
}

export interface ReplayStats {
  total_distance_km: number;
  zones_visited: number;
  anchors_reached: number;
  time_in_zones_minutes: number;
  start_time: number;
  end_time: number;
}

interface ReplayDB extends DBSchema {
  sessions: {
    key: string;
    value: ReplaySession;
    indexes: { 'by-date': string };
  };
  events: {
    key: string;
    value: ReplayEvent;
    indexes: { 'by-session': string; 'by-timestamp': number };
  };
}

let dbPromise: Promise<IDBPDatabase<ReplayDB>> | null = null;

function getDB(): Promise<IDBPDatabase<ReplayDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ReplayDB>('unmapped-replay', 1, {
      upgrade(db) {
        // Sessions store
        const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
        sessionStore.createIndex('by-date', 'date');

        // Events store
        const eventStore = db.createObjectStore('events', { keyPath: 'id' });
        eventStore.createIndex('by-session', 'session_id');
        eventStore.createIndex('by-timestamp', 'timestamp');
      },
    });
  }
  return dbPromise;
}

/**
 * Start a new replay session
 */
export async function startReplaySession(city: string): Promise<string> {
  const db = await getDB();
  const date = new Date().toISOString().split('T')[0];
  const sessionId = `session-${date}-${Date.now()}`;

  const session: ReplaySession = {
    id: sessionId,
    date,
    city,
    events: [],
    stats: {
      total_distance_km: 0,
      zones_visited: 0,
      anchors_reached: 0,
      time_in_zones_minutes: 0,
      start_time: Date.now(),
      end_time: Date.now(),
    },
  };

  await db.put('sessions', session);
  
  // Store in sessionStorage for quick access
  sessionStorage.setItem('current_replay_session', sessionId);

  return sessionId;
}

/**
 * Get current active session ID
 */
export function getCurrentSessionId(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage.getItem('current_replay_session');
}

/**
 * Record a replay event
 */
export async function recordReplayEvent(
  event: Omit<ReplayEvent, 'id' | 'timestamp'>
): Promise<void> {
  const sessionId = getCurrentSessionId();
  if (!sessionId) return;

  const db = await getDB();

  const fullEvent: ReplayEvent & { session_id: string } = {
    ...event,
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    session_id: sessionId,
  };

  await db.put('events', fullEvent as any);

  // Update session stats
  const session = await db.get('sessions', sessionId);
  if (session) {
    session.events.push(fullEvent);
    session.stats.end_time = Date.now();

    if (event.type === 'zone_enter') {
      session.stats.zones_visited++;
    }
    if (event.type === 'anchor_reached') {
      session.stats.anchors_reached++;
    }

    await db.put('sessions', session);
  }
}

/**
 * Update distance walked in current session
 */
export async function updateSessionDistance(distanceKm: number): Promise<void> {
  const sessionId = getCurrentSessionId();
  if (!sessionId) return;

  const db = await getDB();
  const session = await db.get('sessions', sessionId);

  if (session) {
    session.stats.total_distance_km += distanceKm;
    await db.put('sessions', session);
  }
}

/**
 * Get a replay session by ID
 */
export async function getReplaySession(sessionId: string): Promise<ReplaySession | null> {
  const db = await getDB();
  return (await db.get('sessions', sessionId)) || null;
}

/**
 * Get all replay sessions
 */
export async function getAllReplaySessions(): Promise<ReplaySession[]> {
  const db = await getDB();
  return db.getAll('sessions');
}

/**
 * Get sessions for a specific date
 */
export async function getSessionsByDate(date: string): Promise<ReplaySession[]> {
  const db = await getDB();
  return db.getAllFromIndex('sessions', 'by-date', date);
}

/**
 * Delete old sessions (data retention)
 */
export async function purgeOldSessions(daysToKeep: number = 30): Promise<number> {
  const db = await getDB();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  const cutoffString = cutoffDate.toISOString().split('T')[0];

  const allSessions = await db.getAll('sessions');
  let deleted = 0;

  for (const session of allSessions) {
    if (session.date < cutoffString) {
      await db.delete('sessions', session.id);
      deleted++;
    }
  }

  return deleted;
}

/**
 * Export session data as JSON
 */
export async function exportSessionAsJSON(sessionId: string): Promise<string> {
  const session = await getReplaySession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  return JSON.stringify(session, null, 2);
}

/**
 * Export session data as CSV
 */
export async function exportSessionAsCSV(sessionId: string): Promise<string> {
  const session = await getReplaySession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const headers = ['timestamp', 'type', 'zone_id', 'anchor_id', 'lat', 'lon'];
  const rows = session.events.map((e) => [
    new Date(e.timestamp).toISOString(),
    e.type,
    e.zone_id || '',
    e.anchor_id || '',
    e.coordinates?.lat || '',
    e.coordinates?.lon || '',
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Generate timeline visualization data
 */
export function generateTimelineData(session: ReplaySession): Array<{
  time: string;
  event: string;
  icon: string;
  details?: string;
}> {
  return session.events.map((event) => {
    const time = new Date(event.timestamp).toLocaleTimeString();
    let eventName = '';
    let icon = '';
    let details = '';

    switch (event.type) {
      case 'zone_enter':
        eventName = 'Entered Zone';
        icon = '📍';
        details = event.zone_id || '';
        break;
      case 'zone_exit':
        eventName = 'Exited Zone';
        icon = '🚶';
        details = event.zone_id || '';
        break;
      case 'anchor_reached':
        eventName = 'Anchor Reached';
        icon = '⚓';
        details = event.anchor_id || '';
        break;
      case 'mode_change':
        eventName = 'Mode Changed';
        icon = '⚡';
        details = event.metadata?.new_mode;
        break;
      case 'crisis_activated':
        eventName = 'Crisis Activated';
        icon = '🚨';
        details = event.metadata?.trigger;
        break;
      case 'crisis_resolved':
        eventName = 'Crisis Resolved';
        icon = '✅';
        break;
      default:
        eventName = event.type;
        icon = '📝';
    }

    return { time, event: eventName, icon, details };
  });
}
