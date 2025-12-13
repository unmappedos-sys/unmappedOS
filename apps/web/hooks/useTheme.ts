/**
 * useTheme Hook - Day Ops / Night Ops theme switcher
 * Implements ambient light detection (simulated on desktop) and manual toggle
 */

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'day' | 'night';

const THEME_STORAGE_KEY = 'unmapped_theme';
const AUTO_THEME_KEY = 'unmapped_auto_theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('night');
  const [autoTheme, setAutoTheme] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    const storedAuto = localStorage.getItem(AUTO_THEME_KEY) === 'true';

    if (storedTheme) {
      setTheme(storedTheme);
    }
    setAutoTheme(storedAuto);
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.remove('day-ops', 'night-ops');
    document.documentElement.classList.add(theme === 'day' ? 'day-ops' : 'night-ops');
  }, [theme]);

  // Ambient light sensor (simulated on desktop)
  useEffect(() => {
    if (!autoTheme || typeof window === 'undefined') return;

    // Try to use AmbientLightSensor API (Chrome only, limited support)
    if ('AmbientLightSensor' in window) {
      try {
        const sensor = new (window as any).AmbientLightSensor();
        sensor.addEventListener('reading', () => {
          const lux = sensor.illuminance;
          // Switch to day theme if > 50 lux, night theme if < 20 lux
          if (lux > 50 && theme === 'night') {
            setTheme('day');
          } else if (lux < 20 && theme === 'day') {
            setTheme('night');
          }
        });
        sensor.start();
        return () => sensor.stop();
      } catch (error) {
        console.warn('[Theme] AmbientLightSensor not available:', error);
      }
    }

    // Fallback: use time of day (06:00-18:00 = day, else night)
    const checkTimeOfDay = () => {
      const hour = new Date().getHours();
      const shouldBeDay = hour >= 6 && hour < 18;
      setTheme(shouldBeDay ? 'day' : 'night');
    };

    checkTimeOfDay();
    const interval = setInterval(checkTimeOfDay, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [autoTheme, theme]);

  // Toggle theme manually
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'day' ? 'night' : 'day';
    setTheme(newTheme);
    setAutoTheme(false); // Disable auto when manually toggling
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      localStorage.setItem(AUTO_THEME_KEY, 'false');
    }
  }, [theme]);

  // Toggle auto theme
  const toggleAutoTheme = useCallback(() => {
    const newAuto = !autoTheme;
    setAutoTheme(newAuto);
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTO_THEME_KEY, String(newAuto));
    }
  }, [autoTheme]);

  return {
    theme,
    autoTheme,
    toggleTheme,
    toggleAutoTheme,
  };
}
