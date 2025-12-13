/**
 * React hook for Sonic Camouflage audio system
 * 
 * Provides ambient generative soundscapes per zone texture.
 */

import { useState, useEffect, useCallback } from 'react';
import { getSonicCamouflage, ZoneTexture } from '../lib/sonicCamouflage';

interface UseSonicCamouflageReturn {
  isPlaying: boolean;
  currentTexture: ZoneTexture | null;
  volume: number;
  play: (texture: ZoneTexture) => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  crossfadeTo: (texture: ZoneTexture) => void;
}

export function useSonicCamouflage(): UseSonicCamouflageReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTexture, setCurrentTexture] = useState<ZoneTexture | null>(null);
  const [volume, setVolumeState] = useState(0.5);

  // Play texture soundscape
  const play = useCallback((texture: ZoneTexture) => {
    const sonic = getSonicCamouflage();
    sonic.play(texture);
    setIsPlaying(true);
    setCurrentTexture(texture);
  }, []);

  // Stop all audio
  const stop = useCallback(() => {
    const sonic = getSonicCamouflage();
    sonic.stop();
    setIsPlaying(false);
    setCurrentTexture(null);
  }, []);

  // Set volume
  const setVolume = useCallback((vol: number) => {
    const sonic = getSonicCamouflage();
    sonic.setVolume(vol);
    setVolumeState(vol);
  }, []);

  // Crossfade to new texture
  const crossfadeTo = useCallback((texture: ZoneTexture) => {
    const sonic = getSonicCamouflage();
    sonic.crossfadeTo(texture);
    setCurrentTexture(texture);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const sonic = getSonicCamouflage();
      sonic.stop();
    };
  }, []);

  return {
    isPlaying,
    currentTexture,
    volume,
    play,
    stop,
    setVolume,
    crossfadeTo,
  };
}

/**
 * Hook to auto-play soundscape based on current zone texture
 */
export function useAutoSonicCamouflage(
  texture: ZoneTexture | null,
  enabled: boolean = true
): void {
  const { play, stop, crossfadeTo, isPlaying } = useSonicCamouflage();

  useEffect(() => {
    if (!enabled || !texture) {
      stop();
      return;
    }

    if (isPlaying) {
      crossfadeTo(texture);
    } else {
      play(texture);
    }
  }, [texture, enabled, play, stop, crossfadeTo, isPlaying]);
}
