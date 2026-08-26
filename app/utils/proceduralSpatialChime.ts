'use client';

/**
 * ProceduralSpatialChimeSynth
 * ----------------------------
 * Spatial stereo-panning version of the chime synth.
 * Each note sweeps its StereoPannerNode from panStart → panEnd over 350ms,
 * matching the visual L→R traversal of the GLSL shimmer band.
 */
class ProceduralSpatialChimeSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted = false;

  private chimeChord = [1318.51, 1661.22, 1975.53, 2637.02];

  public init() {
    if (this.ctx || typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.22;
    this.masterGain.connect(this.ctx.destination);
  }

  public resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  /**
   * @param panStart  Starting stereo pan (-1 = L, 1 = R)
   * @param panEnd    Ending stereo pan  (-1 = L, 1 = R)
   */
  public playSpatialGlint(panStart = -0.8, panEnd = 0.8) {
    this.init();
    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const sweepDuration = 0.35;

    const notes = [
      { freq: this.chimeChord[0], delay: 0.0,  startP: panStart,        endP: panStart + 0.4 },
      { freq: this.chimeChord[1], delay: 0.06, startP: -0.2,            endP: 0.2            },
      { freq: this.chimeChord[3], delay: 0.12, startP: panEnd - 0.4,    endP: panEnd         },
    ];

    notes.forEach(({ freq, delay, startP, endP }) => {
      const t = now + delay;
      const dur = 0.45;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, t);
      osc2.frequency.setValueAtTime(freq * 2.76, t);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq * 1.4, t);
      filter.Q.setValueAtTime(3.5, t);

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.0001, t);
      gainNode.gain.exponentialRampToValueAtTime(0.35, t + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      let panner: StereoPannerNode | null = null;
      if (typeof ctx.createStereoPanner === 'function') {
        panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(startP, t);
        panner.pan.linearRampToValueAtTime(endP, t + sweepDuration);
      }

      osc1.connect(gainNode);
      osc2.connect(filter);
      filter.connect(gainNode);
      if (panner) { gainNode.connect(panner); panner.connect(this.masterGain!); }
      else { gainNode.connect(this.masterGain!); }

      osc1.start(t); osc2.start(t);
      osc1.stop(t + dur + 0.05);
      osc2.stop(t + dur + 0.05);
    });
  }

  public setMuted(muted: boolean) { this.isMuted = muted; }
}

export const spatialChimeSynth = new ProceduralSpatialChimeSynth();
