/**
 * lib/spacesSfx.ts
 * ─────────────────────────────────────────────────────
 * Web Audio Synthesizer Suite for Echo Spaces
 * $0 infrastructure procedural audio for interactive stations:
 * Piano, Drum pads, Debate Gavel, Rain Ambience, Chimes & Footsteps.
 */

class SpacesSoundEngine {
  private ctx: AudioContext | null = null;
  private rainGainNode: GainNode | null = null;
  private rainSourceNode: AudioBufferSourceNode | null = null;
  private isRainPlaying = false;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // 1. Footstep Tap
  playFootstep() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(110 + Math.random() * 30, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch {}
  }

  // 2. Zone Transition Chime
  playZoneChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.07);
        osc.stop(ctx.currentTime + idx * 0.07 + 0.28);
      });
    } catch {}
  }

  // 3. Sit / Interaction Pop
  playSitPop() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(480, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  // 4. 8-Key Grand Piano Note (Keys 1 to 8: C4 to C5)
  playPianoNote(keyIndex: number) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const frequencies = [
        261.63, // C4 (1)
        293.66, // D4 (2)
        329.63, // E4 (3)
        349.23, // F4 (4)
        392.0,  // G4 (5)
        440.0,  // A4 (6)
        493.88, // B4 (7)
        523.25, // C5 (8)
      ];
      const freq = frequencies[Math.min(frequencies.length - 1, Math.max(0, keyIndex))];

      // Piano harmonics: Fundamental + 2nd overtone
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(freq, ctx.currentTime);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(freq * 2, ctx.currentTime);

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.85);
      osc2.stop(ctx.currentTime + 0.85);
    } catch {}
  }

  // Alias for playPianoNote
  playKeyNote(keyIndex: number) {
    this.playPianoNote(keyIndex);
  }

  // 5. 4-Pad Drum Machine (Kick, Snare, HiHat, 808 Sub)
  playDrum(padType: "kick" | "snare" | "hihat" | "sub808") {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      if (padType === "kick") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.22);
        gain.gain.setValueAtTime(0.7, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.22);
      } else if (padType === "snare") {
        // Snare pop + noise snap
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(190, ctx.currentTime);
        gain.gain.setValueAtTime(0.45, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      } else if (padType === "hihat") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(6000, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.05);
      } else if (padType === "sub808") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(75, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.55);
        gain.gain.setValueAtTime(0.65, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.55);
      }
    } catch {}
  }

  // Alias for playDrum
  playDrumPad(padType: "kick" | "snare" | "hihat" | "sub808") {
    this.playDrum(padType);
  }

  // 6. Debate Judge Gavel Strike (*BANG BANG* ORDER IN COURT!)
  playGavelStrike() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      [0, 0.18].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(120, ctx.currentTime + delay);
        osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + delay + 0.14);
        gain.gain.setValueAtTime(0.6, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.14);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.14);
      });
    } catch {}
  }

  // 7. Library Focus Bell (Tibetan singing bowl chime)
  playFocusBell() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(852, ctx.currentTime);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 2.5);
    } catch {}
  }

  // 8. Concert Emote Cheer
  playCheerFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(f, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.35);
      });
    } catch {}
  }

  // Alias for playCheerFanfare
  playConcertFanfare() {
    this.playCheerFanfare();
  }

  // 9. Fountain Coin Splash
  playFountainSplash() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(987.77, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }

  // 10. Library Lofi Ambient Rain Generator (White noise pink-filtered)
  toggleRainAmbience(enable: boolean) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      if (enable && !this.isRainPlaying) {
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;

        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99 * b0 + white * 0.05;
          b1 = 0.96 * b1 + white * 0.1;
          b2 = 0.86 * b2 + white * 0.3;
          output[i] = (b0 + b1 + b2) * 0.15;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(800, ctx.currentTime);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.08, ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        whiteNoise.start(0);
        this.rainSourceNode = whiteNoise;
        this.rainGainNode = gainNode;
        this.isRainPlaying = true;
      } else if (!enable && this.isRainPlaying && this.rainSourceNode) {
        this.rainSourceNode.stop();
        this.rainSourceNode.disconnect();
        this.rainSourceNode = null;
        this.isRainPlaying = false;
      }
    } catch {}
  }

  // 11. Decoration Object Placement Tap
  playPlaceSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(420, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  // 12. Decoration Object Removal Whoosh
  playRemoveSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(360, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  }

  // 13. Emote Burst Chime
  playEmotePop() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      [659.25, 880, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.05 + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.05);
        osc.stop(ctx.currentTime + idx * 0.05 + 0.16);
      });
    } catch {}
  }

  // 14. Barista Coffee Brew Pour & Steam
  playCoffeeBrew() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      // Pour drip + steam hiss
      [320, 280, 240, 360].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.07);
        osc.stop(ctx.currentTime + idx * 0.07 + 0.18);
      });
    } catch {}
  }

  // 15. Hand Raise Bell Chime
  playHandRaise() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } catch {}
  }

  // 16. Retro 8-bit Arcade Laser
  playArcadeLaser() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  }

  // 17. Retro 8-bit Arcade Explosion
  playArcadeExplosion() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  }

  // 18. Party & Friends Dice Roll (3D clatter & roll sound)
  playDiceRoll() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const count = 5 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const time = ctx.currentTime + i * 0.05 + Math.random() * 0.02;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(240 + Math.random() * 180, time);
        gain.gain.setValueAtTime(0.25 - i * 0.03, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.04);
      }
    } catch {}
  }

  // 19. Spin the Bottle Wheel (Click-click-click deceleration)
  playBottleSpin() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const clicks = 8;
      let delay = 0;
      for (let i = 0; i < clicks; i++) {
        const t = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(520 + Math.random() * 80, t);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.03);

        delay += 0.04 + i * 0.025; // decelerate
      }
    } catch {}
  }

  // 20. Birthday & Celebration Horn Fanfare (🎉 Happy celebration chord)
  playPartyFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const chord = [523.25, 659.25, 783.99, 1046.5]; // C Major triumph
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.7);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.06);
        osc.stop(ctx.currentTime + idx * 0.06 + 0.7);
      });
    } catch {}
  }

  // 21. Resonant Brass Gather Bell (🔔 Calls all friends to gather)
  playGatherBell() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const harmonics = [329.63, 659.25, 987.77];
      harmonics.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.4 / (idx + 1), ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.8);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 2.8);
      });
    } catch {}
  }

  // 22. Polaroid Photo Booth Camera Shutter (📸 Snap & Clack)
  playCameraShutter() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      // 1st click (Mirror up)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "square";
      osc1.frequency.setValueAtTime(1200, ctx.currentTime);
      gain1.gain.setValueAtTime(0.35, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.04);

      // 2nd click (Curtain close)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(480, ctx.currentTime + 0.08);
      gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.08);
      osc2.stop(ctx.currentTime + 0.16);
    } catch {}
  }

  // ── PROCEDURAL AMBIENT MUSIC ENGINE ──
  private ambianceInterval: any = null;
  private currentAmbiance: string | null = null;
  private ambianceVolume: number = 0.35;

  setAmbianceVolume(volume: number) {
    this.ambianceVolume = Math.max(0, Math.min(1, volume));
  }

  getCurrentAmbiance(): string | null {
    return this.currentAmbiance;
  }

  startAmbiance(type: "lofi" | "rain" | "campfire" | "sukoon" | "party") {
    this.stopAmbiance();
    this.currentAmbiance = type;
    const ctx = this.getContext();
    if (!ctx) return;

    if (type === "lofi") {
      // Warm Rhodes chord progressions (ii - V - I)
      const chords = [
        [261.63, 329.63, 392.0, 493.88], // Cmaj7
        [220.0, 261.63, 329.63, 392.0],  // Am7
        [293.66, 349.23, 440.0, 523.25], // Dm7
        [196.0, 246.94, 293.66, 349.23], // G7
      ];
      let step = 0;
      const playStep = () => {
        if (!this.currentAmbiance) return;
        const chord = chords[step % chords.length];
        step++;
        chord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.04);
          gain.gain.setValueAtTime(0.12 * this.ambianceVolume, ctx.currentTime + idx * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.04 + 3.2);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.04);
          osc.stop(ctx.currentTime + idx * 0.04 + 3.2);
        });
      };
      playStep();
      this.ambianceInterval = setInterval(playStep, 3500);
    } else if (type === "rain") {
      this.toggleRainAmbience(true);
      // Add gentle jazz piano notes on top of rain
      const pentatonic = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99];
      this.ambianceInterval = setInterval(() => {
        if (!this.currentAmbiance) return;
        const freq = pentatonic[Math.floor(Math.random() * pentatonic.length)];
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.15 * this.ambianceVolume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.8);
      }, 1600);
    } else if (type === "campfire") {
      // Crackle pops and acoustic guitar warmth
      const notes = [164.81, 196.0, 220.0, 246.94, 329.63];
      this.ambianceInterval = setInterval(() => {
        if (!this.currentAmbiance) return;
        // Ember pop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        const freq = notes[Math.floor(Math.random() * notes.length)];
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.16 * this.ambianceVolume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.2);
      }, 1200);
    } else if (type === "sukoon") {
      // Calming Tibetan bowls & high wind chimes
      const bowls = [528.0, 639.0, 741.0, 852.0];
      this.ambianceInterval = setInterval(() => {
        if (!this.currentAmbiance) return;
        const freq = bowls[Math.floor(Math.random() * bowls.length)];
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.18 * this.ambianceVolume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 4.0);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 4.0);
      }, 2800);
    } else if (type === "party") {
      // 4/4 synthetic pump bassline
      let beat = 0;
      this.ambianceInterval = setInterval(() => {
        if (!this.currentAmbiance) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        const bassFreq = beat % 4 === 0 ? 65.41 : beat % 4 === 2 ? 82.41 : 73.42;
        osc.frequency.setValueAtTime(bassFreq, ctx.currentTime);
        gain.gain.setValueAtTime(0.22 * this.ambianceVolume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.28);
        beat++;
      }, 500); // 120 BPM
    }
  }

  stopAmbiance() {
    if (this.ambianceInterval) {
      clearInterval(this.ambianceInterval);
      this.ambianceInterval = null;
    }
    if (this.currentAmbiance === "rain") {
      this.toggleRainAmbience(false);
    }
    this.currentAmbiance = null;
  }
}

export const spacesSfx = new SpacesSoundEngine();

