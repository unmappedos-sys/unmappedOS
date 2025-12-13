/**
 * Crisis Mode System
 * 
 * Full-screen emergency UI with:
 * - Offline safe phrases
 * - Emergency contacts
 * - Power outage mode
 * - Shake gesture activation
 */

export interface CrisisConfig {
  city: string;
  emergency_police: string;
  emergency_ambulance: string;
  embassy_phone: string;
  safe_phrases: SafePhrase[];
  extraction_points: ExtractionPoint[];
}

export interface SafePhrase {
  id: string;
  situation: string;
  phrase_local: string;
  phrase_romanized: string;
  phrase_english: string;
}

export interface ExtractionPoint {
  id: string;
  name: string;
  type: 'hospital' | 'police' | 'embassy' | 'hotel' | 'transit';
  coordinates: { lat: number; lon: number };
  phone?: string;
  available_24h: boolean;
}

export type CrisisTrigger = 'manual' | 'shake' | 'low_battery' | 'sos_button' | 'auto';

// Default safe phrases (common across cities)
export const DEFAULT_SAFE_PHRASES: SafePhrase[] = [
  {
    id: 'help',
    situation: 'Need immediate help',
    phrase_local: '',
    phrase_romanized: 'Help!',
    phrase_english: 'Help!',
  },
  {
    id: 'police',
    situation: 'Call police',
    phrase_local: '',
    phrase_romanized: 'Please call the police',
    phrase_english: 'Please call the police',
  },
  {
    id: 'hospital',
    situation: 'Need hospital',
    phrase_local: '',
    phrase_romanized: 'I need a hospital',
    phrase_english: 'I need a hospital',
  },
  {
    id: 'embassy',
    situation: 'Contact embassy',
    phrase_local: '',
    phrase_romanized: 'I need to contact my embassy',
    phrase_english: 'I need to contact my embassy',
  },
  {
    id: 'lost',
    situation: 'I am lost',
    phrase_local: '',
    phrase_romanized: 'I am lost',
    phrase_english: 'I am lost',
  },
];

// City-specific phrases
export const CITY_PHRASES: Record<string, SafePhrase[]> = {
  bangkok: [
    {
      id: 'help',
      situation: 'Need immediate help',
      phrase_local: 'ช่วยด้วย!',
      phrase_romanized: 'Chuay duay!',
      phrase_english: 'Help!',
    },
    {
      id: 'police',
      situation: 'Call police',
      phrase_local: 'โทรตำรวจ',
      phrase_romanized: 'Tho tam-ruat',
      phrase_english: 'Call the police',
    },
    {
      id: 'hospital',
      situation: 'Need hospital',
      phrase_local: 'ต้องการโรงพยาบาล',
      phrase_romanized: 'Tong gaan rohng pa-ya-baan',
      phrase_english: 'I need a hospital',
    },
    {
      id: 'taxi_airport',
      situation: 'Go to airport',
      phrase_local: 'ไปสนามบิน',
      phrase_romanized: 'Pai sa-naam bin',
      phrase_english: 'Go to the airport',
    },
    {
      id: 'not_interested',
      situation: 'Not interested (touts)',
      phrase_local: 'ไม่เอา ขอบคุณ',
      phrase_romanized: 'Mai ao, khob khun',
      phrase_english: 'No thank you',
    },
  ],
  tokyo: [
    {
      id: 'help',
      situation: 'Need immediate help',
      phrase_local: '助けて!',
      phrase_romanized: 'Tasukete!',
      phrase_english: 'Help!',
    },
    {
      id: 'police',
      situation: 'Call police',
      phrase_local: '警察を呼んでください',
      phrase_romanized: 'Keisatsu wo yonde kudasai',
      phrase_english: 'Please call the police',
    },
    {
      id: 'hospital',
      situation: 'Need hospital',
      phrase_local: '病院に行きたい',
      phrase_romanized: 'Byouin ni ikitai',
      phrase_english: 'I want to go to a hospital',
    },
    {
      id: 'taxi_airport',
      situation: 'Go to airport',
      phrase_local: '空港まで',
      phrase_romanized: 'Kuukou made',
      phrase_english: 'To the airport',
    },
    {
      id: 'lost',
      situation: 'I am lost',
      phrase_local: '道に迷いました',
      phrase_romanized: 'Michi ni mayoimashita',
      phrase_english: 'I am lost',
    },
  ],
};

// Emergency contacts by city
export const EMERGENCY_CONTACTS: Record<string, { police: string; ambulance: string; embassy?: string }> = {
  bangkok: {
    police: '191',
    ambulance: '1669',
    embassy: '+66-2-205-4000', // US Embassy
  },
  tokyo: {
    police: '110',
    ambulance: '119',
    embassy: '+81-3-3224-5000', // US Embassy
  },
  default: {
    police: '112',
    ambulance: '112',
  },
};

/**
 * Get crisis configuration for a city
 */
export function getCrisisConfig(city: string): CrisisConfig {
  const cityLower = city.toLowerCase();
  const contacts = EMERGENCY_CONTACTS[cityLower] || EMERGENCY_CONTACTS.default;
  const phrases = CITY_PHRASES[cityLower] || DEFAULT_SAFE_PHRASES;

  return {
    city,
    emergency_police: contacts.police,
    emergency_ambulance: contacts.ambulance,
    embassy_phone: contacts.embassy || '',
    safe_phrases: phrases,
    extraction_points: [], // Would be loaded from city pack
  };
}

/**
 * Check if crisis mode should auto-activate
 */
export function shouldActivateCrisis(conditions: {
  batteryLevel: number;
  vitalityLevel: number;
  hasRecentSOS: boolean;
}): { activate: boolean; trigger: CrisisTrigger | null; reason: string } {
  if (conditions.batteryLevel < 5) {
    return {
      activate: true,
      trigger: 'low_battery',
      reason: 'CRITICAL BATTERY // CRISIS MODE RECOMMENDED',
    };
  }

  if (conditions.vitalityLevel < 10) {
    return {
      activate: true,
      trigger: 'auto',
      reason: 'LOW VITALITY DETECTED // SAFETY PROTOCOLS ENGAGED',
    };
  }

  if (conditions.hasRecentSOS) {
    return {
      activate: true,
      trigger: 'sos_button',
      reason: 'SOS TRIGGERED // EMERGENCY SYSTEMS ACTIVE',
    };
  }

  return { activate: false, trigger: null, reason: '' };
}

/**
 * Detect shake gesture (for crisis activation)
 */
export function createShakeDetector(
  onShake: () => void,
  threshold: number = 15,
  timeout: number = 1000
): () => void {
  if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
    return () => {};
  }

  let lastX = 0;
  let lastY = 0;
  let lastZ = 0;
  let lastTime = Date.now();
  let shakeCount = 0;

  const handleMotion = (event: DeviceMotionEvent) => {
    const { accelerationIncludingGravity } = event;
    if (!accelerationIncludingGravity) return;

    const { x, y, z } = accelerationIncludingGravity;
    if (x === null || y === null || z === null) return;

    const currentTime = Date.now();
    const timeDiff = currentTime - lastTime;

    if (timeDiff > 100) {
      const deltaX = Math.abs(x - lastX);
      const deltaY = Math.abs(y - lastY);
      const deltaZ = Math.abs(z - lastZ);

      if (deltaX + deltaY + deltaZ > threshold) {
        shakeCount++;

        // Require 3 shakes within timeout period
        if (shakeCount >= 3) {
          onShake();
          shakeCount = 0;
        }

        // Reset count after timeout
        setTimeout(() => {
          shakeCount = Math.max(0, shakeCount - 1);
        }, timeout);
      }

      lastX = x;
      lastY = y;
      lastZ = z;
      lastTime = currentTime;
    }
  };

  window.addEventListener('devicemotion', handleMotion);

  return () => {
    window.removeEventListener('devicemotion', handleMotion);
  };
}

/**
 * Power outage mode - minimal UI for low battery
 */
export interface PowerOutageConfig {
  backgroundColor: string;
  textColor: string;
  showMap: boolean;
  showTime: boolean;
  fontSize: 'large' | 'xlarge';
  refreshInterval: number;
}

export const POWER_OUTAGE_CONFIG: PowerOutageConfig = {
  backgroundColor: '#000000',
  textColor: '#00ff00',
  showMap: false,
  showTime: true,
  fontSize: 'xlarge',
  refreshInterval: 60000, // 1 minute
};

/**
 * Get a random safe phrase for a city
 */
export function getSafePhrase(city: string): string {
  const cityLower = city.toLowerCase();
  const phrases = CITY_PHRASES[cityLower] || DEFAULT_SAFE_PHRASES;
  const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
  return randomPhrase.phrase_local || randomPhrase.phrase_english;
}

/**
 * Known safe phrases by city for validation
 */
const KNOWN_SAFE_PHRASES: Record<string, string[]> = {
  bangkok: ['ไม่เป็นไร', 'ขอโทษครับ', 'ขอโทษค่ะ', 'ไม่เข้าใจ', 'ช่วยด้วย'],
  tokyo: ['大丈夫です', 'すみません', '分かりません', '助けて'],
};

/**
 * Validate if a phrase is a known safe phrase for a city
 */
export function validateSafePhrase(city: string, phrase: string): boolean {
  const cityLower = city.toLowerCase();
  const knownPhrases = KNOWN_SAFE_PHRASES[cityLower] || [];
  return knownPhrases.includes(phrase);
}

interface AccelerationEvent {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

/**
 * Detect shake gesture from acceleration events
 */
export function detectShakeGesture(
  events: AccelerationEvent[],
  threshold: number = 12
): boolean {
  if (events.length < 3) {
    return false;
  }

  let shakeCount = 0;

  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1];
    const curr = events[i];

    const deltaX = Math.abs(curr.x - prev.x);
    const deltaY = Math.abs(curr.y - prev.y);
    const deltaZ = Math.abs(curr.z - prev.z);

    const totalDelta = deltaX + deltaY + deltaZ;

    if (totalDelta > threshold) {
      shakeCount++;
    }
  }

  // Require at least 2 shake movements
  return shakeCount >= 2;
}
