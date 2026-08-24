/**
 * lib/voiceModulator.ts
 * ─────────────────────────────────────────────────────────────
 * Zero-Server-Cost Client-Side Voice Modulators & Soundboard FX.
 * Powered 100% locally by the browser's Web Audio API.
 * Modulates live microphone streams (Walkie-Talkie, Ghost, 8-Bit Cyber, Megaphone)
 * and triggers instant 1-second reaction memes and sound effects.
 */

export type VoiceFilterMode = "clean" | "walkie_talkie" | "ghost" | "cyber_8bit" | "megaphone";

export interface VoiceFilterOption {
  id: VoiceFilterMode;
  name: string;
  icon: string;
  tagline: string;
  description: string;
}

export const VOICE_FILTERS: VoiceFilterOption[] = [
  {
    id: "clean",
    name: "Clean Mic",
    icon: "🎙️",
    tagline: "Natural HD Audio",
    description: "Unprocessed direct studio voice transmission.",
  },
  {
    id: "walkie_talkie",
    name: "Retro Walkie-Talkie",
    icon: "📻",
    tagline: "Vintage Radio Static",
    description: "Bandpass radio filter with crisp military static & crunch.",
  },
  {
    id: "ghost",
    name: "Anonymous Ghost",
    icon: "👻",
    tagline: "Deep Social Deduction",
    description: "Deep pitched modulation with dark resonance for secret imposter games.",
  },
  {
    id: "cyber_8bit",
    name: "8-Bit Cyber Synth",
    icon: "🤖",
    tagline: "Robotic Vocoder Matrix",
    description: "55Hz ring modulator with retro arcade bitcrushed texture.",
  },
  {
    id: "megaphone",
    name: "Riot Megaphone",
    icon: "📢",
    tagline: "High-Gain Bullhorn",
    description: "Loud overdriven resonance for tournament commentary & hype.",
  },
];

export class VoiceModulatorManager {
  private ctx: AudioContext | null = null;
  private currentFilter: VoiceFilterMode = "clean";
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private activeNodes: AudioNode[] = [];

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

  /**
   * Transforms a raw MediaStream from getUserMedia into a modulated MediaStream.
   */
  public processStream(rawStream: MediaStream, filter: VoiceFilterMode = "clean"): MediaStream {
    try {
      const ctx = this.getContext();
      this.currentFilter = filter;

      // Disconnect previous graph if active
      this.cleanupNodes();

      this.sourceNode = ctx.createMediaStreamSource(rawStream);
      this.destinationNode = ctx.createMediaStreamDestination();

      if (filter === "clean") {
        this.sourceNode.connect(this.destinationNode);
        return this.destinationNode.stream;
      }

      if (filter === "walkie_talkie") {
        // Bandpass Filter (High-pass 500Hz + Low-pass 2.8kHz) + Light Distortion
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 500;

        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 2800;

        const shaper = ctx.createWaveShaper();
        shaper.curve = this.makeDistortionCurve(18) as any;

        const gain = ctx.createGain();
        gain.gain.value = 1.3;

        this.sourceNode.connect(hp);
        hp.connect(lp);
        lp.connect(shaper);
        shaper.connect(gain);
        gain.connect(this.destinationNode);

        this.activeNodes = [hp, lp, shaper, gain];
        return this.destinationNode.stream;
      }

      if (filter === "ghost") {
        // Lowpass 380Hz + Resonant Peak + Sub Drone Pitch
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 380;
        lp.Q.value = 4.5;

        const delay = ctx.createDelay();
        delay.delayTime.value = 0.035;

        const feedback = ctx.createGain();
        feedback.gain.value = 0.45;

        const gain = ctx.createGain();
        gain.gain.value = 1.6;

        this.sourceNode.connect(lp);
        lp.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(gain);
        gain.connect(this.destinationNode);

        this.activeNodes = [lp, delay, feedback, gain];
        return this.destinationNode.stream;
      }

      if (filter === "cyber_8bit") {
        // Ring Modulation via 55Hz Carrier Oscillator + Waveshaper
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.value = 55;

        const modGain = ctx.createGain();
        modGain.gain.value = 0.5;

        const shaper = ctx.createWaveShaper();
        shaper.curve = this.makeBitcrusherCurve(8) as any;

        const gain = ctx.createGain();
        gain.gain.value = 1.4;

        osc.connect(modGain.gain);
        this.sourceNode.connect(modGain);
        modGain.connect(shaper);
        shaper.connect(gain);
        gain.connect(this.destinationNode);

        osc.start();

        this.activeNodes = [osc, modGain, shaper, gain];
        return this.destinationNode.stream;
      }

      if (filter === "megaphone") {
        // High Mid Peak 1.8kHz + Hard Saturation Clip
        const bp = ctx.createBiquadFilter();
        bp.type = "peaking";
        bp.frequency.value = 1800;
        bp.Q.value = 3.0;
        bp.gain.value = 14;

        const shaper = ctx.createWaveShaper();
        shaper.curve = this.makeDistortionCurve(35) as any;

        const gain = ctx.createGain();
        gain.gain.value = 1.1;

        this.sourceNode.connect(bp);
        bp.connect(shaper);
        shaper.connect(gain);
        gain.connect(this.destinationNode);

        this.activeNodes = [bp, shaper, gain];
        return this.destinationNode.stream;
      }

      // Default fallback
      this.sourceNode.connect(this.destinationNode);
      return this.destinationNode.stream;
    } catch (e) {
      console.warn("Voice Modulation fallback:", e);
      return rawStream;
    }
  }

  private cleanupNodes() {
    this.activeNodes.forEach((node) => {
      try {
        if ("stop" in node && typeof (node as any).stop === "function") {
          (node as any).stop();
        }
        node.disconnect();
      } catch (e) {}
    });
    this.activeNodes = [];
  }

  private makeDistortionCurve(amount = 20): Float32Array {
    const k = amount;
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private makeBitcrusherCurve(steps = 8): Float32Array {
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = Math.round(x * steps) / steps;
    }
    return curve;
  }
}

export const voiceModulator = new VoiceModulatorManager();
