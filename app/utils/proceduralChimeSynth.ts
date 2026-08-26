'use client';

/**
 * ProceduralChimeSynth
 * --------------------
 * Generates a 3-note pentatonic sparkle arpeggio using:
 * - Additive synthesis (Sine fundamental + Triangle inharmonic partial)
 * - Bandpass shimmer filter
 * - Exponential gain envelope (4ms attack, 550ms ring-down)
 * Zero external audio files required.
 */
class ProceduralChimeSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted = false;

  // Pentatonic sparkle harmonics: E6, G#6, B6, E7
  private chimeChord = [1318.51, 1661.22, 1975.53, 2637.02];

  public init() {
    if (this.ctx) return;
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.22;
    this.masterGain.connect(this.ctx.destination);
  }

  public resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  public playGlintSparkle() {
    this.init();
    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    const notes = [
      { freq: this.chimeChord[0], delay: 0.0   },
      { freq: this.chimeChord[1], delay: 0.045 },
      { freq: this.chimeChord[3], delay: 0.09  },
    ];

    notes.forEach(({ freq, delay }) => {
      const t = now + delay;

      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, t);

      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2.76, t); // Bell inharmonic ratio

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq * 1.5, t);
      filter.Q.setValueAtTime(3.0, t);

      const noteGain = ctx.createGain();
      noteGain.gain.setValueAtTime(0.0001, t);
      noteGain.gain.exponentialRampToValueAtTime(0.38, t + 0.004);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

      osc1.connect(noteGain);
      osc2.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(this.masterGain!);

      osc1.start(t); osc2.start(t);
      osc1.stop(t + 0.6); osc2.stop(t + 0.6);
    });
  }

  public setMuted(muted: boolean) { this.isMuted = muted; }
}

export const chimeSynth = new ProceduralChimeSynth();
