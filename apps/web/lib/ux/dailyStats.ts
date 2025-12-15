type DailyStats = {
  dateKey: string; // YYYY-MM-DD
  city: string;
  zonesExplored: number;
  anchorsReached: number;
  overpaymentsAvoided: number;
  lastUpdatedAt: string;
};

const KEY = 'unmappedos_daily_stats_v1';

function todayKey(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function loadDailyStats(city: string, now: Date = new Date()): DailyStats {
  const key = todayKey(now);
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return {
        dateKey: key,
        city,
        zonesExplored: 0,
        anchorsReached: 0,
        overpaymentsAvoided: 0,
        lastUpdatedAt: now.toISOString(),
      };
    }

    const parsed = JSON.parse(raw) as Partial<DailyStats>;
    if (parsed.dateKey !== key) {
      return {
        dateKey: key,
        city,
        zonesExplored: 0,
        anchorsReached: 0,
        overpaymentsAvoided: 0,
        lastUpdatedAt: now.toISOString(),
      };
    }

    return {
      dateKey: key,
      city: parsed.city || city,
      zonesExplored: Number(parsed.zonesExplored || 0),
      anchorsReached: Number(parsed.anchorsReached || 0),
      overpaymentsAvoided: Number(parsed.overpaymentsAvoided || 0),
      lastUpdatedAt: parsed.lastUpdatedAt || now.toISOString(),
    };
  } catch {
    return {
      dateKey: key,
      city,
      zonesExplored: 0,
      anchorsReached: 0,
      overpaymentsAvoided: 0,
      lastUpdatedAt: now.toISOString(),
    };
  }
}

export function saveDailyStats(stats: DailyStats): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

export function bumpZonesExplored(city: string): DailyStats {
  const now = new Date();
  const s = loadDailyStats(city, now);
  const next: DailyStats = {
    ...s,
    city,
    zonesExplored: s.zonesExplored + 1,
    lastUpdatedAt: now.toISOString(),
  };
  saveDailyStats(next);
  return next;
}

export function bumpAnchorsReached(city: string): DailyStats {
  const now = new Date();
  const s = loadDailyStats(city, now);
  const next: DailyStats = {
    ...s,
    city,
    anchorsReached: s.anchorsReached + 1,
    lastUpdatedAt: now.toISOString(),
  };
  saveDailyStats(next);
  return next;
}

export function bumpOverpaymentsAvoided(city: string): DailyStats {
  const now = new Date();
  const s = loadDailyStats(city, now);
  const next: DailyStats = {
    ...s,
    city,
    overpaymentsAvoided: s.overpaymentsAvoided + 1,
    lastUpdatedAt: now.toISOString(),
  };
  saveDailyStats(next);
  return next;
}
