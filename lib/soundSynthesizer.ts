/**
 * lib/soundSynthesizer.ts
 * ─────────────────────────────────────────────────────────────
 * Zero-Latency, Zero-Network Web Audio Sound Effect Synthesizer.
 * Big Boss Arena Soundboard + Meme Audio Synthesis.
 * Locally generated in the browser ($0 / 0 Network Errors / 100% Device Support).
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

  // 1. Cinematic Sub Boom (Vine Boom / Heavy Impact)
  playSubBoom(durationSec = 1.8) {
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

  // 4. Big Boss Heavy Resonant Gong
  playGong() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(185, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(92, ctx.currentTime + 2.5);

      gain.gain.setValueAtTime(0.6, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 2.5);
    } catch (e) {
      console.warn("Synth play error:", e);
    }
  }

  // 5. Big Boss Red Flop Buzzer
  playBuzzer() {
    try {
      const ctx = this.getContext();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sawtooth";
      osc2.type = "square";
      osc1.frequency.setValueAtTime(120, ctx.currentTime);
      osc2.frequency.setValueAtTime(125, ctx.currentTime); // dissonant beat frequency

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.7);
      osc2.stop(ctx.currentTime + 0.7);
    } catch (e) {
      console.warn("Synth play error:", e);
    }
  }

  // 6. Arena Hype Airhorn (Multi-Osc Tri-Tone)
  playAirhorn() {
    try {
      const ctx = this.getContext();
      const bursts = [0, 0.15, 0.35];
      const freqs = [466.16, 587.33, 698.46]; // Bb4, D5, F5 tri-tone

      bursts.forEach((offset, bIndex) => {
        const start = ctx.currentTime + offset;
        const dur = bIndex === 2 ? 0.45 : 0.1;

        freqs.forEach((f) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(f, start);

          gain.gain.setValueAtTime(0.18, start);
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
  playApplause(durationSec = 2.5) {
    try {
      const ctx = this.getContext();
      const bufferSize = ctx.sampleRate * durationSec;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Pink-ish noise generation for applause texture
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 2.5; // boost
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1000;
      filter.Q.value = 0.8;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(ctx.currentTime);
    } catch (e) {
      console.warn("Synth play error:", e);
    }
  }

  // 8. Tension Drumroll
  playDrumroll(durationSec = 2.0) {
    try {
      const ctx = this.getContext();
      const hits = 24;
      const interval = durationSec / hits;

      for (let i = 0; i < hits; i++) {
        const start = ctx.currentTime + i * interval;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(120 + Math.random() * 20, start);

        const vol = (i / hits) * 0.4 + 0.05;
        gain.gain.setValueAtTime(vol, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.06);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.06);
      }

      // Final crash
      setTimeout(() => {
        this.playSubBoom(1.5);
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
        { f: 659.25, d: 0.6 },  // E5
        { f: 783.99, d: 0.9 },  // G5
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

  // Universal Player by Sound ID
  playById(id: string) {
    if (id.includes("buzzer") || id.includes("flop") || id.includes("wrong")) {
      this.playBuzzer();
    } else if (id.includes("airhorn") || id.includes("horn") || id.includes("hype")) {
      this.playAirhorn();
    } else if (id.includes("applause") || id.includes("cheer") || id.includes("clap")) {
      this.playApplause();
    } else if (id.includes("drumroll") || id.includes("roll")) {
      this.playDrumroll();
    } else if (id.includes("victory") || id.includes("win") || id.includes("fanfare")) {
      this.playFanfare();
    } else if (id.includes("gong") || id.includes("bell") || id.includes("bigboss")) {
      this.playGong();
    } else if (id.includes("boom") || id.includes("damage") || id.includes("vine")) {
      this.playSubBoom();
    } else if (id.includes("bruh") || id.includes("pop")) {
      this.playBoing();
    } else if (id.includes("wah_wah") || id.includes("slide")) {
      this.playSadSlide();
    } else {
      this.playAirhorn();
    }
  }
}

export const soundSynth = new SoundSynthesizer();
