/**
 * UNMAPPED OS - Tactical Map Canvas
 *
 * Full-screen tactical map with:
 * - Quiet, abstract base map
 * - Zone territories as primary entities
 * - User position tracking
 * - Safe corridors
 * - No business pins, POIs, or commercial labels
 */

import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { TacticalZone, Position, SafeCorridor, OpsMode, ZoneTexture } from './types';
import { ZONE_COLORS, ZONE_COLORS_DAY } from './types';

interface TacticalMapCanvasProps {
  zones: TacticalZone[];
  userPosition?: Position | null;
  safeCorridors?: SafeCorridor[];
  opsMode: OpsMode;
  focusedZoneId?: string | null;
  onZoneTap?: (zone: TacticalZone) => void;
  onAnchorReached?: (zoneId: string) => void;
  onUserMoved?: (position: Position) => void;
  showPath?: boolean;
  className?: string;
}

export interface TacticalMapCanvasRef {
  flyTo: (center: [number, number], zoom?: number) => void;
  focusZone: (zoneId: string) => void;
  clearFocus: () => void;
}

// MapLibre dark style optimized for tactical display
const TACTICAL_STYLE_NIGHT = {
  version: 8 as const,
  name: 'Tactical Night',
  sources: {
    'osm-tiles': {
      type: 'raster' as const,
      tiles: [
        'https://api.maptiler.com/maps/streets-v2-dark/{z}/{x}/{y}.png?key=' +
          (process.env.NEXT_PUBLIC_MAPTILER_KEY || 'get_your_own_key'),
      ],
      tileSize: 512,
      attribution: '© MapTiler © OpenStreetMap',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background' as const,
      paint: { 'background-color': '#0a0a0f' },
    },
    {
      id: 'base-tiles',
      type: 'raster' as const,
      source: 'osm-tiles',
      paint: { 'raster-opacity': 0.6, 'raster-saturation': -0.5 },
    },
  ],
};

// Day ops style - high contrast
const TACTICAL_STYLE_DAY = {
  version: 8 as const,
  name: 'Tactical Day',
  sources: {
    'osm-tiles': {
      type: 'raster' as const,
      tiles: [
        'https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=' +
          (process.env.NEXT_PUBLIC_MAPTILER_KEY || 'get_your_own_key'),
      ],
      tileSize: 512,
      attribution: '© MapTiler © OpenStreetMap',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background' as const,
      paint: { 'background-color': '#fafaf9' },
    },
    {
      id: 'base-tiles',
      type: 'raster' as const,
      source: 'osm-tiles',
      paint: { 'raster-opacity': 0.9, 'raster-saturation': -0.3, 'raster-contrast': 0.1 },
    },
  ],
};

const TacticalMapCanvas = forwardRef<TacticalMapCanvasRef, TacticalMapCanvasProps>(
  function TacticalMapCanvas(
    {
      zones,
      userPosition,
      safeCorridors = [],
      opsMode,
      focusedZoneId,
      onZoneTap,
      onAnchorReached,
      onUserMoved,
      showPath = false,
      className = '',
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const userMarkerRef = useRef<maplibregl.Marker | null>(null);
    const pathCoordsRef = useRef<[number, number][]>([]);
    const [mapReady, setMapReady] = useState(false);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      flyTo: (center: [number, number], zoom = 15) => {
        mapRef.current?.flyTo({ center, zoom, duration: 800 });
      },
      focusZone: (zoneId: string) => {
        const zone = zones.find((z) => z.id === zoneId);
        if (zone && mapRef.current) {
          mapRef.current.flyTo({
            center: [zone.centroid.lon, zone.centroid.lat],
            zoom: 15,
            duration: 600,
          });
        }
      },
      clearFocus: () => {
        if (zones.length > 0 && mapRef.current) {
          const bounds = new maplibregl.LngLatBounds();
          zones.forEach((z) => bounds.extend([z.centroid.lon, z.centroid.lat]));
          mapRef.current.fitBounds(bounds, { padding: 60, duration: 800 });
        }
      },
    }));

    // Initialize map
    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;

      const center: [number, number] =
        zones.length > 0 ? [zones[0].centroid.lon, zones[0].centroid.lat] : [100.5, 13.75];

      const style = opsMode === 'DAY' ? TACTICAL_STYLE_DAY : TACTICAL_STYLE_NIGHT;

      const map = new maplibregl.Map({
        container: containerRef.current,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style: style as any,
        center,
        zoom: 13,
        minZoom: 10,
        maxZoom: 18,
        attributionControl: false,
        logoPosition: 'bottom-right',
      });

      map.on('load', () => {
        setMapReady(true);
      });

      mapRef.current = map;

      return () => {
        map.remove();
        mapRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle ops mode change (day/night)
    useEffect(() => {
      if (!mapRef.current || !mapReady) return;

      const style = opsMode === 'DAY' ? TACTICAL_STYLE_DAY : TACTICAL_STYLE_NIGHT;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mapRef.current.setStyle(style as any);

      // Re-add zones after style change
      mapRef.current.once('styledata', () => {
        addZonesToMap();
        addCorridorsToMap();
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opsMode, mapReady]);

    // Add zones to map
    const addZonesToMap = useCallback(() => {
      const map = mapRef.current;
      if (!map) return;

      const colors = opsMode === 'DAY' ? ZONE_COLORS_DAY : ZONE_COLORS;

      zones.forEach((zone) => {
        const sourceId = `zone-${zone.id}`;
        const fillLayerId = `zone-fill-${zone.id}`;
        const strokeLayerId = `zone-stroke-${zone.id}`;
        const texture = zone.texture as ZoneTexture;
        const palette = colors[texture] || colors.UNKNOWN;

        // Remove existing layers/sources
        if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
        if (map.getLayer(strokeLayerId)) map.removeLayer(strokeLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);

        // Add source
        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { zoneId: zone.id, texture: zone.texture },
            geometry: zone.polygon,
          },
        });

        // Fill layer - soft, fuzzy polygons
        const isFocused = focusedZoneId === zone.id;
        const isOffline = zone.status === 'OFFLINE' || zone.status === 'DEGRADED';

        map.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': isOffline
              ? '#4b5563'
              : palette.fill.replace(/[\d.]+\)$/, isFocused ? '0.25)' : '0.15)'),
            'fill-opacity': isFocused ? 0.9 : isOffline ? 0.5 : 0.8,
          },
        });

        // Stroke layer - subtle borders
        map.addLayer({
          id: strokeLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': isOffline ? '#6b7280' : palette.stroke,
            'line-width': isFocused ? 2 : 1,
            'line-opacity': isFocused ? 1 : 0.6,
            'line-blur': opsMode === 'NIGHT' ? 1 : 0,
          },
        });

        // Click handler
        map.on('click', fillLayerId, () => {
          onZoneTap?.(zone);
        });

        // Cursor change
        map.on('mouseenter', fillLayerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', fillLayerId, () => {
          map.getCanvas().style.cursor = '';
        });
      });

      // Add anchor markers for focused zone
      if (focusedZoneId) {
        const focusedZone = zones.find((z) => z.id === focusedZoneId);
        if (focusedZone?.anchor) {
          addAnchorMarker(focusedZone);
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zones, focusedZoneId, opsMode, onZoneTap]);

    // Add anchor marker
    const addAnchorMarker = useCallback((zone: TacticalZone) => {
      const map = mapRef.current;
      if (!map || !zone.anchor) return;

      // Remove existing anchor marker
      const existingAnchor = document.getElementById('anchor-marker');
      existingAnchor?.remove();

      // Create anchor element
      const el = document.createElement('div');
      el.id = 'anchor-marker';
      el.className = 'tactical-anchor-marker';
      el.innerHTML = `
        <div class="anchor-ring"></div>
        <div class="anchor-crosshair"></div>
      `;

      new maplibregl.Marker({ element: el })
        .setLngLat([zone.anchor.position.lon, zone.anchor.position.lat])
        .addTo(map);
    }, []);

    // Add safe corridors
    const addCorridorsToMap = useCallback(() => {
      const map = mapRef.current;
      if (!map || safeCorridors.length === 0) return;

      safeCorridors.forEach((corridor, idx) => {
        const sourceId = `corridor-${idx}`;
        const layerId = `corridor-line-${idx}`;

        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);

        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { type: corridor.type },
            geometry: {
              type: 'LineString',
              coordinates: corridor.path,
            },
          },
        });

        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': corridor.type === 'NIGHT_SAFE' ? '#22c55e' : '#fbbf24',
            'line-width': 3,
            'line-opacity': 0.7,
            'line-blur': 2,
            'line-dasharray': [2, 2],
          },
        });
      });
    }, [safeCorridors]);

    // Update zones when they change
    useEffect(() => {
      if (mapReady) {
        addZonesToMap();
      }
    }, [mapReady, addZonesToMap]);

    // Update corridors
    useEffect(() => {
      if (mapReady) {
        addCorridorsToMap();
      }
    }, [mapReady, addCorridorsToMap]);

    // Update user position marker
    useEffect(() => {
      if (!mapRef.current || !userPosition) return;

      if (!userMarkerRef.current) {
        // Create user marker
        const el = document.createElement('div');
        el.className = 'tactical-user-marker';
        el.innerHTML = `
          <div class="user-halo"></div>
          <div class="user-chevron" style="transform: rotate(${userPosition.heading || 0}deg)"></div>
        `;

        userMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([userPosition.lon, userPosition.lat])
          .addTo(mapRef.current);
      } else {
        // Update position with smooth transition
        userMarkerRef.current.setLngLat([userPosition.lon, userPosition.lat]);

        // Update heading
        const chevron = userMarkerRef.current.getElement().querySelector('.user-chevron');
        if (chevron && userPosition.heading !== undefined) {
          (chevron as HTMLElement).style.transform = `rotate(${userPosition.heading}deg)`;
        }
      }

      // Track path if enabled
      if (showPath) {
        pathCoordsRef.current.push([userPosition.lon, userPosition.lat]);
        updatePathLine();
      }

      // Check anchor proximity
      if (focusedZoneId) {
        const zone = zones.find((z) => z.id === focusedZoneId);
        if (zone?.anchor) {
          const dist = getDistance(
            userPosition.lat,
            userPosition.lon,
            zone.anchor.position.lat,
            zone.anchor.position.lon
          );
          if (dist < 30) {
            onAnchorReached?.(zone.id);
          }
        }
      }

      onUserMoved?.(userPosition);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userPosition, showPath, focusedZoneId, zones, onAnchorReached, onUserMoved]);

    // Update path line
    const updatePathLine = useCallback(() => {
      const map = mapRef.current;
      if (!map || pathCoordsRef.current.length < 2) return;

      const sourceId = 'user-path';
      const layerId = 'user-path-line';

      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: pathCoordsRef.current.slice(-100), // Keep last 100 points
          },
        });
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: pathCoordsRef.current,
            },
          },
        });

        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#60a5fa',
            'line-width': 2,
            'line-opacity': 0.4,
          },
        });
      }
    }, []);

    // Haversine distance
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371000;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    return (
      <div
        ref={containerRef}
        className={`w-full h-full ${className}`}
        style={{
          background: opsMode === 'DAY' ? '#fafaf9' : '#0a0a0f',
        }}
      />
    );
  }
);

export default TacticalMapCanvas;
