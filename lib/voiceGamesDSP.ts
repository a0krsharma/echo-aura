/**
 * lib/voiceGamesDSP.ts
 * ─────────────────────────────────────────────────────────────
 * Innovative Web Audio DSP Engine for Voice-Mechanic Games:
 * 1. Decibel Limbo (Real-time dB level analysis & threshold tripwires)
 * 2. Reverse Audio Echo (Synthesizer & reversed buffer audio challenges)
 * 3. Rapid-Fire Tongue Twisters (Timed syllabic speech challenges)
 * 4. Waveform Pitch Match (Real-time autocorrelation pitch detector)
 */

export class VoiceGamesDSP {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private pitchBuffer: Float32Array = new Float32Array(2048);

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
   * Initializes real-time analyser from a microphone MediaStream.
   */
  public initAnalyser(stream: MediaStream): AnalyserNode {
    const ctx = this.getContext();
    if (this.micSource) {
      try {
        this.micSource.disconnect();
      } catch (e) {}
    }
    this.micSource = ctx.createMediaStreamSource(stream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    this.micSource.connect(this.analyser);
    return this.analyser;
  }

  /**
   * Calculates current input volume level in Decibels (-100dB to 0dB) and RMS normalized (0-100).
   */
  public getDecibelLevel(): { db: number; normalizedPercent: number } {
    if (!this.analyser) return { db: -100, normalizedPercent: 0 };

    const buffer = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buffer);

    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sum / buffer.length);
    if (rms <= 0.00001) return { db: -100, normalizedPercent: 0 };

    const db = 20 * Math.log10(rms);
    // Map -60dB -> 0%, 0dB -> 100%
    const normalizedPercent = Math.max(0, Math.min(100, Math.round(((db + 60) / 60) * 100)));
    return { db: Math.round(db), normalizedPercent };
  }

  /**
   * Autocorrelation Pitch Detector (detects pitch in Hz: 50Hz to 1000Hz).
   */
  public detectPitch(): number | null {
    if (!this.analyser) return null;
    this.analyser.getFloatTimeDomainData(this.pitchBuffer as any);

    const buffer = this.pitchBuffer;
    const sampleRate = this.getContext().sampleRate;
    const bufferSize = buffer.length;

    // Check signal level
    let rms = 0;
    for (let i = 0; i < bufferSize; i++) {
      rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / bufferSize);
    if (rms < 0.015) return null; // Too quiet

    // Autocorrelation
    let r1 = 0;
    let r2 = bufferSize - 1;
    const thres = 0.2;
    for (let i = 0; i < bufferSize / 2; i++) {
      if (Math.abs(buffer[i]) < thres) {
        r1 = i;
        break;
      }
    }
    for (let i = 1; i < bufferSize / 2; i++) {
      if (Math.abs(buffer[bufferSize - i]) < thres) {
        r2 = bufferSize - i;
        break;
      }
    }

    const trimmed = buffer.slice(r1, r2);
    const c = new Array(trimmed.length).fill(0);
    for (let i = 0; i < trimmed.length; i++) {
      for (let j = 0; j < trimmed.length - i; j++) {
        c[i] = c[i] + trimmed[j] * trimmed[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1;
    let maxpos = -1;
    for (let i = d; i < trimmed.length; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }

    let T0 = maxpos;
    if (T0 === 0) return null;

    const x1 = c[T0 - 1];
    const x2 = c[T0];
    const x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    const freq = sampleRate / T0;
    if (freq >= 60 && freq <= 900) {
      return Math.round(freq);
    }
    return null;
  }

  /**
   * Synthesizes and plays a 3-second challenge sound snippet forward, then plays it in reverse.
   */
  public playReverseAudioSnippet(reversed = false) {
    try {
      const ctx = this.getContext();
      const length = ctx.sampleRate * 2.5;
      const audioBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = audioBuffer.getChannelData(0);

      // Synthesize a retro melodic chirp melody
      const notes = [261.63, 329.63, 392.0, 523.25, 659.25]; // C E G C E
      for (let i = 0; i < length; i++) {
        const t = i / ctx.sampleRate;
        const noteIdx = Math.min(notes.length - 1, Math.floor(t * 2));
        const freq = notes[noteIdx];
        data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-((t % 0.5) * 4));
      }

      if (reversed) {
        Array.prototype.reverse.call(data);
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    } catch (e) {
      console.warn("Reverse audio synth error:", e);
    }
  }
}

export const voiceGamesDSP = new VoiceGamesDSP();

// Tongue Twisters Catalog
export interface TongueTwisterItem {
  id: string;
  language: "HINDI" | "URDU" | "ENGLISH";
  text: string;
  transliteration?: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  timeLimitSec: number;
}

export const TONGUE_TWISTERS: TongueTwisterItem[] = [
  {
    id: "twister_1",
    language: "HINDI",
    text: "चंदू के चाचा ने चंदू की चाची को चांदनी चौक में चांदनी रात में चांदी के चम्मच से चटनी चटाई।",
    transliteration: "Chandu ke chacha ne Chandu ki chachi ko Chandni chowk mein...",
    difficulty: "EASY",
    timeLimitSec: 5,
  },
  {
    id: "twister_2",
    language: "HINDI",
    text: "खड़क सिंह के खड़कने से खड़कती हैं खिड़कियां, खिड़कियों के खड़कने से खड़कता है खड़क सिंह।",
    transliteration: "Khadak Singh ke khadakne se khadakti hain khidkiyan...",
    difficulty: "MEDIUM",
    timeLimitSec: 5,
  },
  {
    id: "twister_3",
    language: "HINDI",
    text: "पके पेड़ पर पका पपीता, पका पेड़ या पका पपीता, पके पेड़ को पकड़े पिंकू, पिंकू पकड़े पका पपीता।",
    transliteration: "Pake ped par paka papeeta, paka ped ya paka papeeta...",
    difficulty: "HARD",
    timeLimitSec: 5,
  },
  {
    id: "twister_4",
    language: "URDU",
    text: "कच्चा पापड़ पक्का पापड़, पक्का पापड़ कच्चा पापड़।",
    transliteration: "Kaccha Papad Pakka Papad, Pakka Papad Kaccha Papad...",
    difficulty: "MEDIUM",
    timeLimitSec: 4,
  },
  {
    id: "twister_5",
    language: "ENGLISH",
    text: "She sells seashells by the seashore, the shells she sells are surely seashells.",
    difficulty: "MEDIUM",
    timeLimitSec: 5,
  },
  {
    id: "twister_6",
    language: "ENGLISH",
    text: "Which witch wished which wicked wish while watching white watches?",
    difficulty: "HARD",
    timeLimitSec: 5,
  },
];
