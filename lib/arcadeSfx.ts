/**
 * lib/arcadeSfx.ts
 * ─────────────────────────────────────────────────────────────
 * Zero-Latency Procedural Web Audio Sound Engine for Echo Arcade.
 * 100% Client-Side Synthesized Audio ($0 network / 0 external assets).
 */

class ArcadeSoundEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!this.ctx || this.ctx.state === "closed") {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /** Safe trigger with vibration */
  private haptic(ms = 15) {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch {}
    }
  }

  // 1. UI Button Press (Clean tactile pop)
  playButtonTap() {
    this.haptic(10);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(420, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(840, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch {}
  }

  // 2. Lumberjack Axe Chop (Crisp wood thud + crunch)
  playAxeChop() {
    this.haptic(20);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  // 3. Hand Slap Clap (Sharp slap impact)
  playSlap() {
    this.haptic(35);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const bufferSize = ctx.sampleRate * 0.12;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1200;
      filter.Q.value = 1.2;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(ctx.currentTime);
    } catch {}
  }

  // 4. Whoosh / Dodge
  playWhoosh() {
    this.haptic(10);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }

  // 5. Ping Pong Table Clack (Resonant wooden table bounce)
  playPingPongBounce(isSmash = false) {
    this.haptic(isSmash ? 30 : 12);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const baseFreq = isSmash ? 900 : 750;
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(isSmash ? 0.45 : 0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.06);
    } catch {}
  }

  // 6. Knife Wood Thud
  playKnifeStick() {
    this.haptic(25);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(280, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  }

  // 7. Knife Shatter / Blade Spark
  playKnifeClash() {
    this.haptic(45);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(1600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }

  // 8. Dart Board Thwack
  playDartHit() {
    this.haptic(20);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.09);
    } catch {}
  }

  // 9. Cup Pong Liquid Splash & Rim Bounce
  playCupSink() {
    this.haptic(35);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08);
      osc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    } catch {}
  }

  // 10. Car Collision / Bump
  playCarBump() {
    this.haptic(30);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  }

  // 11. Match Success Chime (Find Match, RPS Win)
  playMatchSuccess() {
    this.haptic(18);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.06);
        osc.stop(ctx.currentTime + idx * 0.06 + 0.18);
      });
    } catch {}
  }

  // 12. Penalty / Error Buzz
  playPenaltyBuzz() {
    this.haptic(40);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(130, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  }

  // 13. Fanfare Victory Jingle
  playVictory() {
    this.haptic(60);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.35);
      });
    } catch {}
  }

  // 14. Fruit Ninja: Razor Blade Swipe (Whoosh)
  playBladeSwipe() {
    this.haptic(8);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = "sawtooth";
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1200, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.12);
      filter.Q.setValueAtTime(3.5, ctx.currentTime);

      osc.frequency.setValueAtTime(480, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  }

  // 15. Fruit Ninja: Juicy Fruit Splat & Squish
  playFruitSquish() {
    this.haptic(15);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(320, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.14);

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(640, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.14);

      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.14);
      osc2.stop(ctx.currentTime + 0.14);
    } catch {}
  }

  // 16. Fruit Ninja: Sizzling Bomb Fuse
  playBombFuse() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(1800 + Math.random() * 400, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  }

  // 17. Fruit Ninja / Bottle Shooter: Bomb & TNT Detonation Blast
  playBombExplosion() {
    this.haptic(90);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(90, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 0.6);

      gain.gain.setValueAtTime(0.7, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } catch {}
  }

  // 18. Fruit Ninja: Combo Fanfare
  playComboFanfare(combo = 3) {
    this.haptic(30);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const baseFreq = 300 + Math.min(combo, 8) * 60;
      [baseFreq, baseFreq * 1.25, baseFreq * 1.5].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.06);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.06);
        osc.stop(ctx.currentTime + i * 0.06 + 0.25);
      });
    } catch {}
  }

  // Fruit Ninja: Critical Slice Strike
  playCriticalSlice() {
    this.haptic(50);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      // High bright metallic chime + sub-bass punch
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(1174.66, ctx.currentTime); // D6
      osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.35);

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(160, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.55, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.35);
    } catch {}
  }

  // Fruit Ninja: Freeze Banana Slow-Motion Chime
  playFreezeBanana() {
    this.haptic(35);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const freqs = [1046.5, 1318.51, 1567.98, 2093.0];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.28, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.4);
      });
    } catch {}
  }

  // Fruit Ninja: Frenzy Banana Fanfare
  playFrenzyBanana() {
    this.haptic(45);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.05);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.05 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.05);
        osc.stop(ctx.currentTime + i * 0.05 + 0.3);
      });
    } catch {}
  }

  // 19. Bottle Shooter: High-Velocity Gunshot
  playGunshot() {
    this.haptic(45);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      // 1. Initial transient thump
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.6, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);

      // 2. High snap click
      const snap = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snap.type = "square";
      snap.frequency.setValueAtTime(900, ctx.currentTime);
      snap.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.04);
      snapGain.gain.setValueAtTime(0.4, ctx.currentTime);
      snapGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      snap.connect(snapGain);
      snapGain.connect(ctx.destination);
      snap.start(ctx.currentTime);
      snap.stop(ctx.currentTime + 0.04);
    } catch {}
  }

  // 20. Bottle Shooter: Glass Shattering Impact
  playGlassShatter() {
    this.haptic(25);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const frequencies = [1400, 1850, 2400, 3100, 4200];
      frequencies.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        const detune = (Math.random() - 0.5) * 80;
        osc.frequency.setValueAtTime(f + detune, ctx.currentTime + idx * 0.015);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.015 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.015);
        osc.stop(ctx.currentTime + idx * 0.015 + 0.22);
      });
    } catch {}
  }

  // 21. Bottle Shooter: Steel Armor Bullet Ricochet
  playRicochet() {
    this.haptic(20);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(2200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }

  // 22. Bottle Shooter: Revolver Cylinder Reload
  playRevolverReload() {
    this.haptic(15);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      [0, 0.09].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(800, ctx.currentTime + delay);
        osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + delay + 0.04);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.04);
      });
    } catch {}
  }

  // 23. Bottle Shooter: Empty Chamber Hammer Click
  playEmptyChamber() {
    this.haptic(10);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1600, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.03);
    } catch {}
  }

  // ── 🏃‍♂️ 24. Subway Surfer: Audio Suite ──
  playSubwayJump() {
    this.haptic(15);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(240, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(620, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }

  playSubwayRoll() {
    this.haptic(12);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);
    } catch {}
  }

  playSubwayCoin() {
    this.haptic(8);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
      osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.05); // E6
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  }

  playHoverboardDeploy() {
    this.haptic(35);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }

  playJetpackRoar() {
    this.haptic(50);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(320, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  }

  playTrainHorn() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      [277.18, 329.63].forEach((f) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      });
    } catch {}
  }

  playCrashThud() {
    this.haptic(65);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.65, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }

  // ── 🚗 25. Hill Climb Racing: Audio Suite ──
  playEngineRev(pitchRatio = 1.0) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      const base = 55 * Math.min(2.5, Math.max(0.7, pitchRatio));
      osc.frequency.setValueAtTime(base, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  playBrakeSqueal() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(2200 + Math.random() * 400, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  }

  playFuelGulp() {
    this.haptic(25);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      [440, 554.37, 659.25].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.06);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.06);
        osc.stop(ctx.currentTime + i * 0.06 + 0.2);
      });
    } catch {}
  }

  playStuntCheer() {
    this.haptic(50);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.07);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.07);
        osc.stop(ctx.currentTime + i * 0.07 + 0.3);
      });
    } catch {}
  }

  playVehicleCrash() {
    this.haptic(70);
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.7, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  }
}

export const arcadeSfx = new ArcadeSoundEngine();
