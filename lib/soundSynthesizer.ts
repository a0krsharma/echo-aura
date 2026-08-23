/**
 * lib/soundSynthesizer.ts
 * ─────────────────────────────────────────────────────────────
 * Zero-Latency, Zero-Network Web Audio Sound Effect Synthesizer.
 * Arena Live Soundboard + High-Impact Audio FX.
 * Locally synthesized in the browser ($0 / 0 Network Errors / 100% Device Support).
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

  // 1. Heavy 808 Sub Boom (Punchy Kick + Sub Drop)
  playSubBoom(durationSec = 1.6) {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(32, ctx.currentTime + durationSec);

      gain.gain.setValueAtTime(0.9, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + durationSec);
    } catch (e) {
      console.warn("Synth play error:", e);
    }
  }

  // 2. Comic Boing / Bruh Pop
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

  // 4. Resonant Deep Metallic Temple Gong (Rich Harmonics)
  playGong() {
    try {
      const ctx = this.getContext();
      const freqs = [110, 220, 330, 445]; // Fundamental + harmonics for metallic ring
      
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = idx === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.85, ctx.currentTime + 2.8);

        const vol = idx === 0 ? 0.6 : 0.2 / idx;
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 2.8);
      });
    } catch (e) {
      console.warn("Synth play error:", e);
    }
  }

  // 5. Loud Dissonant Red Flop Game-Show Buzzer
  playBuzzer() {
    try {
      const ctx = this.getContext();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sawtooth";
      osc2.type = "square";
      // Harsh dissonant frequencies
      osc1.frequency.setValueAtTime(115, ctx.currentTime);
      osc2.frequency.setValueAtTime(127, ctx.currentTime);

      gain.gain.setValueAtTime(0.45, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.65);
      osc2.stop(ctx.currentTime + 0.65);
    } catch (e) {
      console.warn("Synth play error:", e);
    }
  }

  // 6. Arena Hype Tri-Tone Airhorn
  playAirhorn() {
    try {
      const ctx = this.getContext();
      const bursts = [0, 0.12, 0.28];
      const freqs = [466.16, 587.33, 698.46]; // Bb4, D5, F5 tri-tone chord

      bursts.forEach((offset, bIndex) => {
        const start = ctx.currentTime + offset;
        const dur = bIndex === 2 ? 0.45 : 0.09;

        freqs.forEach((f) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(f, start);

          gain.gain.setValueAtTime(0.2, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + dur);
        });
      });
    } catch (e) {
      console.warn("Synth play error:", e);
    }
  }

  // 7. Arena Crowd Applause & Cheers
  playApplause(durationSec = 2.2) {
    try {
      const ctx = this.getContext();
      const bufferSize = ctx.sampleRate * durationSec;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 2.8;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1100;
      filter.Q.value = 0.9;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.45, ctx.currentTime + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(ctx.currentTime);
    } catch (e) {
      console.warn("Synth play error:", e);
    }
  }

  // 8. Tension Snare Drumroll into Impact
  playDrumroll(durationSec = 1.8) {
    try {
      const ctx = this.getContext();
      const hits = 22;
      const interval = durationSec / hits;

      for (let i = 0; i < hits; i++) {
        const start = ctx.currentTime + i * interval;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(130 + Math.random() * 25, start);

        const vol = (i / hits) * 0.45 + 0.06;
        gain.gain.setValueAtTime(vol, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.05);
      }

      // Final crash
      setTimeout(() => {
        this.playSubBoom(1.2);
      }, durationSec * 1000);
    } catch (e) {
      console.warn("Synth play error:", e);
    }
  }

  // 9. Victory Fanfare
  playFanfare() {
    try {
      const ctx = this.getContext();
      const notes = [
        { f: 523.25, d: 0.15 }, // C5
        { f: 523.25, d: 0.15 }, // C5
        { f: 523.25, d: 0.15 }, // C5
        { f: 659.25, d: 0.5 },  // E5
        { f: 783.99, d: 0.8 },  // G5
      ];
      let start = ctx.currentTime;

      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(n.f, start);

        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + n.d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + n.d);
        start += n.d * 0.85;
      });
    } catch (e) {
      console.warn("Synth play error:", e);
    }
  }

  playSubtlePop() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {
      console.warn("Synth play error:", e);
    }
  }

  playSnare() {
    try {
      this.playDrumroll(0.3);
    } catch (e) {
      console.warn("Synth play error:", e);
    }
  }

  // Universal Player by Sound ID
  playById(id: string) {
    const cleanId = id.toLowerCase();
    if (cleanId === "buzzer" || cleanId.includes("flop") || cleanId.includes("wrong")) {
      this.playBuzzer();
    } else if (cleanId === "airhorn" || cleanId.includes("horn") || cleanId.includes("hype")) {
      this.playAirhorn();
    } else if (cleanId === "applause" || cleanId.includes("cheer") || cleanId.includes("clap")) {
      this.playApplause();
    } else if (cleanId === "drumroll" || cleanId.includes("roll")) {
      this.playDrumroll();
    } else if (cleanId === "gong" || cleanId.includes("bell")) {
      this.playGong();
    } else if (cleanId === "boom" || cleanId.includes("damage") || cleanId.includes("sub") || cleanId.includes("vine")) {
      this.playSubBoom();
    } else if (cleanId.includes("victory") || cleanId.includes("win") || cleanId.includes("fanfare")) {
      this.playFanfare();
    } else if (cleanId.includes("bruh") || cleanId.includes("pop")) {
      this.playBoing();
    } else if (cleanId.includes("wah_wah") || cleanId.includes("slide")) {
      this.playSadSlide();
    } else {
      this.playAirhorn();
    }
  }
}

export const soundSynth = new SoundSynthesizer();
