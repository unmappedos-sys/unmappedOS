/**
 * Flight Recorder - Mission Log Video Generator
 * 
 * Generates shareable "Year in Review" style mission summary.
 * Creates a 15-second high-contrast animation showing:
 * - Path through zones
 * - Stats (anchors locked, hazards reported)
 * - Final rank
 * 
 * "MISSION COMPLETE: TOKYO"
 * 
 * Users post on Instagram/TikTok = free marketing.
 * Travelers, not Tourists.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface MissionEvent {
  id: string;
  type: 'zone_enter' | 'zone_exit' | 'anchor_lock' | 'hazard_report' | 'comment' | 'verification';
  zone_id?: string;
  zone_name?: string;
  anchor_id?: string;
  anchor_name?: string;
  lat?: number;
  lng?: number;
  timestamp: number;
  karma_earned?: number;
}

export interface MissionLog {
  id: string;
  city: string;
  started_at: number;
  ended_at: number | null;
  events: MissionEvent[];
  stats: MissionStats;
  status: 'active' | 'completed';
}

export interface MissionStats {
  zones_visited: number;
  anchors_locked: number;
  hazards_reported: number;
  comments_submitted: number;
  verifications_made: number;
  total_karma: number;
  distance_km: number;
  duration_hours: number;
}

export interface MissionSummary {
  city: string;
  cityDisplay: string;
  dates: string;
  stats: MissionStats;
  rank: string;
  rankIcon: string;
  pathCoordinates: [number, number][]; // [lng, lat] for map trace
  highlights: string[];
  shareText: string;
}

interface FlightRecorderDB extends DBSchema {
  missions: {
    key: string;
    value: MissionLog;
    indexes: { 'by-city': string; 'by-status': string };
  };
}

const DB_NAME = 'unmapped_flight_recorder';
const DB_VERSION = 1;

let db: IDBPDatabase<FlightRecorderDB> | null = null;

async function initDB(): Promise<IDBPDatabase<FlightRecorderDB>> {
  if (db) return db;

  db = await openDB<FlightRecorderDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      const store = database.createObjectStore('missions', { keyPath: 'id' });
      store.createIndex('by-city', 'city');
      store.createIndex('by-status', 'status');
    },
  });

  return db;
}

/**
 * Start a new mission log
 */
export async function startMission(city: string): Promise<MissionLog> {
  const database = await initDB();

  const mission: MissionLog = {
    id: `mission-${city}-${Date.now()}`,
    city,
    started_at: Date.now(),
    ended_at: null,
    events: [],
    stats: {
      zones_visited: 0,
      anchors_locked: 0,
      hazards_reported: 0,
      comments_submitted: 0,
      verifications_made: 0,
      total_karma: 0,
      distance_km: 0,
      duration_hours: 0,
    },
    status: 'active',
  };

  await database.put('missions', mission);
  console.log(`[FLIGHT RECORDER] Mission started: ${city}`);

  return mission;
}

/**
 * Record a mission event
 */
export async function recordEvent(
  missionId: string,
  event: Omit<MissionEvent, 'id' | 'timestamp'>
): Promise<void> {
  const database = await initDB();
  const mission = await database.get('missions', missionId);

  if (!mission || mission.status !== 'active') {
    console.warn('[FLIGHT RECORDER] No active mission found');
    return;
  }

  const fullEvent: MissionEvent = {
    ...event,
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  };

  mission.events.push(fullEvent);

  // Update stats
  switch (event.type) {
    case 'zone_enter':
      mission.stats.zones_visited++;
      break;
    case 'anchor_lock':
      mission.stats.anchors_locked++;
      break;
    case 'hazard_report':
      mission.stats.hazards_reported++;
      break;
    case 'comment':
      mission.stats.comments_submitted++;
      break;
    case 'verification':
      mission.stats.verifications_made++;
      break;
  }

  if (event.karma_earned) {
    mission.stats.total_karma += event.karma_earned;
  }

  // Calculate distance if coordinates available
  if (event.lat && event.lng && mission.events.length > 1) {
    const lastEvent = mission.events[mission.events.length - 2];
    if (lastEvent.lat && lastEvent.lng) {
      const dist = haversineDistance(
        lastEvent.lat,
        lastEvent.lng,
        event.lat,
        event.lng
      );
      mission.stats.distance_km += dist / 1000;
    }
  }

  await database.put('missions', mission);
}

/**
 * Complete a mission
 */
export async function completeMission(missionId: string): Promise<MissionSummary> {
  const database = await initDB();
  const mission = await database.get('missions', missionId);

  if (!mission) {
    throw new Error('Mission not found');
  }

  mission.ended_at = Date.now();
  mission.status = 'completed';
  mission.stats.duration_hours = (mission.ended_at - mission.started_at) / (1000 * 60 * 60);

  await database.put('missions', mission);

  return generateMissionSummary(mission);
}

/**
 * Get active mission
 */
export async function getActiveMission(city?: string): Promise<MissionLog | null> {
  const database = await initDB();
  const missions = await database.getAllFromIndex('missions', 'by-status', 'active');

  if (city) {
    return missions.find((m) => m.city === city) || null;
  }

  return missions[0] || null;
}

/**
 * Get all completed missions
 */
export async function getCompletedMissions(): Promise<MissionLog[]> {
  const database = await initDB();
  return database.getAllFromIndex('missions', 'by-status', 'completed');
}

/**
 * Generate mission summary for sharing
 */
function generateMissionSummary(mission: MissionLog): MissionSummary {
  const cityNames: Record<string, string> = {
    bangkok: 'BANGKOK',
    tokyo: 'TOKYO',
    osaka: 'OSAKA',
    kyoto: 'KYOTO',
    seoul: 'SEOUL',
    taipei: 'TAIPEI',
    hochiminh: 'HO CHI MINH',
    bali: 'BALI',
  };

  // Calculate rank based on activity
  const rank = calculateRank(mission.stats);

  // Extract path coordinates from events
  const pathCoordinates: [number, number][] = mission.events
    .filter((e) => e.lng && e.lat)
    .map((e) => [e.lng!, e.lat!]);

  // Generate highlights
  const highlights: string[] = [];
  if (mission.stats.anchors_locked >= 10) {
    highlights.push('NAVIGATION EXPERT');
  }
  if (mission.stats.hazards_reported >= 3) {
    highlights.push('COMMUNITY GUARDIAN');
  }
  if (mission.stats.verifications_made >= 5) {
    highlights.push('INTEL VALIDATOR');
  }
  if (mission.stats.distance_km >= 10) {
    highlights.push('URBAN EXPLORER');
  }

  // Format dates
  const startDate = new Date(mission.started_at);
  const endDate = new Date(mission.ended_at || Date.now());
  const dates = `${formatDate(startDate)} - ${formatDate(endDate)}`;

  // Share text for social media
  const shareText = `MISSION COMPLETE: ${cityNames[mission.city] || mission.city.toUpperCase()}\n` +
    `📍 ${mission.stats.zones_visited} Zones Explored\n` +
    `🎯 ${mission.stats.anchors_locked} Anchors Locked\n` +
    `⚠️ ${mission.stats.hazards_reported} Hazards Reported\n` +
    `🏆 Rank: ${rank.name}\n\n` +
    `#UnmappedOS #TravelerNotTourist`;

  return {
    city: mission.city,
    cityDisplay: cityNames[mission.city] || mission.city.toUpperCase(),
    dates,
    stats: mission.stats,
    rank: rank.name,
    rankIcon: rank.icon,
    pathCoordinates,
    highlights,
    shareText,
  };
}

/**
 * Calculate operative rank based on stats
 */
function calculateRank(stats: MissionStats): { name: string; icon: string } {
  const score =
    stats.zones_visited * 10 +
    stats.anchors_locked * 20 +
    stats.hazards_reported * 30 +
    stats.comments_submitted * 15 +
    stats.verifications_made * 15 +
    stats.total_karma;

  if (score >= 1000) return { name: 'SHADOW COMMANDER', icon: '👁️' };
  if (score >= 500) return { name: 'FIELD OPERATIVE', icon: '🎖️' };
  if (score >= 200) return { name: 'ZONE SPECIALIST', icon: '🏅' };
  if (score >= 100) return { name: 'FIELD AGENT', icon: '⭐' };
  if (score >= 50) return { name: 'RECON SCOUT', icon: '🔍' };
  return { name: 'INITIATE', icon: '📍' };
}

/**
 * Generate animated video frames for mission log
 * Returns animation data that can be rendered with Canvas
 */
export interface MissionAnimationFrame {
  phase: 'intro' | 'map' | 'stats' | 'rank' | 'outro';
  duration: number; // seconds
  data: Record<string, any>;
}

export function generateAnimationFrames(summary: MissionSummary): MissionAnimationFrame[] {
  return [
    // Intro: "MISSION COMPLETE"
    {
      phase: 'intro',
      duration: 2,
      data: {
        text: 'MISSION COMPLETE',
        city: summary.cityDisplay,
      },
    },
    // Map trace animation
    {
      phase: 'map',
      duration: 6,
      data: {
        path: summary.pathCoordinates,
        zonesVisited: summary.stats.zones_visited,
      },
    },
    // Stats reveal
    {
      phase: 'stats',
      duration: 4,
      data: {
        anchors: summary.stats.anchors_locked,
        hazards: summary.stats.hazards_reported,
        distance: summary.stats.distance_km.toFixed(1),
        karma: summary.stats.total_karma,
      },
    },
    // Rank reveal
    {
      phase: 'rank',
      duration: 2,
      data: {
        rank: summary.rank,
        icon: summary.rankIcon,
        highlights: summary.highlights,
      },
    },
    // Outro: Branding
    {
      phase: 'outro',
      duration: 1,
      data: {
        brand: 'UNMAPPED OS',
        tagline: 'TRAVELER, NOT TOURIST',
      },
    },
  ];
}

/**
 * Render mission animation to canvas
 * This is the core video generation function
 */
export function renderMissionAnimation(
  canvas: HTMLCanvasElement,
  summary: MissionSummary,
  onComplete?: () => void
): (() => void) | undefined {
  const context = canvas.getContext('2d');
  if (!context) return undefined;

  // Non-null reference for use in nested functions
  const ctx = context;

  const frames = generateAnimationFrames(summary);
  let currentFrameIndex = 0;
  let frameStartTime = 0;
  let animationId: number;

  const colors = {
    bg: '#0a0a0a',
    neon: '#00ff88',
    accent: '#00b4d8',
    text: '#ffffff',
    muted: '#666666',
  };

  function drawFrame(timestamp: number) {
    if (!frameStartTime) frameStartTime = timestamp;
    const elapsed = (timestamp - frameStartTime) / 1000;

    const frame = frames[currentFrameIndex];
    if (elapsed >= frame.duration) {
      currentFrameIndex++;
      frameStartTime = timestamp;

      if (currentFrameIndex >= frames.length) {
        onComplete?.();
        return;
      }
    }

    const progress = elapsed / frame.duration;

    // Clear canvas
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw scanlines for CRT effect
    drawScanlines(ctx, canvas.width, canvas.height);

    // Render current phase
    switch (frames[currentFrameIndex].phase) {
      case 'intro':
        drawIntro(ctx, canvas, frames[currentFrameIndex].data, progress, colors);
        break;
      case 'map':
        drawMapTrace(ctx, canvas, frames[currentFrameIndex].data, progress, colors);
        break;
      case 'stats':
        drawStats(ctx, canvas, frames[currentFrameIndex].data, progress, colors);
        break;
      case 'rank':
        drawRank(ctx, canvas, frames[currentFrameIndex].data, progress, colors);
        break;
      case 'outro':
        drawOutro(ctx, canvas, frames[currentFrameIndex].data, progress, colors);
        break;
    }

    animationId = requestAnimationFrame(drawFrame);
  }

  animationId = requestAnimationFrame(drawFrame);

  // Return cleanup function
  return () => cancelAnimationFrame(animationId);
}

function drawScanlines(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
  for (let y = 0; y < height; y += 3) {
    ctx.fillRect(0, y, width, 1);
  }
}

function drawIntro(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  data: any,
  progress: number,
  colors: any
) {
  const alpha = Math.min(1, progress * 2);
  const glowIntensity = Math.sin(progress * Math.PI) * 20;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = colors.neon;
  ctx.shadowColor = colors.neon;
  ctx.shadowBlur = glowIntensity;

  // Main text
  ctx.font = 'bold 48px monospace';
  ctx.globalAlpha = alpha;
  ctx.fillText(data.text, canvas.width / 2, canvas.height / 2 - 30);

  // City name
  ctx.font = 'bold 72px monospace';
  ctx.fillText(data.city, canvas.width / 2, canvas.height / 2 + 60);

  ctx.restore();
}

function drawMapTrace(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  data: any,
  progress: number,
  colors: any
) {
  const path = data.path as [number, number][];
  if (path.length < 2) return;

  // Calculate bounds
  const lngs = path.map((p) => p[0]);
  const lats = path.map((p) => p[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const padding = 50;
  const scaleX = (canvas.width - padding * 2) / (maxLng - minLng || 1);
  const scaleY = (canvas.height - padding * 2) / (maxLat - minLat || 1);
  const scale = Math.min(scaleX, scaleY);

  function toCanvas(coord: [number, number]): [number, number] {
    return [
      padding + (coord[0] - minLng) * scale,
      canvas.height - padding - (coord[1] - minLat) * scale,
    ];
  }

  // Draw path progressively
  const pointsToShow = Math.floor(path.length * progress);

  ctx.save();
  ctx.strokeStyle = colors.neon;
  ctx.lineWidth = 3;
  ctx.shadowColor = colors.neon;
  ctx.shadowBlur = 15;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  const start = toCanvas(path[0]);
  ctx.moveTo(start[0], start[1]);

  for (let i = 1; i <= pointsToShow && i < path.length; i++) {
    const point = toCanvas(path[i]);
    ctx.lineTo(point[0], point[1]);
  }
  ctx.stroke();

  // Draw current position marker
  if (pointsToShow < path.length) {
    const current = toCanvas(path[pointsToShow]);
    ctx.beginPath();
    ctx.arc(current[0], current[1], 8, 0, Math.PI * 2);
    ctx.fillStyle = colors.accent;
    ctx.fill();
  }

  // Zone counter
  ctx.fillStyle = colors.text;
  ctx.font = '24px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`ZONES: ${Math.floor(data.zonesVisited * progress)}`, padding, 40);

  ctx.restore();
}

function drawStats(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  data: any,
  progress: number,
  colors: any
) {
  ctx.save();
  ctx.textAlign = 'center';

  const stats = [
    { label: '🎯 ANCHORS LOCKED', value: data.anchors },
    { label: '⚠️ HAZARDS REPORTED', value: data.hazards },
    { label: '📍 DISTANCE', value: `${data.distance} KM` },
    { label: '⭐ KARMA EARNED', value: data.karma },
  ];

  const startY = 100;
  const spacing = 80;

  stats.forEach((stat, i) => {
    const alpha = Math.min(1, (progress * 4 - i * 0.8));
    if (alpha <= 0) return;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = colors.muted;
    ctx.font = '20px monospace';
    ctx.fillText(stat.label, canvas.width / 2, startY + i * spacing);

    ctx.fillStyle = colors.neon;
    ctx.shadowColor = colors.neon;
    ctx.shadowBlur = 10;
    ctx.font = 'bold 36px monospace';
    ctx.fillText(String(stat.value), canvas.width / 2, startY + i * spacing + 40);
    ctx.shadowBlur = 0;
  });

  ctx.restore();
}

function drawRank(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  data: any,
  progress: number,
  colors: any
) {
  ctx.save();
  ctx.textAlign = 'center';

  const scale = 0.5 + progress * 0.5;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(scale, scale);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);

  ctx.globalAlpha = progress;

  // Icon
  ctx.font = '64px sans-serif';
  ctx.fillText(data.icon, canvas.width / 2, canvas.height / 2 - 40);

  // Rank name
  ctx.fillStyle = colors.neon;
  ctx.shadowColor = colors.neon;
  ctx.shadowBlur = 20;
  ctx.font = 'bold 48px monospace';
  ctx.fillText(data.rank, canvas.width / 2, canvas.height / 2 + 40);

  // Highlights
  ctx.shadowBlur = 0;
  ctx.fillStyle = colors.accent;
  ctx.font = '18px monospace';
  (data.highlights as string[]).forEach((h, i) => {
    ctx.fillText(h, canvas.width / 2, canvas.height / 2 + 90 + i * 25);
  });

  ctx.restore();
}

function drawOutro(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  data: any,
  progress: number,
  colors: any
) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.globalAlpha = 1 - progress;

  ctx.fillStyle = colors.neon;
  ctx.font = 'bold 36px monospace';
  ctx.fillText(data.brand, canvas.width / 2, canvas.height / 2 - 20);

  ctx.fillStyle = colors.muted;
  ctx.font = '18px monospace';
  ctx.fillText(data.tagline, canvas.width / 2, canvas.height / 2 + 20);

  ctx.restore();
}

// Utility functions
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Export mission video as WebM/GIF (using MediaRecorder)
 */
export async function exportMissionVideo(
  summary: MissionSummary
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920; // Instagram Stories aspect ratio

    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 5000000,
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve(blob);
    };
    mediaRecorder.onerror = reject;

    mediaRecorder.start();

    renderMissionAnimation(canvas, summary, () => {
      setTimeout(() => mediaRecorder.stop(), 500);
    });
  });
}
