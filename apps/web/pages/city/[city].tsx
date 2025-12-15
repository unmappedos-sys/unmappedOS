/**
 * UNMAPPED OS - City Dossier Page
 *
 * This is NOT a travel guide.
 * This is NOT a map app.
 * This is a LOADOUT SCREEN before entering a city.
 *
 * UX Philosophy:
 * - Information density WITHOUT clutter
 * - One dominant action per screen
 * - Always show "why" + confidence
 * - Tactical, not tourist
 * - Prepared > impressed
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import type { CityPack } from '@unmapped/lib';
import { downloadCityPack, getCityPackRecord } from '@/lib/cityPack';
import { isOnline, onConnectionChange, vibrateDevice, VIBRATION_PATTERNS } from '@/lib/deviceAPI';

// HUD Components
import {
  SatelliteLock,
  BlackBoxActuator,
  IntelGrid,
  LiveWire,
  CheatSheetPreview,
  OfflineOverlay,
  StickyHeader,
  HUDFrame,
  CityAccent,
  IntelEvent,
  CheatSheetItem,
} from '@/components/hud';

// City Data Registry
const CITY_REGISTRY: Record<
  string,
  {
    name: string;
    code: string;
    country: string;
    accent: CityAccent;
    coordinates: { lat: number; lon: number };
    threat: { level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'; index: number; primaryRisk: string };
    economics: { localPrice: number; touristPrice: number; currency: string; item: string };
    connectivity: { avgWifiMbps: number; esimProviders: string[] };
    emergency: {
      police: string;
      ambulance: string;
      embassy: string;
      hospitalAddress?: string;
      phrases?: { help: string; emergency: string; hospital: string };
    };
    cheatSheetPreview: CheatSheetItem[];
  }
> = {
  bangkok: {
    name: 'Bangkok',
    code: 'BKK',
    country: 'Thailand',
    accent: 'bangkok',
    coordinates: { lat: 13.7563, lon: 100.5018 },
    threat: { level: 'MODERATE', index: 4, primaryRisk: 'AGGRESSIVE TOUTS — TOURIST ZONES' },
    economics: { localPrice: 45, touristPrice: 120, currency: '฿', item: 'COFFEE' },
    connectivity: { avgWifiMbps: 45, esimProviders: ['AIS', 'TRUEMOVE'] },
    emergency: {
      police: '191',
      ambulance: '1669',
      embassy: '+66-2-205-4000',
      hospitalAddress: 'Bumrungrad Hospital, 33 Sukhumvit Soi 3',
      phrases: { help: 'ช่วยด้วย', emergency: 'ฉุกเฉิน', hospital: 'โรงพยาบาล' },
    },
    cheatSheetPreview: [
      {
        id: '1',
        category: 'SCAM',
        preview: 'AVOID: "GRAND PALACE IS CLOSED" CLAIM',
        full: 'If a driver claims a "Monk Holiday," ignore it. The Palace is open daily until 15:30. Walk to the white gate.',
      },
      {
        id: '2',
        category: 'TIP',
        preview: 'METERED TAXI PROTOCOL',
        full: 'Insist on meter. If refused, exit immediately. Next taxi will comply. Standard flag: 35฿.',
      },
      {
        id: '3',
        category: 'PHRASE',
        preview: 'PRICE CHECK: "TAO-RAI?"',
        full: '"Tao-rai?" (How much?) — Use before any transaction. Locals expect negotiation.',
      },
    ],
  },
  tokyo: {
    name: 'Tokyo',
    code: 'TYO',
    country: 'Japan',
    accent: 'tokyo',
    coordinates: { lat: 35.6762, lon: 139.6503 },
    threat: { level: 'LOW', index: 2, primaryRisk: 'LANGUAGE BARRIER — SERVICE COUNTERS' },
    economics: { localPrice: 400, touristPrice: 650, currency: '¥', item: 'RAMEN' },
    connectivity: { avgWifiMbps: 85, esimProviders: ['IIJmio', 'UBIGI'] },
    emergency: {
      police: '110',
      ambulance: '119',
      embassy: '+81-3-3224-5000',
      hospitalAddress: "St. Luke's International Hospital, 9-1 Akashicho, Chuo City",
      phrases: { help: '助けて', emergency: '緊急', hospital: '病院' },
    },
    cheatSheetPreview: [
      {
        id: '1',
        category: 'TIP',
        preview: 'SUBWAY IC CARD ESSENTIAL',
        full: 'Get Suica or Pasmo at any station. Works on all transit + convenience stores. Refundable deposit.',
      },
      {
        id: '2',
        category: 'SCAM',
        preview: 'AVOID: KABUKICHO "FREE" BARS',
        full: 'Touts offering "free" drinks lead to ¥50,000+ tabs. Legitimate bars never use street touts.',
      },
      {
        id: '3',
        category: 'PHRASE',
        preview: 'RECEIPT REQUEST: "RYŌSHŪSHO"',
        full: '"Ryōshūsho kudasai" — Always request receipt. Prevents "foreigner pricing."',
      },
    ],
  },
  singapore: {
    name: 'Singapore',
    code: 'SIN',
    country: 'Singapore',
    accent: 'singapore',
    coordinates: { lat: 1.3521, lon: 103.8198 },
    threat: { level: 'LOW', index: 1, primaryRisk: 'FINES — REGULATORY VIOLATIONS' },
    economics: { localPrice: 4, touristPrice: 7, currency: 'S$', item: 'KOPI' },
    connectivity: { avgWifiMbps: 120, esimProviders: ['SINGTEL', 'STARHUB'] },
    emergency: {
      police: '999',
      ambulance: '995',
      embassy: '+65-6476-9100',
      hospitalAddress: 'Singapore General Hospital, Outram Road',
      phrases: { help: 'Help!', emergency: 'Emergency', hospital: 'Hospital' },
    },
    cheatSheetPreview: [
      {
        id: '1',
        category: 'TIP',
        preview: 'HAWKER CENTER PROTOCOL',
        full: 'Queue at stalls, not tables. Use tissue packet or card to "chope" (reserve) table. Standard practice.',
      },
      {
        id: '2',
        category: 'SCAM',
        preview: 'TAXI: ALWAYS USE METER',
        full: 'All taxis must use meter by law. Report violations to LTA: 1800-225-5582.',
      },
      {
        id: '3',
        category: 'TIP',
        preview: 'MRT IS KING',
        full: 'Cleanest, most efficient transit. Use EZ-Link card. No food/drink on trains — S$500 fine.',
      },
    ],
  },
  hongkong: {
    name: 'Hong Kong',
    code: 'HKG',
    country: 'Hong Kong',
    accent: 'hongkong',
    coordinates: { lat: 22.3193, lon: 114.1694 },
    threat: { level: 'MODERATE', index: 3, primaryRisk: 'CROWD DENSITY — PEAK HOURS' },
    economics: { localPrice: 25, touristPrice: 65, currency: 'HK$', item: 'MILK TEA' },
    connectivity: { avgWifiMbps: 95, esimProviders: ['CSL', '3HK'] },
    emergency: {
      police: '999',
      ambulance: '999',
      embassy: '+852-2523-9011',
      phrases: { help: '救命', emergency: '緊急', hospital: '醫院' },
    },
    cheatSheetPreview: [
      {
        id: '1',
        category: 'TIP',
        preview: 'OCTOPUS CARD ESSENTIAL',
        full: 'Works everywhere — transit, 7-Eleven, restaurants. HK$50 deposit. Load at any MTR station.',
      },
      {
        id: '2',
        category: 'TIP',
        preview: 'DING DING TRAMS',
        full: 'Cheapest transport. HK$3 flat fare. Pay on exit. Best for Central exploration.',
      },
      {
        id: '3',
        category: 'PHRASE',
        preview: 'BILL REQUEST: "MAAI-DAAN"',
        full: '"Mh-goi, maai-daan" — Excuse me, bill please. Essential at cha chaan tengs.',
      },
    ],
  },
  seoul: {
    name: 'Seoul',
    code: 'SEL',
    country: 'South Korea',
    accent: 'seoul',
    coordinates: { lat: 37.5665, lon: 126.978 },
    threat: { level: 'LOW', index: 2, primaryRisk: 'LANGUAGE BARRIER — OLDER ESTABLISHMENTS' },
    economics: { localPrice: 4000, touristPrice: 8000, currency: '₩', item: 'BIBIMBAP' },
    connectivity: { avgWifiMbps: 150, esimProviders: ['KT', 'SKT'] },
    emergency: {
      police: '112',
      ambulance: '119',
      embassy: '+82-2-397-4114',
      phrases: { help: '도와주세요', emergency: '긴급', hospital: '병원' },
    },
    cheatSheetPreview: [
      {
        id: '1',
        category: 'TIP',
        preview: 'T-MONEY CARD ESSENTIAL',
        full: 'Buy at convenience stores. Works on all transit. 10% discount vs cash. Refundable.',
      },
      {
        id: '2',
        category: 'TIP',
        preview: 'POJANGMACHA PRICING',
        full: 'Street tent bars. Always ask price before ordering — no menus. Anju (snacks) often mandatory.',
      },
      {
        id: '3',
        category: 'PHRASE',
        preview: 'PRICE CHECK: "EOLMAYEYO?"',
        full: '"Eolmayeyo?" (How much?) — Essential before any transaction in markets.',
      },
    ],
  },
  bali: {
    name: 'Bali',
    code: 'DPS',
    country: 'Indonesia',
    accent: 'bali',
    coordinates: { lat: -8.3405, lon: 115.092 },
    threat: { level: 'MODERATE', index: 5, primaryRisk: 'AGGRESSIVE TOUTS — TOURIST AREAS' },
    economics: { localPrice: 15000, touristPrice: 45000, currency: 'Rp', item: 'NASI GORENG' },
    connectivity: { avgWifiMbps: 25, esimProviders: ['TELKOMSEL', 'XL'] },
    emergency: {
      police: '110',
      ambulance: '118',
      embassy: '+62-361-233-605',
      phrases: { help: 'Tolong!', emergency: 'Darurat', hospital: 'Rumah sakit' },
    },
    cheatSheetPreview: [
      {
        id: '1',
        category: 'SCAM',
        preview: 'AVOID: "BROKEN METER" TAXIS',
        full: 'Use Blue Bird taxis only (light blue). App: MyBlueBird. Gojek/Grab for motorbike taxi.',
      },
      {
        id: '2',
        category: 'TIP',
        preview: 'MONEY CHANGER PROTOCOL',
        full: 'Use bank-affiliated changers only. Count slowly. Watch for "calculator tricks."',
      },
      {
        id: '3',
        category: 'PHRASE',
        preview: 'POLITE DECLINE: "TIDAK"',
        full: '"Tidak, terima kasih" — No, thank you. Firm but polite. Don\'t engage further.',
      },
    ],
  },
  kualalumpur: {
    name: 'Kuala Lumpur',
    code: 'KUL',
    country: 'Malaysia',
    accent: 'kualalumpur',
    coordinates: { lat: 3.139, lon: 101.6869 },
    threat: { level: 'LOW', index: 2, primaryRisk: 'PETTY THEFT — CROWDED AREAS' },
    economics: { localPrice: 8, touristPrice: 18, currency: 'RM', item: 'TEH TARIK' },
    connectivity: { avgWifiMbps: 55, esimProviders: ['MAXIS', 'CELCOM'] },
    emergency: {
      police: '999',
      ambulance: '999',
      embassy: '+60-3-2168-5000',
      phrases: { help: 'Tolong!', emergency: 'Kecemasan', hospital: 'Hospital' },
    },
    cheatSheetPreview: [
      {
        id: '1',
        category: 'TIP',
        preview: 'GRAB IS DOMINANT',
        full: 'Use Grab app for everything — taxis, food, payments. GrabPay widely accepted.',
      },
      {
        id: '2',
        category: 'TIP',
        preview: 'MAMAK CULTURE',
        full: '24-hour Indian-Muslim eateries. Order teh tarik + roti canai. RM5 fills you up.',
      },
      {
        id: '3',
        category: 'PHRASE',
        preview: 'THANK YOU: "TERIMA KASIH"',
        full: 'Universal politeness. "Terima kasih" works everywhere. Add "banyak" for emphasis.',
      },
    ],
  },
  hanoi: {
    name: 'Hanoi',
    code: 'HAN',
    country: 'Vietnam',
    accent: 'hanoi',
    coordinates: { lat: 21.0285, lon: 105.8542 },
    threat: { level: 'MODERATE', index: 4, primaryRisk: 'TRAFFIC CHAOS — ROAD CROSSINGS' },
    economics: { localPrice: 25000, touristPrice: 75000, currency: '₫', item: 'PHO' },
    connectivity: { avgWifiMbps: 35, esimProviders: ['VIETTEL', 'MOBIFONE'] },
    emergency: {
      police: '113',
      ambulance: '115',
      embassy: '+84-24-3850-5000',
      phrases: { help: 'Cứu tôi!', emergency: 'Khẩn cấp', hospital: 'Bệnh viện' },
    },
    cheatSheetPreview: [
      {
        id: '1',
        category: 'TIP',
        preview: 'ROAD CROSSING TECHNIQUE',
        full: 'Walk slowly, steadily. Traffic flows around you. Never run or stop suddenly.',
      },
      {
        id: '2',
        category: 'SCAM',
        preview: 'AVOID: XE OM "FRIEND" RIDES',
        full: 'Use Grab only. Random motorbike taxis quote 10x prices. Pre-agreed fare or Grab.',
      },
      {
        id: '3',
        category: 'PHRASE',
        preview: 'PRICE CHECK: "BAO NHIÊU?"',
        full: '"Bao nhiêu tiền?" — How much? Essential before any transaction. Negotiate from there.',
      },
    ],
  },
  hochiminh: {
    name: 'Ho Chi Minh City',
    code: 'SGN',
    country: 'Vietnam',
    accent: 'hochiminh',
    coordinates: { lat: 10.8231, lon: 106.6297 },
    threat: { level: 'MODERATE', index: 5, primaryRisk: 'BAG SNATCHING — MOTORBIKE THIEVES' },
    economics: { localPrice: 20000, touristPrice: 60000, currency: '₫', item: 'BANH MI' },
    connectivity: { avgWifiMbps: 40, esimProviders: ['VIETTEL', 'VINAPHONE'] },
    emergency: {
      police: '113',
      ambulance: '115',
      embassy: '+84-28-3520-4200',
      phrases: { help: 'Cứu tôi!', emergency: 'Khẩn cấp', hospital: 'Bệnh viện' },
    },
    cheatSheetPreview: [
      {
        id: '1',
        category: 'SCAM',
        preview: 'BAG SECURITY PROTOCOL',
        full: 'Wear bag cross-body, facing building side. Motorbike snatch-and-grab common on sidewalks.',
      },
      {
        id: '2',
        category: 'TIP',
        preview: 'DISTRICT 1 PREMIUM',
        full: 'Everything 2-3x more expensive in D1. Walk 10min to D3/D4 for local prices.',
      },
      {
        id: '3',
        category: 'PHRASE',
        preview: 'TOO EXPENSIVE: "ĐẮT QUÁ"',
        full: '"Đắt quá!" — Too expensive! Walk away slowly. Price often drops 50%.',
      },
    ],
  },
  taipei: {
    name: 'Taipei',
    code: 'TPE',
    country: 'Taiwan',
    accent: 'taipei',
    coordinates: { lat: 25.033, lon: 121.5654 },
    threat: { level: 'LOW', index: 1, primaryRisk: 'TYPHOON SEASON — JUNE-SEPTEMBER' },
    economics: { localPrice: 50, touristPrice: 100, currency: 'NT$', item: 'BUBBLE TEA' },
    connectivity: { avgWifiMbps: 80, esimProviders: ['CHUNGHWA', 'TAIWAN MOBILE'] },
    emergency: {
      police: '110',
      ambulance: '119',
      embassy: '+886-2-2162-2000',
      phrases: { help: '救命', emergency: '緊急', hospital: '醫院' },
    },
    cheatSheetPreview: [
      {
        id: '1',
        category: 'TIP',
        preview: 'EASYCARD ESSENTIAL',
        full: 'Get at any MRT station or convenience store. Works on all transit + YouBike + 7-Eleven.',
      },
      {
        id: '2',
        category: 'TIP',
        preview: 'NIGHT MARKET PROTOCOL',
        full: 'Walk the full loop first, then buy. Same items vary 2x in price between stalls.',
      },
      {
        id: '3',
        category: 'PHRASE',
        preview: 'THANK YOU: "XIÈ XIÈ"',
        full: 'Universal politeness. "Xièxiè" (shyeh-shyeh) works everywhere.',
      },
    ],
  },
};

// Default fallback for unknown cities
const DEFAULT_CITY_DATA = {
  name: 'Unknown',
  code: 'XXX',
  country: 'LIVE THEATER',
  accent: 'default' as CityAccent,
  coordinates: { lat: 0, lon: 0 },
  threat: { level: 'MODERATE' as const, index: 5, primaryRisk: 'UNKNOWN TERRITORY' },
  economics: { localPrice: 100, touristPrice: 200, currency: '$', item: 'COFFEE' },
  connectivity: { avgWifiMbps: 30, esimProviders: ['LOCAL SIM'] },
  emergency: { police: '112', ambulance: '112', embassy: '112' },
  cheatSheetPreview: [],
};

export default function CityDossierV2() {
  const router = useRouter();
  const { city } = router.query;

  // State
  const [pack, setPack] = useState<CityPack | null>(null);
  const [packDownloadedAt, setPackDownloadedAt] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [atmospherics, setAtmospherics] = useState<{
    tempC: number;
    humidity: number;
    condition: string;
  } | null>(null);
  const [liveEvents, setLiveEvents] = useState<IntelEvent[]>([]);

  // Normalize city key
  const cityKey = useMemo(() => {
    if (typeof city !== 'string') return null;
    return city
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '');
  }, [city]);

  // Get city data
  const cityData = useMemo(() => {
    if (!cityKey) return null;
    return (
      CITY_REGISTRY[cityKey] || {
        ...DEFAULT_CITY_DATA,
        name: city?.toString().charAt(0).toUpperCase() + city?.toString().slice(1) || 'Unknown',
        code: cityKey.slice(0, 3).toUpperCase(),
      }
    );
  }, [cityKey, city]);

  // Connection status monitoring
  useEffect(() => {
    const cleanup = onConnectionChange((online) => {
      setConnectionStatus(online ? 'ONLINE' : 'OFFLINE');
    });
    setConnectionStatus(isOnline() ? 'ONLINE' : 'OFFLINE');
    return cleanup;
  }, []);

  // Load cached pack
  useEffect(() => {
    const loadPack = async () => {
      if (!cityKey) return;
      setLoading(true);
      try {
        const cached = await getCityPackRecord(cityKey);
        if (cached?.pack) {
          setPack(cached.pack);
          setPackDownloadedAt(cached.downloadedAt ?? null);
        }
      } catch (error) {
        console.error('Failed to load cached pack:', error);
      }
      setLoading(false);
    };
    loadPack();
  }, [cityKey]);

  // Fetch weather/atmospherics
  useEffect(() => {
    const fetchWeather = async () => {
      if (!cityData || !pack) return;
      try {
        const zone = pack.zones[0];
        if (!zone) return;
        const resp = await fetch(`/api/weather?lat=${zone.centroid.lat}&lon=${zone.centroid.lon}`);
        if (resp.ok) {
          const data = await resp.json();
          if (data.weather) {
            setAtmospherics({
              tempC: Math.round(data.weather.temperature),
              humidity: Math.round(data.weather.humidity || 70),
              condition: data.weather.description || 'Unknown',
            });
          }
        }
      } catch {
        /* weather API unavailable */
      }
    };
    fetchWeather();
  }, [cityData, pack]);

  // Generate mock live events for demo
  useEffect(() => {
    if (!cityData) return;
    const events: IntelEvent[] = [
      {
        id: '1',
        type: 'PRICE_VERIFIED',
        message: `OPERATIVE_${Math.floor(Math.random() * 100)} VERIFIED PRICE — ZONE ${Math.floor(Math.random() * 10)}`,
        timestamp: Date.now(),
      },
      {
        id: '2',
        type: 'INTEL_UPDATED',
        message: 'INTEL CONFIDENCE UPDATED — CENTRAL DISTRICT',
        timestamp: Date.now() - 60000,
      },
      {
        id: '3',
        type: 'OPERATIVE_ACTIVE',
        message: `FIELD OPERATIVE ACTIVE — ${cityData.name.toUpperCase()}`,
        timestamp: Date.now() - 120000,
      },
      {
        id: '4',
        type: 'HAZARD_REPORTED',
        message: 'MINOR HAZARD CLEARED — TRANSIT HUB',
        timestamp: Date.now() - 180000,
      },
      {
        id: '5',
        type: 'PRICE_VERIFIED',
        message: 'LOCAL RATE CONFIRMED — FOOD DISTRICT',
        timestamp: Date.now() - 240000,
      },
    ];
    setLiveEvents(events);
  }, [cityData]);

  // Download handler
  const handleDownload = useCallback(async () => {
    if (!cityKey || downloading) return;
    setDownloading(true);
    try {
      await downloadCityPack(cityKey);
      const refreshed = await getCityPackRecord(cityKey);
      setPack(refreshed?.pack ?? null);
      setPackDownloadedAt(refreshed?.downloadedAt ?? null);
      vibrateDevice(VIBRATION_PATTERNS.CONFIRM);
    } catch (error) {
      console.error('Pack download failed:', error);
      vibrateDevice(VIBRATION_PATTERNS.ERROR);
    }
    setDownloading(false);
  }, [cityKey, downloading]);

  // Enter field handler
  const handleEnterField = useCallback(() => {
    if (!cityKey) return;
    vibrateDevice(VIBRATION_PATTERNS.TAP);
    router.push(`/map/${encodeURIComponent(cityKey)}`);
  }, [cityKey, router]);

  // Compute zone stats
  const zoneStats = useMemo(() => {
    if (!pack) return null;
    const activeZones = pack.zones.filter((z) => z.status === 'ACTIVE').length;
    const totalAnchors = pack.zones.reduce((sum, z) => sum + (z.selected_anchor ? 1 : 0), 0);
    return {
      zoneCount: pack.zones.length,
      anchorCount: totalAnchors,
      activeZones,
    };
  }, [pack]);

  // Loading state
  if (!cityData || !cityKey) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="font-mono text-ops-neon-green animate-pulse">RESOLVING TARGET...</div>
      </div>
    );
  }

  const isOffline = connectionStatus === 'OFFLINE';
  const hasLocalCache = pack !== null;

  return (
    <>
      <Head>
        <title>{cityData.code} DOSSIER — UNMAPPED OS</title>
        <meta
          name="description"
          content={`Pre-deployment briefing for ${cityData.name}. Tactical intel, threat assessment, and field resources.`}
        />
      </Head>

      {/* Sticky Header */}
      <StickyHeader
        cityName={cityData.name}
        cityCode={cityData.code}
        cityAccent={cityData.accent}
        isActive={hasLocalCache}
        isOffline={isOffline}
      />

      <main className="min-h-screen bg-black">
        {/* SECTION A: Satellite Lock Hero */}
        <SatelliteLock
          cityName={cityData.name}
          cityCode={cityData.code}
          coordinates={cityData.coordinates}
          cityAccent={cityData.accent}
          className="min-h-[50vh] md:min-h-[60vh]"
        />

        {/* Main content container */}
        <div className="max-w-4xl mx-auto px-4 pb-12 space-y-8 -mt-8 relative z-10">
          {/* SECTION B: Black Box Actuator */}
          <section className="pt-4">
            <BlackBoxActuator
              cityName={cityData.name}
              cityAccent={cityData.accent}
              packDownloaded={hasLocalCache}
              packSizeMB={45}
              onDownload={handleDownload}
              onEnterField={handleEnterField}
              disabled={isOffline && !hasLocalCache}
            />
          </section>

          {/* Offline Overlay */}
          {isOffline && (
            <OfflineOverlay
              isOffline={true}
              hasLocalCache={hasLocalCache}
              emergency={cityData.emergency}
              cityAccent={cityData.accent}
              onOpenOfflineMap={handleEnterField}
            />
          )}

          {/* SECTION C: Intel Grid */}
          <section>
            <IntelGrid
              cityAccent={cityData.accent}
              threat={cityData.threat}
              economics={cityData.economics}
              connectivity={cityData.connectivity}
              atmospherics={
                atmospherics
                  ? {
                      ...atmospherics,
                      note:
                        atmospherics.humidity > 80
                          ? 'HYDRATION CRITICAL'
                          : atmospherics.tempC > 35
                            ? 'HEAT ADVISORY'
                            : undefined,
                    }
                  : undefined
              }
              zones={zoneStats || undefined}
            />
          </section>

          {/* SECTION D: Live Wire */}
          <section>
            <LiveWire events={liveEvents} cityAccent={cityData.accent} speed="slow" />
          </section>

          {/* Cheat Sheet Preview */}
          <section>
            <CheatSheetPreview
              items={cityData.cheatSheetPreview}
              totalItems={15}
              cityAccent={cityData.accent}
              packDownloaded={hasLocalCache}
              onDownloadPack={handleDownload}
            />
          </section>

          {/* Pack Status */}
          {hasLocalCache && pack && (
            <HUDFrame cityAccent={cityData.accent} className="p-4">
              <div className="font-mono text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-ops-night-muted">PACK VERSION</span>
                  <span className="text-ops-night-text">v{pack.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ops-night-muted">GENERATED</span>
                  <span className="text-ops-night-text">{pack.generated_at}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ops-night-muted">CACHED</span>
                  <span className="text-ops-night-text">{packDownloadedAt || 'UNKNOWN'}</span>
                </div>
              </div>
            </HUDFrame>
          )}

          {/* Footer navigation */}
          <nav className="flex items-center justify-between pt-8 border-t border-ops-night-border">
            <Link href="/cities">
              <button className="font-mono text-xs tracking-wider text-ops-night-muted hover:text-ops-neon-green transition-colors">
                ← ALL DOSSIERS
              </button>
            </Link>
            <div className="font-mono text-[10px] text-ops-night-muted/50">
              NO MAP. NO BUSINESSES. INTEL FIRST.
            </div>
          </nav>
        </div>
      </main>
    </>
  );
}

// Force server-side rendering for dynamic city routes
export async function getServerSideProps() {
  return { props: {} };
}
