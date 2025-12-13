// GeoJSON types
export interface Point {
  lat: number;
  lon: number;
}

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [lon, lat]
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: [number, number][][]; // [[lon, lat]]
}

export interface GeoJSONFeature<G = GeoJSONPolygon | GeoJSONPoint, P = Record<string, unknown>> {
  type: 'Feature';
  geometry: G;
  properties: P;
}

// Anchor types
export interface AnchorCandidate {
  id: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
  score?: number;
}

export interface SelectedAnchor extends AnchorCandidate {
  name: string;
  selection_reason: string;
}

// Zone types
export type ZoneStatus = 'ACTIVE' | 'OFFLINE';

export type TextureType =
  | 'COMMERCIAL_DENSE'
  | 'RESIDENTIAL'
  | 'TRANSIT_HUB'
  | 'CULTURAL'
  | 'WATERFRONT'
  | 'INDUSTRIAL'
  | 'MIXED';

export interface SafeCorridor {
  type: 'LineString';
  coordinates: [number, number][];
  vitality_score: number;
}

export interface IntelMarker {
  type: 'CLEAN' | 'OVERPRICING' | 'HASSLE' | 'OFFLINE';
  lat: number;
  lon: number;
  count: number;
}

export interface Zone {
  zone_id: string;
  city: string;
  polygon: GeoJSONPolygon;
  centroid: Point;
  texture_type: TextureType;
  neon_color: string;
  anchor_candidates?: AnchorCandidate[];
  selected_anchor: SelectedAnchor;
  price_medians: {
    coffee?: number;
    beer?: number;
    taxi_airport?: number;
  };
  cheat_sheet: {
    taxi_phrase: string;
    price_estimates: string;
    emergency_numbers: {
      police: string;
      ambulance: string;
      embassy: string;
    };
  };
  status: ZoneStatus;
  // New Strategy 6.0+ features
  safe_corridors?: SafeCorridor[];
  intel_markers?: IntelMarker[];
  mission_whisper?: string;
  search_index_tokens?: string[];
  top_comments?: Comment[];
  texture_modifiers?: {
    weather_impact?: number;
    recent_reports?: number;
    updated_at?: string;
  };
}

// City Pack types
export interface CityPack {
  city: string;
  generated_at: string;
  version: number;
  zones: Zone[];
  meta: {
    source: string;
    seed_count: number;
  };
  // Pack sharing metadata
  pack_token?: string;
  pack_size_bytes?: number;
}

// Comment types
export type CommentTag =
  | 'CLEAN'
  | 'CROWDED'
  | 'SAFE'
  | 'SKETCHY'
  | 'OVERPRICED'
  | 'GOOD_VALUE'
  | 'TOURIST_TRAP'
  | 'LOCAL_FAVORITE'
  | 'AVOID'
  | 'RECOMMENDED';

export interface Comment {
  id: string;
  zone_id: string;
  city: string;
  user_hash?: string;
  short_tag: CommentTag;
  note: string;
  price?: number;
  photo_url?: string;
  created_at: string;
  verified: boolean;
  moderated: boolean;
  trust_score: number;
}

// Operative Memory (local storage)
export interface OperativeMemory {
  user_id?: string;
  visited_zones: {
    zone_id: string;
    city: string;
    visited_at: string;
    anchor_reached: boolean;
  }[];
  anchors_reached: number;
  total_distance_km: number;
  missions_completed: number;
  last_export?: string;
  preferences: {
    shadow_copy_mode: boolean;
    sync_memory_to_server: boolean;
  };
}

// Shadow Copy mode
export interface ShadowCopyConfig {
  enabled: boolean;
  block_writes: boolean;
  anonymize_all: boolean;
}

// Overpass types
export interface OverpassNode {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

export interface OverpassWay {
  type: 'way';
  id: number;
  nodes: number[];
  tags: Record<string, string>;
  center?: {
    lat: number;
    lon: number;
  };
}

export type OverpassElement = OverpassNode | OverpassWay;

export interface OverpassResponse {
  version: number;
  generator: string;
  elements: OverpassElement[];
}

// Algorithm configuration
export interface AnchorConfig {
  radii: number[]; // meters
  priorityTags: Record<string, string[]>;
  negativeTags: Record<string, string[]>;
  weights: {
    priority: number;
    proximity: number;
    connectivity: number;
    tagRichness: number;
  };
}
