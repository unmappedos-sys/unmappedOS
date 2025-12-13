import { useEffect, useState, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Zone } from '@unmapped/lib';

interface MapComponentProps {
  city: string;
  zones: Zone[];
  onZoneClick?: (zone: Zone) => void;
  onAnchorReached?: (anchor: Zone['selected_anchor']) => void;
}

export default function MapComponent({
  city,
  zones,
  onZoneClick,
  onAnchorReached,
}: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userPosition, setUserPosition] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Using Maptiler OpenMapTiles for better cartography (free tier)
    const styleUrl = process.env.NEXT_PUBLIC_MAPLIBRE_STYLE_URL || 'https://api.maptiler.com/maps/streets/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL';

    // Calculate center from first zone
    const center: [number, number] =
      zones.length > 0
        ? [zones[0].centroid.lon, zones[0].centroid.lat]
        : [100.5, 13.75]; // Bangkok default

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center,
      zoom: 13,
    });

    map.current.on('load', () => {
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
          map.current.on('click', layerId, () => {
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

          const marker = new maplibregl.Marker(el)
            .setLngLat([anchor.lon, anchor.lat])
            .setPopup(
              new maplibregl.Popup({ offset: 25 }).setHTML(
                `<div class="ops-card p-3">
                  <h3 class="font-mono font-bold text-sm">${anchor.name}</h3>
                  <p class="text-xs text-gray-500">${zone.zone_id}</p>
                </div>`
              )
            )
            .addTo(map.current);

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

  const locateUser = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };
          setUserPosition(pos);

          if (map.current) {
            // Add user marker
            const el = document.createElement('div');
            el.className = 'user-marker';
            el.style.width = '20px';
            el.style.height = '20px';
            el.style.borderRadius = '50%';
            el.style.backgroundColor = '#00FF00';
            el.style.border = '3px solid white';

            new maplibregl.Marker(el).setLngLat([pos.lon, pos.lat]).addTo(map.current);

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
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Map controls overlay */}
      <div className="absolute top-4 right-4 space-y-2">
        <button
          onClick={locateUser}
          className="ops-button text-xs px-3 py-2 bg-black bg-opacity-70"
          title="Calibrate Position"
        >
          📍 LOCATE
        </button>
      </div>

      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80">
          <p className="terminal-text animate-pulse">LOADING TACTICAL DISPLAY...</p>
        </div>
      )}
    </div>
  );
}
