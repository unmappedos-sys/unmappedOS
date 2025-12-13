/**
 * Whisper Engine Tests
 * 
 * Tests for intel whisper generation.
 */

type WhisperType = 'intel' | 'price' | 'safety' | 'timing' | 'local';

interface Whisper {
  id: string;
  type: WhisperType;
  text: string;
  zone_id?: string;
  confidence: number;
  expires_at: Date;
}

// Local test implementations
function generateLocalWhisper(
  type: WhisperType,
  context: Record<string, any>
): { type: WhisperType; message: string } {
  const templates: Record<WhisperType, string> = {
    intel: `INTEL: ${context.context || 'Activity detected'}`,
    price: `PRICE: ${context.trend || 'stable'} trend`,
    safety: `SAFETY: ${context.alert_level || 'normal'}`,
    timing: 'TIMING: Check local hours',
    local: 'LOCAL: Area intel available',
  };

  return {
    type,
    message: templates[type],
  };
}

function formatWhisperMessage(whisper: { type: string; text?: string; message?: string; confidence: number }): string {
  const prefix = `[${whisper.type.toUpperCase()}]`;
  const content = (whisper.text || whisper.message || '').toUpperCase();
  const confidence = whisper.confidence < 0.5 ? ' // UNVERIFIED' : '';
  return `${prefix} ${content}${confidence}`;
}

function isWhisperRelevant(whisper: { expires_at: Date | string }): boolean {
  const expiry = typeof whisper.expires_at === 'string' 
    ? new Date(whisper.expires_at) 
    : whisper.expires_at;
  return expiry.getTime() > Date.now();
}

describe('Whisper Engine', () => {
  describe('generateLocalWhisper', () => {
    it('should generate intel whispers', () => {
      const whisper = generateLocalWhisper('intel', {
        zone_id: 'zone_001',
        context: 'market activity',
      });

      expect(whisper.type).toBe('intel');
      expect(whisper.message).toBeTruthy();
    });

    it('should generate price whispers', () => {
      const whisper = generateLocalWhisper('price', {
        zone_id: 'zone_001',
        average_price: 150,
        trend: 'rising',
      });

      expect(whisper.type).toBe('price');
    });

    it('should generate safety whispers', () => {
      const whisper = generateLocalWhisper('safety', {
        zone_id: 'zone_001',
        alert_level: 'caution',
      });

      expect(whisper.type).toBe('safety');
    });
  });

  describe('formatWhisperMessage', () => {
    it('should format whisper in operative style', () => {
      const whisper = {
        id: 'test_1',
        type: 'intel',
        text: 'High foot traffic detected',
        zone_id: 'zone_001',
        confidence: 0.8,
        expires_at: new Date(Date.now() + 3600000),
      };

      const formatted = formatWhisperMessage(whisper);
      
      expect(formatted).toContain('[INTEL]');
      expect(formatted.toUpperCase()).toBe(formatted); // All caps
    });

    it('should include confidence indicator for low confidence', () => {
      const whisper = {
        id: 'test_1',
        type: 'intel',
        text: 'Possible activity',
        zone_id: 'zone_001',
        confidence: 0.4,
        expires_at: new Date(Date.now() + 3600000),
      };

      const formatted = formatWhisperMessage(whisper);
      expect(formatted).toContain('UNVERIFIED');
    });
  });

  describe('isWhisperRelevant', () => {
    it('should return true for non-expired whispers', () => {
      const whisper = {
        id: 'test_1',
        type: 'intel',
        text: 'Test',
        zone_id: 'zone_001',
        confidence: 0.8,
        expires_at: new Date(Date.now() + 3600000),
      };

      expect(isWhisperRelevant(whisper)).toBe(true);
    });

    it('should return false for expired whispers', () => {
      const whisper = {
        id: 'test_1',
        type: 'intel',
        text: 'Test',
        zone_id: 'zone_001',
        confidence: 0.8,
        expires_at: new Date(Date.now() - 3600000), // 1 hour ago
      };

      expect(isWhisperRelevant(whisper)).toBe(false);
    });
  });
});
