/**
 * DIRECTION MAP — Minimal map view
 *
 * Shows ONLY:
 * - User position
 * - Direction arrow
 * - Highlighted destination
 * - Minimal roads
 *
 * Answers ONE question: "Is it close and walkable?"
 */

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Recommendation, Position } from './types';

interface DirectionMapProps {
  userPosition: Position | null;
  destination: Recommendation['destination'] | null;
  visible: boolean;
  onClose: () => void;
  onNavigate: () => void;
}

export interface DirectionMapRef {
  centerOnUser: () => void;
}

const DirectionMap = forwardRef<DirectionMapRef, DirectionMapProps>(function DirectionMap(
  { userPosition, destination, visible, onClose, onNavigate },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Expose methods
  useImperativeHandle(ref, () => ({
    centerOnUser: () => {
      if (mapRef.current && userPosition) {
        mapRef.current.flyTo({
          center: [userPosition.lon, userPosition.lat],
          zoom: 16,
          duration: 500,
        });
      }
    },
  }));

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || !visible) return;

    // Clean up existing map
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY || 'get_your_own_OpIi9ZULNHzrESv6T2vL';

    // Calculate center
    const center: [number, number] = userPosition
      ? [userPosition.lon, userPosition.lat]
      : destination
        ? [destination.lon, destination.lat]
        : [100.5018, 13.7563]; // Bangkok default

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/streets-v2-light/style.json?key=${maptilerKey}`,
      center,
      zoom: 15,
      attributionControl: false,
      pitchWithRotate: false,
      dragRotate: false,
    });

    mapRef.current = map;

    // Add attribution
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    // Disable rotation
    map.touchZoomRotate.disableRotation();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [visible, userPosition, destination]);

  // Update user marker
  useEffect(() => {
    if (!mapRef.current || !userPosition || !visible) return;

    // Remove existing
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    // Create user marker (blue dot)
    const el = document.createElement('div');
    el.className = 'user-marker';
    el.innerHTML = `
        <div style="
          width: 20px;
          height: 20px;
          background: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>
      `;

    userMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([userPosition.lon, userPosition.lat])
      .addTo(mapRef.current);
  }, [userPosition, visible]);

  // Update destination marker
  useEffect(() => {
    if (!mapRef.current || !destination || !visible) return;

    // Remove existing
    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
    }

    // Create destination marker (direction arrow)
    const el = document.createElement('div');
    el.className = 'dest-marker';
    el.innerHTML = `
        <div style="
          background: #16a34a;
          color: white;
          padding: 8px 14px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          white-space: nowrap;
        ">${destination.name}</div>
      `;

    destMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([destination.lon, destination.lat])
      .addTo(mapRef.current);

    // Fit bounds to show both points
    if (userPosition) {
      const bounds = new maplibregl.LngLatBounds()
        .extend([userPosition.lon, userPosition.lat])
        .extend([destination.lon, destination.lat]);

      mapRef.current.fitBounds(bounds, {
        padding: { top: 100, bottom: 200, left: 50, right: 50 },
        maxZoom: 16,
        duration: 500,
      });
    }
  }, [destination, userPosition, visible]);

  // Draw direction line
  const drawLine = useCallback(() => {
    if (!mapRef.current || !userPosition || !destination) return;

    const map = mapRef.current;

    // Remove existing line
    if (map.getLayer('direction-line')) {
      map.removeLayer('direction-line');
    }
    if (map.getSource('direction-line')) {
      map.removeSource('direction-line');
    }

    // Add line source
    map.addSource('direction-line', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [userPosition.lon, userPosition.lat],
            [destination.lon, destination.lat],
          ],
        },
      },
    });

    // Add line layer
    map.addLayer({
      id: 'direction-line',
      type: 'line',
      source: 'direction-line',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#16a34a',
        'line-width': 4,
        'line-dasharray': [2, 2],
        'line-opacity': 0.8,
      },
    });
  }, [userPosition, destination]);

  // Draw line when map loads
  useEffect(() => {
    if (!mapRef.current || !visible) return;

    const map = mapRef.current;

    const onLoad = () => {
      drawLine();
    };

    if (map.isStyleLoaded()) {
      drawLine();
    } else {
      map.on('load', onLoad);
    }

    return () => {
      map.off('load', onLoad);
    };
  }, [visible, drawLine]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Map container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 pt-safe">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center active:scale-95 transition-transform"
          >
            <svg
              className="w-5 h-5 text-stone-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          {destination && (
            <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-sm">
              <span className="text-stone-700 text-sm font-medium">
                {formatDistanceLabel(destination.distance)}
              </span>
            </div>
          )}
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      {/* Bottom action */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pb-safe">
        <div className="p-4 bg-gradient-to-t from-white via-white to-transparent pt-12">
          <button
            onClick={onNavigate}
            className="w-full py-4 bg-stone-900 text-white rounded-2xl font-medium active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Open in Maps
          </button>
        </div>
      </div>
    </div>
  );
});

function formatDistanceLabel(meters: number): string {
  if (meters < 100) return `${Math.round(meters / 10) * 10}m walk`;
  if (meters < 1000) return `${Math.round(meters / 50) * 50}m walk`;
  const km = meters / 1000;
  if (km < 2) return `${km.toFixed(1)}km walk`;
  return `${km.toFixed(1)}km`;
}

export default DirectionMap;
