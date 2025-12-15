export function formatHHMM(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function hoursSince(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const deltaMs = now.getTime() - t;
  if (deltaMs < 0) return 0;
  return deltaMs / (1000 * 60 * 60);
}

export function formatLastVerified(hours: number | null): string {
  if (hours === null) return 'UNVERIFIED';
  if (hours < 1) return 'UNDER 1h AGO';
  if (hours < 48) return `${Math.round(hours)}h AGO`;
  const days = Math.round(hours / 24);
  return `${days}d AGO`;
}
