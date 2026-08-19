/**
 * lib/soundSynthesizer.ts
 * ─────────────────────────────────────────────────────────────
 * Zero-Latency, Zero-Network Web Audio Sound Effect Synthesizer.
 * Synthesizes crystal-clear audio memes and acoustic backing drones
 * locally in the browser with 100% device compatibility ($0 / 0 Network Errors).
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // 1. Cinematic Sub Boom (Vine Boom / Impact)
  playSubBoom(durationSec = 2) {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + durationSec);

      gain.gain.setValueAtTime(0.8, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + durationSec);
    } catch (e) {
      console.warn("Synth play error:", e);
    }
  }

  // 2. Comic Boing (Bruh / Pop)
  playBoing() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(650, ctx.currentTime + 0.15);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.6);

      gain.gain.setValueAtTime(0.6, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.warn("Synth play error:", e);
    }
  }

  // 3. Sad Slide (Wah Wah Trombone)
  playSadSlide() {
    try {
      const ctx = this.getContext();
      const notes = [293.66, 277.18, 261.63, 233.08]; // D4 -> C#4 -> C4 -> Bb3
      let start = ctx.currentTime;

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, start);
        if (i === notes.length - 1) {
          osc.frequency.exponentialRampToValueAtTime(freq * 0.85, start + 0.8);
        }

        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + (i === notes.length - 1 ? 0.8 : 0.35));

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + (i === notes.length - 1 ? 0.8 : 0.35));
        start += 0.32;
      });
    } catch (e) {
      console.warn("Synth play error:", e);
    }
  }

  // 4. Mehfil Gong / Resonator (Wah Wah Cheer)
  playGong() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(185, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(92, ctx.currentTime + 2.5);

      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 2.5);
    } catch (e) {
      console.warn("Synth play error:", e);
    }
  }

  // 5. Lo-Fi Ambient Chord / Drone
  playLofiAmbient(durationSec = 4) {
    try {
      const ctx = this.getContext();
      const chords = [130.81, 164.81, 196.0, 246.94]; // Cmaj7 (C3, E3, G3, B3)

      chords.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + durationSec);
      });
    } catch (e) {
      console.warn("Synth play error:", e);
    }
  }

  // Universal Player by Sound ID
  playById(id: string) {
    if (id.includes("vine") || id.includes("damage") || id.includes("boom")) {
      this.playSubBoom();
    } else if (id.includes("bruh") || id.includes("pop")) {
      this.playBoing();
    } else if (id.includes("wah_wah") || id.includes("slide")) {
      this.playSadSlide();
    } else if (id.includes("ghazal") || id.includes("gong")) {
      this.playGong();
    } else {
      this.playLofiAmbient();
    }
  }
}

export const soundSynth = new SoundSynthesizer();
