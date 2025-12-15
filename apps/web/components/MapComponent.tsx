import { useEffect, useState, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Zone } from '@unmapped/lib';
import { getMapProviderDecision, recordMapLoad } from '../lib/mapUsageTracker';

interface MapComponentProps {
  city: string;
  zones: Zone[];
  onZoneClick?: (zone: Zone) => void;
  onAnchorReached?: (anchor: Zone['selected_anchor']) => void;
}

// Mapbox is only loaded dynamically when needed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MapInstance = maplibregl.Map | any;
type MapProvider = 'mapbox' | 'maplibre';

export default function MapComponent({
  city: _city,
  zones,
  onZoneClick,
  onAnchorReached,
}: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const providerRef = useRef<MapProvider>('maplibre');
  const lastZoneId = useRef<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const pointInPolygon = useCallback((point: [number, number], polygon: [number, number][]) => {
    const [x, y] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];

      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }

    return inside;
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    let disposed = false;
    let localMap: MapInstance | null = null;

    const init = async () => {
      // Get smart provider decision based on usage tracking
      const decision = getMapProviderDecision();
      providerRef.current = decision.provider;

      // Calculate center from first zone
      const center: [number, number] =
        zones.length > 0 ? [zones[0].centroid.lon, zones[0].centroid.lat] : [100.5, 13.75];

      if (decision.provider === 'mapbox') {
        const mod = await import('mapbox-gl');
        const mapboxgl = mod.default;

        const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        if (!mapboxToken) {
          throw new Error('Mapbox selected but NEXT_PUBLIC_MAPBOX_TOKEN is missing');
        }

        mapboxgl.accessToken = mapboxToken;
        const mapboxStyle =
          process.env.NEXT_PUBLIC_MAPBOX_STYLE || 'mapbox://styles/mapbox/dark-v11';

        localMap = new mapboxgl.Map({
          container: mapContainer.current!,
          style: mapboxStyle,
          center,
          zoom: 13,
        });

        recordMapLoad('mapbox');
        console.log(
          `[Map] Using Mapbox (${decision.remainingLoads.toLocaleString()} loads remaining this month)`
        );
      } else {
        const styleUrl =
          process.env.NEXT_PUBLIC_MAPLIBRE_STYLE_URL || 'https://demotiles.maplibre.org/style.json';

        localMap = new maplibregl.Map({
          container: mapContainer.current!,
          style: styleUrl,
          center,
          zoom: 13,
        });

        recordMapLoad('maplibre');
        console.log(`[Map] Using MapLibre (${decision.reason})`);
      }

      if (disposed) {
        localMap?.remove();
        return;
      }

      map.current = localMap;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (localMap as any).on('load', () => {
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
                'fill-opacity': zone.status === 'OFFLINE' ? 0.08 : 0.16,
              },
            });

            // Add zone borders
            map.current.addLayer({
              id: `${layerId}-border`,
              type: 'line',
              source: sourceId,
              paint: {
                'line-color': zone.status === 'OFFLINE' ? '#999999' : zone.neon_color,
                'line-width': 1,
              },
            });

            // Click handler
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (map.current as any).on('click', layerId, () => {
              onZoneClick?.(zone);
            });
          }
        });
      });
    };

    init();

    return () => {
      disposed = true;
      try {
        localMap?.remove();
      } catch {
        // ignore
      }
      map.current = null;
    };
  }, [zones, onZoneClick, onAnchorReached]);

  useEffect(() => {
    if (!mapLoaded) return;
    if (!onZoneClick) return;
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        // Find containing zone (prefer exact polygon match)
        let active: Zone | null = null;
        for (const zone of zones) {
          const ring = zone.polygon.coordinates?.[0];
          if (!ring || ring.length < 4) continue;
          if (pointInPolygon([lon, lat], ring as [number, number][])) {
            active = zone;
            break;
          }
        }

        if (!active) return;
        if (lastZoneId.current === active.zone_id) return;

        lastZoneId.current = active.zone_id;
        onZoneClick(active);
      },
      () => {
        // Silent: user may deny location; map remains usable.
      },
      {
        enableHighAccuracy: false,
        maximumAge: 15000,
        timeout: 20000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [mapLoaded, onZoneClick, pointInPolygon, zones]);

  const locateUser = useCallback(async () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };

          if (map.current) {
            const resolveMarker = async () => {
              if (providerRef.current !== 'mapbox') return maplibregl.Marker;
              const mod = await import('mapbox-gl');
              return mod.default.Marker;
            };

            // Add user marker
            const el = document.createElement('div');
            el.className = 'user-marker';
            el.style.width = '20px';
            el.style.height = '20px';
            el.style.borderRadius = '50%';
            el.style.backgroundColor = '#00FF00';
            el.style.border = '3px solid white';

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            resolveMarker()
              .then((MarkerImpl) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                new MarkerImpl({ element: el })
                  .setLngLat([pos.lon, pos.lat])
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .addTo(map.current as any);
                map.current?.flyTo({ center: [pos.lon, pos.lat], zoom: 15 });
              })
              .catch(() => {
                // ignore
              });
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

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Map controls overlay */}
      <div className="absolute top-4 right-4 space-y-2">
        <button
          onClick={locateUser}
          className="btn-tactical-ghost px-3 py-2 text-[10px]"
          title="Calibrate Position"
        >
          CALIBRATE
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
