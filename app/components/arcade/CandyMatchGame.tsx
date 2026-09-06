"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import {
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Flame,
  Award,
} from "lucide-react";

interface CandyMatchGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
}

const GRID_SIZE = 8;

export type SpecialType = "NONE" | "STRIPED_H" | "STRIPED_V" | "WRAPPED" | "COLOR_BOMB";

export interface CandyItem {
  id: number;
  colorId: number; // 0 to 5
  special: SpecialType;
}

export interface CandyColorDef {
  name: string;
  color: string;
  darkColor: string;
  emoji: string;
}

export const CANDY_TYPES: CandyColorDef[] = [
  { name: "Cherry", color: "#ef4444", darkColor: "#991b1b", emoji: "🍒" },
  { name: "Blueberry", color: "#3b82f6", darkColor: "#1e40af", emoji: "🫐" },
  { name: "Lime", color: "#10b981", darkColor: "#065f46", emoji: "🍏" },
  { name: "Lemon", color: "#f59e0b", darkColor: "#92400e", emoji: "🍋" },
  { name: "Grape", color: "#a855f7", darkColor: "#6b21a8", emoji: "🍇" },
  { name: "Orange", color: "#f97316", darkColor: "#9a3412", emoji: "🍊" },
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

// ── Web Audio Synthesizer for Candy Match-3 ───────────────────────────────────
class CandyAudioEngine {
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

  public playSwap() {
    this.playTone(380, 40, "sine", 0.08);
  }

  public playMatch(combo = 1) {
    if (this.isMuted) return;
    const base = 440 + combo * 60;
    this.playTone(base, 60, "triangle", 0.14);
    setTimeout(() => this.playTone(base * 1.25, 80, "triangle", 0.16), 40);
  }

  public playSpecial() {
    if (this.isMuted) return;
    const notes = [659, 880, 1174];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 70, "square", 0.12), idx * 45);
    });
  }

  public playColorBomb() {
    if (this.isMuted) return;
    const notes = [523, 659, 784, 1046, 1318];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 100, "triangle", 0.16), idx * 45);
    });
  }

  public playGameOver() {
    this.playTone(160, 200, "sawtooth", 0.2);
  }
}

const candyAudio = new CandyAudioEngine();

let nextCandyId = 1;

export default function CandyMatchGame({ match, currentUid }: CandyMatchGameProps) {
  const [grid, setGrid] = useState<(CandyItem | null)[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [movesLeft, setMovesLeft] = useState<number>(25);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [comboBanner, setComboBanner] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const particlesRef = useRef<Particle[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isGameOverRef = useRef(isGameOver);
  isGameOverRef.current = isGameOver;

  // Sync audio mute
  useEffect(() => {
    candyAudio.isMuted = isMuted;
  }, [isMuted]);

  // Load High Score
  useEffect(() => {
    try {
      const saved = localStorage.getItem("echo_candy_match_hi");
      if (saved) setHighScore(parseInt(saved, 10) || 0);
    } catch {}
  }, []);

  const updateLocalHighScore = useCallback((s: number) => {
    setHighScore((prev) => {
      if (s > prev) {
        try {
          localStorage.setItem("echo_candy_match_hi", String(s));
        } catch {}
        return s;
      }
      return prev;
    });
  }, []);

  // Generate a random candy
  const createRandomCandy = (special: SpecialType = "NONE", excludeColors: number[] = []): CandyItem => {
    let availableColors = [0, 1, 2, 3, 4, 5].filter((c) => !excludeColors.includes(c));
    if (availableColors.length === 0) availableColors = [0, 1, 2, 3, 4, 5];
    const colorId = availableColors[Math.floor(Math.random() * availableColors.length)];
    return {
      id: nextCandyId++,
      colorId,
      special,
    };
  };

  // Check board for matches
  const findMatches = useCallback((board: (CandyItem | null)[][]) => {
    const matchedCoords = new Set<string>();
    const specialCreations: { r: number; c: number; special: SpecialType; colorId: number }[] = [];

    // Horizontal matches
    for (let r = 0; r < GRID_SIZE; r++) {
      let runStart = 0;
      for (let c = 1; c <= GRID_SIZE; c++) {
        const prev = board[r][c - 1];
        const curr = c < GRID_SIZE ? board[r][c] : null;

        if (curr && prev && curr.colorId === prev.colorId && curr.colorId !== 99) {
          continue;
        } else {
          const runLen = c - runStart;
          if (runLen >= 3) {
            for (let i = runStart; i < c; i++) {
              matchedCoords.add(`${r},${i}`);
            }
            // 5-in-a-row -> Color Bomb
            if (runLen >= 5) {
              specialCreations.push({ r, c: runStart + 2, special: "COLOR_BOMB", colorId: 99 });
            } else if (runLen === 4) {
              specialCreations.push({ r, c: runStart + 1, special: "STRIPED_H", colorId: board[r][runStart]!.colorId });
            }
          }
          runStart = c;
        }
      }
    }

    // Vertical matches
    for (let c = 0; c < GRID_SIZE; c++) {
      let runStart = 0;
      for (let r = 1; r <= GRID_SIZE; r++) {
        const prev = board[r - 1][c];
        const curr = r < GRID_SIZE ? board[r][c] : null;

        if (curr && prev && curr.colorId === prev.colorId && curr.colorId !== 99) {
          continue;
        } else {
          const runLen = r - runStart;
          if (runLen >= 3) {
            for (let i = runStart; i < r; i++) {
              matchedCoords.add(`${i},${c}`);
            }
            if (runLen >= 5) {
              specialCreations.push({ r: runStart + 2, c, special: "COLOR_BOMB", colorId: 99 });
            } else if (runLen === 4) {
              specialCreations.push({ r: runStart + 1, c, special: "STRIPED_V", colorId: board[runStart][c]!.colorId });
            }
          }
          runStart = r;
        }
      }
    }

    return { matchedCoords, specialCreations };
  }, []);

  // Initialize board with no starting matches
  const initBoard = useCallback(() => {
    const newBoard: (CandyItem | null)[][] = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      newBoard[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        const exclude: number[] = [];
        if (c >= 2 && newBoard[r][c - 1]?.colorId === newBoard[r][c - 2]?.colorId) {
          exclude.push(newBoard[r][c - 1]!.colorId);
        }
        if (r >= 2 && newBoard[r - 1][c]?.colorId === newBoard[r - 2][c]?.colorId) {
          exclude.push(newBoard[r - 1][c]!.colorId);
        }
        newBoard[r][c] = createRandomCandy("NONE", exclude);
      }
    }

    setGrid(newBoard);
    setSelectedCell(null);
    setScore(0);
    setMovesLeft(25);
    setIsGameOver(false);
    setComboBanner(null);
  }, []);

  useEffect(() => {
    initBoard();
  }, [initBoard]);

  // Particle burst helper
  const spawnExplosionParticles = (x: number, y: number, color: string) => {
    for (let p = 0; p < 8; p++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 4 + 2,
        life: 0,
        maxLife: 20,
      });
    }
  };

  // Gravity & Refill step
  const applyGravityAndRefill = (board: (CandyItem | null)[][]): (CandyItem | null)[][] => {
    const nextBoard = board.map((row) => [...row]);

    for (let c = 0; c < GRID_SIZE; c++) {
      let emptyRow = GRID_SIZE - 1;

      // Drop existing items down
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        if (nextBoard[r][c] !== null) {
          if (r !== emptyRow) {
            nextBoard[emptyRow][c] = nextBoard[r][c];
            nextBoard[r][c] = null;
          }
          emptyRow--;
        }
      }

      // Fill top slots with new candies
      for (let r = emptyRow; r >= 0; r--) {
        nextBoard[r][c] = createRandomCandy("NONE");
      }
    }

    return nextBoard;
  };

  // Process recursive cascade loop
  const processCascade = useCallback(
    async (currentBoard: (CandyItem | null)[][], combo = 1): Promise<(CandyItem | null)[][]> => {
      const { matchedCoords, specialCreations } = findMatches(currentBoard);

      if (matchedCoords.size === 0) {
        setIsProcessing(false);
        return currentBoard;
      }

      candyAudio.playMatch(combo);

      // Trigger Combo Voice Banner
      if (combo >= 4) setComboBanner("🔥 UNSTOPPABLE!");
      else if (combo === 3) setComboBanner("✨ DELICIOUS!");
      else if (combo === 2) setComboBanner("🎉 SWEET!");
      else setComboBanner(null);

      setTimeout(() => setComboBanner(null), 1200);

      // Calculate score with combo multiplier
      const points = matchedCoords.size * 30 * combo;
      setScore((s) => {
        const next = s + points;
        updateLocalHighScore(next);
        return next;
      });

      // Clear matched cells
      const clearedBoard = currentBoard.map((row, r) =>
        row.map((cell, c) => {
          if (matchedCoords.has(`${r},${c}`)) {
            return null;
          }
          return cell;
        })
      );

      // Insert any spawned special candies
      specialCreations.forEach((sc) => {
        clearedBoard[sc.r][sc.c] = {
          id: nextCandyId++,
          colorId: sc.colorId,
          special: sc.special,
        };
      });

      setGrid(clearedBoard);

      // Wait 180ms for pop animation then drop
      await new Promise((res) => setTimeout(res, 180));

      const droppedBoard = applyGravityAndRefill(clearedBoard);
      setGrid(droppedBoard);

      // Wait 220ms then check next cascade
      await new Promise((res) => setTimeout(res, 220));
      return processCascade(droppedBoard, combo + 1);
    },
    [findMatches, updateLocalHighScore]
  );

  // Execute swap
  const executeSwap = async (r1: number, c1: number, r2: number, c2: number) => {
    if (isProcessing || isGameOver) return;
    setIsProcessing(true);
    candyAudio.playSwap();

    const nextBoard = grid.map((r) => [...r]);
    const itemA = nextBoard[r1][c1];
    const itemB = nextBoard[r2][c2];

    // Check Color Bomb special combo
    if (itemA?.special === "COLOR_BOMB" || itemB?.special === "COLOR_BOMB") {
      candyAudio.playColorBomb();
      const targetColor = itemA?.special === "COLOR_BOMB" ? itemB?.colorId : itemA?.colorId;
      
      const bombCleared = nextBoard.map((row) =>
        row.map((cell) => {
          if (cell && (cell.colorId === targetColor || cell.special === "COLOR_BOMB")) {
            return null;
          }
          return cell;
        })
      );

      setScore((s) => s + 400);
      setGrid(bombCleared);
      setMovesLeft((m) => Math.max(0, m - 1));

      await new Promise((res) => setTimeout(res, 200));
      const dropped = applyGravityAndRefill(bombCleared);
      setGrid(dropped);
      await processCascade(dropped, 2);
      return;
    }

    // Normal Swap
    nextBoard[r1][c1] = itemB;
    nextBoard[r2][c2] = itemA;
    setGrid(nextBoard);

    // Verify if valid match
    const { matchedCoords } = findMatches(nextBoard);

    if (matchedCoords.size === 0) {
      // Revert invalid swap
      await new Promise((res) => setTimeout(res, 240));
      nextBoard[r1][c1] = itemA;
      nextBoard[r2][c2] = itemB;
      setGrid(nextBoard);
      setIsProcessing(false);
      return;
    }

    // Valid move
    const remainingMoves = movesLeft - 1;
    setMovesLeft(remainingMoves);

    if (remainingMoves <= 0) {
      setIsGameOver(true);
      candyAudio.playGameOver();
      updateArcadeGameScore(match.id, currentUid, "candy_match", score, true);
    }

    await processCascade(nextBoard, 1);
  };

  // Cell click handler
  const handleCellClick = (r: number, c: number) => {
    if (isProcessing || isGameOver) return;

    if (!selectedCell) {
      setSelectedCell({ r, c });
      return;
    }

    const { r: sr, c: sc } = selectedCell;
    const isAdjacent = Math.abs(r - sr) + Math.abs(c - sc) === 1;

    if (isAdjacent) {
      setSelectedCell(null);
      executeSwap(sr, sc, r, c);
    } else {
      setSelectedCell({ r, c });
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto py-2 px-1 select-none font-mono">
      {/* Outer Shell */}
      <div className="relative rounded-3xl p-3 sm:p-4 bg-gradient-to-b from-[#21162b] via-[#160d1f] to-[#0d0714] border-2 border-[#3d2452] shadow-[0_16px_40px_rgba(0,0,0,0.85)]">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-1 pb-2.5 mb-2.5 border-b border-[#361e48] text-xs">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-[9px] text-neutral-400 font-bold uppercase">CANDY MATCH-3 🍬</div>
              <div className="text-base font-black text-pink-400">
                {score} <span className="text-[10px] text-neutral-500 font-mono">PTS</span>
              </div>
            </div>

            <div className="pl-3 border-l border-neutral-800">
              <div className="text-[9px] text-neutral-400 font-bold uppercase">MOVES</div>
              <div className={`text-sm font-black ${movesLeft <= 5 ? "text-rose-400 animate-pulse" : "text-amber-300"}`}>
                {movesLeft}
              </div>
            </div>

            <div className="pl-3 border-l border-neutral-800">
              <div className="text-[9px] text-neutral-400 font-bold uppercase">TARGET</div>
              <div className="text-sm font-black text-emerald-400">3,000</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              className="p-2 rounded-xl bg-[#281636] border border-[#482862] text-neutral-300 hover:text-white transition-all cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-neutral-400" /> : <Volume2 className="w-3.5 h-3.5 text-pink-400" />}
            </button>

            <button
              type="button"
              onClick={initBoard}
              className="p-2 rounded-xl bg-[#281636] border border-[#482862] text-neutral-300 hover:text-white transition-all cursor-pointer active:scale-95"
              title="Restart"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── 8x8 Candy Match-3 Grid ── */}
        <div className="relative aspect-square w-full rounded-2xl p-2.5 sm:p-3 bg-gradient-to-b from-[#1c1024] to-[#0f0714] border-2 border-[#3f2257] shadow-[inset_0_4px_24px_rgba(0,0,0,0.85)] flex items-center justify-center">
          
          {/* Combo Voice Callout Banner */}
          {comboBanner && (
            <div className="absolute top-4 z-30 px-5 py-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black text-sm tracking-wider uppercase shadow-2xl shadow-pink-500/50 animate-bounce">
              {comboBanner}
            </div>
          )}

          {/* Grid Cells */}
          <div
            className="w-full h-full grid gap-1 sm:gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
            }}
          >
            {grid.map((row, r) =>
              row.map((candy, c) => {
                const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                if (!candy) {
                  return <div key={`${r}-${c}`} className="w-full h-full rounded-xl bg-black/20" />;
                }

                const def = CANDY_TYPES[candy.colorId] || CANDY_TYPES[0];

                return (
                  <div
                    key={candy.id}
                    onClick={() => handleCellClick(r, c)}
                    className={`relative w-full h-full rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 shadow-md ${
                      isSelected
                        ? "scale-110 ring-2 ring-white z-20 shadow-white/40"
                        : "hover:scale-105 active:scale-95"
                    }`}
                    style={{
                      backgroundColor: candy.special === "COLOR_BOMB" ? "#1f1b24" : def.color,
                      border: `2px solid ${candy.special === "COLOR_BOMB" ? "#f59e0b" : def.darkColor}`,
                      boxShadow: `inset 0 2px 4px rgba(255,255,255,0.35), 0 3px 6px rgba(0,0,0,0.45)`,
                    }}
                  >
                    {/* Special Badges */}
                    {candy.special === "STRIPED_H" && (
                      <div className="absolute inset-x-0 h-1.5 bg-white/70 rounded-full shadow" />
                    )}
                    {candy.special === "STRIPED_V" && (
                      <div className="absolute inset-y-0 w-1.5 bg-white/70 rounded-full shadow" />
                    )}
                    {candy.special === "COLOR_BOMB" ? (
                      <span className="text-base sm:text-lg animate-spin">🔮</span>
                    ) : (
                      <span className="text-xs sm:text-sm drop-shadow">{def.emoji}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Game Over / Victory Modal */}
          {isGameOver && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-4 text-center z-30 animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/20 border border-pink-500/50 flex items-center justify-center text-2xl mb-2">
                {score >= 3000 ? "👑" : "💥"}
              </div>
              <div className="text-xl font-black text-white uppercase tracking-wider">
                {score >= 3000 ? "TARGET REACHED!" : "OUT OF MOVES"}
              </div>
              <div className="text-xs text-neutral-400 mt-1">
                FINAL SCORE: <span className="text-pink-400 font-bold">{score}</span>
              </div>
              {score >= highScore && score > 0 && (
                <div className="text-[10px] text-emerald-400 font-bold mt-0.5">
                  ★ NEW HIGH SCORE RECORD! ★
                </div>
              )}

              <button
                type="button"
                onClick={initBoard}
                className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black text-xs uppercase shadow-lg shadow-pink-500/30 hover:brightness-110 active:scale-95 cursor-pointer transition-transform"
              >
                PLAY AGAIN 🔄
              </button>
            </div>
          )}
        </div>

        {/* Footer Hints */}
        <div className="flex items-center justify-between text-[9px] text-neutral-400 font-bold pt-2 mt-1 border-t border-[#361e48]">
          <span>SWAP 2 ADJACENT GEMS // MATCH 3+ IN A ROW</span>
          <span>4-MATCH: STRIPED • 5-MATCH: COLOR BOMB</span>
        </div>
      </div>

      {/* Social Deck */}
      <div className="mt-4">
        <ArcadeSocialDeck match={match} currentUid={currentUid} />
      </div>
    </div>
  );
}
