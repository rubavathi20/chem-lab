// ─── Audio System for Lab Sounds ──────────────────────────────────────────

type SoundType =
  | 'pouring'
  | 'drop'
  | 'glass_clink'
  | 'glass_scrape'
  | 'bunsen_ignite'
  | 'bunsen_flame'
  | 'bubbles'
  | 'gas_hiss'
  | 'splash'
  | 'beaker_place'
  | 'cap_open'
  | 'cap_close'
  | 'stir'
  | 'success'
  | 'warning';

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  harmonics?: { freq: number; gain: number }[];
  noise?: { type: 'white' | 'pink' | 'brown'; amount: number };
}

const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
  pouring: {
    frequency: 200,
    duration: 1.5,
    type: 'sine',
    envelope: { attack: 0.1, decay: 0.3, sustain: 0.6, release: 0.5 },
    noise: { type: 'pink', amount: 0.3 },
  },
  drop: {
    frequency: 800,
    duration: 0.15,
    type: 'sine',
    envelope: { attack: 0.01, decay: 0.05, sustain: 0, release: 0.09 },
  },
  glass_clink: {
    frequency: 2000,
    duration: 0.3,
    type: 'sine',
    envelope: { attack: 0.001, decay: 0.1, sustain: 0.3, release: 0.2 },
    harmonics: [
      { freq: 4000, gain: 0.5 },
      { freq: 6000, gain: 0.25 },
    ],
  },
  glass_scrape: {
    frequency: 1500,
    duration: 0.4,
    type: 'sawtooth',
    envelope: { attack: 0.05, decay: 0.1, sustain: 0.3, release: 0.2 },
    noise: { type: 'white', amount: 0.2 },
  },
  bunsen_ignite: {
    frequency: 100,
    duration: 0.5,
    type: 'sawtooth',
    envelope: { attack: 0.05, decay: 0.15, sustain: 0.5, release: 0.2 },
    noise: { type: 'pink', amount: 0.4 },
  },
  bunsen_flame: {
    frequency: 80,
    duration: 2.0,
    type: 'sawtooth',
    envelope: { attack: 0.3, decay: 0.2, sustain: 0.7, release: 0.5 },
    noise: { type: 'pink', amount: 0.35 },
    harmonics: [
      { freq: 160, gain: 0.3 },
      { freq: 240, gain: 0.15 },
    ],
  },
  bubbles: {
    frequency: 400,
    duration: 0.8,
    type: 'sine',
    envelope: { attack: 0.1, decay: 0.3, sustain: 0.4, release: 0.2 },
    harmonics: [
      { freq: 600, gain: 0.3 },
      { freq: 800, gain: 0.2 },
    ],
  },
  gas_hiss: {
    frequency: 300,
    duration: 1.0,
    type: 'sawtooth',
    envelope: { attack: 0.1, decay: 0.3, sustain: 0.5, release: 0.3 },
    noise: { type: 'white', amount: 0.6 },
  },
  splash: {
    frequency: 150,
    duration: 0.6,
    type: 'sine',
    envelope: { attack: 0.02, decay: 0.2, sustain: 0.3, release: 0.3 },
    noise: { type: 'pink', amount: 0.5 },
  },
  beaker_place: {
    frequency: 300,
    duration: 0.2,
    type: 'sine',
    envelope: { attack: 0.01, decay: 0.05, sustain: 0.2, release: 0.1 },
    harmonics: [
      { freq: 600, gain: 0.3 },
      { freq: 900, gain: 0.15 },
    ],
  },
  cap_open: {
    frequency: 500,
    duration: 0.25,
    type: 'square',
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.1 },
    noise: { type: 'white', amount: 0.2 },
  },
  cap_close: {
    frequency: 400,
    duration: 0.2,
    type: 'square',
    envelope: { attack: 0.01, decay: 0.08, sustain: 0.2, release: 0.08 },
  },
  stir: {
    frequency: 100,
    duration: 0.8,
    type: 'sine',
    envelope: { attack: 0.2, decay: 0.3, sustain: 0.4, release: 0.3 },
    noise: { type: 'pink', amount: 0.2 },
  },
  success: {
    frequency: 523.25, // C5
    duration: 0.4,
    type: 'sine',
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.2 },
    harmonics: [
      { freq: 659.25, gain: 0.6 }, // E5
      { freq: 783.99, gain: 0.4 }, // G5
    ],
  },
  warning: {
    frequency: 440,
    duration: 0.6,
    type: 'square',
    envelope: { attack: 0.05, decay: 0.15, sustain: 0.6, release: 0.2 },
  },
};

// ─── Audio Context Manager ──────────────────────────────────────────────────

class LabAudioSystem {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled: boolean = true;
  private volume: number = 0.7;
  private activeSounds: Map<string, { stop: () => void }> = new Map();

  async init(): Promise<void> {
    if (this.context) return;

    try {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.context.destination);
    } catch (err) {
      console.warn('Web Audio API not available:', err);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  resume(): void {
    this.context?.resume();
  }

  suspend(): void {
    this.context?.suspend();
  }

  // ─── Generate noise buffer ───────────────────────────────────────────────
  private createNoiseBuffer(type: 'white' | 'pink' | 'brown', duration: number): AudioBuffer {
    if (!this.context) throw new Error('Audio context not initialized');

    const sampleRate = this.context.sampleRate;
    const length = duration * sampleRate;
    const buffer = this.context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } else if (type === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    } else { // brown
      let lastOut = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }
    }

    return buffer;
  }

  // ─── Play sound effect ∑═════════════════════════════════════════════════
  play(soundType: SoundType, options?: { volume?: number; pitch?: number; loop?: boolean }): () => void {
    if (!this.enabled || !this.context || !this.masterGain) return () => {};

    const config = SOUND_CONFIGS[soundType];
    if (!config) return () => {};

    const volumeOverride = options?.volume ?? 1;
    const pitchShift = options?.pitch ?? 1;
    const loop = options?.loop ?? false;

    const now = this.context.currentTime;
    const duration = config.duration;

    // Create gain node for envelope
    const gainNode = this.context.createGain();
    gainNode.connect(this.masterGain);

    // Apply ADSR envelope
    const { attack, decay, sustain, release } = config.envelope;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volumeOverride, now + attack);
    gainNode.gain.linearRampToValueAtTime(sustain * volumeOverride, now + attack + decay);
    if (!loop) {
      gainNode.gain.linearRampToValueAtTime(0, now + duration);
    }

    // Create oscillator for main tone
    const osc = this.context.createOscillator();
    osc.type = config.type;
    osc.frequency.value = config.frequency * pitchShift;
    osc.connect(gainNode);

    // Start oscillator
    osc.start(now);
    if (!loop) {
      osc.stop(now + duration + release);
    }

    // Create noise if specified
    let noiseSource: AudioBufferSourceNode | null = null;
    let noiseGain: GainNode | null = null;
    if (config.noise) {
      const noiseBuffer = this.createNoiseBuffer(config.noise.type, duration);
      noiseSource = this.context.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = loop;

      noiseGain = this.context.createGain();
      noiseGain.gain.value = config.noise.amount * volumeOverride;
      noiseGain.connect(gainNode);
      noiseSource.connect(noiseGain);
      noiseSource.start(now);
      if (!loop) {
        noiseSource.stop(now + duration);
      }
    }

    // Create harmonic oscillators
    const harmonicOscs: OscillatorNode[] = [];
    config.harmonics?.forEach((h) => {
      const harmOsc = this.context!.createOscillator();
      harmOsc.type = config.type;
      harmOsc.frequency.value = h.freq * pitchShift;
      const harmGain = this.context!.createGain();
      harmGain.gain.value = h.gain * volumeOverride;
      harmGain.connect(gainNode);
      harmOsc.connect(harmGain);
      harmOsc.start(now);
      if (!loop) harmOsc.stop(now + duration);
      harmonicOscs.push(harmOsc);
    });

    // Create unique ID for this sound
    const soundId = `${soundType}-${Date.now()}`;

    // Stop function
    const stop = () => {
      const endTime = this.context?.currentTime ?? 0;
      gainNode.gain.cancelScheduledValues(endTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, endTime);
      gainNode.gain.linearRampToValueAtTime(0, endTime + release);
      osc.stop(endTime + release);
      noiseSource?.stop(endTime + release);
      harmonicOscs.forEach((h) => h.stop(endTime + release));
      this.activeSounds.delete(soundId);
    };

    this.activeSounds.set(soundId, { stop });

    return stop;
  }

  // ─── Convenience methods for common sounds ══════════════════════════════════
  playDrop(): () => void {
    return this.play('drop');
  }

  playPour(duration?: number): () => void {
    if (duration) {
      return this.play('pouring', { volume: 0.8 });
    }
    return this.play('pouring', { volume: 0.6 });
  }

  playClink(): () => void {
    return this.play('glass_clink', { pitch: 0.9 + Math.random() * 0.2 });
  }

  playPlace(): () => void {
    return this.play('beaker_place');
  }

  playCapOpen(): () => void {
    return this.play('cap_open');
  }

  playCapClose(): () => void {
    return this.play('cap_close');
  }

  playBubbles(): () => void {
    return this.play('bubbles', { volume: 0.5 });
  }

  playGas(): () => void {
    return this.play('gas_hiss', { volume: 0.4 });
  }

  playSuccess(): () => void {
    return this.play('success', { volume: 0.8 });
  }

  playWarning(): () => void {
    return this.play('warning', { volume: 0.6 });
  }

  playSplash(): () => void {
    return this.play('splash', { volume: 0.5 });
  }

  startBunsenBurner(): () => void {
    return this.play('bunsen_flame', { loop: true, volume: 0.4 });
  }

  stopAll(): void {
    this.activeSounds.forEach((sound) => sound.stop());
    this.activeSounds.clear();
  }

  dispose(): void {
    this.stopAll();
    this.context?.close();
    this.context = null;
    this.masterGain = null;
  }
}

// Singleton instance
export const labAudio = new LabAudioSystem();

// ─── React Hook for Audio ══════════════════════════════════════════════════
export function useLabAudio() {
  return {
    init: () => labAudio.init(),
    play: (type: SoundType, options?: { volume?: number; pitch?: number; loop?: boolean }) => labAudio.play(type, options),
    setEnabled: (enabled: boolean) => labAudio.setEnabled(enabled),
    setVolume: (volume: number) => labAudio.setVolume(volume),
    resume: () => labAudio.resume(),
    suspend: () => labAudio.suspend(),
    stopAll: () => labAudio.stopAll(),
    // Convenience
    playDrop: () => labAudio.playDrop(),
    playPour: (d?: number) => labAudio.playPour(d),
    playClink: () => labAudio.playClink(),
    playPlace: () => labAudio.playPlace(),
    playSuccess: () => labAudio.playSuccess(),
    playWarning: () => labAudio.playWarning(),
    playBubbles: () => labAudio.playBubbles(),
  };
}
