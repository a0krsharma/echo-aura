"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import {
  ArrowLeft,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Trophy,
  Flame,
  Zap,
  Music,
  Play,
  Pause,
  Award,
} from "lucide-react";

export interface GuitarHeroProps {
  match?: ArcadeMatch;
  currentUid?: string;
  isHost?: boolean;
  onBack?: () => void;
  onInviteFriend?: () => void;
  onRandomMatch?: () => void;
}

// ── Types ──
type GuitarGameMode = "rhythm" | "strummer" | "fretboard";
type GuitarSoundType = "electric_rock" | "acoustic_steel";

interface NoteLane {
  lane: number; // 0: Green, 1: Red, 2: Yellow, 3: Blue, 4: Orange
  name: string;
  color: string;
  glowColor: string;
  keyLabel: string;
  pcKey: string;
  freq: number;
}

const LANES: NoteLane[] = [
  { lane: 0, name: "Green", color: "#22c55e", glowColor: "#4ade80", keyLabel: "1", pcKey: "KeyA", freq: 196.0 }, // G3
  { lane: 1, name: "Red", color: "#ef4444", glowColor: "#f87171", keyLabel: "2", pcKey: "KeyS", freq: 246.94 }, // B3
  { lane: 2, name: "Yellow", color: "#eab308", glowColor: "#facc15", keyLabel: "3", pcKey: "KeyD", freq: 293.66 }, // D4
  { lane: 3, name: "Blue", color: "#3b82f6", glowColor: "#60a5fa", keyLabel: "4", pcKey: "KeyJ", freq: 392.0 }, // G4
  { lane: 4, name: "Orange", color: "#f97316", glowColor: "#fb923c", keyLabel: "5", pcKey: "KeyK", freq: 440.0 }, // A4
];

interface FallingNote {
  id: number;
  lane: number;
  y: number; // 0 to 100 (% of highway length)
  hit: boolean;
  missed: boolean;
}

interface SongTrack {
  id: string;
  title: string;
  artist: string;
  tempoBpm: number;
  pattern: { lane: number; beat: number }[];
}

const ROCK_SONGS: SongTrack[] = [
  {
    id: "smoke",
    title: "Smoke On The Water",
    artist: "Deep Purple",
    tempoBpm: 110,
    pattern: [
      { lane: 0, beat: 0 },
      { lane: 1, beat: 1 },
      { lane: 2, beat: 2 },
      { lane: 0, beat: 3.5 },
      { lane: 1, beat: 4.5 },
      { lane: 3, beat: 5.5 },
      { lane: 2, beat: 6.5 },
      { lane: 0, beat: 8 },
      { lane: 1, beat: 9 },
      { lane: 2, beat: 10 },
      { lane: 1, beat: 11.5 },
      { lane: 0, beat: 12.5 },
    ],
  },
  {
    id: "rock_anthem",
    title: "High Voltage Shred",
    artist: "Echo Rockers",
    tempoBpm: 130,
    pattern: [
      { lane: 0, beat: 0 },
      { lane: 0, beat: 0.5 },
      { lane: 1, beat: 1 },
      { lane: 2, beat: 2 },
      { lane: 3, beat: 3 },
      { lane: 4, beat: 4 },
      { lane: 3, beat: 5 },
      { lane: 2, beat: 6 },
      { lane: 1, beat: 7 },
      { lane: 0, beat: 8 },
      { lane: 2, beat: 9 },
      { lane: 4, beat: 10 },
      { lane: 2, beat: 11 },
      { lane: 0, beat: 12 },
    ],
  },
  {
    id: "sweet_child",
    title: "Sweet Child Intro",
    artist: "Guns N' Roses",
    tempoBpm: 125,
    pattern: [
      { lane: 0, beat: 0 },
      { lane: 4, beat: 0.5 },
      { lane: 2, beat: 1 },
      { lane: 1, beat: 1.5 },
      { lane: 3, beat: 2 },
      { lane: 2, beat: 2.5 },
      { lane: 1, beat: 3 },
      { lane: 2, beat: 3.5 },
      { lane: 0, beat: 4 },
      { lane: 4, beat: 4.5 },
      { lane: 2, beat: 5 },
      { lane: 1, beat: 5.5 },
      { lane: 3, beat: 6 },
      { lane: 2, beat: 6.5 },
    ],
  },
];

// Acoustic 6-Strings
interface GuitarString {
  note: string;
  name: string;
  freq: number;
  thickness: number;
}

const GUITAR_STRINGS: GuitarString[] = [
  { note: "E2", name: "6th (Low E)", freq: 82.41, thickness: 4 },
  { note: "A2", name: "5th (A)", freq: 110.0, thickness: 3.4 },
  { note: "D3", name: "4th (D)", freq: 146.83, thickness: 2.8 },
  { note: "G3", name: "3rd (G)", freq: 196.0, thickness: 2.2 },
  { note: "B3", name: "2nd (B)", freq: 246.94, thickness: 1.6 },
  { note: "E4", name: "1st (High E)", freq: 329.63, thickness: 1.2 },
];

interface ChordPreset {
  name: string;
  frets: number[]; // -1 = mute, 0 = open, 1-4 = fret number for [E2, A2, D3, G3, B3, E4]
}

const CHORD_PRESETS: ChordPreset[] = [
  { name: "C Major", frets: [-1, 3, 2, 0, 1, 0] },
  { name: "G Major", frets: [3, 2, 0, 0, 3, 3] },
  { name: "D Major", frets: [-1, -1, 0, 2, 3, 2] },
  { name: "E Minor", frets: [0, 2, 2, 0, 0, 0] },
  { name: "A Minor", frets: [-1, 0, 2, 2, 1, 0] },
  { name: "F Major", frets: [1, 3, 3, 2, 1, 1] },
  { name: "E Major", frets: [0, 2, 2, 1, 0, 0] },
  { name: "A Major", frets: [-1, 0, 2, 2, 2, 0] },
];

export default function GuitarHeroGame({
  match,
  currentUid,
  isHost,
  onBack,
  onInviteFriend,
  onRandomMatch,
}: GuitarHeroProps) {
  const highwayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // ── Game State ──
  const [gameMode, setGameMode] = useState<GuitarGameMode>("rhythm");
  const [guitarSound, setGuitarSound] = useState<GuitarSoundType>("electric_rock");
  const [selectedSong, setSelectedSong] = useState<SongTrack>(ROCK_SONGS[0]);
  const [isPlayingRhythm, setIsPlayingRhythm] = useState(false);

  // Rhythm Metrics
  const [score, setScore] = useState(0);
  const [comboStreak, setComboStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [rockMeter, setRockMeter] = useState(50); // 0 (fail) to 100 (rocking)
  const [starPower, setStarPower] = useState(0); // 0 to 100
  const [hitFeedback, setHitFeedback] = useState<{ text: string; color: string; id: number } | null>(null);

  // Active pressed lanes
  const [activeLanePresses, setActiveLanePresses] = useState<boolean[]>([false, false, false, false, false]);

  // Falling notes queue
  const notesRef = useRef<FallingNote[]>([]);
  const songBeatRef = useRef(0);
  const nextNoteId = useRef(1);

  // Strummer Mode State
  const [activeChord, setActiveChord] = useState<ChordPreset>(CHORD_PRESETS[0]);
  const [vibratingStrings, setVibratingStrings] = useState<boolean[]>([false, false, false, false, false, false]);

  // Audio Context getter
  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }, []);

  // ── Procedural Web Audio Guitar Synthesizer (Electric & Acoustic) ──
  const playGuitarNote = useCallback(
    (freq: number, duration = 1.0) => {
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;

        if (guitarSound === "electric_rock") {
          // Electric Guitar: Sawtooth + Sub-oscillator + WaveShaper overdrive distortion + Cab filter
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          const shaper = ctx.createWaveShaper();
          const filter = ctx.createBiquadFilter();

          // Distortion Curve
          const n_samples = 44100;
          const curve = new Float32Array(n_samples);
          const deg = Math.PI / 180;
          const k = 50; // Overdrive crunch amount
          for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
          }
          shaper.curve = curve;
          shaper.oversample = "4x";

          // Frequencies
          osc1.type = "sawtooth";
          osc1.frequency.setValueAtTime(freq, now);
          osc2.type = "square";
          osc2.frequency.setValueAtTime(freq * 0.5, now); // Sub-octave power chord body

          // Cabinet Resonance Filter
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(2800, now);
          filter.Q.setValueAtTime(3.5, now);

          // Amp Envelope
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.28, now + 0.015); // Pick attack
          gain.gain.exponentialRampToValueAtTime(0.12, now + 0.2); // Power sustain
          gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.4); // Decay

          osc1.connect(shaper);
          osc2.connect(shaper);
          shaper.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + duration + 0.4);
          osc2.stop(now + duration + 0.4);
        } else {
          // Acoustic Steel-String Guitar: Pluck transient + warm wooden body resonance
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now);

          filter.type = "bandpass";
          filter.frequency.setValueAtTime(freq * 1.5, now);
          filter.Q.setValueAtTime(1.8, now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.35, now + 0.008); // Sharp finger pick
          gain.gain.exponentialRampToValueAtTime(0.08, now + 0.18);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.5);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + duration + 0.5);
        }
      } catch {}
    },
    [getAudioContext, guitarSound]
  );

  // Muffled miss sound
  const playMissMuffle = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(80, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  }, [getAudioContext]);

  // ── Hit Fret Lane Action (Rhythm Mode) ──
  const hitLane = useCallback(
    (laneIdx: number) => {
      // Audio & tactile feedback
      playGuitarNote(LANES[laneIdx].freq, 0.6);

      // Flash lane pad
      setActiveLanePresses((prev) => {
        const next = [...prev];
        next[laneIdx] = true;
        return next;
      });
      setTimeout(() => {
        setActiveLanePresses((prev) => {
          const next = [...prev];
          next[laneIdx] = false;
          return next;
        });
      }, 150);

      // Check falling notes in strike zone (target line at y = 84%)
      const strikeZoneY = 84;
      const hitTolerance = 14; // +/- 14% around strike line

      const targetNote = notesRef.current.find(
        (n) => n.lane === laneIdx && !n.hit && !n.missed && Math.abs(n.y - strikeZoneY) <= hitTolerance
      );

      if (targetNote) {
        targetNote.hit = true;
        const diff = Math.abs(targetNote.y - strikeZoneY);
        let pts = 100;
        let label = "PERFECT! 🔥";
        let col = "#4ade80";

        if (diff > 8) {
          pts = 50;
          label = "GOOD 👍";
          col = "#facc15";
        } else if (diff > 4) {
          pts = 80;
          label = "GREAT! ⚡";
          col = "#38bdf8";
        }

        setScore((s) => s + pts * multiplier);
        setComboStreak((c) => {
          const nextStreak = c + 1;
          if (nextStreak >= 30) setMultiplier(4);
          else if (nextStreak >= 20) setMultiplier(3);
          else if (nextStreak >= 10) setMultiplier(2);
          return nextStreak;
        });
        setRockMeter((m) => Math.min(100, m + 4));
        setStarPower((sp) => Math.min(100, sp + 3));
        setHitFeedback({ text: label, color: col, id: Date.now() });

        if (match) {
          updateArcadeGameScore(match.id, currentUid || "player", "guitar_hero", score + pts * multiplier, false);
        }
      } else {
        // Miss / Stray strum
        playMissMuffle();
        setComboStreak(0);
        setMultiplier(1);
        setRockMeter((m) => Math.max(0, m - 5));
        setHitFeedback({ text: "MISS! ❌", color: "#ef4444", id: Date.now() });
      }
    },
    [currentUid, match, multiplier, playGuitarNote, playMissMuffle, score]
  );

  // ── Keyboard Controls Listener ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === "Digit1" || code === "KeyA") hitLane(0);
      else if (code === "Digit2" || code === "KeyS") hitLane(1);
      else if (code === "Digit3" || code === "KeyD") hitLane(2);
      else if (code === "Digit4" || code === "KeyJ") hitLane(3);
      else if (code === "Digit5" || code === "KeyK") hitLane(4);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hitLane]);

  // ── Rhythm Highway Game Loop ──
  useEffect(() => {
    if (gameMode !== "rhythm" || !isPlayingRhythm) return;

    let animId: number;
    let lastTime = performance.now();
    const speedY = 0.55; // Note fall speed

    // Spawner timer based on song tempo
    const stepInterval = (60 / selectedSong.tempoBpm) * 500;
    let patternIndex = 0;

    const spawnTimer = setInterval(() => {
      if (patternIndex < selectedSong.pattern.length) {
        const item = selectedSong.pattern[patternIndex];
        notesRef.current.push({
          id: nextNoteId.current++,
          lane: item.lane,
          y: 0,
          hit: false,
          missed: false,
        });
        patternIndex = (patternIndex + 1) % selectedSong.pattern.length; // Loop song
      }
    }, stepInterval);

    const loop = () => {
      const canvas = highwayCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      // Update falling notes
      notesRef.current.forEach((n) => {
        n.y += speedY;
        // Check missed note past strike line
        if (!n.hit && !n.missed && n.y > 94) {
          n.missed = true;
          setComboStreak(0);
          setMultiplier(1);
          setRockMeter((m) => Math.max(0, m - 4));
        }
      });
      notesRef.current = notesRef.current.filter((n) => n.y <= 110);

      // ── Draw 3D Perspective Fretboard Highway ──
      // Dark rock stage backdrop
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, w, h);

      // Highway Trapezius (3D perspective: narrow at top, wide at bottom)
      const topW = w * 0.45;
      const botW = w * 0.94;
      const topX = (w - topW) / 2;
      const botX = (w - botW) / 2;

      ctx.beginPath();
      ctx.moveTo(topX, 20);
      ctx.lineTo(topX + topW, 20);
      ctx.lineTo(botX + botW, h - 20);
      ctx.lineTo(botX, h - 20);
      ctx.closePath();

      // Fretboard gradient
      const roadGrad = ctx.createLinearGradient(0, 20, 0, h - 20);
      roadGrad.addColorStop(0, "#18181b");
      roadGrad.addColorStop(0.5, "#27272a");
      roadGrad.addColorStop(1, "#09090b");
      ctx.fillStyle = roadGrad;
      ctx.fill();
      ctx.strokeStyle = "#52525b";
      ctx.lineWidth = 3;
      ctx.stroke();

      // 5 Track Lanes Lines
      for (let i = 0; i <= 5; i++) {
        const lxTop = topX + (topW / 5) * i;
        const lxBot = botX + (botW / 5) * i;
        ctx.strokeStyle = i === 0 || i === 5 ? "#a1a1aa" : "rgba(113, 113, 122, 0.4)";
        ctx.lineWidth = i === 0 || i === 5 ? 2.5 : 1.2;
        ctx.beginPath();
        ctx.moveTo(lxTop, 20);
        ctx.lineTo(lxBot, h - 20);
        ctx.stroke();
      }

      // Horizontal Fret Markers (perspective spacing)
      for (let f = 1; f <= 10; f++) {
        const fy = 20 + Math.pow(f / 10, 1.8) * (h - 40);
        const ratio = (fy - 20) / (h - 40);
        const fw = topW + (botW - topW) * ratio;
        const fx = (w - fw) / 2;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + fw, fy);
        ctx.stroke();
      }

      // Strike Target Line (at y = 84%)
      const strikeY = 20 + (h - 40) * 0.84;
      const strikeW = topW + (botW - topW) * 0.84;
      const strikeX = (w - strikeW) / 2;

      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(strikeX, strikeY);
      ctx.lineTo(strikeX + strikeW, strikeY);
      ctx.stroke();

      // Draw 5 Target Receiver Buttons at Strike Line
      LANES.forEach((l, idx) => {
        const laneW = strikeW / 5;
        const cx = strikeX + laneW * idx + laneW / 2;
        const isPressed = activeLanePresses[idx];

        // Glow ring
        ctx.fillStyle = isPressed ? l.color : "rgba(0, 0, 0, 0.8)";
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(cx, strikeY, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner core
        ctx.fillStyle = isPressed ? "#ffffff" : l.color;
        ctx.beginPath();
        ctx.arc(cx, strikeY, 6, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Falling Notes (3D scaling gems)
      notesRef.current.forEach((n) => {
        if (n.hit) return;
        const progress = n.y / 100;
        const ny = 20 + (h - 40) * progress;
        const curW = topW + (botW - topW) * progress;
        const curX = (w - curW) / 2;
        const laneW = curW / 5;
        const nx = curX + laneW * n.lane + laneW / 2;

        const laneDef = LANES[n.lane];
        const gemRadius = 6 + progress * 8;

        // Gem Body
        ctx.fillStyle = n.missed ? "#71717a" : laneDef.color;
        ctx.beginPath();
        ctx.arc(nx, ny, gemRadius, 0, Math.PI * 2);
        ctx.fill();

        // Specular 3D highlight
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(nx - gemRadius * 0.3, ny - gemRadius * 0.3, gemRadius * 0.35, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      clearInterval(spawnTimer);
      cancelAnimationFrame(animId);
    };
  }, [activeLanePresses, gameMode, isPlayingRhythm, selectedSong]);

  // ── Pluck Acoustic Guitar String ──
  const pluckString = (strIdx: number) => {
    const str = GUITAR_STRINGS[strIdx];
    const fret = activeChord.frets[strIdx];
    if (fret === -1) {
      // Muted string
      playMissMuffle();
      return;
    }

    // Fret pitch ratio: f * 2^(fret/12)
    const tunedFreq = str.freq * Math.pow(2, fret / 12);
    playGuitarNote(tunedFreq, 1.2);

    // Vibration feedback
    setVibratingStrings((prev) => {
      const next = [...prev];
      next[strIdx] = true;
      return next;
    });
    setTimeout(() => {
      setVibratingStrings((prev) => {
        const next = [...prev];
        next[strIdx] = false;
        return next;
      });
    }, 300);
  };

  // Strum entire chord (top to bottom arpeggio)
  const strumChord = () => {
    GUITAR_STRINGS.forEach((_, idx) => {
      setTimeout(() => {
        pluckString(idx);
      }, idx * 35);
    });
  };

  return (
    <div className="flex flex-col items-center justify-center w-full select-none">
      <div className="relative w-full max-w-[420px] bg-neutral-950 rounded-3xl overflow-hidden border-4 border-neutral-800 shadow-2xl flex flex-col">
        {/* ── 1. Top Header ── */}
        <div className="bg-neutral-900 px-4 py-3 border-b border-neutral-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-white shadow-md shadow-red-500/30">
              <span className="text-base">🎸</span>
            </div>
            <div>
              <h1 className="text-sm font-black font-mono text-white tracking-wider uppercase">Guitar Hero Studio</h1>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-400">
                <span className="text-amber-400 font-bold">{guitarSound === "electric_rock" ? "⚡ OVERDRIVE" : "🪵 ACOUSTIC"}</span>
                <span>•</span>
                <span>{gameMode.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Tone Switch */}
            <button
              onClick={() => setGuitarSound((s) => (s === "electric_rock" ? "acoustic_steel" : "electric_rock"))}
              className={`px-2 py-1 rounded-xl text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                guitarSound === "electric_rock"
                  ? "bg-red-950/80 border-red-500 text-red-300"
                  : "bg-amber-950/80 border-amber-500 text-amber-300"
              }`}
            >
              {guitarSound === "electric_rock" ? "⚡ ROCK" : "🪵 ACOUSTIC"}
            </button>

            {onBack && (
              <button
                onClick={onBack}
                className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white cursor-pointer"
                title="Exit"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── 2. Mode Switcher ── */}
        <div className="bg-neutral-900/60 px-3 py-2 border-b border-neutral-800 flex items-center justify-between text-[10px] font-mono font-bold">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setGameMode("rhythm");
                setIsPlayingRhythm(true);
              }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                gameMode === "rhythm" ? "bg-red-600 text-white shadow" : "text-neutral-400 hover:text-white"
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>RHYTHM HERO</span>
            </button>
            <button
              onClick={() => {
                setGameMode("strummer");
                setIsPlayingRhythm(false);
              }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                gameMode === "strummer" ? "bg-amber-600 text-white shadow" : "text-neutral-400 hover:text-white"
              }`}
            >
              <span>CHORD STRUMMER</span>
            </button>
          </div>

          {gameMode === "rhythm" && (
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold">{multiplier}x MULTI</span>
              <span className="text-neutral-300">{score} PTS</span>
            </div>
          )}
        </div>

        {/* ── 3. Main Gameplay Display ── */}
        {gameMode === "rhythm" ? (
          /* ── Rhythm Rocker Mode (Guitar Hero 3D Highway) ── */
          <div className="relative w-full bg-black">
            {/* Song Selector Header */}
            <div className="bg-neutral-900/90 px-3 py-1.5 flex items-center justify-between text-xs font-mono border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">TRACK:</span>
                <select
                  value={selectedSong.id}
                  onChange={(e) => {
                    const s = ROCK_SONGS.find((rs) => rs.id === e.target.value);
                    if (s) {
                      setSelectedSong(s);
                      notesRef.current = [];
                      setScore(0);
                      setComboStreak(0);
                    }
                  }}
                  className="bg-neutral-950 border border-neutral-700 rounded px-2 py-0.5 text-[10px] text-white outline-none cursor-pointer"
                >
                  {ROCK_SONGS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.tempoBpm} BPM)
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setIsPlayingRhythm((p) => !p)}
                className={`px-2.5 py-0.5 rounded font-bold text-[10px] flex items-center gap-1 cursor-pointer ${
                  isPlayingRhythm ? "bg-amber-600 text-white" : "bg-emerald-600 text-white"
                }`}
              >
                {isPlayingRhythm ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isPlayingRhythm ? "PAUSE" : "START"}</span>
              </button>
            </div>

            {/* 3D Highway Canvas */}
            <canvas
              ref={highwayCanvasRef}
              width={420}
              height={260}
              className="w-full h-auto block"
            />

            {/* Hit Rating Popup */}
            {hitFeedback && (
              <div
                key={hitFeedback.id}
                style={{ color: hitFeedback.color }}
                className="absolute top-12 left-1/2 -translate-x-1/2 font-black font-mono text-sm uppercase tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] animate-bounce"
              >
                {hitFeedback.text}
              </div>
            )}

            {/* Rock Meter & Star Power HUD */}
            <div className="bg-neutral-950 px-3 py-1.5 flex items-center justify-between border-t border-neutral-800 text-[10px] font-mono">
              {/* Rock Meter Bar */}
              <div className="flex items-center gap-1.5 flex-1 max-w-[140px]">
                <span className="text-neutral-400">ROCK:</span>
                <div className="flex-1 h-2 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    style={{ width: `${rockMeter}%` }}
                    className={`h-full transition-all ${
                      rockMeter > 60 ? "bg-emerald-500" : rockMeter > 30 ? "bg-amber-500" : "bg-red-500"
                    }`}
                  />
                </div>
              </div>

              {/* Star Power Meter */}
              <div className="flex items-center gap-1.5 flex-1 max-w-[140px]">
                <span className="text-amber-400 font-bold">STAR:</span>
                <div className="flex-1 h-2 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    style={{ width: `${starPower}%` }}
                    className="h-full bg-cyan-400 shadow-sm shadow-cyan-400 transition-all"
                  />
                </div>
              </div>

              <div className="text-neutral-400">
                COMBO: <span className="text-white font-bold">{comboStreak}</span>
              </div>
            </div>

            {/* 5 Fret Touch Action Buttons (Matching Guitar Hero Colors) */}
            <div className="grid grid-cols-5 gap-2 p-3 bg-neutral-900 border-t border-neutral-800">
              {LANES.map((l, idx) => (
                <button
                  key={l.name}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    hitLane(idx);
                  }}
                  style={{
                    backgroundColor: activeLanePresses[idx] ? l.glowColor : l.color,
                    borderColor: l.glowColor,
                  }}
                  className="h-14 rounded-2xl flex flex-col items-center justify-center text-black font-black font-mono shadow-lg active:scale-95 active:brightness-125 transition-transform cursor-pointer border-2"
                >
                  <span className="text-sm uppercase">{l.keyLabel}</span>
                  <span className="text-[9px] opacity-75 font-sans">[{l.pcKey.replace("Key", "")}]</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Acoustic Chord Strummer Mode ── */
          <div className="flex flex-col w-full bg-[#3e2723] p-4 text-white">
            {/* Chord Selection Buttons */}
            <div className="mb-3">
              <span className="text-[10px] font-mono text-amber-300 font-bold block mb-1.5 uppercase">
                Select Chord to Fret:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {CHORD_PRESETS.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => {
                      setActiveChord(c);
                      arcadeSfx.playButtonTap();
                    }}
                    className={`py-1.5 rounded-xl font-mono font-black text-xs transition-all cursor-pointer border ${
                      activeChord.name === c.name
                        ? "bg-amber-500 border-amber-400 text-black shadow-lg shadow-amber-500/40 scale-105"
                        : "bg-neutral-900/80 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive 6-String Guitar Soundhole & Fretboard */}
            <div className="relative w-full h-44 rounded-2xl bg-gradient-to-b from-[#4e342e] to-[#271b18] border-4 border-[#1a120f] shadow-2xl p-4 flex flex-col justify-between overflow-hidden">
              {/* Soundhole graphic in center */}
              <div className="absolute right-8 top-1/2 -translate-y-1/2 w-28 h-28 rounded-full bg-black border-4 border-amber-800/60 shadow-inner flex items-center justify-center opacity-80 pointer-events-none">
                <div className="w-20 h-20 rounded-full border border-amber-700/40" />
              </div>

              {/* 6 Guitar Strings */}
              {GUITAR_STRINGS.map((str, idx) => {
                const isVibrating = vibratingStrings[idx];
                const fret = activeChord.frets[idx];

                return (
                  <div
                    key={str.note}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      pluckString(idx);
                    }}
                    className="relative flex items-center justify-between cursor-pointer py-1 group"
                  >
                    {/* String label & fret indicator */}
                    <div className="flex items-center gap-2 z-10">
                      <span className="w-6 text-[10px] font-mono font-bold text-amber-200">{str.note}</span>
                      <span className="text-[9px] font-mono text-neutral-400">
                        {fret === -1 ? "✕" : fret === 0 ? "O" : `Fret ${fret}`}
                      </span>
                    </div>

                    {/* The vibrating string line */}
                    <div
                      style={{
                        height: `${str.thickness}px`,
                        backgroundColor: isVibrating ? "#fef08a" : idx < 3 ? "#d97706" : "#e2e8f0",
                        transform: isVibrating ? "translateY(2px)" : "none",
                      }}
                      className="flex-1 mx-3 rounded-full transition-transform shadow"
                    />

                    {/* Pluck button indicator */}
                    <span className="text-[10px] font-mono text-neutral-400 group-hover:text-amber-300 font-bold z-10">
                      PLUCK
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Strum All Chords Bar */}
            <div className="mt-3 flex items-center justify-center">
              <button
                type="button"
                onClick={strumChord}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-mono font-black text-sm uppercase tracking-wider shadow-xl shadow-amber-600/30 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>STRUM {activeChord.name.toUpperCase()}</span>
                <span>🎸</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer info bar */}
        <div className="bg-black/95 px-4 py-2 text-[9px] font-mono text-neutral-400 text-center border-t border-neutral-900 flex items-center justify-center gap-2">
          <span>🎸 Rhythm Keys: [1-5] or [A, S, D, J, K]</span>
          <span>•</span>
          <span>Tap Strings to Pluck</span>
        </div>
      </div>
    </div>
  );
}
