/**
 * HUD Type Definitions - UNMAPPED OS
 */

export type CityAccent =
  | 'tokyo' // Pink/Magenta
  | 'bangkok' // Amber/Gold
  | 'singapore' // Cyan
  | 'hongkong' // Red
  | 'seoul' // Purple
  | 'bali' // Teal
  | 'kualalumpur' // Orange
  | 'hanoi' // Yellow
  | 'hochiminh' // Lime
  | 'taipei' // Blue
  | 'default'; // Green

export interface CityColorScheme {
  primary: string;
  glow: string;
  accent: string;
  wireframe: string;
}

export const CITY_COLORS: Record<CityAccent, CityColorScheme> = {
  tokyo: {
    primary: '#FF10F0',
    glow: 'rgba(255, 16, 240, 0.5)',
    accent: '#FF10F0',
    wireframe: '#FF10F0',
  },
  bangkok: {
    primary: '#FFB000',
    glow: 'rgba(255, 176, 0, 0.5)',
    accent: '#FFB000',
    wireframe: '#FFB000',
  },
  singapore: {
    primary: '#00F5FF',
    glow: 'rgba(0, 245, 255, 0.5)',
    accent: '#00F5FF',
    wireframe: '#00F5FF',
  },
  hongkong: {
    primary: '#FF0040',
    glow: 'rgba(255, 0, 64, 0.5)',
    accent: '#FF0040',
    wireframe: '#FF0040',
  },
  seoul: {
    primary: '#9D00FF',
    glow: 'rgba(157, 0, 255, 0.5)',
    accent: '#9D00FF',
    wireframe: '#9D00FF',
  },
  bali: {
    primary: '#00FFB0',
    glow: 'rgba(0, 255, 176, 0.5)',
    accent: '#00FFB0',
    wireframe: '#00FFB0',
  },
  kualalumpur: {
    primary: '#FF6600',
    glow: 'rgba(255, 102, 0, 0.5)',
    accent: '#FF6600',
    wireframe: '#FF6600',
  },
  hanoi: {
    primary: '#FFFF00',
    glow: 'rgba(255, 255, 0, 0.5)',
    accent: '#FFFF00',
    wireframe: '#FFFF00',
  },
  hochiminh: {
    primary: '#AAFF00',
    glow: 'rgba(170, 255, 0, 0.5)',
    accent: '#AAFF00',
    wireframe: '#AAFF00',
  },
  taipei: {
    primary: '#0080FF',
    glow: 'rgba(0, 128, 255, 0.5)',
    accent: '#0080FF',
    wireframe: '#0080FF',
  },
  default: {
    primary: '#00FF41',
    glow: 'rgba(0, 255, 65, 0.5)',
    accent: '#00FF41',
    wireframe: '#00FF41',
  },
};

export interface ThreatLevel {
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  index: number; // 0-10
  primaryRisk: string;
}

export interface EconomicsData {
  localPrice: number;
  touristPrice: number;
  currency: string;
  markupPercent: number;
  item: string;
}

export interface ConnectivityData {
  avgWifiMbps: number;
  esimProviders: string[];
  status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
}

export interface AtmosphericsData {
  tempC: number;
  humidity: number;
  condition: string;
  note: string;
}

export interface CityPackStatus {
  downloaded: boolean;
  sizeBytes: number;
  version: string;
  downloadedAt: string | null;
  zones: number;
  anchors: number;
}

export interface IntelEvent {
  id: string;
  type: 'PRICE_VERIFIED' | 'HAZARD_REPORTED' | 'INTEL_UPDATED' | 'OPERATIVE_ACTIVE';
  message: string;
  sector?: string;
  timestamp: number;
}

export interface CheatSheetItem {
  id: string;
  category: 'SCAM' | 'TIP' | 'PHRASE' | 'CUSTOM';
  preview: string;
  full: string;
}

export interface EmergencyInfo {
  police: string;
  ambulance: string;
  embassy: string;
  hospitalAddress?: string;
  phrases?: {
    help: string;
    emergency: string;
    hospital: string;
  };
}

export type DownloadStage =
  | 'IDLE'
  | 'HANDSHAKE'
  | 'GEOMETRY'
  | 'ANCHORS'
  | 'CHEATSHEET'
  | 'VERIFICATION'
  | 'COMPLETE'
  | 'ERROR';

export interface DownloadProgress {
  stage: DownloadStage;
  percent: number;
  message: string;
}

export type OpsMode = 'NIGHT' | 'DAY' | 'OFFLINE';
