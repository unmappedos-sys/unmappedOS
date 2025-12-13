/**
 * Sonic Camouflage System
 * 
 * Generative ambient soundscapes using Web Audio API.
 * Creates immersive audio based on zone texture type.
 * 
 * SILENCE → White noise, wind, distant temple bells
 * ANALOG → Lo-fi crackle, cafe ambience, vinyl warmth
 * NEON → Deep synth bass, cyberpunk pulse, neon hum
 * CHAOS → Layered chaos, urban cacophony, tension
 * 
 * No heavy MP3 downloads - pure client-side synthesis.
 */

export type TextureType = 'SILENCE' | 'ANALOG' | 'NEON' | 'CHAOS';

// Type alias for hooks/components
export type ZoneTexture = TextureType;

// All available zone textures
export const ZONE_TEXTURES: readonly TextureType[] = ['SILENCE', 'ANALOG', 'NEON', 'CHAOS'] as const;

interface SoundscapeConfig {
  masterVolume: number;
  crossfadeDuration: number; // seconds
  layers: SoundLayer[];
}

interface SoundLayer {
  type: 'noise' | 'oscillator' | 'bells' | 'crackle' | 'pulse';
  frequency?: number;
  detune?: number;
  gain: number;
  filter?: {
    type: BiquadFilterType;
    frequency: number;
    Q?: number;
  };
  lfo?: {
    frequency: number;
    depth: number;
  };
}

// Soundscape configurations per texture
const SOUNDSCAPES: Record<TextureType, SoundscapeConfig> = {
  SILENCE: {
    masterVolume: 0.3,
    crossfadeDuration: 3,
    layers: [
      // Soft white noise (wind)
      {
        type: 'noise',
        gain: 0.15,
        filter: { type: 'lowpass', frequency: 800, Q: 0.5 },
      },
      // Distant bells (occasional)
      {
        type: 'bells',
        frequency: 523.25, // C5
        gain: 0.08,
      },
      // Sub-bass drone (grounding)
      {
        type: 'oscillator',
        frequency: 60,
        gain: 0.1,
        filter: { type: 'lowpass', frequency: 100 },
      },
    ],
  },
  ANALOG: {
    masterVolume: 0.25,
    crossfadeDuration: 2,
    layers: [
      // Vinyl crackle
      {
        type: 'crackle',
        gain: 0.12,
        filter: { type: 'highpass', frequency: 2000 },
      },
      // Warm bass hum (cafe ambience)
      {
        type: 'oscillator',
        frequency: 110,
        gain: 0.08,
        filter: { type: 'lowpass', frequency: 200 },
        lfo: { frequency: 0.1, depth: 5 },
      },
      // Soft pink noise (room tone)
      {
        type: 'noise',
        gain: 0.1,
        filter: { type: 'bandpass', frequency: 400, Q: 0.3 },
      },
    ],
  },
  NEON: {
    masterVolume: 0.35,
    crossfadeDuration: 2,
    layers: [
      // Deep synth bass (cyberpunk pulse)
      {
        type: 'oscillator',
        frequency: 55, // A1
        gain: 0.2,
        filter: { type: 'lowpass', frequency: 150 },
        lfo: { frequency: 0.25, depth: 10 },
      },
      // Neon hum (electric buzz)
      {
        type: 'oscillator',
        frequency: 120, // Power line frequency
        detune: 1200,
        gain: 0.05,
        filter: { type: 'bandpass', frequency: 2000, Q: 10 },
      },
      // Rhythmic pulse
      {
        type: 'pulse',
        frequency: 0.5, // BPM-style pulse
        gain: 0.15,
      },
    ],
  },
  CHAOS: {
    masterVolume: 0.3,
    crossfadeDuration: 1.5,
    layers: [
      // Urban noise bed
      {
        type: 'noise',
        gain: 0.2,
        filter: { type: 'bandpass', frequency: 1000, Q: 0.5 },
      },
      // Tension drone
      {
        type: 'oscillator',
        frequency: 73.42, // D2
        gain: 0.15,
        filter: { type: 'lowpass', frequency: 200 },
        lfo: { frequency: 0.3, depth: 20 },
      },
      // Dissonant overtone
      {
        type: 'oscillator',
        frequency: 77.78, // Slightly off D#2
        gain: 0.08,
        filter: { type: 'lowpass', frequency: 300 },
      },
      // High frequency tension
      {
        type: 'oscillator',
        frequency: 3000,
        gain: 0.02,
        filter: { type: 'highpass', frequency: 2500 },
        lfo: { frequency: 8, depth: 200 },
      },
    ],
  },
};

class SonicCamouflage {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: AudioNode[] = [];
  private currentTexture: TextureType | null = null;
  private isPlaying = false;
  private bellInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the audio context
   */
  async init(): Promise<boolean> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0;
      
      console.log('[SONIC] Audio context initialized');
      return true;
    } catch (error) {
      console.error('[SONIC] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Start playing soundscape for a texture
   */
  async play(texture: TextureType): Promise<void> {
    if (!this.audioContext || !this.masterGain) {
      const initialized = await this.init();
      if (!initialized) return;
    }

    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext!.state === 'suspended') {
      await this.audioContext!.resume();
    }

    const config = SOUNDSCAPES[texture];
    const ctx = this.audioContext!;

    // If same texture, do nothing
    if (this.currentTexture === texture && this.isPlaying) {
      return;
    }

    // Crossfade from current soundscape
    if (this.isPlaying) {
      await this.performCrossfade(texture);
      return;
    }

    // Build new soundscape
    this.buildSoundscape(texture, config);

    // Fade in
    this.masterGain!.gain.setValueAtTime(0, ctx.currentTime);
    this.masterGain!.gain.linearRampToValueAtTime(
      config.masterVolume,
      ctx.currentTime + config.crossfadeDuration
    );

    this.currentTexture = texture;
    this.isPlaying = true;
    console.log(`[SONIC] Playing ${texture} soundscape`);
  }

  /**
   * Build the soundscape from layers
   */
  private buildSoundscape(texture: TextureType, config: SoundscapeConfig): void {
    const ctx = this.audioContext!;

    config.layers.forEach((layer) => {
      switch (layer.type) {
        case 'noise':
          this.createNoiseLayer(layer);
          break;
        case 'oscillator':
          this.createOscillatorLayer(layer);
          break;
        case 'bells':
          this.createBellsLayer(layer, texture);
          break;
        case 'crackle':
          this.createCrackleLayer(layer);
          break;
        case 'pulse':
          this.createPulseLayer(layer);
          break;
      }
    });
  }

  /**
   * Create white/pink noise layer
   */
  private createNoiseLayer(layer: SoundLayer): void {
    const ctx = this.audioContext!;
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Generate white noise
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const gain = ctx.createGain();
    gain.gain.value = layer.gain;

    if (layer.filter) {
      const filter = ctx.createBiquadFilter();
      filter.type = layer.filter.type;
      filter.frequency.value = layer.filter.frequency;
      if (layer.filter.Q) filter.Q.value = layer.filter.Q;

      noise.connect(filter);
      filter.connect(gain);
      this.activeNodes.push(filter);
    } else {
      noise.connect(gain);
    }

    gain.connect(this.masterGain!);
    noise.start();

    this.activeNodes.push(noise, gain);
  }

  /**
   * Create oscillator layer (bass, drones)
   */
  private createOscillatorLayer(layer: SoundLayer): void {
    const ctx = this.audioContext!;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = layer.frequency || 110;
    if (layer.detune) osc.detune.value = layer.detune;

    const gain = ctx.createGain();
    gain.gain.value = layer.gain;

    // Add LFO modulation
    if (layer.lfo) {
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = layer.lfo.frequency;

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = layer.lfo.depth;

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      this.activeNodes.push(lfo, lfoGain);
    }

    if (layer.filter) {
      const filter = ctx.createBiquadFilter();
      filter.type = layer.filter.type;
      filter.frequency.value = layer.filter.frequency;
      if (layer.filter.Q) filter.Q.value = layer.filter.Q;

      osc.connect(filter);
      filter.connect(gain);
      this.activeNodes.push(filter);
    } else {
      osc.connect(gain);
    }

    gain.connect(this.masterGain!);
    osc.start();

    this.activeNodes.push(osc, gain);
  }

  /**
   * Create temple bells layer (SILENCE zones)
   */
  private createBellsLayer(layer: SoundLayer, texture: TextureType): void {
    if (texture !== 'SILENCE') return;

    const ctx = this.audioContext!;

    // Schedule random bell strikes
    const playBell = () => {
      if (!this.isPlaying || this.currentTexture !== 'SILENCE') return;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = layer.frequency || 523.25;

      // Add harmonics
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = (layer.frequency || 523.25) * 2.4;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(layer.gain, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain!);

      osc.start();
      osc2.start();
      osc.stop(ctx.currentTime + 4);
      osc2.stop(ctx.currentTime + 4);
    };

    // Random interval between 8-20 seconds
    const scheduleNext = () => {
      const delay = 8000 + Math.random() * 12000;
      this.bellInterval = setTimeout(() => {
        playBell();
        scheduleNext();
      }, delay);
    };

    // First bell after 5 seconds
    setTimeout(playBell, 5000);
    scheduleNext();
  }

  /**
   * Create vinyl crackle layer (ANALOG zones)
   */
  private createCrackleLayer(layer: SoundLayer): void {
    const ctx = this.audioContext!;

    // Create crackle using noise bursts
    const createCrackle = () => {
      if (!this.isPlaying) return;

      const bufferSize = ctx.sampleRate * 0.02; // 20ms burst
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Sparse impulses
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() > 0.97 ? (Math.random() * 2 - 1) * 0.5 : 0;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gain = ctx.createGain();
      gain.gain.value = layer.gain;

      if (layer.filter) {
        const filter = ctx.createBiquadFilter();
        filter.type = layer.filter.type;
        filter.frequency.value = layer.filter.frequency;

        source.connect(filter);
        filter.connect(gain);
      } else {
        source.connect(gain);
      }

      gain.connect(this.masterGain!);
      source.start();

      // Schedule next crackle
      setTimeout(createCrackle, 30 + Math.random() * 100);
    };

    createCrackle();
  }

  /**
   * Create rhythmic pulse layer (NEON zones)
   */
  private createPulseLayer(layer: SoundLayer): void {
    const ctx = this.audioContext!;

    const createPulse = () => {
      if (!this.isPlaying || this.currentTexture !== 'NEON') return;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 55; // Low A

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(layer.gain, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);

      // Schedule next pulse (2 second interval = 30 BPM feel)
      setTimeout(createPulse, 2000);
    };

    createPulse();
  }

  /**
   * Crossfade to new texture (internal implementation)
   */
  private async performCrossfade(newTexture: TextureType): Promise<void> {
    const ctx = this.audioContext!;
    const oldConfig = SOUNDSCAPES[this.currentTexture!];
    const newConfig = SOUNDSCAPES[newTexture];

    // Fade out current
    this.masterGain!.gain.linearRampToValueAtTime(
      0,
      ctx.currentTime + oldConfig.crossfadeDuration
    );

    // Wait for fade out
    await new Promise((resolve) =>
      setTimeout(resolve, oldConfig.crossfadeDuration * 1000)
    );

    // Stop old nodes
    this.stopAllNodes();

    // Build new soundscape
    this.buildSoundscape(newTexture, newConfig);

    // Fade in new
    this.masterGain!.gain.setValueAtTime(0, ctx.currentTime);
    this.masterGain!.gain.linearRampToValueAtTime(
      newConfig.masterVolume,
      ctx.currentTime + newConfig.crossfadeDuration
    );

    this.currentTexture = newTexture;
    console.log(`[SONIC] Crossfaded to ${newTexture}`);
  }

  /**
   * Stop all active nodes
   */
  private stopAllNodes(): void {
    this.activeNodes.forEach((node) => {
      try {
        if (node instanceof AudioScheduledSourceNode) {
          node.stop();
        }
        node.disconnect();
      } catch (e) {
        // Node may already be stopped
      }
    });
    this.activeNodes = [];

    if (this.bellInterval) {
      clearTimeout(this.bellInterval);
      this.bellInterval = null;
    }
  }

  /**
   * Stop playing
   */
  async stop(): Promise<void> {
    if (!this.audioContext || !this.isPlaying) return;

    const ctx = this.audioContext;

    // Fade out
    this.masterGain!.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    this.stopAllNodes();
    this.currentTexture = null;
    this.isPlaying = false;

    console.log('[SONIC] Stopped');
  }

  /**
   * Set master volume (0-1)
   */
  setVolume(volume: number): void {
    if (!this.masterGain) return;

    const clampedVolume = Math.max(0, Math.min(1, volume));
    const config = this.currentTexture ? SOUNDSCAPES[this.currentTexture] : null;
    const targetVolume = config ? config.masterVolume * clampedVolume : clampedVolume;

    this.masterGain.gain.linearRampToValueAtTime(
      targetVolume,
      this.audioContext!.currentTime + 0.1
    );
  }

  /**
   * Public crossfade to a new texture (wrapper for private method)
   */
  crossfadeTo(texture: TextureType): void {
    if (this.isPlaying && this.currentTexture !== texture) {
      this.performCrossfade(texture);
    } else if (!this.isPlaying) {
      this.play(texture);
    }
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get current texture
   */
  getCurrentTexture(): TextureType | null {
    return this.currentTexture;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Singleton instance
let instance: SonicCamouflage | null = null;

export function getSonicCamouflage(): SonicCamouflage {
  if (!instance) {
    instance = new SonicCamouflage();
  }
  return instance;
}

export { SonicCamouflage };
