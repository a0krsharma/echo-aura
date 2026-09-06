"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import {
  RotateCcw,
  Undo2,
  Trophy,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ArrowRight,
  Sparkles,
  Layers,
  CheckCircle2,
} from "lucide-react";

interface NutsAndBoltsGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
}

const MAX_NUT_CAPACITY = 4;

export interface NutColorConfig {
  id: string;
  name: string;
  color: string;
  darkColor: string;
  textColor: string;
}

export const NUT_COLORS: NutColorConfig[] = [
  { id: "ruby", name: "Ruby", color: "#ef4444", darkColor: "#991b1b", textColor: "#ffffff" },
  { id: "sapphire", name: "Sapphire", color: "#3b82f6", darkColor: "#1e40af", textColor: "#ffffff" },
  { id: "emerald", name: "Emerald", color: "#10b981", darkColor: "#065f46", textColor: "#ffffff" },
  { id: "amber", name: "Amber", color: "#f59e0b", darkColor: "#92400e", textColor: "#000000" },
  { id: "amethyst", name: "Amethyst", color: "#a855f7", darkColor: "#6b21a8", textColor: "#ffffff" },
  { id: "cyan", name: "Cyan", color: "#06b6d4", darkColor: "#0e7490", textColor: "#000000" },
  { id: "coral", name: "Coral", color: "#f97316", darkColor: "#9a3412", textColor: "#ffffff" },
];

// ── Web Audio Synthesizer ─────────────────────────────────────────────────────
class BoltsAudioEngine {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public playTone(freq: number, durationMs: number, type: OscillatorType = "sine", gainVal = 0.1) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + durationMs / 1000);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + durationMs / 1000);
    } catch {
      // Ignore
    }
  }

  // Lift / Unscrew nut
  public playUnscrew() {
    if (this.isMuted) return;
    this.playTone(340, 40, "triangle", 0.12);
    setTimeout(() => this.playTone(520, 50, "triangle", 0.15), 35);
  }

  // Thread down / Ratchet
  public playScrewDown() {
    if (this.isMuted) return;
    this.playTone(520, 40, "triangle", 0.15);
    setTimeout(() => this.playTone(340, 50, "triangle", 0.12), 35);
  }

  // Invalid Move
  public playError() {
    this.playTone(180, 80, "sawtooth", 0.15);
  }

  // Level Won Chime
  public playVictory() {
    if (this.isMuted) return;
    const notes = [523, 659, 784, 1046];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 100, "sine", 0.18), idx * 60);
    });
  }
}

const boltsAudio = new BoltsAudioEngine();

export default function NutsAndBoltsGame({ match, currentUid }: NutsAndBoltsGameProps) {
  const [level, setLevel] = useState<number>(1);
  const [bolts, setBolts] = useState<string[][]>([]);
  const [selectedBoltIdx, setSelectedBoltIdx] = useState<number | null>(null);
  const [moveCount, setMoveCount] = useState<number>(0);
  const [history, setHistory] = useState<string[][][]>([]);
  const [isLevelWon, setIsLevelWon] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Sync audio mute
  useEffect(() => {
    boltsAudio.isMuted = isMuted;
  }, [isMuted]);

  // Load High Score
  useEffect(() => {
    try {
      const saved = localStorage.getItem("echo_nuts_bolts_hi");
      if (saved) setHighScore(parseInt(saved, 10) || 0);
    } catch {}
  }, []);

  const updateLocalHighScore = useCallback((s: number) => {
    setHighScore((prev) => {
      if (s > prev) {
        try {
          localStorage.setItem("echo_nuts_bolts_hi", String(s));
        } catch {}
        return s;
      }
      return prev;
    });
  }, []);

  // ── Procedural Solvable Board Generator ─────────────────────────────────────
  const generateSolvableLevel = useCallback((lvl: number): string[][] => {
    // Determine color count: 3 colors for lvl 1-4, 4 for lvl 5-12, 5 for 13-25, 6 for 26+
    const colorCount = Math.min(NUT_COLORS.length, lvl <= 3 ? 3 : lvl <= 10 ? 4 : lvl <= 20 ? 5 : 6);
    const emptyBoltCount = 2;
    const totalBolts = colorCount + emptyBoltCount;

    // Start with solved state: Each bolt has 4 of the same color
    const solvedBolts: string[][] = [];
    for (let c = 0; c < colorCount; c++) {
      const colorId = NUT_COLORS[c].id;
      solvedBolts.push([colorId, colorId, colorId, colorId]);
    }
    for (let e = 0; e < emptyBoltCount; e++) {
      solvedBolts.push([]);
    }

    // Apply N valid reverse transfers to shuffle
    const shuffleMoves = 18 + lvl * 5;
    const current = solvedBolts.map((b) => [...b]);

    for (let m = 0; m < shuffleMoves; m++) {
      // Find non-empty source
      const nonEmpties = current
        .map((b, idx) => ({ b, idx }))
        .filter((item) => item.b.length > 0);

      if (nonEmpties.length === 0) break;
      const src = nonEmpties[Math.floor(Math.random() * nonEmpties.length)];

      // Find targets that have capacity
      const validTargets = current
        .map((b, idx) => ({ b, idx }))
        .filter((item) => item.idx !== src.idx && item.b.length < MAX_NUT_CAPACITY);

      if (validTargets.length === 0) continue;
      const tgt = validTargets[Math.floor(Math.random() * validTargets.length)];

      // Transfer top nut
      const nut = current[src.idx].pop()!;
      current[tgt.idx].push(nut);
    }

    return current;
  }, []);

  // Start / Load Level
  const loadLevel = useCallback((lvl: number) => {
    const newBoard = generateSolvableLevel(lvl);
    setBolts(newBoard);
    setSelectedBoltIdx(null);
    setMoveCount(0);
    setHistory([]);
    setIsLevelWon(false);
  }, [generateSolvableLevel]);

  useEffect(() => {
    loadLevel(level);
  }, [level, loadLevel]);

  // Check Victory Condition: Every non-empty bolt has 4 identical colors
  const checkVictory = useCallback((board: string[][]): boolean => {
    let completedBolts = 0;
    let expectedCompleted = 0;

    for (const b of board) {
      if (b.length === 0) continue;
      expectedCompleted++;
      if (b.length !== MAX_NUT_CAPACITY) return false;
      const first = b[0];
      if (!b.every((nut) => nut === first)) return false;
      completedBolts++;
    }

    return completedBolts === expectedCompleted && completedBolts > 0;
  }, []);

  // Handle Bolt Click (Pick up or Thread down)
  const handleBoltClick = (boltIdx: number) => {
    if (isLevelWon) return;

    if (selectedBoltIdx === null) {
      // Trying to select source bolt
      if (bolts[boltIdx].length === 0) {
        boltsAudio.playError();
        return;
      }
      setSelectedBoltIdx(boltIdx);
      boltsAudio.playUnscrew();
    } else if (selectedBoltIdx === boltIdx) {
      // Unselect same bolt
      setSelectedBoltIdx(null);
      boltsAudio.playScrewDown();
    } else {
      // Trying to transfer from selectedBoltIdx -> boltIdx
      const srcBolt = bolts[selectedBoltIdx];
      const tgtBolt = bolts[boltIdx];

      const nutToMove = srcBolt[srcBolt.length - 1];

      // Validation Rules:
      // 1. Target must have capacity < 4
      // 2. Target must be empty OR top color must match incoming nut
      const canPlace =
        tgtBolt.length < MAX_NUT_CAPACITY &&
        (tgtBolt.length === 0 || tgtBolt[tgtBolt.length - 1] === nutToMove);

      if (!canPlace) {
        boltsAudio.playError();
        setSelectedBoltIdx(null);
        return;
      }

      // Execute Move
      const nextBolts = bolts.map((b) => [...b]);
      const transferred = nextBolts[selectedBoltIdx].pop()!;
      nextBolts[boltIdx].push(transferred);

      // Save history for undo
      setHistory((prev) => [...prev, bolts.map((b) => [...b])]);
      setBolts(nextBolts);
      setSelectedBoltIdx(null);
      setMoveCount((m) => m + 1);
      boltsAudio.playScrewDown();

      // Check win
      if (checkVictory(nextBolts)) {
        setIsLevelWon(true);
        boltsAudio.playVictory();
        const levelBonus = 100 + level * 25;
        const nextScore = score + levelBonus;
        setScore(nextScore);
        updateLocalHighScore(nextScore);
        updateArcadeGameScore(match.id, currentUid, "nuts_and_bolts", nextScore, false);
      }
    }
  };

  // Undo Move
  const handleUndo = () => {
    if (history.length === 0 || isLevelWon) return;
    const lastBoard = history[history.length - 1];
    setBolts(lastBoard);
    setHistory((prev) => prev.slice(0, -1));
    setSelectedBoltIdx(null);
    setMoveCount((m) => Math.max(0, m - 1));
    boltsAudio.playUnscrew();
  };

  // Next Level
  const handleNextLevel = () => {
    setLevel((l) => l + 1);
  };

  return (
    <div className="w-full max-w-lg mx-auto py-2 px-1 select-none font-mono">
      {/* Outer Console Shell */}
      <div className="relative rounded-3xl p-3 sm:p-4 bg-gradient-to-b from-[#18232e] via-[#101720] to-[#080d12] border-2 border-[#2b3d50] shadow-[0_16px_40px_rgba(0,0,0,0.85)]">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-1 pb-2.5 mb-3 border-b border-[#223344] text-xs">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-[9px] text-neutral-400 font-bold uppercase">NUTS & BOLTS 🔩</div>
              <div className="text-base font-black text-amber-400 flex items-center gap-1.5">
                <span>LVL {level}</span>
                <span className="text-[10px] text-neutral-500 font-mono">({moveCount} MOVES)</span>
              </div>
            </div>

            <div className="pl-3 border-l border-neutral-800">
              <div className="text-[9px] text-neutral-400 font-bold uppercase">SCORE</div>
              <div className="text-sm font-black text-emerald-400">{score}</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0 || isLevelWon}
              className={`p-2 rounded-xl border text-neutral-300 transition-all cursor-pointer active:scale-95 ${
                history.length > 0 && !isLevelWon
                  ? "bg-[#1d2b3a] border-[#344b62] hover:text-white"
                  : "bg-neutral-900 border-neutral-800 text-neutral-600 cursor-not-allowed"
              }`}
              title="Undo Move"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              className="p-2 rounded-xl bg-[#1d2b3a] border border-[#344b62] text-neutral-300 hover:text-white transition-all cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-neutral-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            <button
              type="button"
              onClick={() => loadLevel(level)}
              className="p-2 rounded-xl bg-[#1d2b3a] border border-[#344b62] text-neutral-300 hover:text-white transition-all cursor-pointer active:scale-95"
              title="Reset Level"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Workshop Table: Vertical Threaded Bolts & Hex Nuts ── */}
        <div className="relative w-full rounded-2xl p-4 sm:p-6 bg-gradient-to-b from-[#131b24] via-[#0c1219] to-[#070b10] border-2 border-[#253547] shadow-[inset_0_4px_24px_rgba(0,0,0,0.85)] min-h-[360px] flex items-center justify-center">
          
          {/* Bolts Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 sm:gap-6 w-full max-w-md place-items-center">
            {bolts.map((bolt, boltIdx) => {
              const isSelected = selectedBoltIdx === boltIdx;
              const isFullColor =
                bolt.length === MAX_NUT_CAPACITY &&
                bolt.every((n) => n === bolt[0]);

              return (
                <div
                  key={boltIdx}
                  onClick={() => handleBoltClick(boltIdx)}
                  className={`relative flex flex-col items-center justify-end h-52 w-16 rounded-2xl p-1 cursor-pointer transition-all duration-200 group ${
                    isSelected
                      ? "ring-2 ring-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.3)] bg-amber-500/5"
                      : "hover:bg-white/[0.03]"
                  }`}
                >
                  {/* Solved Bolt Ribbon Badge */}
                  {isFullColor && (
                    <div className="absolute -top-3 z-20">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 drop-shadow" />
                    </div>
                  )}

                  {/* ── Threaded Vertical Metal Bolt Shaft ── */}
                  <div className="absolute bottom-6 w-4 h-40 rounded-t-md bg-gradient-to-r from-[#94a3b8] via-[#cbd5e1] to-[#64748b] border-x border-[#475569] shadow-[inset_0_0_4px_rgba(0,0,0,0.5)] z-0 flex flex-col justify-between py-1">
                    {/* Thread Ridges */}
                    {Array.from({ length: 14 }).map((_, rIdx) => (
                      <div
                        key={rIdx}
                        className="w-full h-[2px] bg-[#334155]/60 -skew-y-6"
                      />
                    ))}
                  </div>

                  {/* Bolt Heavy Base Nut / Stand */}
                  <div className="absolute bottom-0 w-14 h-6 rounded-b-xl bg-gradient-to-b from-[#475569] via-[#334155] to-[#1e293b] border-t-2 border-[#94a3b8] shadow-md z-0" />

                  {/* ── Stack of Hex Nuts ── */}
                  <div className="relative z-10 w-full flex flex-col-reverse items-center gap-1 mb-6">
                    {bolt.map((nutColorId, nutIdx) => {
                      const cfg = NUT_COLORS.find((c) => c.id === nutColorId) || NUT_COLORS[0];
                      const isTopNut = nutIdx === bolt.length - 1;
                      const isHovering = isSelected && isTopNut;

                      return (
                        <div
                          key={nutIdx}
                          className={`relative w-12 h-7 rounded-md transition-all duration-200 flex items-center justify-center shadow-lg border-2 ${
                            isHovering ? "-translate-y-6 ring-2 ring-amber-300 scale-105" : ""
                          }`}
                          style={{
                            backgroundColor: cfg.color,
                            borderColor: cfg.darkColor,
                            boxShadow: `inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.5), 0 3px 6px rgba(0,0,0,0.6)`,
                          }}
                        >
                          {/* Inner Hex Hole */}
                          <div className="w-4 h-4 rounded-full bg-[#1e293b] border border-black/50 shadow-inner flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#cbd5e1]/40" />
                          </div>

                          {/* Outer Chamfer Facets */}
                          <div className="absolute inset-0 rounded-md border-x-4 border-black/20 pointer-events-none" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Level Complete Modal */}
          {isLevelWon && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-4 text-center z-30 animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-2xl mb-2 animate-bounce">
                🏆
              </div>
              <div className="text-xl font-black text-white uppercase tracking-wider">
                BOLTS SORTED!
              </div>
              <div className="text-xs text-neutral-400 mt-1">
                LEVEL {level} CLEARED IN <span className="text-amber-400 font-bold">{moveCount} MOVES</span>
              </div>
              <div className="text-xs text-emerald-400 font-bold mt-0.5">
                +{100 + level * 25} PTS AWARDED
              </div>

              <button
                type="button"
                onClick={handleNextLevel}
                className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black text-xs uppercase shadow-lg shadow-amber-400/30 hover:brightness-110 active:scale-95 cursor-pointer transition-transform flex items-center gap-1.5"
              >
                <span>NEXT LEVEL</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Footer Hints */}
        <div className="flex items-center justify-between text-[9px] text-neutral-400 font-bold pt-2 mt-1 border-t border-[#223344]">
          <span>TAP BOLT TO LIFT NUT // TAP TARGET TO SCREW DOWN</span>
          <span>SAME COLOR ONLY ON TOP</span>
        </div>
      </div>

      {/* Social Deck */}
      <div className="mt-4">
        <ArcadeSocialDeck match={match} currentUid={currentUid} />
      </div>
    </div>
  );
}
