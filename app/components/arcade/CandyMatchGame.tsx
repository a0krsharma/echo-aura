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
  Star,
  Flame,
  Award,
} from "lucide-react";

interface CandyMatchGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
}

const GRID_SIZE = 8;
const TARGET_SCORE_1_STAR = 1500;
const TARGET_SCORE_2_STAR = 3000;
const TARGET_SCORE_3_STAR = 5000;

export type SpecialType = "NONE" | "STRIPED_H" | "STRIPED_V" | "WRAPPED" | "COLOR_BOMB";

export interface CandyItem {
  id: number;
  colorId: number; // 0 to 5, or 99 for color bomb
  special: SpecialType;
}

export interface CandyDef {
  name: string;
  color: string;
  darkColor: string;
  lightColor: string;
  shape: "bean" | "lozenge" | "drop" | "square" | "circle" | "teardrop";
}

export const CANDY_DEFS: CandyDef[] = [
  { name: "Red Bean", color: "#ef4444", darkColor: "#991b1b", lightColor: "#fca5a5", shape: "bean" },
  { name: "Orange Lozenge", color: "#f97316", darkColor: "#9a3412", lightColor: "#fdba74", shape: "lozenge" },
  { name: "Yellow Drop", color: "#eab308", darkColor: "#854d0e", lightColor: "#fde047", shape: "drop" },
  { name: "Green Square", color: "#22c55e", darkColor: "#14532d", lightColor: "#86efac", shape: "square" },
  { name: "Blue Berry", color: "#3b82f6", darkColor: "#1e3a8a", lightColor: "#93c5fd", shape: "circle" },
  { name: "Purple Grape", color: "#a855f7", darkColor: "#581c87", lightColor: "#d8b4fe", shape: "teardrop" },
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

// ── Web Audio Synthesizer for Candy Crush ─────────────────────────────────────
class CandyCrushAudioEngine {
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

  public playTone(freq: number, durationMs: number, type: OscillatorType = "sine", gainVal = 0.12) {
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
    } catch {}
  }

  public playSwap() {
    this.playTone(380, 50, "sine", 0.08);
  }

  public playPop(combo = 1) {
    if (this.isMuted) return;
    const baseFreq = 420 + Math.min(combo * 65, 600);
    this.playTone(baseFreq, 60, "triangle", 0.15);
    setTimeout(() => this.playTone(baseFreq * 1.3, 70, "triangle", 0.16), 30);
  }

  public playLaser() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(900, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch {}
  }

  public playBomb() {
    if (this.isMuted) return;
    this.playTone(90, 240, "sawtooth", 0.25);
  }

  public playColorBomb() {
    if (this.isMuted) return;
    const notes = [523, 659, 784, 1046, 1318, 1568];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 110, "triangle", 0.18), idx * 50);
    });
  }

  public playAnnouncerChord() {
    if (this.isMuted) return;
    const chord = [523, 659, 784, 1046];
    chord.forEach((freq) => this.playTone(freq, 280, "sine", 0.08));
  }
}

const candyAudio = new CandyCrushAudioEngine();

let nextCandyId = 1;

export default function CandyMatchGame({ match, currentUid }: CandyMatchGameProps) {
  const [grid, setGrid] = useState<(CandyItem | null)[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [movesLeft, setMovesLeft] = useState<number>(25);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isWon, setIsWon] = useState<boolean>(false);
  const [comboBanner, setComboBanner] = useState<{ text: string; sub: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Drag & Swipe gesture tracking
  const touchStartPos = useRef<{ r: number; c: number; x: number; y: number } | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const isGameOverRef = useRef(isGameOver);
  isGameOverRef.current = isGameOver;

  // Sync audio mute
  useEffect(() => {
    candyAudio.isMuted = isMuted;
  }, [isMuted]);

  // Load High Score
  useEffect(() => {
    try {
      const saved = localStorage.getItem("echo_candy_crush_hi");
      if (saved) setHighScore(parseInt(saved, 10) || 0);
    } catch {}
  }, []);

  const updateLocalHighScore = useCallback((s: number) => {
    setHighScore((prev) => {
      if (s > prev) {
        try {
          localStorage.setItem("echo_candy_crush_hi", String(s));
        } catch {}
        return s;
      }
      return prev;
    });
  }, []);

  // Create Random Candy
  const createRandomCandy = (special: SpecialType = "NONE", excludeColors: number[] = []): CandyItem => {
    let available = [0, 1, 2, 3, 4, 5].filter((c) => !excludeColors.includes(c));
    if (available.length === 0) available = [0, 1, 2, 3, 4, 5];
    const colorId = available[Math.floor(Math.random() * available.length)];
    return {
      id: nextCandyId++,
      colorId,
      special,
    };
  };

  // Find standard 3, 4, 5 and L/T matches
  const findMatches = useCallback((board: (CandyItem | null)[][]) => {
    const matchedCoords = new Set<string>();
    const specialCreations: { r: number; c: number; special: SpecialType; colorId: number }[] = [];

    // Horizontal check
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
            for (let i = runStart; i < c; i++) matchedCoords.add(`${r},${i}`);

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

    // Vertical check
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
            for (let i = runStart; i < r; i++) matchedCoords.add(`${i},${c}`);

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
    setIsWon(false);
    setComboBanner(null);
  }, []);

  useEffect(() => {
    initBoard();
  }, [initBoard]);

  // Gravity & Refill
  const applyGravityAndRefill = (board: (CandyItem | null)[][]): (CandyItem | null)[][] => {
    const next = board.map((row) => [...row]);

    for (let c = 0; c < GRID_SIZE; c++) {
      let emptyRow = GRID_SIZE - 1;
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        if (next[r][c] !== null) {
          if (r !== emptyRow) {
            next[emptyRow][c] = next[r][c];
            next[r][c] = null;
          }
          emptyRow--;
        }
      }
      for (let r = emptyRow; r >= 0; r--) {
        next[r][c] = createRandomCandy("NONE");
      }
    }

    return next;
  };

  // Trigger special candy explosion
  const detonateSpecials = (
    board: (CandyItem | null)[][],
    coordsToClear: Set<string>
  ): Set<string> => {
    const finalCoords = new Set(coordsToClear);
    let added = true;

    while (added) {
      added = false;
      const currentList = Array.from(finalCoords);

      for (const coord of currentList) {
        const [r, c] = coord.split(",").map(Number);
        const item = board[r]?.[c];
        if (!item) continue;

        if (item.special === "STRIPED_H") {
          candyAudio.playLaser();
          for (let col = 0; col < GRID_SIZE; col++) {
            const key = `${r},${col}`;
            if (!finalCoords.has(key)) {
              finalCoords.add(key);
              added = true;
            }
          }
        } else if (item.special === "STRIPED_V") {
          candyAudio.playLaser();
          for (let row = 0; row < GRID_SIZE; row++) {
            const key = `${row},${c}`;
            if (!finalCoords.has(key)) {
              finalCoords.add(key);
              added = true;
            }
          }
        } else if (item.special === "WRAPPED") {
          candyAudio.playBomb();
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                const key = `${nr},${nc}`;
                if (!finalCoords.has(key)) {
                  finalCoords.add(key);
                  added = true;
                }
              }
            }
          }
        }
      }
    }

    return finalCoords;
  };

  // Recursive Cascade Loop
  const processCascade = useCallback(
    async (currentBoard: (CandyItem | null)[][], combo = 1): Promise<(CandyItem | null)[][]> => {
      const { matchedCoords, specialCreations } = findMatches(currentBoard);

      if (matchedCoords.size === 0) {
        setIsProcessing(false);
        return currentBoard;
      }

      candyAudio.playPop(combo);

      // Announcer Callouts
      if (combo >= 4) {
        setComboBanner({ text: "DIVINE! 👑", sub: "MEGA CASCADE!" });
        candyAudio.playAnnouncerChord();
      } else if (combo === 3) {
        setComboBanner({ text: "DELICIOUS! ✨", sub: "SWEET COMBO!" });
        candyAudio.playAnnouncerChord();
      } else if (combo === 2) {
        setComboBanner({ text: "TASTY! 🍭", sub: "GOOD MOVE!" });
      }

      setTimeout(() => setComboBanner(null), 1400);

      // Expand matches with any striped/wrapped explosions
      const fullCoordsToClear = detonateSpecials(currentBoard, matchedCoords);

      // Score
      const addedPoints = fullCoordsToClear.size * 35 * combo;
      setScore((s) => {
        const next = s + addedPoints;
        updateLocalHighScore(next);
        if (next >= TARGET_SCORE_1_STAR && !isWon) setIsWon(true);
        return next;
      });

      // Clear cells
      const cleared = currentBoard.map((row, r) =>
        row.map((cell, c) => {
          if (fullCoordsToClear.has(`${r},${c}`)) return null;
          return cell;
        })
      );

      // Insert new specials
      specialCreations.forEach((sc) => {
        cleared[sc.r][sc.c] = {
          id: nextCandyId++,
          colorId: sc.colorId,
          special: sc.special,
        };
      });

      setGrid(cleared);

      await new Promise((res) => setTimeout(res, 190));
      const dropped = applyGravityAndRefill(cleared);
      setGrid(dropped);

      await new Promise((res) => setTimeout(res, 220));
      return processCascade(dropped, combo + 1);
    },
    [findMatches, updateLocalHighScore, isWon]
  );

  // Candy Crush Special Combo Interactions
  const handleSpecialCombos = async (
    nextBoard: (CandyItem | null)[][],
    itemA: CandyItem,
    itemB: CandyItem,
    r1: number,
    c1: number,
    r2: number,
    c2: number
  ): Promise<boolean> => {
    // 1. Color Bomb + Color Bomb (Board Wipe Supernova!)
    if (itemA.special === "COLOR_BOMB" && itemB.special === "COLOR_BOMB") {
      candyAudio.playColorBomb();
      setComboBanner({ text: "SUGAR CRUSH! 💥", sub: "SUPERNOVA WIPEOUT!" });
      const wiped = nextBoard.map((row) => row.map(() => null));
      setScore((s) => s + 2000);
      setGrid(wiped);
      await new Promise((res) => setTimeout(res, 300));
      const dropped = applyGravityAndRefill(wiped);
      setGrid(dropped);
      await processCascade(dropped, 3);
      return true;
    }

    // 2. Color Bomb + Striped (Converts all matching colors to Striped!)
    if (
      (itemA.special === "COLOR_BOMB" && (itemB.special === "STRIPED_H" || itemB.special === "STRIPED_V")) ||
      (itemB.special === "COLOR_BOMB" && (itemA.special === "STRIPED_H" || itemA.special === "STRIPED_V"))
    ) {
      candyAudio.playColorBomb();
      const targetColor = itemA.special === "COLOR_BOMB" ? itemB.colorId : itemA.colorId;
      setComboBanner({ text: "SUPER STRIPE! ⚡", sub: "ALL STRIPED CASCADE!" });

      // Convert all target color candies to striped
      const converted: (CandyItem | null)[][] = nextBoard.map((row) =>
        row.map((cell) => {
          if (cell && cell.colorId === targetColor) {
            return {
              ...cell,
              special: (Math.random() > 0.5 ? "STRIPED_H" : "STRIPED_V") as SpecialType,
            };
          }
          if (cell && cell.special === "COLOR_BOMB") return null;
          return cell;
        })
      );

      setGrid(converted);
      await new Promise((res) => setTimeout(res, 250));

      // Detonate all of them!
      const allStripedCoords = new Set<string>();
      converted.forEach((row, r) =>
        row.forEach((cell, c) => {
          if (cell && cell.colorId === targetColor) allStripedCoords.add(`${r},${c}`);
        })
      );

      const expanded = detonateSpecials(converted, allStripedCoords);
      const cleared = converted.map((row, r) =>
        row.map((cell, c) => (expanded.has(`${r},${c}`) ? null : cell))
      );

      setScore((s) => s + 1200);
      setGrid(cleared);
      await new Promise((res) => setTimeout(res, 250));

      const dropped = applyGravityAndRefill(cleared);
      setGrid(dropped);
      await processCascade(dropped, 2);
      return true;
    }

    // 3. Color Bomb + Normal Candy
    if (itemA.special === "COLOR_BOMB" || itemB.special === "COLOR_BOMB") {
      candyAudio.playColorBomb();
      const targetColor = itemA.special === "COLOR_BOMB" ? itemB.colorId : itemA.colorId;
      setComboBanner({ text: "COLOR CRUSH! 🔮", sub: "COLOR CLEARED!" });

      const bombCleared = nextBoard.map((row) =>
        row.map((cell) => {
          if (cell && (cell.colorId === targetColor || cell.special === "COLOR_BOMB")) return null;
          return cell;
        })
      );

      setScore((s) => s + 500);
      setGrid(bombCleared);
      await new Promise((res) => setTimeout(res, 220));

      const dropped = applyGravityAndRefill(bombCleared);
      setGrid(dropped);
      await processCascade(dropped, 2);
      return true;
    }

    // 4. Striped + Striped (Cross Laser Explosion)
    if (
      (itemA.special === "STRIPED_H" || itemA.special === "STRIPED_V") &&
      (itemB.special === "STRIPED_H" || itemB.special === "STRIPED_V")
    ) {
      candyAudio.playLaser();
      setComboBanner({ text: "CROSS LASER! ⚡", sub: "ROW & COL CLEAR!" });
      const crossCoords = new Set<string>();
      for (let c = 0; c < GRID_SIZE; c++) crossCoords.add(`${r2},${c}`);
      for (let r = 0; r < GRID_SIZE; r++) crossCoords.add(`${r},${c2}`);

      const cleared = nextBoard.map((row, r) =>
        row.map((cell, c) => (crossCoords.has(`${r},${c}`) ? null : cell))
      );

      setScore((s) => s + 400);
      setGrid(cleared);
      await new Promise((res) => setTimeout(res, 200));

      const dropped = applyGravityAndRefill(cleared);
      setGrid(dropped);
      await processCascade(dropped, 2);
      return true;
    }

    // 5. Striped + Wrapped (Giant 3-Row by 3-Col Steamroller!)
    if (
      ((itemA.special === "STRIPED_H" || itemA.special === "STRIPED_V") && itemB.special === "WRAPPED") ||
      ((itemB.special === "STRIPED_H" || itemB.special === "STRIPED_V") && itemA.special === "WRAPPED")
    ) {
      candyAudio.playBomb();
      candyAudio.playLaser();
      setComboBanner({ text: "STEAMROLLER! 💣", sub: "3-ROW 3-COL CLEAR!" });

      const blastCoords = new Set<string>();
      for (let dr = -1; dr <= 1; dr++) {
        const nr = r2 + dr;
        if (nr >= 0 && nr < GRID_SIZE) {
          for (let c = 0; c < GRID_SIZE; c++) blastCoords.add(`${nr},${c}`);
        }
      }
      for (let dc = -1; dc <= 1; dc++) {
        const nc = c2 + dc;
        if (nc >= 0 && nc < GRID_SIZE) {
          for (let r = 0; r < GRID_SIZE; r++) blastCoords.add(`${r},${nc}`);
        }
      }

      const cleared = nextBoard.map((row, r) =>
        row.map((cell, c) => (blastCoords.has(`${r},${c}`) ? null : cell))
      );

      setScore((s) => s + 800);
      setGrid(cleared);
      await new Promise((res) => setTimeout(res, 220));

      const dropped = applyGravityAndRefill(cleared);
      setGrid(dropped);
      await processCascade(dropped, 2);
      return true;
    }

    return false;
  };

  // Execute Swap
  const executeSwap = async (r1: number, c1: number, r2: number, c2: number) => {
    if (isProcessing || isGameOver) return;
    setIsProcessing(true);
    candyAudio.playSwap();

    const nextBoard = grid.map((r) => [...r]);
    const itemA = nextBoard[r1][c1];
    const itemB = nextBoard[r2][c2];

    if (!itemA || !itemB) {
      setIsProcessing(false);
      return;
    }

    // Consume 1 move
    const remainingMoves = movesLeft - 1;
    setMovesLeft(remainingMoves);

    // Check special combo combinations
    const wasSpecialCombo = await handleSpecialCombos(nextBoard, itemA, itemB, r1, c1, r2, c2);
    if (wasSpecialCombo) {
      if (remainingMoves <= 0) {
        setIsGameOver(true);
        updateArcadeGameScore(match.id, currentUid, "candy_match", score, true);
      }
      return;
    }

    // Regular Swap
    nextBoard[r1][c1] = itemB;
    nextBoard[r2][c2] = itemA;
    setGrid(nextBoard);

    // Verify valid match
    const { matchedCoords } = findMatches(nextBoard);

    if (matchedCoords.size === 0) {
      // Revert swap on invalid move
      await new Promise((res) => setTimeout(res, 220));
      nextBoard[r1][c1] = itemA;
      nextBoard[r2][c2] = itemB;
      setGrid(nextBoard);
      setIsProcessing(false);
      return;
    }

    if (remainingMoves <= 0) {
      setIsGameOver(true);
      updateArcadeGameScore(match.id, currentUid, "candy_match", score, true);
    }

    await processCascade(nextBoard, 1);
  };

  // Touch Swipe Gesture Handlers
  const handleTouchStart = (r: number, c: number, e: React.TouchEvent) => {
    if (isProcessing || isGameOver) return;
    const touch = e.touches[0];
    touchStartPos.current = { r, c, x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (r: number, c: number, e: React.TouchEvent) => {
    if (!touchStartPos.current || isProcessing || isGameOver) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;
    const startR = touchStartPos.current.r;
    const startC = touchStartPos.current.c;
    touchStartPos.current = null;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) > 18) {
      if (absX > absY) {
        // Horizontal swipe
        const targetC = dx > 0 ? startC + 1 : startC - 1;
        if (targetC >= 0 && targetC < GRID_SIZE) {
          executeSwap(startR, startC, startR, targetC);
        }
      } else {
        // Vertical swipe
        const targetR = dy > 0 ? startR + 1 : startR - 1;
        if (targetR >= 0 && targetR < GRID_SIZE) {
          executeSwap(startR, startC, targetR, startC);
        }
      }
    } else {
      // Tap Click
      handleCellClick(r, c);
    }
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

  // Star Progress Percentage
  const starProgress = Math.min(100, (score / TARGET_SCORE_3_STAR) * 100);

  return (
    <div className="w-full max-w-lg mx-auto py-2 px-1 select-none font-sans">
      {/* ── Outer Candy Crush Purple Shell ── */}
      <div className="relative rounded-[32px] p-3 sm:p-4 bg-gradient-to-b from-[#2e1050] via-[#1a0832] to-[#0d031c] border-2 border-[#52228d] shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_1px_2px_rgba(255,255,255,0.25)]">
        
        {/* Top Header: Star Meter & Moves Badge */}
        <div className="px-1 pb-3 mb-2 border-b border-[#431973] space-y-2">
          <div className="flex items-center justify-between">
            {/* Logo & Score */}
            <div>
              <div className="text-[10px] font-black tracking-widest text-pink-300 uppercase flex items-center gap-1">
                <span>CANDY CRUSH SAGA</span>
                <Sparkles className="w-3 h-3 text-amber-300" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow">
                {score.toLocaleString()}
              </div>
            </div>

            {/* Remaining Moves Lollipop Badge */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-600 to-rose-400 border-2 border-white/60 shadow-[0_4px_12px_rgba(244,63,94,0.45)] flex flex-col items-center justify-center">
                <span className="text-[8px] font-black text-pink-100 uppercase -mb-0.5">MOVES</span>
                <span className="text-base font-black text-white">{movesLeft}</span>
              </div>

              {/* Audio & Restart Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsMuted((m) => !m)}
                  className="p-2 rounded-xl bg-[#3f196a] border border-[#5d269c] text-pink-200 hover:text-white transition-all cursor-pointer"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-pink-400" />}
                </button>

                <button
                  type="button"
                  onClick={initBoard}
                  className="p-2 rounded-xl bg-[#3f196a] border border-[#5d269c] text-pink-200 hover:text-white transition-all cursor-pointer active:scale-95"
                  title="Restart"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* ── 3-Star Progress Meter Bar ── */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px] font-black text-pink-200 uppercase">
              <span>PROGRESS TARGET</span>
              <div className="flex items-center gap-2">
                <span className={score >= TARGET_SCORE_1_STAR ? "text-amber-300" : "text-neutral-500"}>★ 1,500</span>
                <span className={score >= TARGET_SCORE_2_STAR ? "text-amber-300" : "text-neutral-500"}>★★ 3,000</span>
                <span className={score >= TARGET_SCORE_3_STAR ? "text-amber-300 font-bold" : "text-neutral-500"}>★★★ 5,000</span>
              </div>
            </div>

            <div className="relative w-full h-3 rounded-full bg-[#1e0a36] border border-[#52228d] overflow-hidden p-0.5 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-pink-500 transition-all duration-300 shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                style={{ width: `${starProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── 8x8 Candy Grid Viewport ── */}
        <div className="relative aspect-square w-full rounded-2xl p-2.5 sm:p-3 bg-gradient-to-b from-[#1d0a33] to-[#10031f] border-2 border-[#52228d] shadow-[inset_0_4px_24px_rgba(0,0,0,0.85)] flex items-center justify-center">
          
          {/* Announcer Voice Banner */}
          {comboBanner && (
            <div className="absolute top-6 z-40 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 border-2 border-white/50 text-white font-black text-center shadow-2xl shadow-pink-500/50 animate-bounce">
              <div className="text-base tracking-wider uppercase drop-shadow">{comboBanner.text}</div>
              <div className="text-[10px] text-pink-100 font-bold tracking-widest uppercase">{comboBanner.sub}</div>
            </div>
          )}

          {/* 8x8 Grid Cells */}
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
                  return <div key={`${r}-${c}`} className="w-full h-full rounded-xl bg-black/30" />;
                }

                const def = CANDY_DEFS[candy.colorId] || CANDY_DEFS[0];
                const isColorBomb = candy.special === "COLOR_BOMB";

                return (
                  <div
                    key={candy.id}
                    onTouchStart={(e) => handleTouchStart(r, c, e)}
                    onTouchEnd={(e) => handleTouchEnd(r, c, e)}
                    onClick={() => handleCellClick(r, c)}
                    className={`relative w-full h-full rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? "scale-110 ring-2 ring-white z-20 shadow-[0_0_16px_rgba(255,255,255,0.7)]"
                        : "hover:scale-105 active:scale-95"
                    }`}
                    style={{
                      background: isColorBomb
                        ? "radial-gradient(circle at 35% 35%, #4a2810, #1b0e06)"
                        : `radial-gradient(circle at 35% 35%, ${def.lightColor}, ${def.color} 60%, ${def.darkColor})`,
                      border: `2px solid ${isColorBomb ? "#f59e0b" : def.darkColor}`,
                      boxShadow: isColorBomb
                        ? "0 0 12px rgba(245,158,11,0.5), inset 0 2px 4px rgba(255,255,255,0.4)"
                        : "0 4px 8px rgba(0,0,0,0.5), inset 0 2px 3px rgba(255,255,255,0.5), inset 0 -2px 3px rgba(0,0,0,0.4)",
                    }}
                  >
                    {/* ── 3D Specular Glare Highlight ── */}
                    <div className="absolute top-1 left-1.5 w-2 h-1 rounded-full bg-white/60 pointer-events-none" />

                    {/* ── Striped Candy Laser Stripes ── */}
                    {candy.special === "STRIPED_H" && (
                      <div className="absolute inset-x-0 h-2 bg-gradient-to-r from-transparent via-white/80 to-transparent shadow-[0_0_8px_white] pointer-events-none" />
                    )}
                    {candy.special === "STRIPED_V" && (
                      <div className="absolute inset-y-0 w-2 bg-gradient-to-b from-transparent via-white/80 to-transparent shadow-[0_0_8px_white] pointer-events-none" />
                    )}

                    {/* ── Wrapped Candy Cellophane Corners ── */}
                    {candy.special === "WRAPPED" && (
                      <div className="absolute inset-0 border-2 border-white/80 rounded-xl shadow-[0_0_10px_rgba(255,255,255,0.8)] pointer-events-none animate-pulse">
                        <span className="absolute -top-1 -left-1 w-2 h-2 bg-white rounded-full" />
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full" />
                      </div>
                    )}

                    {/* ── Color Bomb Multi-Color Sprinkles ── */}
                    {isColorBomb ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <span className="text-lg sm:text-xl drop-shadow animate-spin">🔮</span>
                      </div>
                    ) : (
                      /* Juicy Fruit / Candy Icon Silhouette */
                      <div className="w-2.5 h-2.5 rounded-full bg-white/25 shadow-inner" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Game Over / Victory Modal */}
          {isGameOver && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-4 text-center z-50 animate-in fade-in zoom-in-95">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-pink-500 border-2 border-white/60 flex items-center justify-center text-3xl mb-2 animate-bounce shadow-xl">
                {score >= TARGET_SCORE_1_STAR ? "👑" : "🍬"}
              </div>

              <div className="text-xl font-black text-white tracking-wide uppercase">
                {score >= TARGET_SCORE_1_STAR ? "SUGAR CRUSH VICTORY!" : "OUT OF MOVES!"}
              </div>

              <div className="flex items-center gap-1.5 my-2">
                <Star className={`w-6 h-6 ${score >= TARGET_SCORE_1_STAR ? "text-amber-400 fill-amber-400" : "text-neutral-600"}`} />
                <Star className={`w-7 h-7 ${score >= TARGET_SCORE_2_STAR ? "text-amber-400 fill-amber-400" : "text-neutral-600"}`} />
                <Star className={`w-6 h-6 ${score >= TARGET_SCORE_3_STAR ? "text-amber-400 fill-amber-400" : "text-neutral-600"}`} />
              </div>

              <div className="text-xs text-neutral-300 font-bold">
                FINAL SCORE: <span className="text-pink-400 font-black">{score.toLocaleString()}</span>
              </div>

              <button
                type="button"
                onClick={initBoard}
                className="mt-4 px-7 py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 text-white font-black text-xs uppercase shadow-xl shadow-pink-500/40 hover:brightness-110 active:scale-95 cursor-pointer transition-transform"
              >
                PLAY AGAIN 🔄
              </button>
            </div>
          )}
        </div>

        {/* Candy Crush Rules & Combos Footer */}
        <div className="mt-3 pt-2.5 border-t border-[#431973] text-[9px] font-black text-pink-200 uppercase space-y-1">
          <div className="flex items-center justify-between">
            <span>👆 SWIPE OR TAP ADJACENT GEMS TO SWAP</span>
            <span>4 IN A ROW = STRIPED ⚡</span>
          </div>
          <div className="flex items-center justify-between text-neutral-400">
            <span>5 IN A ROW = COLOR BOMB 🔮</span>
            <span>COMBO: STRIPED + COLOR BOMB = MASSIVE BLAST!</span>
          </div>
        </div>
      </div>

      {/* Social Deck */}
      <div className="mt-4">
        <ArcadeSocialDeck match={match} currentUid={currentUid} />
      </div>
    </div>
  );
}
