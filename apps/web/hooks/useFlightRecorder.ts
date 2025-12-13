/**
 * React hook for Flight Recorder - Mission Log system
 * 
 * Tracks mission progress and generates shareable videos.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MissionLog,
  MissionSummary,
  MissionEvent,
  startMission,
  completeMission,
  recordEvent,
  getActiveMission,
  getCompletedMissions,
  renderMissionAnimation,
  exportMissionVideo,
  generateAnimationFrames,
} from '../lib/flightRecorder';

interface UseFlightRecorderReturn {
  activeMission: MissionLog | null;
  completedMissions: MissionLog[];
  isRecording: boolean;
  start: (city: string) => Promise<void>;
  complete: () => Promise<MissionSummary | null>;
  record: (event: Omit<MissionEvent, 'id' | 'timestamp'>) => Promise<void>;
  exportVideo: () => Promise<Blob | null>;
  lastSummary: MissionSummary | null;
}

export function useFlightRecorder(): UseFlightRecorderReturn {
  const [activeMission, setActiveMission] = useState<MissionLog | null>(null);
  const [completedMissions, setCompletedMissions] = useState<MissionLog[]>([]);
  const [lastSummary, setLastSummary] = useState<MissionSummary | null>(null);

  // Load active mission on mount
  useEffect(() => {
    async function loadMissions() {
      try {
        const [active, completed] = await Promise.all([
          getActiveMission(),
          getCompletedMissions(),
        ]);
        setActiveMission(active);
        setCompletedMissions(completed);
      } catch (err) {
        console.error('[FLIGHT RECORDER] Error loading missions:', err);
      }
    }

    loadMissions();
  }, []);

  // Start a new mission
  const start = useCallback(async (city: string) => {
    try {
      const mission = await startMission(city);
      setActiveMission(mission);
    } catch (err) {
      console.error('[FLIGHT RECORDER] Error starting mission:', err);
      throw err;
    }
  }, []);

  // Complete the current mission
  const complete = useCallback(async () => {
    if (!activeMission) return null;

    try {
      const summary = await completeMission(activeMission.id);
      setLastSummary(summary);
      setActiveMission(null);

      // Refresh completed missions
      const completed = await getCompletedMissions();
      setCompletedMissions(completed);

      return summary;
    } catch (err) {
      console.error('[FLIGHT RECORDER] Error completing mission:', err);
      throw err;
    }
  }, [activeMission]);

  // Record an event
  const record = useCallback(
    async (event: Omit<MissionEvent, 'id' | 'timestamp'>) => {
      if (!activeMission) {
        console.warn('[FLIGHT RECORDER] No active mission to record to');
        return;
      }

      try {
        await recordEvent(activeMission.id, event);

        // Refresh active mission
        const updated = await getActiveMission(activeMission.city);
        setActiveMission(updated);
      } catch (err) {
        console.error('[FLIGHT RECORDER] Error recording event:', err);
      }
    },
    [activeMission]
  );

  // Export video for last completed mission
  const exportVideo = useCallback(async () => {
    if (!lastSummary) {
      console.warn('[FLIGHT RECORDER] No mission summary to export');
      return null;
    }

    try {
      const blob = await exportMissionVideo(lastSummary);
      return blob;
    } catch (err) {
      console.error('[FLIGHT RECORDER] Error exporting video:', err);
      throw err;
    }
  }, [lastSummary]);

  return {
    activeMission,
    completedMissions,
    isRecording: !!activeMission,
    start,
    complete,
    record,
    exportVideo,
    lastSummary,
  };
}

/**
 * Hook for rendering mission animation to a canvas
 */
export function useMissionAnimation(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  summary: MissionSummary | null,
  autoPlay: boolean = false
): {
  play: () => void;
  isPlaying: boolean;
} {
  const [isPlaying, setIsPlaying] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const play = useCallback(() => {
    if (!canvasRef.current || !summary) return;

    setIsPlaying(true);

    cleanupRef.current = renderMissionAnimation(
      canvasRef.current,
      summary,
      () => setIsPlaying(false)
    ) as unknown as () => void;
  }, [canvasRef, summary]);

  // Auto-play if enabled
  useEffect(() => {
    if (autoPlay && summary) {
      play();
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [autoPlay, summary, play]);

  return { play, isPlaying };
}

/**
 * Hook to auto-record events based on zone/anchor changes
 */
export function useAutoRecord(
  recorder: ReturnType<typeof useFlightRecorder>,
  zoneId: string | null,
  zoneName: string | null,
  lat: number | null,
  lng: number | null
): void {
  const lastZoneRef = useRef<string | null>(null);

  useEffect(() => {
    if (!recorder.isRecording || !zoneId) return;

    // Only record if zone changed
    if (zoneId !== lastZoneRef.current) {
      lastZoneRef.current = zoneId;

      recorder.record({
        type: 'zone_enter',
        zone_id: zoneId,
        zone_name: zoneName || undefined,
        lat: lat || undefined,
        lng: lng || undefined,
      });
    }
  }, [recorder, zoneId, zoneName, lat, lng]);
}
