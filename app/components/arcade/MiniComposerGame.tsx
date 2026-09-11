"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Share2,
  Trash2,
  Delete,
  Music,
  Sparkles,
  Trophy,
  ArrowLeft,
  Check,
  BookOpen,
  Award,
  Users,
  Sliders,
} from "lucide-react";

export interface MiniComposerProps {
  match?: ArcadeMatch;
  currentUid?: string;
  isHost?: boolean;
  onBack?: () => void;
  onInviteFriend?: () => void;
  onRandomMatch?: () => void;
}

// ── Note Definitions ──
export interface PianoKeyDef {
  note: string; // e.g. "C4", "C#4", "D4"
  label: string; // "C", "C#", "D"
  freq: number;
  isBlack: boolean;
  whiteIndex: number; // 0 to 13
  staffStep: number; // Vertical staff line step (C4 = 0, D4 = 1, E4 = 2... B5 = 13)
  keyChar?: string; // PC keyboard shortcut
}

export const PIANO_KEYS: PianoKeyDef[] = [
  // Octave 4
  { note: "C4", label: "C", freq: 261.63, isBlack: false, whiteIndex: 0, staffStep: 0, keyChar: "A" },
  { note: "C#4", label: "C#", freq: 277.18, isBlack: true, whiteIndex: 0, staffStep: 0, keyChar: "W" },
  { note: "D4", label: "D", freq: 293.66, isBlack: false, whiteIndex: 1, staffStep: 1, keyChar: "S" },
  { note: "D#4", label: "D#", freq: 311.13, isBlack: true, whiteIndex: 1, staffStep: 1, keyChar: "E" },
  { note: "E4", label: "E", freq: 329.63, isBlack: false, whiteIndex: 2, staffStep: 2, keyChar: "D" },
  { note: "F4", label: "F", freq: 349.23, isBlack: false, whiteIndex: 3, staffStep: 3, keyChar: "F" },
  { note: "F#4", label: "F#", freq: 369.99, isBlack: true, whiteIndex: 3, staffStep: 3, keyChar: "T" },
  { note: "G4", label: "G", freq: 392.0, isBlack: false, whiteIndex: 4, staffStep: 4, keyChar: "G" },
  { note: "G#4", label: "G#", freq: 415.3, isBlack: true, whiteIndex: 4, staffStep: 4, keyChar: "Y" },
  { note: "A4", label: "A", freq: 440.0, isBlack: false, whiteIndex: 5, staffStep: 5, keyChar: "H" },
  { note: "A#4", label: "A#", freq: 466.16, isBlack: true, whiteIndex: 5, staffStep: 5, keyChar: "U" },
  { note: "B4", label: "B", freq: 493.88, isBlack: false, whiteIndex: 6, staffStep: 6, keyChar: "J" },

  // Octave 5
  { note: "C5", label: "C", freq: 523.25, isBlack: false, whiteIndex: 7, staffStep: 7, keyChar: "K" },
  { note: "C#5", label: "C#", freq: 554.37, isBlack: true, whiteIndex: 7, staffStep: 7, keyChar: "O" },
  { note: "D5", label: "D", freq: 587.33, isBlack: false, whiteIndex: 8, staffStep: 8, keyChar: "L" },
  { note: "D#5", label: "D#", freq: 622.25, isBlack: true, whiteIndex: 8, staffStep: 8, keyChar: "P" },
  { note: "E5", label: "E", freq: 659.25, isBlack: false, whiteIndex: 9, staffStep: 9, keyChar: ";" },
  { note: "F5", label: "F", freq: 698.46, isBlack: false, whiteIndex: 10, staffStep: 10, keyChar: "'" },
  { note: "F#5", label: "F#", freq: 739.99, isBlack: true, whiteIndex: 10, staffStep: 10, keyChar: "]" },
  { note: "G5", label: "G", freq: 783.99, isBlack: false, whiteIndex: 11, staffStep: 11, keyChar: "Z" },
  { note: "G#5", label: "G#", freq: 830.61, isBlack: true, whiteIndex: 11, staffStep: 11, keyChar: "X" },
  { note: "A5", label: "A", freq: 880.0, isBlack: false, whiteIndex: 12, staffStep: 12, keyChar: "C" },
  { note: "A#5", label: "A#", freq: 932.33, isBlack: true, whiteIndex: 12, staffStep: 12, keyChar: "V" },
  { note: "B5", label: "B", freq: 987.77, isBlack: false, whiteIndex: 13, staffStep: 13, keyChar: "B" },
];

export interface ComposedNote {
  id: number;
  note: string; // e.g. "C4" or "REST"
  isRest: boolean;
  duration: 1 | 2 | 4 | 8; // 1 = Whole, 2 = Half, 4 = Quarter, 8 = Eighth
  staffStep: number;
  isSharp: boolean;
}

export interface SongLesson {
  id: string;
  title: string;
  icon: string;
  notes: { note: string; duration: 1 | 2 | 4 | 8 }[];
}

export const PRESET_SONGS: SongLesson[] = [
  {
    id: "mario",
    title: "Super Mario Theme",
    icon: "🍄",
    notes: [
      { note: "E5", duration: 8 },
      { note: "E5", duration: 8 },
      { note: "REST", duration: 8 },
      { note: "E5", duration: 8 },
      { note: "REST", duration: 8 },
      { note: "C5", duration: 8 },
      { note: "E5", duration: 4 },
      { note: "G5", duration: 4 },
      { note: "REST", duration: 4 },
      { note: "G4", duration: 4 },
    ],
  },
  {
    id: "twinkle",
    title: "Twinkle Twinkle",
    icon: "⭐",
    notes: [
      { note: "C4", duration: 4 },
      { note: "C4", duration: 4 },
      { note: "G4", duration: 4 },
      { note: "G4", duration: 4 },
      { note: "A4", duration: 4 },
      { note: "A4", duration: 4 },
      { note: "G4", duration: 2 },
      { note: "F4", duration: 4 },
      { note: "F4", duration: 4 },
      { note: "E4", duration: 4 },
      { note: "E4", duration: 4 },
      { note: "D4", duration: 4 },
      { note: "D4", duration: 4 },
      { note: "C4", duration: 2 },
    ],
  },
  {
    id: "fur_elise",
    title: "Für Elise",
    icon: "🎹",
    notes: [
      { note: "E5", duration: 8 },
      { note: "D#5", duration: 8 },
      { note: "E5", duration: 8 },
      { note: "D#5", duration: 8 },
      { note: "E5", duration: 8 },
      { note: "B4", duration: 8 },
      { note: "D5", duration: 8 },
      { note: "C5", duration: 8 },
      { note: "A4", duration: 4 },
    ],
  },
  {
    id: "birthday",
    title: "Happy Birthday",
    icon: "🎂",
    notes: [
      { note: "C4", duration: 8 },
      { note: "C4", duration: 8 },
      { note: "D4", duration: 4 },
      { note: "C4", duration: 4 },
      { note: "F4", duration: 4 },
      { note: "E4", duration: 2 },
      { note: "C4", duration: 8 },
      { note: "C4", duration: 8 },
      { note: "D4", duration: 4 },
      { note: "C4", duration: 4 },
      { note: "G4", duration: 4 },
      { note: "F4", duration: 2 },
    ],
  },
  {
    id: "ode_joy",
    title: "Ode to Joy",
    icon: "🕊️",
    notes: [
      { note: "E4", duration: 4 },
      { note: "E4", duration: 4 },
      { note: "F4", duration: 4 },
      { note: "G4", duration: 4 },
      { note: "G4", duration: 4 },
      { note: "F4", duration: 4 },
      { note: "E4", duration: 4 },
      { note: "D4", duration: 4 },
      { note: "C4", duration: 4 },
      { note: "C4", duration: 4 },
      { note: "D4", duration: 4 },
      { note: "E4", duration: 4 },
      { note: "E4", duration: 4 },
      { note: "D4", duration: 8 },
      { note: "D4", duration: 2 },
    ],
  },
];

type InstrumentType = "piano" | "music_box" | "chiptune" | "rhodes";
type GameMode = "compose" | "learn" | "memory";

export default function MiniComposerGame({
  match,
  currentUid,
  isHost,
  onBack,
  onInviteFriend,
  onRandomMatch,
}: MiniComposerProps) {
  const staffCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── Audio Engine Context Ref ──
  const audioCtxRef = useRef<AudioContext | null>(null);

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

  // ── State ──
  const [instrument, setInstrument] = useState<InstrumentType>("piano");
  const [gameMode, setGameMode] = useState<GameMode>("compose");
  const [tempoBpm, setTempoBpm] = useState<number>(100);
  const [selectedDuration, setSelectedDuration] = useState<1 | 2 | 4 | 8>(4);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePlayheadIndex, setActivePlayheadIndex] = useState<number | null>(null);
  const [pressedKeyNotes, setPressedKeyNotes] = useState<Record<string, boolean>>({});
  const [copiedShare, setCopiedShare] = useState(false);

  // Composed Notes List
  const [notes, setNotes] = useState<ComposedNote[]>([
    { id: 1, note: "C4", isRest: false, duration: 4, staffStep: 0, isSharp: false },
    { id: 2, note: "E4", isRest: false, duration: 4, staffStep: 2, isSharp: false },
    { id: 3, note: "G4", isRest: false, duration: 4, staffStep: 4, isSharp: false },
    { id: 4, note: "F#4", isRest: false, duration: 4, staffStep: 3, isSharp: true },
    { id: 5, note: "B4", isRest: false, duration: 4, staffStep: 6, isSharp: false },
  ]);

  // Learn Mode State
  const [currentLesson, setCurrentLesson] = useState<SongLesson>(PRESET_SONGS[0]);
  const [lessonStep, setLessonStep] = useState(0);
  const [lessonScore, setLessonScore] = useState(0);

  // Memory Challenge State
  const [memorySequence, setMemorySequence] = useState<string[]>([]);
  const [memoryStep, setMemoryStep] = useState(0);
  const [memoryRound, setMemoryRound] = useState(1);
  const [memoryPlaying, setMemoryPlaying] = useState(false);

  // ── Procedural Web Audio Synthesizer ──
  const playSoundNote = useCallback(
    (freq: number, durationSec = 0.5) => {
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;

        if (instrument === "piano") {
          // Acoustic Grand Piano: rich multi-harmonic additive synthesis
          const fund = ctx.createOscillator();
          const harm2 = ctx.createOscillator();
          const harm3 = ctx.createOscillator();
          const gain = ctx.createGain();

          fund.type = "sine";
          fund.frequency.setValueAtTime(freq, now);

          harm2.type = "triangle";
          harm2.frequency.setValueAtTime(freq * 2, now);

          harm3.type = "sine";
          harm3.frequency.setValueAtTime(freq * 3, now);

          // Piano felt strike impulse & decay curve
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.4, now + 0.012); // Crisp attack
          gain.gain.exponentialRampToValueAtTime(0.15, now + 0.15); // Hammer ring
          gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec + 0.6); // Warm acoustic tail

          fund.connect(gain);
          harm2.connect(gain);
          harm3.connect(gain);
          gain.connect(ctx.destination);

          fund.start(now);
          harm2.start(now);
          harm3.start(now);

          fund.stop(now + durationSec + 0.6);
          harm2.stop(now + durationSec + 0.6);
          harm3.stop(now + durationSec + 0.6);
        } else if (instrument === "music_box") {
          // Music Box: high pure sine tines with crystalline shimmer
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq * 2, now);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec + 0.8);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + durationSec + 0.8);
        } else if (instrument === "chiptune") {
          // 8-Bit NES retro pulse wave
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + durationSec);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + durationSec);
        } else if (instrument === "rhodes") {
          // Warm Electric Rhodes Piano: soft sine with gentle tremolo
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.01, now);
          gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.08, now + 0.3);
          gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + durationSec + 0.5);
        }
      } catch {}
    },
    [getAudioContext, instrument]
  );

  // ── Tap Piano Key Handler ──
  const handleKeyTrigger = useCallback(
    (keyDef: PianoKeyDef) => {
      // Audio sound
      playSoundNote(keyDef.freq, 0.4);

      // Tactile UI feedback
      setPressedKeyNotes((prev) => ({ ...prev, [keyDef.note]: true }));
      setTimeout(() => {
        setPressedKeyNotes((prev) => ({ ...prev, [keyDef.note]: false }));
      }, 180);

      // Mode logic: Free Compose
      if (gameMode === "compose") {
        setNotes((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            note: keyDef.note,
            isRest: false,
            duration: selectedDuration,
            staffStep: keyDef.staffStep,
            isSharp: keyDef.isBlack,
          },
        ]);
      } else if (gameMode === "learn") {
        // Mode logic: Learn / Song Tutor
        const target = currentLesson.notes[lessonStep];
        if (target && target.note === keyDef.note) {
          setLessonScore((s) => s + 50);
          setLessonStep((step) => {
            const next = step + 1;
            if (next >= currentLesson.notes.length) {
              // Completed song!
              if (match) {
                updateArcadeGameScore(match.id, currentUid || "player", "mini_composer", lessonScore + 500, true);
              }
              return 0; // Loop or finish
            }
            return next;
          });
        }
      } else if (gameMode === "memory" && !memoryPlaying) {
        // Memory sequence check
        const targetNote = memorySequence[memoryStep];
        if (targetNote === keyDef.note) {
          if (memoryStep + 1 >= memorySequence.length) {
            // Completed sequence! Advance round
            setMemoryRound((r) => r + 1);
            setMemoryStep(0);
            setTimeout(() => {
              startMemoryRound(memoryRound + 1);
            }, 800);
          } else {
            setMemoryStep((s) => s + 1);
          }
        } else {
          // Mistake! Replay
          arcadeSfx.playButtonTap();
          setMemoryStep(0);
        }
      }
    },
    [
      currentLesson.notes,
      currentUid,
      gameMode,
      lessonScore,
      lessonStep,
      match,
      memoryPlaying,
      memoryRound,
      memorySequence,
      memoryStep,
      playSoundNote,
      selectedDuration,
    ]
  );

  // ── Rest Note Insertion ──
  const handleInsertRest = () => {
    arcadeSfx.playButtonTap();
    setNotes((prev) => [
      ...prev,
      {
        id: Date.now(),
        note: "REST",
        isRest: true,
        duration: selectedDuration,
        staffStep: 4,
        isSharp: false,
      },
    ]);
  };

  // ── Backspace / Delete Last Note ──
  const handleDeleteLast = () => {
    arcadeSfx.playButtonTap();
    setNotes((prev) => prev.slice(0, -1));
  };

  // ── Clear All Notes ──
  const handleClearAll = () => {
    arcadeSfx.playButtonTap();
    setNotes([]);
    setActivePlayheadIndex(null);
  };

  // ── Memory Round Generator ──
  const startMemoryRound = useCallback(
    (roundNum: number) => {
      const pool = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];
      const length = Math.min(8, 2 + roundNum);
      const newSeq: string[] = [];
      for (let i = 0; i < length; i++) {
        newSeq.push(pool[Math.floor(Math.random() * pool.length)]);
      }
      setMemorySequence(newSeq);
      setMemoryStep(0);
      setMemoryPlaying(true);

      // Play each note in sequence
      newSeq.forEach((n, idx) => {
        setTimeout(() => {
          const keyDef = PIANO_KEYS.find((k) => k.note === n);
          if (keyDef) {
            playSoundNote(keyDef.freq, 0.4);
            setPressedKeyNotes((prev) => ({ ...prev, [n]: true }));
            setTimeout(() => setPressedKeyNotes((prev) => ({ ...prev, [n]: false })), 220);
          }
          if (idx === newSeq.length - 1) {
            setMemoryPlaying(false);
          }
        }, (idx + 1) * 550);
      });
    },
    [playSoundNote]
  );

  // Switch to Memory mode
  useEffect(() => {
    if (gameMode === "memory") {
      startMemoryRound(1);
    }
  }, [gameMode, startMemoryRound]);

  // ── Playback Engine (sweeping playhead cursor) ──
  useEffect(() => {
    if (!isPlaying || notes.length === 0) {
      setActivePlayheadIndex(null);
      return;
    }

    let currentIndex = 0;
    let timer: NodeJS.Timeout;

    const playStep = () => {
      if (currentIndex >= notes.length) {
        setIsPlaying(false);
        setActivePlayheadIndex(null);
        return;
      }

      const note = notes[currentIndex];
      setActivePlayheadIndex(currentIndex);

      if (!note.isRest) {
        const keyDef = PIANO_KEYS.find((k) => k.note === note.note);
        if (keyDef) {
          const durationMultiplier = 4 / note.duration;
          const noteSec = (60 / tempoBpm) * durationMultiplier;
          playSoundNote(keyDef.freq, noteSec * 0.85);
          setPressedKeyNotes((prev) => ({ ...prev, [note.note]: true }));
          setTimeout(() => {
            setPressedKeyNotes((prev) => ({ ...prev, [note.note]: false }));
          }, noteSec * 750);
        }
      }

      const stepMs = (60 / tempoBpm) * (4 / note.duration) * 1000;
      currentIndex++;
      timer = setTimeout(playStep, stepMs);
    };

    playStep();
    return () => clearTimeout(timer);
  }, [isPlaying, notes, playSoundNote, tempoBpm]);

  // ── PC Keyboard Listener ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const keyChar = e.key.toUpperCase();
      const matched = PIANO_KEYS.find((k) => k.keyChar === keyChar);
      if (matched && !e.repeat) {
        handleKeyTrigger(matched);
      }
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
      if (e.code === "Backspace") {
        handleDeleteLast();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKeyTrigger]);

  // ── Sheet Music Canvas Renderer ──
  useEffect(() => {
    const canvas = staffCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Dimensions
    const w = canvas.width;
    const h = canvas.height;

    // Clear with classic crisp sheet music ivory paper
    ctx.fillStyle = "#fafaf9";
    ctx.fillRect(0, 0, w, h);

    // Subtle paper texture gradient
    const paperGrad = ctx.createLinearGradient(0, 0, 0, h);
    paperGrad.addColorStop(0, "#ffffff");
    paperGrad.addColorStop(1, "#f5f5f4");
    ctx.fillStyle = paperGrad;
    ctx.fillRect(0, 0, w, h);

    // 5 Horizontal Staff Lines
    // Position lines at y = 50, 62, 74, 86, 98 (spacing = 12px)
    const staffTop = 48;
    const lineGap = 12;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1.2;

    for (let i = 0; i < 5; i++) {
      const ly = staffTop + i * lineGap;
      ctx.beginPath();
      ctx.moveTo(12, ly);
      ctx.lineTo(w - 12, ly);
      ctx.stroke();
    }

    // Bar line at start
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, staffTop);
    ctx.lineTo(12, staffTop + 4 * lineGap);
    ctx.stroke();

    // 𝄞 Treble Clef Graphic
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 52px serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("𝄞", 16, staffTop + 2 * lineGap + 4);

    // Determine notes to render (either user notes, or lesson notes)
    const activeNotes =
      gameMode === "learn"
        ? currentLesson.notes.map((n, i) => {
            const k = PIANO_KEYS.find((pk) => pk.note === n.note);
            return {
              id: i,
              note: n.note,
              isRest: n.note === "REST",
              duration: n.duration,
              staffStep: k ? k.staffStep : 4,
              isSharp: k ? k.isBlack : false,
            };
          })
        : notes;

    // Note layout parameters
    const noteStartX = 72;
    const noteSpacing = Math.min(38, (w - noteStartX - 24) / Math.max(8, activeNotes.length));

    // Render Notes
    activeNotes.forEach((note, idx) => {
      const nx = noteStartX + idx * noteSpacing;
      const isCur = activePlayheadIndex === idx;
      const isTargetInLesson = gameMode === "learn" && lessonStep === idx;

      // Vertical Y calculation based on staffStep:
      // Middle C (C4, staffStep 0) is below bottom staff line at y = 110
      // D4 (1) is space below = 104
      // E4 (2, bottom line) = 96
      // F4 (3, 1st space) = 90
      // G4 (4, 2nd line) = 84
      // A4 (5, 2nd space) = 78
      // B4 (6, 3rd line) = 72
      // C5 (7, 3rd space) = 66
      // D5 (8, 4th line) = 60
      // E5 (9, 4th space) = 54
      // F5 (10, top line) = 48
      // G5 (11, space above) = 42
      // A5 (12, line above) = 36
      // B5 (13, space above line) = 30
      const ny = 110 - note.staffStep * 6;

      // Highlight active note
      if (isCur || isTargetInLesson) {
        ctx.fillStyle = isTargetInLesson ? "rgba(234, 179, 8, 0.25)" : "rgba(56, 189, 248, 0.25)";
        ctx.beginPath();
        ctx.arc(nx, ny, 16, 0, Math.PI * 2);
        ctx.fill();
      }

      if (note.isRest) {
        // Quarter Rest Symbol 𝄽
        ctx.fillStyle = isCur ? "#0284c7" : "#334155";
        ctx.font = "bold 20px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("𝄽", nx, staffTop + 2 * lineGap);
      } else {
        // Sharp symbol (♯)
        if (note.isSharp) {
          ctx.fillStyle = isCur ? "#0284c7" : isTargetInLesson ? "#eab308" : "#0f172a";
          ctx.font = "bold 13px sans-serif";
          ctx.textAlign = "right";
          ctx.fillText("♯", nx - 8, ny + 4);
        }

        // Ledger Lines (for Middle C4 or high notes)
        if (note.staffStep <= 0) {
          // Ledger line for C4
          ctx.strokeStyle = "#475569";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(nx - 8, 110);
          ctx.lineTo(nx + 8, 110);
          ctx.stroke();
        } else if (note.staffStep >= 12) {
          // Ledger line for A5 / B5
          ctx.strokeStyle = "#475569";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(nx - 8, 36);
          ctx.lineTo(nx + 8, 36);
          ctx.stroke();
        }

        // Notehead
        ctx.fillStyle = isCur ? "#0284c7" : isTargetInLesson ? "#eab308" : "#0f172a";
        ctx.save();
        ctx.translate(nx, ny);
        ctx.rotate(-0.35); // Classic musical note tilt

        // Filled or open notehead
        ctx.beginPath();
        ctx.ellipse(0, 0, 6, 4.2, 0, 0, Math.PI * 2);

        if (note.duration === 1 || note.duration === 2) {
          // Open notehead for half and whole notes
          ctx.fill();
          ctx.fillStyle = "#fafaf9";
          ctx.beginPath();
          ctx.ellipse(0, 0, 3.5, 2.2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fill();
        }
        ctx.restore();

        // Note Stem (for all notes except whole note duration 1)
        if (note.duration !== 1) {
          ctx.strokeStyle = isCur ? "#0284c7" : isTargetInLesson ? "#eab308" : "#0f172a";
          ctx.lineWidth = 1.6;
          ctx.beginPath();

          // If note is on or above B4 (staffStep 6), stem points DOWN on the left side
          // If note is below B4, stem points UP on the right side
          if (note.staffStep >= 6) {
            ctx.moveTo(nx - 5, ny);
            ctx.lineTo(nx - 5, ny + 26);
            ctx.stroke();
            // Eighth note flag
            if (note.duration === 8) {
              ctx.beginPath();
              ctx.moveTo(nx - 5, ny + 26);
              ctx.quadraticCurveTo(nx - 1, ny + 20, nx, ny + 14);
              ctx.stroke();
            }
          } else {
            ctx.moveTo(nx + 5, ny);
            ctx.lineTo(nx + 5, ny - 26);
            ctx.stroke();
            // Eighth note flag
            if (note.duration === 8) {
              ctx.beginPath();
              ctx.moveTo(nx + 5, ny - 26);
              ctx.quadraticCurveTo(nx + 9, ny - 20, nx + 10, ny - 14);
              ctx.stroke();
            }
          }
        }
      }
    });

    // Sweeping Animated Playhead Cursor Line
    if (activePlayheadIndex !== null && activeNotes[activePlayheadIndex]) {
      const cursorX = noteStartX + activePlayheadIndex * noteSpacing;
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cursorX, 20);
      ctx.lineTo(cursorX, h - 16);
      ctx.stroke();

      // Top & bottom cursor dots
      ctx.fillStyle = "#eab308";
      ctx.beginPath();
      ctx.arc(cursorX, 20, 3.5, 0, Math.PI * 2);
      ctx.arc(cursorX, h - 16, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [activePlayheadIndex, currentLesson.notes, gameMode, lessonStep, notes]);

  // Copy shareable song notes
  const handleShareSong = () => {
    const text = notes.map((n) => (n.isRest ? "REST" : n.note)).join(" - ");
    navigator.clipboard?.writeText?.(`🎼 Mini Composer Tune: ${text}`);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const whiteKeys = PIANO_KEYS.filter((k) => !k.isBlack);
  const blackKeys = PIANO_KEYS.filter((k) => k.isBlack);

  return (
    <div className="flex flex-col items-center justify-center w-full select-none">
      {/* ── Main Container matching the Mobile Reference App ── */}
      <div className="relative w-full max-w-[420px] bg-white rounded-3xl overflow-hidden border-4 border-neutral-800 shadow-2xl flex flex-col">
        {/* ── 1. Top Header (Icon + Title + Share) ── */}
        <div className="bg-white px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Blue Music Icon */}
            <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-black font-sans text-neutral-900 tracking-tight leading-tight">
                Mini Composer
              </h1>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-500">
                <span>{instrument.toUpperCase()}</span>
                <span>•</span>
                <span>{tempoBpm} BPM</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleShareSong}
              className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 active:scale-95 transition-all cursor-pointer"
              title="Share Melody"
            >
              {copiedShare ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </button>

            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 active:scale-95 transition-all cursor-pointer"
                title="Exit"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── 2. Mode Selector Pills ── */}
        <div className="bg-neutral-50 px-3 py-1.5 border-b border-neutral-200 flex items-center justify-between text-[11px] font-mono font-bold">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setGameMode("compose")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                gameMode === "compose" ? "bg-blue-600 text-white shadow" : "text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              FREE COMPOSE
            </button>
            <button
              onClick={() => setGameMode("learn")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                gameMode === "learn" ? "bg-emerald-600 text-white shadow" : "text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>LEARN SONGS</span>
            </button>
            <button
              onClick={() => setGameMode("memory")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                gameMode === "memory" ? "bg-amber-600 text-white shadow" : "text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              <Award className="w-3 h-3" />
              <span>EAR GAME</span>
            </button>
          </div>

          {/* Instrument Dropdown */}
          <select
            value={instrument}
            onChange={(e) => setInstrument(e.target.value as InstrumentType)}
            className="bg-white border border-neutral-300 rounded-lg px-2 py-0.5 text-[10px] font-mono text-neutral-700 outline-none cursor-pointer"
          >
            <option value="piano">PIANO</option>
            <option value="music_box">MUSIC BOX</option>
            <option value="chiptune">8-BIT</option>
            <option value="rhodes">RHODES</option>
          </select>
        </div>

        {/* ── 3. Top Toolbar (Matching User's Screenshot Exactly) ── */}
        {gameMode === "compose" ? (
          <div className="bg-neutral-100 px-3 py-2 border-b border-neutral-300 flex items-center justify-between">
            {/* Play Button */}
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className={`px-3 py-1.5 rounded-xl font-bold font-sans text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer ${
                isPlaying ? "bg-amber-500 text-white" : "bg-neutral-900 hover:bg-black text-white"
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>

            {/* Divider */}
            <div className="w-[1px] h-6 bg-neutral-300 mx-1" />

            {/* Rest Button 𝄽 */}
            <button
              onClick={handleInsertRest}
              className="w-8 h-8 rounded-xl bg-white border border-neutral-300 hover:bg-neutral-50 active:scale-95 text-base flex items-center justify-center text-neutral-800 shadow-sm cursor-pointer font-serif"
              title="Insert Rest"
            >
              𝄽
            </button>

            {/* Duration Buttons: 1 (whole), 2 (half), 4 (quarter), 8 (eighth) */}
            <div className="flex items-center gap-1">
              {([1, 2, 4, 8] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDuration(d)}
                  className={`w-7 h-8 rounded-xl font-bold text-xs font-mono transition-all cursor-pointer flex items-center justify-center border ${
                    selectedDuration === d
                      ? "bg-blue-600 border-blue-700 text-white shadow-sm"
                      : "bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                  }`}
                  title={`${d === 1 ? "Whole" : d === 2 ? "Half" : d === 4 ? "Quarter" : "Eighth"} Note`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Delete & Trash */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleDeleteLast}
                className="w-8 h-8 rounded-xl bg-white border border-neutral-300 hover:bg-neutral-50 active:scale-95 text-neutral-600 flex items-center justify-center shadow-sm cursor-pointer"
                title="Backspace / Delete Last"
              >
                <Delete className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleClearAll}
                className="w-8 h-8 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 active:scale-95 text-red-600 flex items-center justify-center shadow-sm cursor-pointer"
                title="Clear All"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : gameMode === "learn" ? (
          /* Learn Song Selector Bar */
          <div className="bg-emerald-50 px-3 py-2 border-b border-emerald-200 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-base">{currentLesson.icon}</span>
              <select
                value={currentLesson.id}
                onChange={(e) => {
                  const s = PRESET_SONGS.find((p) => p.id === e.target.value);
                  if (s) {
                    setCurrentLesson(s);
                    setLessonStep(0);
                  }
                }}
                className="bg-white border border-emerald-300 rounded-lg px-2 py-1 font-bold text-emerald-900 outline-none cursor-pointer"
              >
                {PRESET_SONGS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 font-bold text-emerald-800">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>{lessonScore} pts</span>
            </div>
          </div>
        ) : (
          /* Ear Memory Challenge Bar */
          <div className="bg-amber-50 px-3 py-2 border-b border-amber-200 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-base">👂</span>
              <span className="font-bold text-amber-900">ROUND {memoryRound}</span>
              <span className="text-neutral-500">
                ({memoryStep}/{memorySequence.length} notes)
              </span>
            </div>

            <button
              onClick={() => startMemoryRound(memoryRound)}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] cursor-pointer"
            >
              REPLAY MELODY
            </button>
          </div>
        )}

        {/* ── 4. Sheet Music Staff Canvas (Upper Area) ── */}
        <div className="relative w-full bg-[#fafaf9] border-b border-neutral-300">
          <canvas
            ref={staffCanvasRef}
            width={420}
            height={150}
            className="w-full h-auto block"
          />

          {/* Learn Mode Next Key Hint Pill */}
          {gameMode === "learn" && currentLesson.notes[lessonStep] && (
            <div className="absolute top-2 right-2 bg-emerald-600/90 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 shadow">
              <span>NEXT NOTE:</span>
              <span className="underline">{currentLesson.notes[lessonStep].note}</span>
            </div>
          )}
        </div>

        {/* ── 5. Interactive Piano Keyboard (Lower Area matching the uploaded screenshot!) ── */}
        <div className="relative w-full bg-neutral-900 pt-2 pb-6 px-1 select-none">
          {/* White Keys Container */}
          <div className="relative flex w-full h-44 rounded-b-2xl overflow-hidden bg-neutral-200 border-2 border-neutral-300 shadow-inner">
            {whiteKeys.map((k) => {
              const isPressed = pressedKeyNotes[k.note];
              const isTargetNext =
                gameMode === "learn" && currentLesson.notes[lessonStep]?.note === k.note;

              return (
                <button
                  key={k.note}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleKeyTrigger(k);
                  }}
                  className={`relative flex-1 h-full border-r border-neutral-300 rounded-b-md flex flex-col justify-end items-center pb-2 cursor-pointer transition-all ${
                    isPressed
                      ? "bg-blue-200 shadow-inner scale-y-[0.98]"
                      : isTargetNext
                      ? "bg-yellow-100 animate-pulse border-b-4 border-b-yellow-500"
                      : "bg-white hover:bg-neutral-50 active:bg-neutral-200"
                  }`}
                  title={`${k.note} (${k.keyChar ? `Key [${k.keyChar}]` : ""})`}
                >
                  {/* Note Label matching the screenshot: C, D, E, F, G, A, B... */}
                  <span
                    className={`font-sans font-bold text-xs select-none ${
                      isTargetNext ? "text-yellow-600 scale-125 font-black" : "text-neutral-400"
                    }`}
                  >
                    {k.label}
                  </span>
                </button>
              );
            })}

            {/* Black Keys Positioned Exactly on Top */}
            {blackKeys.map((k) => {
              const isPressed = pressedKeyNotes[k.note];
              const isTargetNext =
                gameMode === "learn" && currentLesson.notes[lessonStep]?.note === k.note;

              // Compute absolute percentage offset based on whiteIndex
              // 14 white keys total => each white key is 100 / 14 = 7.1428%
              // Black key sits centered between whiteIndex and whiteIndex + 1
              const leftPercent = ((k.whiteIndex + 1) * (100 / 14)) - (100 / 14) * 0.32;

              return (
                <button
                  key={k.note}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleKeyTrigger(k);
                  }}
                  style={{ left: `${leftPercent}%`, width: "4.8%" }}
                  className={`absolute top-0 h-28 rounded-b-md z-10 cursor-pointer shadow-lg transition-all ${
                    isPressed
                      ? "bg-blue-700 shadow-inner scale-y-[0.98]"
                      : isTargetNext
                      ? "bg-yellow-500 ring-2 ring-yellow-300 animate-pulse"
                      : "bg-neutral-900 hover:bg-neutral-800 active:bg-black"
                  }`}
                  title={`${k.note} (${k.keyChar ? `Key [${k.keyChar}]` : ""})`}
                >
                  <span className="sr-only">{k.label}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom helper instructions bar */}
          <div className="mt-2 text-center text-[10px] font-mono text-neutral-400 flex items-center justify-center gap-2">
            <span>🎹 Tap keys to play</span>
            <span>•</span>
            <span>Desktop: [A]-[;] White Keys, [W]-[P] Black Keys</span>
          </div>
        </div>
      </div>
    </div>
  );
}
