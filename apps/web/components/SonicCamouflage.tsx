/**
 * SonicCamouflage Component
 * 
 * Ambient audio control for zone-based soundscapes.
 * Generative audio that matches zone texture.
 */

import React from 'react';
import { useSonicCamouflage } from '../hooks/useSonicCamouflage';
import { ZoneTexture } from '../lib/sonicCamouflage';

interface SonicCamouflageProps {
  currentTexture?: ZoneTexture;
  onClose?: () => void;
}

export function SonicCamouflage({ currentTexture, onClose }: SonicCamouflageProps) {
  const {
    isPlaying,
    currentTexture: playingTexture,
    volume,
    play,
    stop,
    setVolume,
    crossfadeTo,
  } = useSonicCamouflage();

  const textures: { id: ZoneTexture; name: string; description: string; icon: string }[] = [
    {
      id: 'SILENCE',
      name: 'Silence',
      description: 'Temple grounds, meditation spaces',
      icon: '🕯️',
    },
    {
      id: 'ANALOG',
      name: 'Analog',
      description: 'Vinyl warmth, cafe ambience',
      icon: '📻',
    },
    {
      id: 'NEON',
      name: 'Neon',
      description: 'Night markets, urban pulse',
      icon: '🌃',
    },
    {
      id: 'CHAOS',
      name: 'Chaos',
      description: 'Sensory overload, street markets',
      icon: '🎪',
    },
  ];

  const handleTextureSelect = (texture: ZoneTexture) => {
    if (isPlaying && playingTexture === texture) {
      stop();
    } else if (isPlaying) {
      crossfadeTo(texture);
    } else {
      play(texture);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎵</span>
          <div>
            <h2 className="text-white font-bold">SONIC CAMOUFLAGE</h2>
            <p className="text-gray-500 text-xs">Ambient Soundscapes</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400"
          >
            ✕
          </button>
        )}
      </div>

      {/* Current Zone */}
      {currentTexture && (
        <div className="p-4 bg-gray-900/50 border-b border-gray-800">
          <div className="text-gray-500 text-xs mb-1">CURRENT ZONE TEXTURE</div>
          <div className="text-white font-bold">{currentTexture}</div>
        </div>
      )}

      {/* Texture Grid */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-3">
          {textures.map((texture) => {
            const isActive = isPlaying && playingTexture === texture.id;
            const isRecommended = currentTexture === texture.id;

            return (
              <button
                key={texture.id}
                onClick={() => handleTextureSelect(texture.id)}
                className={`
                  p-4 rounded-lg border-2 transition-all text-left
                  ${isActive
                    ? 'border-emerald-500 bg-emerald-950/50'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">{texture.icon}</span>
                  {isActive && (
                    <div className="flex gap-0.5">
                      <div className="w-1 h-3 bg-emerald-400 rounded animate-pulse" />
                      <div className="w-1 h-4 bg-emerald-400 rounded animate-pulse delay-75" />
                      <div className="w-1 h-2 bg-emerald-400 rounded animate-pulse delay-150" />
                    </div>
                  )}
                </div>
                <div className="text-white font-bold text-sm">{texture.name}</div>
                <div className="text-gray-500 text-xs mt-1">{texture.description}</div>
                {isRecommended && !isActive && (
                  <div className="mt-2 text-xs text-emerald-400">Recommended for zone</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 bg-gray-900 border-t border-gray-800">
        {/* Volume slider */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-400">Volume</span>
            <span className="text-white font-mono">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Play/Stop button */}
        <button
          onClick={isPlaying ? stop : () => play(currentTexture || 'SILENCE')}
          className={`
            w-full py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2
            ${isPlaying
              ? 'bg-red-600 text-white hover:bg-red-500'
              : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }
          `}
        >
          {isPlaying ? (
            <>◼ STOP</>
          ) : (
            <>▶ PLAY {currentTexture || 'SILENCE'}</>
          )}
        </button>

        <p className="text-center text-gray-600 text-xs mt-3">
          Generative audio • No loops • Always unique
        </p>
      </div>
    </div>
  );
}

/**
 * Compact toggle for quick audio control
 */
interface SonicToggleProps {
  texture?: ZoneTexture;
}

export function SonicToggle({ texture }: SonicToggleProps) {
  const { isPlaying, play, stop, crossfadeTo, currentTexture } = useSonicCamouflage();

  const handleToggle = () => {
    if (isPlaying) {
      stop();
    } else if (texture) {
      play(texture);
    }
  };

  // Auto-crossfade when texture changes
  React.useEffect(() => {
    if (isPlaying && texture && texture !== currentTexture) {
      crossfadeTo(texture);
    }
  }, [texture, isPlaying, currentTexture, crossfadeTo]);

  return (
    <button
      onClick={handleToggle}
      className={`
        w-10 h-10 rounded-full flex items-center justify-center
        transition-all border-2
        ${isPlaying
          ? 'bg-emerald-600 border-emerald-400 text-white'
          : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
        }
      `}
      title={isPlaying ? 'Stop Sonic Camouflage' : 'Start Sonic Camouflage'}
    >
      {isPlaying ? (
        <span className="text-sm">🎵</span>
      ) : (
        <span className="text-sm opacity-50">🔇</span>
      )}
    </button>
  );
}

export default SonicCamouflage;
