/**
 * FlightRecorder Component
 * 
 * Mission log video generator for shareable content.
 * "MISSION COMPLETE: TOKYO"
 */

import React, { useRef, useState, useEffect } from 'react';
import { useFlightRecorder, useMissionAnimation } from '../hooks/useFlightRecorder';
import { MissionSummary } from '../lib/flightRecorder';

interface FlightRecorderProps {
  city: string;
  onClose?: () => void;
}

export function FlightRecorder({ city, onClose }: FlightRecorderProps) {
  const {
    activeMission,
    completedMissions,
    isRecording,
    start,
    complete,
    lastSummary,
    exportVideo,
  } = useFlightRecorder();

  const [exporting, setExporting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { play: playAnimation, isPlaying } = useMissionAnimation(
    canvasRef,
    lastSummary,
    false
  );

  // Show summary when mission completes
  useEffect(() => {
    if (lastSummary) {
      setShowSummary(true);
    }
  }, [lastSummary]);

  const handleStart = async () => {
    await start(city);
  };

  const handleComplete = async () => {
    await complete();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportVideo();
      if (blob) {
        // Download the video
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `unmapped-${city}-mission.webm`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (!lastSummary) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Mission Complete: ${lastSummary.cityDisplay}`,
          text: lastSummary.shareText,
          url: window.location.origin,
        });
      } catch (err) {
        // User cancelled or share failed
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(lastSummary.shareText);
      alert('Copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📹</span>
          <div>
            <h2 className="text-white font-bold">FLIGHT RECORDER</h2>
            <p className="text-gray-500 text-xs">Mission Log</p>
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

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {!isRecording && !showSummary && (
          <>
            <div className="text-6xl mb-6">🎬</div>
            <h3 className="text-white text-xl font-bold mb-2">Start Recording</h3>
            <p className="text-gray-400 text-center mb-6 max-w-xs">
              Track your journey through {city.toUpperCase()} and generate a shareable mission report.
            </p>
            <button
              onClick={handleStart}
              className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-500"
            >
              🔴 START MISSION
            </button>

            {completedMissions.length > 0 && (
              <div className="mt-8 w-full max-w-sm">
                <h4 className="text-gray-400 text-sm mb-3">Past Missions</h4>
                <div className="space-y-2">
                  {completedMissions.slice(0, 3).map((m) => (
                    <div
                      key={m.id}
                      className="p-3 bg-gray-900 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <div className="text-white font-bold">{m.city.toUpperCase()}</div>
                        <div className="text-gray-500 text-xs">
                          {m.stats.zones_visited} zones • {m.stats.anchors_locked} anchors
                        </div>
                      </div>
                      <div className="text-emerald-400">✓</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {isRecording && !showSummary && (
          <>
            <div className="relative mb-6">
              <div className="text-6xl">📍</div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
            </div>
            <h3 className="text-white text-xl font-bold mb-2">Recording Active</h3>
            <p className="text-gray-400 text-center mb-4">
              {city.toUpperCase()} MISSION
            </p>

            <div className="bg-gray-900 p-4 rounded-lg mb-6 w-full max-w-xs">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl text-white font-bold">
                    {activeMission?.stats.zones_visited || 0}
                  </div>
                  <div className="text-gray-500 text-xs">ZONES</div>
                </div>
                <div>
                  <div className="text-2xl text-white font-bold">
                    {activeMission?.stats.anchors_locked || 0}
                  </div>
                  <div className="text-gray-500 text-xs">ANCHORS</div>
                </div>
                <div>
                  <div className="text-2xl text-white font-bold">
                    {activeMission?.stats.hazards_reported || 0}
                  </div>
                  <div className="text-gray-500 text-xs">HAZARDS</div>
                </div>
                <div>
                  <div className="text-2xl text-white font-bold">
                    {(activeMission?.stats.distance_km || 0).toFixed(1)}
                  </div>
                  <div className="text-gray-500 text-xs">KM</div>
                </div>
              </div>
            </div>

            <button
              onClick={handleComplete}
              className="px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-500"
            >
              ⏹ END MISSION
            </button>
          </>
        )}

        {showSummary && lastSummary && (
          <>
            <canvas
              ref={canvasRef}
              width={360}
              height={640}
              className="bg-black rounded-lg border border-gray-800 mb-4"
            />

            <div className="flex gap-3 mb-4">
              <button
                onClick={playAnimation}
                disabled={isPlaying}
                className={`px-4 py-2 rounded-lg font-bold ${
                  isPlaying
                    ? 'bg-gray-700 text-gray-400'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
              >
                {isPlaying ? '▶ Playing...' : '▶ Preview'}
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500"
              >
                {exporting ? '⏳ Exporting...' : '💾 Download'}
              </button>
              <button
                onClick={handleShare}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500"
              >
                📤 Share
              </button>
            </div>

            <div className="bg-gray-900 p-3 rounded-lg max-w-xs w-full">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                {lastSummary.shareText}
              </pre>
            </div>

            <button
              onClick={() => setShowSummary(false)}
              className="mt-4 text-gray-500 text-sm"
            >
              ← Back to Recorder
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Compact Mission Status Indicator
 */
interface MissionIndicatorProps {
  onClick?: () => void;
}

export function MissionIndicator({ onClick }: MissionIndicatorProps) {
  const { activeMission, isRecording } = useFlightRecorder();

  if (!isRecording) return null;

  return (
    <button
      onClick={onClick}
      className="fixed top-4 left-4 z-40 flex items-center gap-2 px-3 py-1.5 bg-black/80 backdrop-blur rounded-full border border-gray-700"
    >
      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      <span className="text-white text-xs font-mono">
        REC: {activeMission?.city.toUpperCase()}
      </span>
    </button>
  );
}

export default FlightRecorder;
