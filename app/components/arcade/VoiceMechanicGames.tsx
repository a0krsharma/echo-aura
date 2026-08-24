"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Volume2,
  Zap,
  Flame,
  Clock,
  Check,
  X,
  RotateCcw,
  Sparkles,
  Award,
  Activity,
  AlertCircle,
} from "lucide-react";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  voiceGamesDSP,
  TONGUE_TWISTERS,
  type TongueTwisterItem,
} from "@/lib/voiceGamesDSP";

type VoiceGameType = "DECIBEL_LIMBO" | "REVERSE_ECHO" | "TONGUE_TWISTER" | "PITCH_MATCH";

export default function VoiceMechanicGames() {
  const [activeGame, setActiveGame] = useState<VoiceGameType>("DECIBEL_LIMBO");
  const [isMicActive, setIsMicActive] = useState<boolean>(false);

  // 1. Decibel Limbo State
  const [limboMode, setLimboMode] = useState<"WHISPER" | "SCREAM">("WHISPER");
  const [currentDb, setCurrentDb] = useState<number>(-100);
  const [dbPercent, setDbPercent] = useState<number>(0);
  const [isLimboTripped, setIsLimboTripped] = useState<boolean>(false);
  const [limboScore, setLimboScore] = useState<number>(0);

  // 2. Reverse Audio Echo State
  const [reverseSnippetPlaying, setReverseSnippetPlaying] = useState<boolean>(false);
  const [reverseGuessed, setReverseGuessed] = useState<boolean>(false);

  // 3. Tongue Twister State
  const [twisterIdx, setTwisterIdx] = useState<number>(0);
  const [twisterTimer, setTwisterTimer] = useState<number>(5);
  const [isTwisterRunning, setIsTwisterRunning] = useState<boolean>(false);
  const [twisterPassed, setTwisterPassed] = useState<boolean>(false);

  // 4. Waveform Pitch Match State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentPitchHz, setCurrentPitchHz] = useState<number | null>(null);
  const [targetPitchHz, setTargetPitchHz] = useState<number>(260); // C4 ~ 261Hz
  const [pitchAccuracy, setPitchAccuracy] = useState<number>(0);

  // Initialize Microphone for DSP
  const handleStartMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceGamesDSP.initAnalyser(stream);
      setIsMicActive(true);
      soundSynth.playSubtlePop();
    } catch (e) {
      console.warn("Microphone access failed:", e);
    }
  };

  // Real-time audio polling loop for Decibel Limbo & Pitch Match
  useEffect(() => {
    if (!isMicActive) return;

    const interval = setInterval(() => {
      // 1. Decibel Limbo Processing
      const { db, normalizedPercent } = voiceGamesDSP.getDecibelLevel();
      setCurrentDb(db);
      setDbPercent(normalizedPercent);

      if (limboMode === "WHISPER") {
        // Ceiling is -25dB. If louder, trip!
        if (db > -25 && db < 0) {
          setIsLimboTripped(true);
          soundSynth.playBuzzer();
        }
      } else {
        // Scream mode: Floor is -15dB. If quieter while active, trip!
        if (db < -15 && isMicActive) {
          // Warning indicator
        }
      }

      // 2. Pitch Match Processing
      const pitch = voiceGamesDSP.detectPitch();
      if (pitch) {
        setCurrentPitchHz(pitch);
        const diff = Math.abs(pitch - targetPitchHz);
        const accuracy = Math.max(0, Math.min(100, Math.round(100 - (diff / targetPitchHz) * 100)));
        setPitchAccuracy(accuracy);
        if (accuracy > 85) {
          soundSynth.playSnare();
        }
      } else {
        setCurrentPitchHz(null);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isMicActive, limboMode, targetPitchHz]);

  // Pitch Match Canvas Animation Oscilloscope
  useEffect(() => {
    if (activeGame !== "PITCH_MATCH") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let time = 0;
    let animId: number;

    const render = () => {
      time += 0.05;
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, w, h);

      // Grid Lines
      ctx.strokeStyle = "#1a1a24";
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Target Sine Wave (Cyan)
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const y = h / 2 + Math.sin(time * 2 + (x / w) * Math.PI * 4) * (targetPitchHz / 10);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // User Voice Live Waveform (Emerald / Rose)
      if (currentPitchHz) {
        ctx.strokeStyle = pitchAccuracy > 75 ? "#34d399" : "#f43f5e";
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const y = h / 2 + Math.sin(time * 3 + (x / w) * Math.PI * 4) * (currentPitchHz / 10);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [activeGame, currentPitchHz, targetPitchHz, pitchAccuracy]);

  // Tongue twister timer
  useEffect(() => {
    let interval: any;
    if (isTwisterRunning && twisterTimer > 0) {
      interval = setInterval(() => setTwisterTimer((t) => t - 1), 1000);
    } else if (twisterTimer === 0 && isTwisterRunning) {
      soundSynth.playBuzzer();
      setIsTwisterRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTwisterRunning, twisterTimer]);

  const currentTwister: TongueTwisterItem = TONGUE_TWISTERS[twisterIdx] || TONGUE_TWISTERS[0];

  return (
    <div className="bg-black border-2 border-white p-4 sm:p-6 rounded-xl font-mono text-white space-y-6 shadow-2xl select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-400">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>// INNOVATIVE VOICE-MECHANIC GAMES [ REAL-TIME AUDIO DSP ]</span>
          </div>
          <h2 className="text-lg font-black uppercase text-white">
            Decibel Limbo, Reverse Echo & Pitch Match
          </h2>
        </div>

        {!isMicActive ? (
          <button
            type="button"
            onClick={handleStartMic}
            className="py-2 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase rounded-lg transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-1.5"
          >
            <Mic className="w-4 h-4" />
            <span>ENABLE LIVE MIC DSP 🎙️</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-emerald-950 border border-emerald-600 px-3 py-1.5 rounded-lg text-emerald-300 text-xs font-black">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>MIC DSP ACTIVE ({currentDb} dB)</span>
          </div>
        )}
      </div>

      {/* Game Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveGame("DECIBEL_LIMBO")}
          className={`py-2.5 px-3 border rounded-lg font-black uppercase transition-all cursor-pointer ${
            activeGame === "DECIBEL_LIMBO"
              ? "border-emerald-400 bg-emerald-950/50 text-emerald-300 ring-1 ring-emerald-400"
              : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700"
          }`}
        >
          🎚️ DECIBEL LIMBO
        </button>

        <button
          type="button"
          onClick={() => setActiveGame("REVERSE_ECHO")}
          className={`py-2.5 px-3 border rounded-lg font-black uppercase transition-all cursor-pointer ${
            activeGame === "REVERSE_ECHO"
              ? "border-cyan-400 bg-cyan-950/50 text-cyan-300 ring-1 ring-cyan-400"
              : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700"
          }`}
        >
          🔁 REVERSE AUDIO ECHO
        </button>

        <button
          type="button"
          onClick={() => setActiveGame("TONGUE_TWISTER")}
          className={`py-2.5 px-3 border rounded-lg font-black uppercase transition-all cursor-pointer ${
            activeGame === "TONGUE_TWISTER"
              ? "border-amber-400 bg-amber-950/50 text-amber-300 ring-1 ring-amber-400"
              : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700"
          }`}
        >
          ⚡ TONGUE TWISTERS
        </button>

        <button
          type="button"
          onClick={() => setActiveGame("PITCH_MATCH")}
          className={`py-2.5 px-3 border rounded-lg font-black uppercase transition-all cursor-pointer ${
            activeGame === "PITCH_MATCH"
              ? "border-purple-400 bg-purple-950/50 text-purple-300 ring-1 ring-purple-400"
              : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700"
          }`}
        >
          〰️ WAVEFORM PITCH MATCH
        </button>
      </div>

      {/* ── GAME 1: DECIBEL LIMBO ── */}
      {activeGame === "DECIBEL_LIMBO" && (
        <div className="bg-neutral-950 border border-emerald-900/60 p-4 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black uppercase text-emerald-400">
                DECIBEL LIMBO (MIC CEILING & FLOOR CHALLENGE)
              </h3>
              <p className="text-[10px] text-neutral-400">
                Speak or sing without crossing the laser tripwire decibel ceiling!
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setLimboMode("WHISPER");
                  setIsLimboTripped(false);
                  soundSynth.playSubtlePop();
                }}
                className={`px-3 py-1.5 text-xs font-bold uppercase rounded transition-all cursor-pointer ${
                  limboMode === "WHISPER"
                    ? "bg-emerald-500 text-black font-black"
                    : "bg-black border border-neutral-800 text-neutral-400"
                }`}
              >
                🤫 WHISPER CEILING (&lt; -25 dB)
              </button>
              <button
                type="button"
                onClick={() => {
                  setLimboMode("SCREAM");
                  setIsLimboTripped(false);
                  soundSynth.playSubtlePop();
                }}
                className={`px-3 py-1.5 text-xs font-bold uppercase rounded transition-all cursor-pointer ${
                  limboMode === "SCREAM"
                    ? "bg-rose-500 text-black font-black"
                    : "bg-black border border-neutral-800 text-neutral-400"
                }`}
              >
                📢 SCREAM FLOOR (&gt; -15 dB)
              </button>
            </div>
          </div>

          {/* Live Decibel Meter Gauge */}
          <div className="space-y-2 bg-black border border-neutral-800 p-4 rounded-xl">
            <div className="flex justify-between text-xs font-bold">
              <span>LIVE INPUT: {currentDb} dB</span>
              <span className={isLimboTripped ? "text-rose-400 font-black animate-ping" : "text-emerald-400"}>
                {isLimboTripped ? "🚨 TRIPWIRE BREACHED!" : "✅ SAFE ZONE"}
              </span>
            </div>

            {/* Meter Bar */}
            <div className="w-full bg-neutral-900 h-6 rounded-lg overflow-hidden border border-neutral-700 relative">
              <div
                className={`h-full transition-all duration-100 ${
                  isLimboTripped
                    ? "bg-rose-500"
                    : dbPercent > 65
                    ? "bg-amber-400"
                    : "bg-emerald-400"
                }`}
                style={{ width: `${dbPercent}%` }}
              />

              {/* Threshold Marker */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_10px_red]"
                style={{ left: limboMode === "WHISPER" ? "60%" : "75%" }}
                title="TRIPWIRE CEILING"
              />
            </div>
          </div>

          {isLimboTripped && (
            <div className="flex items-center justify-between bg-rose-950/60 border border-rose-600 p-3 rounded-lg">
              <span className="text-xs text-rose-300 font-bold">
                You broke the decibel threshold! Take a penalty or reset.
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsLimboTripped(false);
                  soundSynth.playFanfare();
                }}
                className="py-1 px-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase rounded cursor-pointer"
              >
                RESET LIMBO
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── GAME 2: REVERSE AUDIO ECHO ── */}
      {activeGame === "REVERSE_ECHO" && (
        <div className="bg-neutral-950 border border-cyan-900/60 p-4 rounded-xl space-y-4">
          <div className="space-y-0.5 border-b border-neutral-800 pb-2">
            <h3 className="text-sm font-black uppercase text-cyan-400">
              REVERSE AUDIO ECHO (PHONETIC BACKWARD MIMIC)
            </h3>
            <p className="text-[10px] text-neutral-400">
              Listen to the reversed 3-second audio cue, mimic it backward on mic, and play forward to reveal!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                soundSynth.playSubtlePop();
                voiceGamesDSP.playReverseAudioSnippet(true);
              }}
              className="p-4 bg-black border-2 border-cyan-400 hover:bg-cyan-950/40 rounded-xl font-black text-xs uppercase transition-all flex flex-col items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95"
            >
              <RotateCcw className="w-6 h-6 text-cyan-400 animate-spin" />
              <span>[ 🔁 PLAY REVERSED AUDIO CUE ]</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundSynth.playFanfare();
                voiceGamesDSP.playReverseAudioSnippet(false);
                setReverseGuessed(true);
              }}
              className="p-4 bg-black border-2 border-emerald-400 hover:bg-emerald-950/40 rounded-xl font-black text-xs uppercase transition-all flex flex-col items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95"
            >
              <Sparkles className="w-6 h-6 text-emerald-400" />
              <span>[ ▶️ PLAY ORIGINAL FORWARD MELODY ]</span>
            </button>
          </div>
        </div>
      )}

      {/* ── GAME 3: RAPID-FIRE TONGUE TWISTERS ── */}
      {activeGame === "TONGUE_TWISTER" && (
        <div className="bg-neutral-950 border border-amber-900/60 p-4 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black uppercase text-amber-400">
                RAPID-FIRE TONGUE TWISTERS (3X SPEED DUEL)
              </h3>
              <p className="text-[10px] text-neutral-400">
                Recite the tongue twister 3 times at full speed within 5 seconds without tripping!
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                soundSynth.playSubtlePop();
                setTwisterIdx((i) => (i + 1) % TONGUE_TWISTERS.length);
                setTwisterTimer(5);
                setTwisterPassed(false);
              }}
              className="px-3 py-1.5 bg-neutral-900 border border-neutral-700 hover:border-amber-400 text-amber-300 font-bold text-xs uppercase rounded cursor-pointer"
            >
              NEXT TWISTER ⏭️
            </button>
          </div>

          <div className="bg-black border-2 border-amber-400 p-4 rounded-xl space-y-2 shadow-[0_0_30px_rgba(251,191,36,0.15)]">
            <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase">
              <span>LANGUAGE: {currentTwister.language}</span>
              <span>DIFFICULTY: {currentTwister.difficulty}</span>
            </div>
            <div className="text-base sm:text-lg font-black text-white leading-relaxed">
              "{currentTwister.text}"
            </div>
            {currentTwister.transliteration && (
              <div className="text-xs text-neutral-400 italic">
                {currentTwister.transliteration}
              </div>
            )}
          </div>

          {/* Timer & Controls */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="text-xl font-black text-white font-mono">
              CLOCK: {twisterTimer}S
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  soundSynth.playFanfare();
                  setIsTwisterRunning(true);
                  setTwisterTimer(5);
                }}
                className="py-2 px-6 bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase rounded-lg transition-all cursor-pointer shadow-lg active:scale-95"
              >
                START 5S SPRINT 🎙️
              </button>

              <button
                type="button"
                onClick={() => {
                  soundSynth.playApplause();
                  setTwisterPassed(true);
                }}
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-lg transition-all cursor-pointer"
              >
                {twisterPassed ? "✅ PASSED 3X!" : "CLAIM VICTORY 👑"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GAME 4: WAVEFORM PITCH MATCH ── */}
      {activeGame === "PITCH_MATCH" && (
        <div className="bg-neutral-950 border border-purple-900/60 p-4 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black uppercase text-purple-400">
                WAVEFORM PITCH MATCH (REAL-TIME OSCILLOSCOPE)
              </h3>
              <p className="text-[10px] text-neutral-400">
                Hum or sing into your mic to match the live sine frequency wave in real time!
              </p>
            </div>

            <div className="text-right">
              <div className="text-sm font-black text-purple-400">
                MATCH: {pitchAccuracy}%
              </div>
              <div className="text-[9px] text-neutral-400 font-bold">
                TARGET: {targetPitchHz} Hz
              </div>
            </div>
          </div>

          {/* Oscilloscope Canvas */}
          <div className="w-full h-48 bg-black border-2 border-purple-500 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.2)]">
            <canvas ref={canvasRef} width={600} height={192} className="w-full h-full" />
          </div>

          {/* Target Frequency Controls */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <span className="text-xs text-neutral-400 font-bold uppercase">TARGET FREQUENCY:</span>
            <div className="flex gap-1.5">
              {[180, 220, 260, 330, 440].map((hz) => (
                <button
                  key={hz}
                  type="button"
                  onClick={() => {
                    setTargetPitchHz(hz);
                    soundSynth.playSubtlePop();
                  }}
                  className={`py-1.5 px-3 rounded text-xs font-black uppercase transition-all cursor-pointer ${
                    targetPitchHz === hz
                      ? "bg-purple-600 text-white shadow-md"
                      : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:border-neutral-700"
                  }`}
                >
                  {hz} Hz
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
