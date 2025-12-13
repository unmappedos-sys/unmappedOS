/**
 * Example: Complete Integration of All Strategy 6.0+ Features
 * 
 * This file demonstrates how to integrate all new features into a single page.
 * Use this as a reference for building complete operative experiences.
 */

import { useState, useEffect } from 'react';
import EnhancedMapComponent from '@/components/EnhancedMapComponent';
import PackShareModal from '@/components/PackShareModal';
import { useDirectionAware } from '@/hooks/useDirectionAware';
import { useOperativeMemory } from '@/hooks/useOperativeMemory';
import { useOps } from '@/contexts/OpsContext';
import { getCityPack } from '@/lib/cityPack';
import type { Zone, CityPack } from '@unmapped/lib';

export default function CompleteIntegrationExample() {
  // State
  const [pack, setPack] = useState<CityPack | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [targetAnchor, setTargetAnchor] = useState<{ lat: number; lon: number } | null>(null);
  const [userPosition, setUserPosition] = useState<{ lat: number; lon: number } | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Hooks
  const { shadowCopy, toggleShadowCopy, dayOps } = useOps();
  const { memory, stats, recordZoneVisit, exportMemory, importMemory } = useOperativeMemory();
  const directionData = useDirectionAware({
    targetLat: targetAnchor?.lat,
    targetLon: targetAnchor?.lon,
    userLat: userPosition?.lat,
    userLon: userPosition?.lon,
  });

  // Load pack on mount
  useEffect(() => {
    loadPack();
  }, []);

  const loadPack = async () => {
    try {
      const bangkokPack = await getCityPack('bangkok');
      setPack(bangkokPack);
    } catch (error) {
      console.error('Failed to load pack:', error);
    }
  };

  // Handle zone selection
  const handleZoneClick = async (zone: Zone) => {
    setSelectedZone(zone);
    
    // Set target anchor for Direction-Aware Mode
    setTargetAnchor({
      lat: zone.selected_anchor.lat,
      lon: zone.selected_anchor.lon,
    });

    // Record zone visit in Operative Memory
    if (!shadowCopy.enabled) {
      await recordZoneVisit(zone.zone_id, zone.city, false);
    }
  };

  // Handle anchor reached
  const handleAnchorReached = async (anchor: Zone['selected_anchor']) => {
    if (selectedZone && !shadowCopy.enabled) {
      await recordZoneVisit(selectedZone.zone_id, selectedZone.city, true);
    }

    // Vibrate on anchor lock
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    alert(`ANCHOR POINT REACHED // ${anchor.name.toUpperCase()}`);
  };

  // Snapshot GPS
  const handleSnapshotGPS = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserPosition({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });

          if ('vibrate' in navigator) {
            navigator.vibrate(200);
          }
        },
        (error) => {
          console.error('GPS error:', error);
          alert('GPS SNAPSHOT FAILED // ENABLE LOCATION');
        }
      );
    }
  };

  // Export to Google Maps
  const handleExportToMaps = () => {
    if (!selectedZone) {
      alert('SELECT ZONE FIRST');
      return;
    }

    const anchor = selectedZone.selected_anchor;
    const lat = anchor.lat;
    const lon = anchor.lon;

    // Copy cheat sheet to clipboard
    const cheatSheet = `
ZONE: ${selectedZone.zone_id.toUpperCase()}
ANCHOR: ${anchor.name}
TAXI: ${selectedZone.cheat_sheet.taxi_phrase}
PRICES: ${selectedZone.cheat_sheet.price_estimates}
EMERGENCY: ${selectedZone.cheat_sheet.emergency_numbers.police}
MISSION WHISPER: ${selectedZone.mission_whisper || 'N/A'}
    `.trim();

    navigator.clipboard.writeText(cheatSheet);

    // Open Google Maps
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    window.open(mapsUrl, '_blank');

    alert('CHEAT SHEET COPIED // GOOGLE MAPS OPENED');
  };

  // Handle pack import
  const handlePackImport = async (importedPack: CityPack) => {
    setPack(importedPack);
    alert(`PACK IMPORTED // ${importedPack.city.toUpperCase()}`);
  };

  if (!pack) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-cyan-400 font-mono animate-pulse">
          LOADING CITY PACK...
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-black text-white font-mono">
      {/* Header */}
      <header className="bg-gray-900 border-b-2 border-cyan-500 p-4 flex justify-between items-center">
        <h1 className="text-cyan-400 text-xl">
          UNMAPPED OS // {pack.city.toUpperCase()}
        </h1>
        
        {/* Operative Stats */}
        <div className="text-sm text-gray-400">
          <span className="text-green-400">{stats.zones_visited}</span> ZONES //
          <span className="text-yellow-400 ml-2">{stats.anchors_reached}</span> ANCHORS //
          <span className="text-purple-400 ml-2">{stats.total_distance_km.toFixed(2)}</span> KM
        </div>

        {/* Shadow Copy Indicator */}
        {shadowCopy.enabled && (
          <div className="bg-red-900 border border-red-500 px-3 py-1 text-red-200 text-xs">
            🕶️ SHADOW COPY: READ-ONLY
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-80 bg-gray-900 border-r-2 border-cyan-500 p-4 overflow-y-auto">
          {/* Selected Zone Info */}
          {selectedZone ? (
            <div className="mb-4">
              <h2 className="text-cyan-400 text-lg mb-2">ZONE: {selectedZone.zone_id}</h2>
              
              {/* Anchor */}
              <div className="bg-gray-800 p-3 mb-3 border border-gray-700">
                <div className="text-xs text-gray-400">ANCHOR:</div>
                <div className="text-white">{selectedZone.selected_anchor.name}</div>
              </div>

              {/* Mission Whisper */}
              {selectedZone.mission_whisper && (
                <div className="bg-yellow-900 border border-yellow-600 p-3 mb-3">
                  <div className="text-xs text-yellow-400">MISSION WHISPER:</div>
                  <div className="text-yellow-200 text-sm">{selectedZone.mission_whisper}</div>
                </div>
              )}

              {/* Intel Markers Summary */}
              {selectedZone.intel_markers && selectedZone.intel_markers.length > 0 && (
                <div className="bg-gray-800 border border-gray-700 p-3 mb-3">
                  <div className="text-xs text-gray-400 mb-2">QUICK-INTEL:</div>
                  {selectedZone.intel_markers.map((marker, idx) => (
                    <div key={idx} className="flex items-center text-sm mb-1">
                      <span className={`w-3 h-3 rounded-full mr-2 ${
                        marker.type === 'CLEAN' ? 'bg-green-500' :
                        marker.type === 'OVERPRICING' ? 'bg-orange-500' :
                        marker.type === 'HASSLE' ? 'bg-purple-500' :
                        'bg-gray-500'
                      }`}></span>
                      <span className="text-white">{marker.type}: {marker.count}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Safe Corridors */}
              {selectedZone.safe_corridors && selectedZone.safe_corridors.length > 0 && (
                <div className="bg-green-900 border border-green-600 p-3 mb-3">
                  <div className="text-xs text-green-400 mb-1">SAFE CORRIDORS:</div>
                  <div className="text-green-200 text-sm">
                    {selectedZone.safe_corridors.length} high-vitality path(s)
                  </div>
                  <div className="text-green-300 text-xs mt-1">
                    Avg Score: {(selectedZone.safe_corridors.reduce((sum, c) => sum + c.vitality_score, 0) / selectedZone.safe_corridors.length).toFixed(2)}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={handleExportToMaps}
                  disabled={shadowCopy.enabled}
                  className="w-full bg-cyan-500 text-black py-2 px-4 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {shadowCopy.enabled ? 'SHADOW COPY: READ-ONLY' : 'EXPORT TO GOOGLE MAPS'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              SELECT ZONE TO VIEW DETAILS
            </div>
          )}

          {/* Operative Memory */}
          <div className="mt-6 border-t border-gray-700 pt-4">
            <h3 className="text-cyan-400 mb-2">OPERATIVE MEMORY</h3>
            <div className="bg-gray-800 p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Zones Visited:</span>
                <span className="text-white">{stats.zones_visited}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Anchors Reached:</span>
                <span className="text-white">{stats.anchors_reached}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Distance:</span>
                <span className="text-white">{stats.total_distance_km.toFixed(2)} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Missions:</span>
                <span className="text-white">{stats.missions_completed}</span>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <button
                onClick={() => {
                  const json = exportMemory();
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'operative_memory.json';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="w-full bg-gray-700 text-white py-2 px-4 text-sm hover:bg-gray-600"
              >
                EXPORT MEMORY
              </button>

              <button
                onClick={toggleShadowCopy}
                className={`w-full py-2 px-4 text-sm ${
                  shadowCopy.enabled
                    ? 'bg-red-900 border border-red-600 text-red-200'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                {shadowCopy.enabled ? '🕶️ SHADOW COPY: ON' : 'SHADOW COPY: OFF'}
              </button>
            </div>
          </div>
        </aside>

        {/* Map */}
        <main className="flex-1 relative">
          <EnhancedMapComponent
            city={pack.city}
            zones={pack.zones}
            selectedZone={selectedZone}
            targetAnchor={targetAnchor}
            onZoneClick={handleZoneClick}
            onAnchorReached={handleAnchorReached}
            theme={dayOps ? 'day' : 'night'}
          />

          {/* Floating Action Buttons */}
          <div className="absolute bottom-4 right-4 space-y-2">
            <button
              onClick={handleSnapshotGPS}
              className="block bg-green-600 text-white px-4 py-2 rounded shadow-lg hover:bg-green-500"
              title="Snapshot GPS"
            >
              📍 GPS
            </button>

            <button
              onClick={() => setShareModalOpen(true)}
              className="block bg-purple-600 text-white px-4 py-2 rounded shadow-lg hover:bg-purple-500"
              title="Share Pack"
            >
              📲 SHARE
            </button>
          </div>
        </main>
      </div>

      {/* Pack Share Modal */}
      <PackShareModal
        pack={pack}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        onImport={handlePackImport}
      />
    </div>
  );
}
