export type BatteryState = {
  supported: boolean;
  level: number | null; // 0..1
  charging: boolean | null;
};

export async function getBatteryState(): Promise<BatteryState> {
  // Battery Status API is not supported in many browsers.
  const nav = navigator as unknown as { getBattery?: () => Promise<any> };
  if (!nav.getBattery) return { supported: false, level: null, charging: null };

  try {
    const b = await nav.getBattery();
    return {
      supported: true,
      level: typeof b.level === 'number' ? b.level : null,
      charging: typeof b.charging === 'boolean' ? b.charging : null,
    };
  } catch {
    return { supported: false, level: null, charging: null };
  }
}
