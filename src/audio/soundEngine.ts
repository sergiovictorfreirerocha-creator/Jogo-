import { WorldId } from '../types/game';

interface WorldMusicTheme {
  bpm: number;
  wave: OscillatorType;
  bassWave: OscillatorType;
  notes: number[]; // Hz
  bass: number[]; // Hz
}

const WORLD_THEMES: Record<WorldId, WorldMusicTheme> = {
  urban: {
    bpm: 118,
    wave: 'triangle',
    bassWave: 'sawtooth',
    notes: [261.63, 329.63, 392.0, 493.88, 392.0, 329.63, 293.66, 392.0],
    bass: [130.81, 130.81, 164.81, 196.0],
  },
  forest: {
    bpm: 96,
    wave: 'sine',
    bassWave: 'triangle',
    notes: [293.66, 349.23, 440.0, 523.25, 440.0, 392.0, 349.23, 329.63],
    bass: [146.83, 174.61, 130.81, 146.83],
  },
  volcanic: {
    bpm: 126,
    wave: 'sawtooth',
    bassWave: 'square',
    notes: [220.0, 233.08, 293.66, 329.63, 293.66, 233.08, 220.0, 196.0],
    bass: [110.0, 110.0, 98.0, 116.54],
  },
  frozen: {
    bpm: 102,
    wave: 'sine',
    bassWave: 'sine',
    notes: [523.25, 659.25, 783.99, 987.77, 783.99, 659.25, 587.33, 659.25],
    bass: [196.0, 220.0, 261.63, 196.0],
  },
  cyberpunk: {
    bpm: 132,
    wave: 'sawtooth',
    bassWave: 'sawtooth',
    notes: [261.63, 311.13, 392.0, 466.16, 523.25, 466.16, 392.0, 311.13],
    bass: [65.41, 65.41, 77.78, 98.0],
  },
  desert: {
    bpm: 108,
    wave: 'triangle',
    bassWave: 'triangle',
    notes: [293.66, 311.13, 392.0, 440.0, 466.16, 440.0, 392.0, 311.13],
    bass: [146.83, 146.83, 116.54, 130.81],
  },
  space: {
    bpm: 84,
    wave: 'sine',
    bassWave: 'triangle',
    notes: [329.63, 493.88, 587.33, 659.25, 493.88, 392.0, 440.0, 329.63],
    bass: [82.41, 98.0, 110.0, 98.0],
  },
  medieval: {
    bpm: 112,
    wave: 'triangle',
    bassWave: 'triangle',
    notes: [293.66, 349.23, 440.0, 392.0, 349.23, 329.63, 293.66, 261.63],
    bass: [146.83, 130.81, 116.54, 130.81],
  },
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicVol = 0.45;
  private sfxVol = 0.7;
  private musicTimer: number | null = null;
  private currentWorld: WorldId | null = null;
  private stepIdx = 0;
  private coinCombo = 0;
  private lastCoinTime = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVol * 0.22;
      this.sfxGain.gain.value = this.sfxVol * 0.55;
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public setVolumes(music: number, sfx: number): void {
    this.musicVol = Math.max(0, Math.min(1, music));
    this.sfxVol = Math.max(0, Math.min(1, sfx));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicVol * 0.22, this.ctx.currentTime, 0.04);
    }
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVol * 0.55, this.ctx.currentTime, 0.04);
    }
  }

  public startWorldMusic(worldId: WorldId): void {
    if (this.currentWorld === worldId && this.musicTimer !== null) return;
    this.stopMusic();
    this.currentWorld = worldId;
    this.stepIdx = 0;
    const theme = WORLD_THEMES[worldId];
    const stepMs = Math.round((60 / theme.bpm / 2) * 1000);

    this.musicTimer = window.setInterval(() => {
      if (this.musicVol <= 0.01) return;
      const ctx = this.ctx;
      if (!ctx || ctx.state !== 'running' || !this.musicGain) return;

      const now = ctx.currentTime;
      const noteFreq = theme.notes[this.stepIdx % theme.notes.length];
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = theme.wave;
      osc.frequency.setValueAtTime(noteFreq, now);
      g.gain.setValueAtTime(0.001, now);
      g.gain.exponentialRampToValueAtTime(0.18, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + (stepMs / 1000) * 0.9);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + (stepMs / 1000) * 0.95);

      if (this.stepIdx % 2 === 0) {
        const bassFreq = theme.bass[Math.floor(this.stepIdx / 2) % theme.bass.length];
        const bOsc = ctx.createOscillator();
        const bGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 340;
        bOsc.type = theme.bassWave;
        bOsc.frequency.setValueAtTime(bassFreq, now);
        bGain.gain.setValueAtTime(0.001, now);
        bGain.gain.exponentialRampToValueAtTime(0.24, now + 0.04);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + (stepMs / 1000) * 1.7);
        bOsc.connect(filter);
        filter.connect(bGain);
        bGain.connect(this.musicGain);
        bOsc.start(now);
        bOsc.stop(now + (stepMs / 1000) * 1.8);
      }

      this.stepIdx++;
    }, stepMs);
  }

  public stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.currentWorld = null;
  }

  private tone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.3,
    delay = 0
  ): void {
    if (this.sfxVol <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    }
    g.gain.setValueAtTime(0.001, now);
    g.gain.exponentialRampToValueAtTime(gainPeak, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playJump(isDouble = false): void {
    if (isDouble) {
      this.tone(320, 680, 0.16, 'triangle', 0.34);
      this.tone(480, 860, 0.14, 'sine', 0.22, 0.04);
    } else {
      this.tone(210, 440, 0.14, 'triangle', 0.34);
    }
  }

  public playLand(impactSpeed = 5): void {
    const strength = Math.min(0.45, Math.max(0.1, impactSpeed * 0.025));
    this.tone(135, 55, 0.11, 'sine', strength);
  }

  public playBounce(): void {
    this.tone(180, 740, 0.26, 'sine', 0.42);
    this.tone(360, 920, 0.2, 'triangle', 0.25, 0.05);
  }

  public playCoin(): void {
    const nowMs = performance.now();
    if (nowMs - this.lastCoinTime < 1200) {
      this.coinCombo = Math.min(8, this.coinCombo + 1);
    } else {
      this.coinCombo = 0;
    }
    this.lastCoinTime = nowMs;
    const pitchBoost = 1 + this.coinCombo * 0.06;
    this.tone(880 * pitchBoost, 1046 * pitchBoost, 0.09, 'sine', 0.3);
    this.tone(1318 * pitchBoost, 1568 * pitchBoost, 0.14, 'triangle', 0.28, 0.06);
  }

  public playCheckpoint(): void {
    this.tone(440, 440, 0.14, 'triangle', 0.32, 0);
    this.tone(554.37, 554.37, 0.14, 'triangle', 0.32, 0.08);
    this.tone(659.25, 659.25, 0.24, 'sine', 0.36, 0.16);
    this.tone(880, 880, 0.32, 'sine', 0.3, 0.24);
  }

  public playSwitch(): void {
    this.tone(330, 520, 0.12, 'square', 0.22);
    this.tone(520, 780, 0.18, 'triangle', 0.26, 0.08);
  }

  public playFall(): void {
    this.tone(380, 110, 0.32, 'sawtooth', 0.24);
  }

  public playEliminated(): void {
    this.tone(240, 75, 0.22, 'sawtooth', 0.38, 0);
    this.tone(180, 52, 0.38, 'square', 0.28, 0.08);
  }

  public playBridgeWarning(): void {
    this.tone(760, 620, 0.09, 'square', 0.24, 0);
    this.tone(920, 740, 0.09, 'square', 0.22, 0.11);
  }

  public playBridgeVanish(): void {
    this.tone(440, 140, 0.24, 'triangle', 0.26);
  }

  public playBridgeReady(): void {
    this.tone(523.25, 659.25, 0.14, 'sine', 0.2);
  }

  public playVictory(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, idx) => {
      this.tone(f, f, 0.26, 'triangle', 0.34, idx * 0.09);
    });
    this.tone(1046.5, 1046.5, 0.55, 'sine', 0.32, 0.38);
  }

  public playMenuClick(): void {
    this.tone(520, 680, 0.06, 'sine', 0.22);
  }

  public playPurchase(): void {
    this.tone(587.33, 587.33, 0.1, 'triangle', 0.3, 0);
    this.tone(783.99, 783.99, 0.12, 'triangle', 0.32, 0.08);
    this.tone(1174.66, 1174.66, 0.28, 'sine', 0.35, 0.16);
  }
}

export const soundEngine = new SoundEngine();
