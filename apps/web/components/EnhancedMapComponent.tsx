import { useEffect, useState, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Zone } from '@unmapped/lib';
import { useDirectionAware } from '../hooks/useDirectionAware';

interface EnhancedMapProps {
  city: string;
  zones: Zone[];
  selectedZone?: Zone | null;
  targetAnchor?: { lat: number; lon: number } | null;
  onZoneClick?: (zone: Zone) => void;
  onAnchorReached?: (anchor: Zone['selected_anchor']) => void;
  theme?: 'night' | 'day';
}

export default function EnhancedMapComponent({
  city,
  zones,
  selectedZone,
  targetAnchor,
  onZoneClick,
  onAnchorReached,
  theme = 'night',
}: EnhancedMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userPosition, setUserPosition] = useState<{ lat: number; lon: number } | null>(null);
  const [showSafeCorridors, setShowSafeCorridors] = useState(true);
  const [showIntelMarkers, setShowIntelMarkers] = useState(true);

  // Direction-Aware Mode
  const directionData = useDirectionAware({
    targetLat: targetAnchor?.lat,
    targetLon: targetAnchor?.lon,
    userLat: userPosition?.lat,
    userLon: userPosition?.lon,
  });

  useEffect(() => {
    if (!mapContainer.current) return;

    const styleUrl =
      process.env.NEXT_PUBLIC_MAPLIBRE_STYLE_URL ||
      'https://api.maptiler.com/maps/streets/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL';

    const center: [number, number] =
      zones.length > 0 ? [zones[0].centroid.lon, zones[0].centroid.lat] : [100.5, 13.75];

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center,
      zoom: 13,
    });

    map.current.on('load', () => {
      if (!map.current) return;
      setMapLoaded(true);

      // Add zones as polygons
      zones.forEach((zone) => {
        addZoneLayer(zone);
        addAnchorMarker(zone);
        
        // Add Safe Walk Corridors
        if (showSafeCorridors && zone.safe_corridors) {
          addSafeCorridors(zone);
        }

        // Add Quick-Intel markers
        if (showIntelMarkers && zone.intel_markers) {
          addIntelMarkers(zone);
        }
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [zones]);

  // Add zone polygon layer
  const addZoneLayer = useCallback((zone: Zone) => {
    if (!map.current) return;

    const sourceId = `zone-${zone.zone_id}`;
    const layerId = `zone-layer-${zone.zone_id}`;

    // Dynamic texture shifts based on modifiers
    let fillOpacity = zone.status === 'OFFLINE' ? 0.2 : 0.4;
    let color = zone.status === 'OFFLINE' ? '#666666' : zone.neon_color;

    // Apply texture modifiers
    if (zone.texture_modifiers) {
      if (zone.texture_modifiers.weather_impact && zone.texture_modifiers.weather_impact > 0.5) {
        fillOpacity *= 0.7; // Dim for rain/weather
      }
      if (zone.texture_modifiers.recent_reports && zone.texture_modifiers.recent_reports > 0) {
        color = '#FF6600'; // Orange for warnings
      }
    }

    map.current.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: zone.polygon,
        properties: {
          zone_id: zone.zone_id,
          status: zone.status,
        },
      },
    });

    // Night Ops vs Day Ops theming
    const themeColor = theme === 'night' ? color : '#FF9900';

    map.current.addLayer({
      id: layerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': themeColor,
        'fill-opacity': fillOpacity,
      },
    });

    // Pulsing animation for active zones
    if (zone.status === 'ACTIVE') {
      animateZonePulse(layerId);
    }

    // Border
    map.current.addLayer({
      id: `${layerId}-border`,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': themeColor,
        'line-width': 2,
      },
    });

    // Click handler
    map.current.on('click', layerId, () => {
      onZoneClick?.(zone);
    });
  }, [onZoneClick, theme]);

  // Animate zone pulsing
  const animateZonePulse = useCallback((layerId: string) => {
    if (!map.current) return;

    let opacity = 0.4;
    let increasing = false;

    const pulse = () => {
      if (!map.current || !map.current.getLayer(layerId)) return;

      opacity += increasing ? 0.01 : -0.01;
      if (opacity >= 0.6) increasing = false;
      if (opacity <= 0.3) increasing = true;

      map.current.setPaintProperty(layerId, 'fill-opacity', opacity);
      requestAnimationFrame(pulse);
    };

    pulse();
  }, []);

  // Add anchor marker
  const addAnchorMarker = useCallback(
    (zone: Zone) => {
      if (!map.current || !zone.selected_anchor) return;

      const anchor = zone.selected_anchor;
      const el = document.createElement('div');
      el.className = 'anchor-marker';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.borderRadius = '50%';
      el.style.border = `3px solid ${zone.neon_color}`;
      el.style.backgroundColor = 'rgba(0,0,0,0.8)';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.innerHTML = '⚓';

      const marker = new maplibregl.Marker(el)
        .setLngLat([anchor.lon, anchor.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(
            `<div class="bg-gray-900 p-3 border border-cyan-500 font-mono text-xs">
              <h3 class="font-bold text-cyan-400">${anchor.name}</h3>
              <p class="text-gray-400">${zone.zone_id}</p>
              ${zone.mission_whisper ? `<p class="text-yellow-400 mt-2 text-xs">${zone.mission_whisper}</p>` : ''}
            </div>`
          )
        )
        .addTo(map.current);

      el.addEventListener('click', () => {
        onAnchorReached?.(anchor);
      });
    },
    [onAnchorReached]
  );

  // Add Safe Walk Score corridors
  const addSafeCorridors = useCallback((zone: Zone) => {
    if (!map.current || !zone.safe_corridors) return;

    zone.safe_corridors.forEach((corridor, idx) => {
      const sourceId = `corridor-${zone.zone_id}-${idx}`;
      const layerId = `corridor-layer-${zone.zone_id}-${idx}`;

      map.current!.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: corridor,
          properties: {
            vitality_score: corridor.vitality_score,
          },
        },
      });

      map.current!.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#00FF00',
          'line-width': 4,
          'line-opacity': 0.6,
          'line-dasharray': [2, 2],
        },
      });
    });
  }, []);

  // Add Quick-Intel markers
  const addIntelMarkers = useCallback((zone: Zone) => {
    if (!map.current || !zone.intel_markers) return;

    zone.intel_markers.forEach((marker, idx) => {
      const el = document.createElement('div');
      el.className = 'intel-marker';
      el.style.width = '16px';
      el.style.height = '16px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';

      // Color by type
      const colors = {
        CLEAN: '#00FF00',
        OVERPRICING: '#FF9900',
        HASSLE: '#FF00FF',
        OFFLINE: '#666666',
      };
      el.style.backgroundColor = colors[marker.type];
      el.style.opacity = '0.8';

      // Position near zone centroid with slight offset
      const lat = zone.centroid.lat + (Math.random() - 0.5) * 0.002;
      const lon = zone.centroid.lon + (Math.random() - 0.5) * 0.002;

      new maplibregl.Marker(el)
        .setLngLat([lon, lat])
        .setPopup(
          new maplibregl.Popup({ offset: 10 }).setHTML(
            `<div class="bg-black text-white p-2 font-mono text-xs">
              ${marker.type}: ${marker.count} reports
            </div>`
          )
        )
        .addTo(map.current!);
    });
  }, []);

  // Locate user with snapshot GPS
  const locateUser = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };
          setUserPosition(pos);

          if (map.current) {
            // Add/update user marker
            const el = document.createElement('div');
            el.className = 'user-marker';
            el.style.width = '20px';
            el.style.height = '20px';
            el.style.borderRadius = '50%';
            el.style.backgroundColor = '#00FF00';
            el.style.border = '3px solid white';
            el.style.boxShadow = '0 0 10px rgba(0,255,0,0.8)';

            new maplibregl.Marker(el).setLngLat([pos.lon, pos.lat]).addTo(map.current);

            map.current.flyTo({ center: [pos.lon, pos.lat], zoom: 16 });
          }

          if ('vibrate' in navigator) {
            navigator.vibrate(200);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Location access denied');
        }
      );
    }
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Direction-Aware HUD */}
      {targetAnchor && directionData.supported && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-80 border-2 border-cyan-500 p-4 font-mono text-sm">
          <div className="text-cyan-400 mb-2">DIRECTION-AWARE MODE</div>
          
          {/* Directional Arrow */}
          {directionData.relativeBearing !== null && (
            <div className="flex items-center justify-center mb-2">
              <div
                className="text-4xl transition-transform duration-300"
                style={{
                  transform: `rotate(${directionData.relativeBearing}deg)`,
                }}
              >
                ↑
              </div>
            </div>
          )}

          {directionData.heading !== null && (
            <div className="text-white">
              HEADING: {Math.round(directionData.heading)}°
            </div>
          )}
          
          {directionData.distance !== null && (
            <div className="text-green-400">
              DISTANCE: {directionData.distance < 1000
                ? `${Math.round(directionData.distance)}m`
                : `${(directionData.distance / 1000).toFixed(2)}km`}
            </div>
          )}
        </div>
      )}

      {/* Map Controls */}
      <div className="absolute top-4 right-4 space-y-2">
        <button
          onClick={locateUser}
          className="block w-full bg-black bg-opacity-80 border border-cyan-500 text-cyan-400 px-4 py-2 font-mono text-xs hover:bg-cyan-500 hover:text-black transition"
        >
          📍 SNAPSHOT GPS
        </button>

        <button
          onClick={() => setShowSafeCorridors(!showSafeCorridors)}
          className={`block w-full bg-black bg-opacity-80 border px-4 py-2 font-mono text-xs transition ${
            showSafeCorridors
              ? 'border-green-500 text-green-400'
              : 'border-gray-600 text-gray-400'
          }`}
        >
          {showSafeCorridors ? '✓' : '○'} SAFE CORRIDORS
        </button>

        <button
          onClick={() => setShowIntelMarkers(!showIntelMarkers)}
          className={`block w-full bg-black bg-opacity-80 border px-4 py-2 font-mono text-xs transition ${
            showIntelMarkers
              ? 'border-purple-500 text-purple-400'
              : 'border-gray-600 text-gray-400'
          }`}
        >
          {showIntelMarkers ? '✓' : '○'} INTEL OVERLAY
        </button>
      </div>

      {/* Mission Whisper for selected zone */}
      {selectedZone?.mission_whisper && (
        <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-90 border border-yellow-500 p-3 font-mono text-xs text-yellow-400">
          <span className="text-gray-400">MISSION WHISPER:</span> {selectedZone.mission_whisper}
        </div>
      )}

      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80">
          <p className="text-cyan-400 font-mono animate-pulse">LOADING TACTICAL DISPLAY...</p>
        </div>
      )}
    </div>
  );
}
