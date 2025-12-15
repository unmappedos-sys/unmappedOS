/**
 * LOCAL SENSE - Calm Map Canvas
 *
 * A quiet, neutral map that feels alive but not busy.
 * No POIs, no labels, no ratings. Just soft shapes.
 */

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { LocalArea, Position } from './types';

export interface LocalSenseMapRef {
  panTo: (position: Position) => void;
  getCenter: () => Position | null;
}

interface LocalSenseMapProps {
  areas: LocalArea[];
  userPosition: Position | null;
  isOffline?: boolean;
  onAreaTap?: (area: LocalArea, screenPos: { x: number; y: number }) => void;
  onMapMove?: () => void;
  className?: string;
}

// Minimal, calm map style - no POIs, no labels
const CALM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'Local Sense',
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap',
    },
  },
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#fafaf9' },
    },
    {
      id: 'base-tiles',
      type: 'raster',
      source: 'osm-tiles',
      paint: {
        'raster-opacity': 0.6,
        'raster-saturation': -0.5,
        'raster-contrast': -0.1,
        'raster-brightness-min': 0.1,
      },
    },
  ],
};

// Offline style - even more muted
const OFFLINE_STYLE: maplibregl.StyleSpecification = {
  ...CALM_STYLE,
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#f5f5f4' },
    },
    {
      id: 'base-tiles',
      type: 'raster',
      source: 'osm-tiles',
      paint: {
        'raster-opacity': 0.4,
        'raster-saturation': -0.8,
        'raster-contrast': -0.2,
        'raster-brightness-min': 0.2,
      },
    },
  ],
};

const LocalSenseMap = forwardRef<LocalSenseMapRef, LocalSenseMapProps>(function LocalSenseMap(
  { areas, userPosition, isOffline = false, onAreaTap, onMapMove, className = '' },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<HTMLDivElement | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Expose methods
  useImperativeHandle(ref, () => ({
    panTo: (position: Position) => {
      mapRef.current?.panTo([position.lon, position.lat], { duration: 1200 });
    },
    getCenter: () => {
      const center = mapRef.current?.getCenter();
      if (!center) return null;
      return { lat: center.lat, lon: center.lng };
    },
  }));

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center: [number, number] =
      areas.length > 0 ? [areas[0].center.lon, areas[0].center.lat] : [100.5, 13.75];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: isOffline ? OFFLINE_STYLE : CALM_STYLE,
      center,
      zoom: 14,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      logoPosition: 'bottom-right',
    });

    map.on('load', () => {
      setMapReady(true);
    });

    map.on('moveend', () => {
      onMapMove?.();
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update style when offline status changes
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    mapRef.current.setStyle(isOffline ? OFFLINE_STYLE : CALM_STYLE);
  }, [isOffline, mapReady]);

  // Render gravity fields (very subtle)
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;

    // Remove existing gravity layers
    areas.forEach((area) => {
      const fillId = `gravity-${area.id}`;
      if (map.getLayer(fillId)) map.removeLayer(fillId);
      if (map.getSource(fillId)) map.removeSource(fillId);
    });

    // Add gravity fields
    areas.forEach((area) => {
      const sourceId = `gravity-${area.id}`;

      // Determine opacity based on gravity/pressure
      const isGood = area.localGravity > 0.6 && area.pressureLevel < 0.4;
      const isPressured = area.pressureLevel > 0.6;

      let fillColor = 'rgba(0, 0, 0, 0)';
      let fillOpacity = 0;

      if (isGood) {
        // Soft green pull
        fillColor = 'rgba(16, 185, 129, 0.08)';
        fillOpacity = 0.08 * area.confidence;
      } else if (isPressured) {
        // Soft amber pressure
        fillColor = 'rgba(251, 191, 36, 0.06)';
        fillOpacity = 0.06 * area.confidence;
      }

      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: area.polygon,
        },
      });

      map.addLayer({
        id: sourceId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': fillColor,
          'fill-opacity': fillOpacity,
        },
      });

      // Click handler
      map.on('click', sourceId, (e) => {
        if (e.originalEvent && onAreaTap) {
          onAreaTap(area, {
            x: e.originalEvent.clientX,
            y: e.originalEvent.clientY,
          });
        }
      });
    });
  }, [areas, mapReady, onAreaTap]);

  // User position marker (subtle dot)
  useEffect(() => {
    if (!mapRef.current || !mapReady || !userPosition) return;
    const map = mapRef.current;

    // Create or update marker
    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'localsense-user-marker';
      el.innerHTML = `
          <div class="user-dot"></div>
          <div class="user-pulse"></div>
        `;
      userMarkerRef.current = el;

      new maplibregl.Marker({ element: el })
        .setLngLat([userPosition.lon, userPosition.lat])
        .addTo(map);
    } else {
      // Update position
      const markers = document.querySelectorAll('.localsense-user-marker');
      markers.forEach((m) => m.remove());

      const el = document.createElement('div');
      el.className = 'localsense-user-marker';
      el.innerHTML = `
          <div class="user-dot"></div>
          <div class="user-pulse"></div>
        `;
      userMarkerRef.current = el;

      new maplibregl.Marker({ element: el })
        .setLngLat([userPosition.lon, userPosition.lat])
        .addTo(map);
    }
  }, [userPosition, mapReady]);

  // Fit to areas on load
  useEffect(() => {
    if (!mapRef.current || !mapReady || areas.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    areas.forEach((area) => {
      bounds.extend([area.center.lon, area.center.lat]);
    });

    mapRef.current.fitBounds(bounds, {
      padding: 60,
      duration: 1000,
      maxZoom: 15,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${className}`}
      style={{ background: '#fafaf9' }}
    />
  );
});

export default LocalSenseMap;
