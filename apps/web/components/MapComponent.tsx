import { useEffect, useState, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import mapboxgl from 'mapbox-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Zone } from '@unmapped/lib';
import {
  getMapProviderDecision,
  recordMapLoad,
  getMapUsageStats,
  setMapProviderOverride,
  type MapProviderDecision,
} from '../lib/mapUsageTracker';

interface MapComponentProps {
  city: string;
  zones: Zone[];
  onZoneClick?: (zone: Zone) => void;
  onAnchorReached?: (anchor: Zone['selected_anchor']) => void;
}

type MapInstance = maplibregl.Map | mapboxgl.Map;
type MarkerClass = typeof maplibregl.Marker | typeof mapboxgl.Marker;
type PopupClass = typeof maplibregl.Popup | typeof mapboxgl.Popup;

export default function MapComponent({
  city: _city,
  zones,
  onZoneClick,
  onAnchorReached,
}: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [providerInfo, setProviderInfo] = useState<MapProviderDecision | null>(null);
  const [showUsagePanel, setShowUsagePanel] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Get smart provider decision based on usage tracking
    const decision = getMapProviderDecision();
    setProviderInfo(decision);

    // Calculate center from first zone
    const center: [number, number] =
      zones.length > 0 ? [zones[0].centroid.lon, zones[0].centroid.lat] : [100.5, 13.75]; // Bangkok default

    let mapInstance: MapInstance;
    let MarkerImpl: MarkerClass;
    let PopupImpl: PopupClass;

    if (decision.provider === 'mapbox') {
      // Use Mapbox GL
      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
      mapboxgl.accessToken = mapboxToken;

      const mapboxStyle = process.env.NEXT_PUBLIC_MAPBOX_STYLE || 'mapbox://styles/mapbox/dark-v11';

      mapInstance = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapboxStyle,
        center,
        zoom: 13,
      });

      MarkerImpl = mapboxgl.Marker;
      PopupImpl = mapboxgl.Popup;

      // Record the load
      recordMapLoad('mapbox');

      console.log(
        `[Map] Using Mapbox (${decision.remainingLoads.toLocaleString()} loads remaining this month)`
      );
    } else {
      // Use MapLibre (free fallback)
      const styleUrl =
        process.env.NEXT_PUBLIC_MAPLIBRE_STYLE_URL || 'https://demotiles.maplibre.org/style.json';

      mapInstance = new maplibregl.Map({
        container: mapContainer.current,
        style: styleUrl,
        center,
        zoom: 13,
      });

      MarkerImpl = maplibregl.Marker;
      PopupImpl = maplibregl.Popup;

      // Record the load
      recordMapLoad('maplibre');

      console.log(`[Map] Using MapLibre (${decision.reason})`);
    }

    map.current = mapInstance;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mapInstance as any).on('load', () => {
      setMapLoaded(true);

      // Add zones as polygons
      zones.forEach((zone) => {
        const sourceId = `zone-${zone.zone_id}`;
        const layerId = `zone-layer-${zone.zone_id}`;

        if (map.current) {
          map.current.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: zone.polygon,
              properties: {
                zone_id: zone.zone_id,
                status: zone.status,
                neon_color: zone.neon_color,
              },
            },
          });

          map.current.addLayer({
            id: layerId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': zone.status === 'OFFLINE' ? '#666666' : zone.neon_color,
              'fill-opacity': zone.status === 'OFFLINE' ? 0.2 : 0.4,
            },
          });

          // Add zone borders
          map.current.addLayer({
            id: `${layerId}-border`,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': zone.status === 'OFFLINE' ? '#999999' : zone.neon_color,
              'line-width': 2,
            },
          });

          // Click handler
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (map.current as any).on('click', layerId, () => {
            onZoneClick?.(zone);
          });
        }
      });

      // Add anchors as markers
      zones.forEach((zone) => {
        if (map.current && zone.selected_anchor) {
          const anchor = zone.selected_anchor;
          const el = document.createElement('div');
          el.className = 'anchor-marker';
          el.style.width = '30px';
          el.style.height = '30px';
          el.style.borderRadius = '50%';
          el.style.border = `3px solid ${zone.neon_color}`;
          el.style.backgroundColor = 'rgba(0,0,0,0.7)';
          el.style.cursor = 'pointer';

          const popup = new PopupImpl({ offset: 25 }).setHTML(
            `<div class="ops-card p-3">
              <h3 class="font-mono font-bold text-sm">${anchor.name}</h3>
              <p class="text-xs text-gray-500">${zone.zone_id}</p>
            </div>`
          );

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          new MarkerImpl({ element: el })
            .setLngLat([anchor.lon, anchor.lat])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .setPopup(popup as any)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .addTo(map.current as any);

          el.addEventListener('click', () => {
            onAnchorReached?.(anchor);
          });
        }
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [zones, onZoneClick, onAnchorReached]);

  const locateUser = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };

          if (map.current) {
            const decision = getMapProviderDecision();
            const MarkerImpl = decision.provider === 'mapbox' ? mapboxgl.Marker : maplibregl.Marker;

            // Add user marker
            const el = document.createElement('div');
            el.className = 'user-marker';
            el.style.width = '20px';
            el.style.height = '20px';
            el.style.borderRadius = '50%';
            el.style.backgroundColor = '#00FF00';
            el.style.border = '3px solid white';

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            new MarkerImpl({ element: el }).setLngLat([pos.lon, pos.lat]).addTo(map.current as any);

            map.current.flyTo({ center: [pos.lon, pos.lat], zoom: 15 });
          }

          // Vibrate on location found
          if ('vibrate' in navigator) {
            navigator.vibrate(200);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Location access denied. Enable location to use zone detection.');
        }
      );
    }
  }, []);

  const handleProviderSwitch = useCallback((provider: 'mapbox' | 'maplibre') => {
    setMapProviderOverride(provider);
    // Force re-render by reloading the page (simplest approach for map switch)
    window.location.reload();
  }, []);

  const usageStats = typeof window !== 'undefined' ? getMapUsageStats() : null;

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full mapboxgl-canvas maplibregl-canvas" />

      {/* Map controls overlay */}
      <div className="absolute top-4 right-4 space-y-2">
        <button
          onClick={locateUser}
          className="ops-button text-xs px-3 py-2 bg-black bg-opacity-70"
          title="Calibrate Position"
        >
          📍 LOCATE
        </button>

        {/* Usage indicator */}
        {providerInfo && (
          <button
            onClick={() => setShowUsagePanel(!showUsagePanel)}
            className={`ops-button text-xs px-3 py-2 bg-black bg-opacity-70 ${
              providerInfo.isCritical
                ? 'border-red-500 text-red-400'
                : providerInfo.isWarning
                  ? 'border-yellow-500 text-yellow-400'
                  : 'border-green-500 text-green-400'
            }`}
            title="Map Provider Status"
          >
            {providerInfo.provider === 'mapbox' ? '🗺️' : '🌍'} {providerInfo.provider.toUpperCase()}
          </button>
        )}
      </div>

      {/* Usage panel */}
      {showUsagePanel && providerInfo && usageStats && (
        <div className="absolute top-20 right-4 bg-black bg-opacity-90 border border-gray-700 rounded-lg p-4 w-72 text-sm font-mono">
          <h3 className="text-green-400 font-bold mb-3">MAP PROVIDER STATUS</h3>

          <div className="space-y-2 text-gray-300">
            <div className="flex justify-between">
              <span>Provider:</span>
              <span className="text-white">{providerInfo.provider.toUpperCase()}</span>
            </div>

            <div className="flex justify-between">
              <span>Mapbox Loads:</span>
              <span className="text-white">{usageStats.mapboxLoads.toLocaleString()} / 50K</span>
            </div>

            <div className="flex justify-between">
              <span>MapLibre Loads:</span>
              <span className="text-white">{usageStats.maplibreLoads.toLocaleString()}</span>
            </div>

            {/* Usage bar */}
            <div className="mt-2">
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    providerInfo.isCritical
                      ? 'bg-red-500'
                      : providerInfo.isWarning
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(usageStats.usagePercent * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {(usageStats.usagePercent * 100).toFixed(1)}% of free tier used
              </p>
            </div>

            <p className="text-xs text-gray-400 mt-2">{providerInfo.reason}</p>

            {/* Manual switch buttons */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-xs text-gray-500 mb-2">Manual Override:</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleProviderSwitch('mapbox')}
                  disabled={providerInfo.provider === 'mapbox'}
                  className={`flex-1 px-2 py-1 text-xs rounded ${
                    providerInfo.provider === 'mapbox'
                      ? 'bg-green-900 text-green-400'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Mapbox
                </button>
                <button
                  onClick={() => handleProviderSwitch('maplibre')}
                  disabled={providerInfo.provider === 'maplibre'}
                  className={`flex-1 px-2 py-1 text-xs rounded ${
                    providerInfo.provider === 'maplibre'
                      ? 'bg-green-900 text-green-400'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  MapLibre
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowUsagePanel(false)}
            className="absolute top-2 right-2 text-gray-500 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80">
          <p className="terminal-text animate-pulse">LOADING TACTICAL DISPLAY...</p>
        </div>
      )}

      {/* Auto-switch notification */}
      {providerInfo?.isCritical && (
        <div className="absolute bottom-4 left-4 right-4 bg-yellow-900 bg-opacity-90 border border-yellow-600 rounded-lg p-3 text-sm">
          <p className="text-yellow-300 font-mono">
            ⚠️ AUTO-SWITCHED TO MAPLIBRE - Mapbox usage at{' '}
            {(providerInfo.usagePercent * 100).toFixed(0)}% of free tier
          </p>
        </div>
      )}
    </div>
  );
}
