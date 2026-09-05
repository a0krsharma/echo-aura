"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateSnakeScore, type ArcadeMatch } from "@/lib/arcade";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Volume2, VolumeX, RotateCcw, Play, Pause, Award, Shield, Sparkles } from "lucide-react";

interface SnakeGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
}

// ── LCD Grid Specs (24 cols x 16 rows matches Nokia 84x48 aspect ratio) ──
const COLS = 24;
const ROWS = 16;

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type MazeType = "NONE" | "BOX" | "TUNNEL" | "CROSS";

interface BonusInsect {
  pos: [number, number];
  timeLeft: number; // ticks remaining
  maxTime: number;
  points: number;
}

// Maze obstacle coordinates [row, col]
const MAZE_OBSTACLES: Record<MazeType, [number, number][]> = {
  NONE: [],
  BOX: [], // Handled by collision logic (border walls)
  TUNNEL: [
    // Top horizontal barrier
    [4, 4], [4, 5], [4, 6], [4, 7], [4, 8], [4, 9], [4, 10], [4, 11], [4, 12], [4, 13], [4, 14], [4, 15], [4, 16], [4, 17], [4, 18], [4, 19],
    // Bottom horizontal barrier
    [11, 4], [11, 5], [11, 6], [11, 7], [11, 8], [11, 9], [11, 10], [11, 11], [11, 12], [11, 13], [11, 14], [11, 15], [11, 16], [11, 17], [11, 18], [11, 19],
  ],
  CROSS: [
    // Vertical center beam
    [2, 12], [3, 12], [4, 12], [5, 12], [6, 12], [9, 12], [10, 12], [11, 12], [12, 12], [13, 12],
    // Horizontal center beam
    [8, 4], [8, 5], [8, 6], [8, 7], [8, 8], [8, 15], [8, 16], [8, 17], [8, 18], [8, 19],
  ],
};

// Nokia speed settings (ms per tick)
const SPEED_CONFIG: Record<number, { ms: number; label: string }> = {
  1: { ms: 220, label: "1 (SLOW)" },
  2: { ms: 190, label: "2" },
  3: { ms: 160, label: "3 (CASUAL)" },
  4: { ms: 135, label: "4" },
  5: { ms: 110, label: "5 (CLASSIC)" },
  6: { ms: 90, label: "6" },
  7: { ms: 75, label: "7 (FAST)" },
  8: { ms: 60, label: "8" },
  9: { ms: 48, label: "9 (TURBO)" },
};

// ── Monophonic 8-bit Nokia 3310 Audio Synthesizer ─────────────────────────────
class NokiaAudioEngine {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public playTone(freq: number, durationMs: number, type: OscillatorType = "square", gainVal = 0.12) {
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
      // Ignore audio failure
    }
  }

  // Key click
  public playKeyClick() {
    this.playTone(850, 14, "square", 0.08);
  }

  // Turn blip
  public playTurn() {
    this.playTone(600, 12, "square", 0.05);
  }

  // Eat Apple (iconic double-pip: 880Hz -> 1320Hz)
  public playEat() {
    if (this.isMuted) return;
    this.playTone(880, 25, "square", 0.15);
    setTimeout(() => {
      this.playTone(1320, 40, "square", 0.18);
    }, 28);
  }

  // Bonus Insect Spawn
  public playBonusSpawn() {
    if (this.isMuted) return;
    this.playTone(523, 40, "square", 0.1);
    setTimeout(() => this.playTone(659, 40, "square", 0.1), 45);
    setTimeout(() => this.playTone(784, 50, "square", 0.12), 90);
  }

  // Eat Bonus Insect (high victory arpeggio)
  public playEatBonus() {
    if (this.isMuted) return;
    const notes = [1046, 1318, 1568, 2093];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 45, "square", 0.15), idx * 45);
    });
  }

  // Crash / Wall Hit
  public playCrash() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(120, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(35, this.ctx.currentTime + 0.28);

      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.28);
    } catch {
      // Ignore
    }
  }

  // Authentic Nokia 3310 Snake Game Over jingle (descending)
  public playGameOverJingle() {
    if (this.isMuted) return;
    const melody = [
      { freq: 698, dur: 90 },  // F5
      { freq: 587, dur: 90 },  // D5
      { freq: 466, dur: 90 },  // Bb4
      { freq: 392, dur: 110 }, // G4
      { freq: 311, dur: 120 }, // Eb4
      { freq: 261, dur: 220 }, // C4
    ];
    let time = 0;
    melody.forEach((note) => {
      setTimeout(() => this.playTone(note.freq, note.dur, "square", 0.16), time);
      time += note.dur + 18;
    });
  }
}

const nokiaAudio = new NokiaAudioEngine();

export default function SnakeGame({ match, currentUid }: SnakeGameProps) {
  // Config state
  const [speedLevel, setSpeedLevel] = useState<number>(5);
  const [maze, setMaze] = useState<MazeType>("NONE");
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Game loop state
  const [snake, setSnake] = useState<[number, number][]>([
    [8, 12],
    [8, 11],
    [8, 10],
    [8, 9],
  ]);
  const [food, setFood] = useState<[number, number]>([8, 18]);
  const [bonus, setBonus] = useState<BonusInsect | null>(null);
  const [foodEatenCount, setFoodEatenCount] = useState<number>(0);
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // LCD display blinking ticks for retro animation
  const [lcdTick, setLcdTick] = useState<number>(0);

  // References to keep event handlers fresh
  const directionRef = useRef<Direction>(direction);
  directionRef.current = direction;

  const nextDirectionRef = useRef<Direction>(direction);
  nextDirectionRef.current = direction;

  const mazeRef = useRef<MazeType>(maze);
  mazeRef.current = maze;

  const speedLevelRef = useRef<number>(speedLevel);
  speedLevelRef.current = speedLevel;

  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;

  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;

  const isGameOverRef = useRef<boolean>(isGameOver);
  isGameOverRef.current = isGameOver;

  const bonusRef = useRef<BonusInsect | null>(bonus);
  bonusRef.current = bonus;

  // Touch swipe gesture refs
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Audio mute sync
  useEffect(() => {
    nokiaAudio.isMuted = isMuted;
  }, [isMuted]);

  // Load high score from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("echo_nokia_snake_hi");
      if (saved) {
        setHighScore(parseInt(saved, 10) || 0);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Update saved high score
  const updateLocalHighScore = useCallback((newScore: number) => {
    setHighScore((prev) => {
      if (newScore > prev) {
        try {
          localStorage.setItem("echo_nokia_snake_hi", String(newScore));
        } catch {
          // Ignore
        }
        return newScore;
      }
      return prev;
    });
  }, []);

  // Obstacle cells for current maze
  const getObstacles = useCallback((mazeType: MazeType): [number, number][] => {
    return MAZE_OBSTACLES[mazeType] || [];
  }, []);

  // Spawns standard apple dot
  const spawnFood = useCallback((
    currentSnake: [number, number][],
    currentMaze: MazeType,
    currentBonus: BonusInsect | null
  ): [number, number] => {
    const obstacles = getObstacles(currentMaze);
    let attempts = 0;
    while (attempts < 500) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);

      // Check box border walls
      if (currentMaze === "BOX" && (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1)) {
        attempts++;
        continue;
      }

      // Check snake collision
      const onSnake = currentSnake.some(([sr, sc]) => sr === r && sc === c);
      // Check obstacle collision
      const onObstacle = obstacles.some(([or, oc]) => or === r && oc === c);
      // Check bonus collision
      const onBonus = currentBonus && currentBonus.pos[0] === r && currentBonus.pos[1] === c;

      if (!onSnake && !onObstacle && !onBonus) {
        return [r, c];
      }
      attempts++;
    }
    return [5, 5];
  }, [getObstacles]);

  // Spawns bonus creature (Snake II feature)
  const spawnBonus = useCallback((
    currentSnake: [number, number][],
    currentMaze: MazeType,
    currentFood: [number, number]
  ): BonusInsect => {
    const obstacles = getObstacles(currentMaze);
    let r = Math.floor(Math.random() * (ROWS - 2)) + 1;
    let c = Math.floor(Math.random() * (COLS - 2)) + 1;
    let attempts = 0;
    while (attempts < 300) {
      r = Math.floor(Math.random() * (ROWS - 2)) + 1;
      c = Math.floor(Math.random() * (COLS - 2)) + 1;
      const onSnake = currentSnake.some(([sr, sc]) => sr === r && sc === c);
      const onObstacle = obstacles.some(([or, oc]) => or === r && oc === c);
      const onFood = currentFood[0] === r && currentFood[1] === c;
      if (!onSnake && !onObstacle && !onFood) break;
      attempts++;
    }

    nokiaAudio.playBonusSpawn();
    return {
      pos: [r, c],
      timeLeft: 60, // 60 ticks
      maxTime: 60,
      points: 100,
    };
  }, [getObstacles]);

  // Start new game
  const handleStartGame = () => {
    nokiaAudio.playKeyClick();
    const initialSnake: [number, number][] = [
      [8, 12],
      [8, 11],
      [8, 10],
      [8, 9],
    ];
    const initialFood = spawnFood(initialSnake, mazeRef.current, null);

    setSnake(initialSnake);
    setFood(initialFood);
    setBonus(null);
    setFoodEatenCount(0);
    setDirection("RIGHT");
    directionRef.current = "RIGHT";
    nextDirectionRef.current = "RIGHT";
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    setIsPlaying(true);
  };

  // Pause / Resume
  const handleTogglePause = () => {
    if (!isPlaying || isGameOver) return;
    nokiaAudio.playKeyClick();
    setIsPaused((p) => !p);
  };

  // Safe direction changer (prevents 180° instant self-reversals)
  const changeDirection = useCallback((newDir: Direction) => {
    const curr = directionRef.current;
    if (
      (newDir === "UP" && curr !== "DOWN") ||
      (newDir === "DOWN" && curr !== "UP") ||
      (newDir === "LEFT" && curr !== "RIGHT") ||
      (newDir === "RIGHT" && curr !== "LEFT")
    ) {
      if (nextDirectionRef.current !== newDir) {
        nextDirectionRef.current = newDir;
        nokiaAudio.playTurn();
        if (navigator.vibrate) navigator.vibrate(10);
      }
    }
  }, []);

  // Main game tick
  const step = useCallback(() => {
    if (!isPlayingRef.current || isPausedRef.current || isGameOverRef.current) return;

    setLcdTick((t) => (t + 1) % 1000);

    // Apply buffered direction
    const dir = nextDirectionRef.current;
    directionRef.current = dir;

    setSnake((prevSnake) => {
      const head = prevSnake[0];
      let newR = head[0];
      let newC = head[1];

      if (dir === "UP") newR -= 1;
      else if (dir === "DOWN") newR += 1;
      else if (dir === "LEFT") newC -= 1;
      else if (dir === "RIGHT") newC += 1;

      const currentMaze = mazeRef.current;

      // Handle Border collision or screen wrap
      if (currentMaze === "BOX") {
        if (newR <= 0 || newR >= ROWS - 1 || newC <= 0 || newC >= COLS - 1) {
          triggerGameOver();
          return prevSnake;
        }
      } else {
        // Classic Nokia wrap mode (toroidal screen)
        if (newR < 0) newR = ROWS - 1;
        else if (newR >= ROWS) newR = 0;
        if (newC < 0) newC = COLS - 1;
        else if (newC >= COLS) newC = 0;
      }

      // Check obstacle maze collision
      const obstacles = MAZE_OBSTACLES[currentMaze] || [];
      if (obstacles.some(([or, oc]) => or === newR && oc === newC)) {
        triggerGameOver();
        return prevSnake;
      }

      // Check self-collision (excluding the tail if it moves)
      const willGrow =
        (newR === food[0] && newC === food[1]) ||
        (bonusRef.current && newR === bonusRef.current.pos[0] && newC === bonusRef.current.pos[1]);

      const bodyToCheck = willGrow ? prevSnake : prevSnake.slice(0, -1);
      if (bodyToCheck.some(([sr, sc]) => sr === newR && sc === newC)) {
        triggerGameOver();
        return prevSnake;
      }

      const newHead: [number, number] = [newR, newC];
      const newSnake = [newHead, ...prevSnake];

      // Handle Apple consumption
      if (newR === food[0] && newC === food[1]) {
        nokiaAudio.playEat();
        const basePts = 10 * speedLevelRef.current;
        const newScore = score + basePts;
        setScore(newScore);
        updateLocalHighScore(newScore);

        const newCount = foodEatenCount + 1;
        setFoodEatenCount(newCount);

        // Spawn bonus insect every 5 apples if none active
        let nextBonus = bonusRef.current;
        if (newCount % 5 === 0 && !nextBonus) {
          nextBonus = spawnBonus(newSnake, currentMaze, food);
          setBonus(nextBonus);
        }

        setFood(spawnFood(newSnake, currentMaze, nextBonus));
      } else if (bonusRef.current && newR === bonusRef.current.pos[0] && newC === bonusRef.current.pos[1]) {
        // Handle Bonus Insect consumption
        nokiaAudio.playEatBonus();
        const bonusPts = Math.round(bonusRef.current.points * (bonusRef.current.timeLeft / bonusRef.current.maxTime)) + 50;
        const newScore = score + bonusPts;
        setScore(newScore);
        updateLocalHighScore(newScore);
        setBonus(null);
      } else {
        newSnake.pop();
      }

      // Update bonus countdown and subtle crawl
      if (bonusRef.current) {
        setBonus((prevB) => {
          if (!prevB) return null;
          if (prevB.timeLeft <= 1) return null;

          // Bonus insect crawls 1 cell occasionally
          let nextPos = prevB.pos;
          if (prevB.timeLeft % 8 === 0) {
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
            const testR = Math.max(1, Math.min(ROWS - 2, prevB.pos[0] + dr));
            const testC = Math.max(1, Math.min(COLS - 2, prevB.pos[1] + dc));
            if (!newSnake.some(([sr, sc]) => sr === testR && sc === testC)) {
              nextPos = [testR, testC];
            }
          }

          return {
            ...prevB,
            pos: nextPos,
            timeLeft: prevB.timeLeft - 1,
          };
        });
      }

      return newSnake;
    });
  }, [food, score, foodEatenCount, spawnFood, spawnBonus, updateLocalHighScore]);

  const triggerGameOver = () => {
    setIsGameOver(true);
    setIsPlaying(false);
    nokiaAudio.playCrash();
    setTimeout(() => {
      nokiaAudio.playGameOverJingle();
    }, 320);
    updateSnakeScore(match.id, currentUid, score, true);
  };

  // Game loop ticker
  useEffect(() => {
    if (!isPlaying || isPaused || isGameOver) return;
    const intervalMs = SPEED_CONFIG[speedLevel]?.ms || 110;
    const interval = setInterval(step, intervalMs);
    return () => clearInterval(interval);
  }, [isPlaying, isPaused, isGameOver, speedLevel, step]);

  // Physical Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling on arrow keys or space
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Numpad8" || e.key === "2") {
        changeDirection("UP");
      } else if (e.code === "ArrowDown" || e.code === "KeyS" || e.code === "Numpad2" || e.key === "8") {
        changeDirection("DOWN");
      } else if (e.code === "ArrowLeft" || e.code === "KeyA" || e.code === "Numpad4" || e.key === "4") {
        changeDirection("LEFT");
      } else if (e.code === "ArrowRight" || e.code === "KeyD" || e.code === "Numpad6" || e.key === "6") {
        changeDirection("RIGHT");
      } else if (e.code === "Space" || e.code === "Enter") {
        if (!isPlaying || isGameOver) {
          handleStartGame();
        } else {
          handleTogglePause();
        }
      } else if (e.key >= "1" && e.key <= "9" && !isPlaying) {
        setSpeedLevel(parseInt(e.key, 10));
        nokiaAudio.playKeyClick();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, isGameOver, changeDirection]);

  // Direct Touch / Swipe on LCD display
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) > 25) {
      if (absX > absY) {
        if (dx > 0) changeDirection("RIGHT");
        else changeDirection("LEFT");
      } else {
        if (dy > 0) changeDirection("DOWN");
        else changeDirection("UP");
      }
    }
  };

  // Cycle Mazes
  const handleCycleMaze = () => {
    nokiaAudio.playKeyClick();
    const sequence: MazeType[] = ["NONE", "BOX", "TUNNEL", "CROSS"];
    const nextIdx = (sequence.indexOf(maze) + 1) % sequence.length;
    setMaze(sequence[nextIdx]);
  };

  // Cycle Speed
  const handleCycleSpeed = () => {
    nokiaAudio.playKeyClick();
    setSpeedLevel((lvl) => (lvl % 9) + 1);
  };

  // Render LCD cell contents
  const obstacles = MAZE_OBSTACLES[maze] || [];

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto py-2 px-1 select-none font-mono">
      {/* ── Outer Nokia 3310 Phone Chassis ── */}
      <div className="relative rounded-[46px] p-4 sm:p-5 bg-gradient-to-b from-[#1b2b3a] via-[#15212d] to-[#0c151e] shadow-[0_22px_60px_rgba(0,0,0,0.85),inset_0_2px_4px_rgba(255,255,255,0.25),inset_0_-4px_8px_rgba(0,0,0,0.7)] border-4 border-[#2b3e52]">
        
        {/* Top Speaker Ear-piece */}
        <div className="flex flex-col items-center justify-center mb-3">
          <div className="w-16 h-2 rounded-full bg-[#0b1219] border border-[#3b4c5e] shadow-[inset_0_1px_3px_rgba(0,0,0,0.9)] flex items-center justify-center gap-1">
            <span className="w-1 h-1 rounded-full bg-[#1b2633]" />
            <span className="w-1 h-1 rounded-full bg-[#1b2633]" />
            <span className="w-1 h-1 rounded-full bg-[#1b2633]" />
            <span className="w-1 h-1 rounded-full bg-[#1b2633]" />
          </div>
          {/* Nokia Logo */}
          <div className="mt-1.5 tracking-[0.28em] text-[13px] font-black text-[#c2d0df] drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] font-sans">
            NOKIA
          </div>
        </div>

        {/* ── Inner Curved Bezel Frame ── */}
        <div className="relative rounded-[28px] p-3 sm:p-3.5 bg-gradient-to-b from-[#243343] to-[#1a2734] border-2 border-[#384a5c] shadow-[inset_0_3px_8px_rgba(0,0,0,0.6)]">
          
          {/* Glass Glare Reflection Overlay */}
          <div className="absolute inset-0 rounded-[26px] bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.12] pointer-events-none z-20" />

          {/* ── Retro Monochrome Dot-Matrix LCD Display ── */}
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="relative rounded-[16px] p-2.5 overflow-hidden border-2 border-[#41533b] shadow-[inset_0_4px_10px_rgba(0,0,0,0.45)] bg-[#95a881] text-[#1c2714]"
            style={{
              backgroundImage: `
                radial-gradient(#899c75 18%, transparent 19%),
                radial-gradient(#899c75 18%, transparent 19%)
              `,
              backgroundPosition: "0 0, 2px 2px",
              backgroundSize: "4px 4px",
            }}
          >
            {/* LCD Top Status Bar */}
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold border-b border-[#73855f] pb-1 mb-1 tracking-wider uppercase">
              {/* Antenna / Signal */}
              <div className="flex items-end gap-0.5" title="Signal Strength">
                <span className="w-1 h-1.5 bg-[#1c2714]" />
                <span className="w-1 h-2.5 bg-[#1c2714]" />
                <span className="w-1 h-3.5 bg-[#1c2714]" />
                <span className="w-1 h-4 bg-[#1c2714]" />
                <span className="text-[8px] font-mono ml-0.5">ECHO</span>
              </div>

              {/* Title & Game Mode */}
              <div className="font-extrabold tracking-widest text-center">
                {isGameOver ? "CRASH!" : isPaused ? "PAUSED" : "SNAKE II"}
              </div>

              {/* Battery Meter */}
              <div className="flex items-center gap-1">
                <span className="text-[8px]">LVL {speedLevel}</span>
                <div className="w-5 h-2.5 border border-[#1c2714] p-0.5 flex gap-0.5 rounded-[1px]">
                  <span className="w-1 h-full bg-[#1c2714]" />
                  <span className="w-1 h-full bg-[#1c2714]" />
                  <span className="w-1 h-full bg-[#1c2714]" />
                </div>
              </div>
            </div>

            {/* Sub-Header: Score & Bonus Bar */}
            <div className="flex items-center justify-between text-[10px] font-extrabold px-0.5 mb-1.5">
              <span>SCORE: {String(score).padStart(5, "0")}</span>
              {bonus && (
                <div className="flex items-center gap-1 text-[9px] animate-pulse">
                  <span>BUG:</span>
                  <div className="w-12 h-1.5 bg-[#7e926a] border border-[#1c2714] overflow-hidden">
                    <div
                      className="h-full bg-[#1c2714]"
                      style={{ width: `${(bonus.timeLeft / bonus.maxTime) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              <span>HI: {String(highScore).padStart(5, "0")}</span>
            </div>

            {/* ── Main LCD 24x16 Grid Matrix ── */}
            <div
              className={`relative aspect-[24/16] w-full bg-[#8ea177] border-2 border-[#1c2714] ${
                maze === "BOX" ? "ring-2 ring-[#1c2714]" : ""
              }`}
            >
              {/* Dot-matrix grid layer */}
              <div
                className="w-full h-full grid"
                style={{
                  gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: ROWS }).map((_, r) =>
                  Array.from({ length: COLS }).map((_, c) => {
                    const isHead = snake[0][0] === r && snake[0][1] === c;
                    const isBody = snake.slice(1).some(([sr, sc]) => sr === r && sc === c);
                    const isApple = food[0] === r && food[1] === c;
                    const isInsect = bonus && bonus.pos[0] === r && bonus.pos[1] === c;
                    const isObstacle =
                      obstacles.some(([or, oc]) => or === r && oc === c) ||
                      (maze === "BOX" && (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1));

                    return (
                      <div
                        key={`${r}-${c}`}
                        className="w-full h-full flex items-center justify-center p-[0.5px]"
                      >
                        {isHead ? (
                          // Snake Head with Eyes
                          <div className="w-full h-full bg-[#1c2714] relative rounded-[1px] flex items-center justify-center">
                            {/* Head Eyes Orientation */}
                            {direction === "RIGHT" && (
                              <div className="absolute right-[1px] flex flex-col gap-[2px]">
                                <span className="w-[1.5px] h-[1.5px] bg-[#95a881]" />
                                <span className="w-[1.5px] h-[1.5px] bg-[#95a881]" />
                              </div>
                            )}
                            {direction === "LEFT" && (
                              <div className="absolute left-[1px] flex flex-col gap-[2px]">
                                <span className="w-[1.5px] h-[1.5px] bg-[#95a881]" />
                                <span className="w-[1.5px] h-[1.5px] bg-[#95a881]" />
                              </div>
                            )}
                            {direction === "UP" && (
                              <div className="absolute top-[1px] flex gap-[2px]">
                                <span className="w-[1.5px] h-[1.5px] bg-[#95a881]" />
                                <span className="w-[1.5px] h-[1.5px] bg-[#95a881]" />
                              </div>
                            )}
                            {direction === "DOWN" && (
                              <div className="absolute bottom-[1px] flex gap-[2px]">
                                <span className="w-[1.5px] h-[1.5px] bg-[#95a881]" />
                                <span className="w-[1.5px] h-[1.5px] bg-[#95a881]" />
                              </div>
                            )}
                          </div>
                        ) : isBody ? (
                          // Snake Body Segment
                          <div className="w-full h-full bg-[#1c2714] rounded-[0.5px]" />
                        ) : isApple ? (
                          // Classic Nokia 3x3 Apple Dot
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-[#1c2714] rounded-[1px] relative">
                              <span className="absolute -top-[1.5px] left-[1px] w-[1px] h-[1.5px] bg-[#1c2714]" />
                            </div>
                          </div>
                        ) : isInsect ? (
                          // Nokia Snake II Bonus Insect (Spider/Beetle)
                          <div className="w-full h-full flex items-center justify-center animate-bounce">
                            <div className="w-2.5 h-2 bg-[#1c2714] relative rounded-[1px]">
                              {/* Legs */}
                              <span className="absolute -top-[1px] -left-[1px] w-[1px] h-[1px] bg-[#1c2714]" />
                              <span className="absolute -top-[1px] -right-[1px] w-[1px] h-[1px] bg-[#1c2714]" />
                              <span className="absolute -bottom-[1px] -left-[1px] w-[1px] h-[1px] bg-[#1c2714]" />
                              <span className="absolute -bottom-[1px] -right-[1px] w-[1px] h-[1px] bg-[#1c2714]" />
                            </div>
                          </div>
                        ) : isObstacle ? (
                          // Maze Brick Obstacle
                          <div className="w-full h-full bg-[#1c2714] border-[0.5px] border-[#8ea177]" />
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>

              {/* ── Overlay: Start / Game Over Modal on LCD ── */}
              {(!isPlaying || isGameOver || isPaused) && (
                <div className="absolute inset-0 bg-[#95a881]/90 flex flex-col items-center justify-center p-2 text-center text-[#1c2714] z-10">
                  {isGameOver ? (
                    <div className="space-y-1">
                      <div className="text-xs font-black tracking-widest uppercase">
                        💀 GAME OVER
                      </div>
                      <div className="text-[10px] font-extrabold">
                        SCORE: {score}
                      </div>
                      <div className="text-[9px] text-[#2b3a20]">
                        {score >= highScore && score > 0 ? "★ NEW RECORD! ★" : `BEST: ${highScore}`}
                      </div>
                      <button
                        type="button"
                        onClick={handleStartGame}
                        className="mt-1 px-3 py-1 bg-[#1c2714] text-[#95a881] font-black text-[10px] uppercase rounded-[2px] shadow cursor-pointer active:scale-95"
                      >
                        [ PLAY AGAIN ]
                      </button>
                    </div>
                  ) : isPaused ? (
                    <div className="space-y-1">
                      <div className="text-xs font-black tracking-widest">GAME PAUSED</div>
                      <button
                        type="button"
                        onClick={handleTogglePause}
                        className="mt-1 px-3 py-1 bg-[#1c2714] text-[#95a881] font-black text-[10px] uppercase rounded-[2px] shadow cursor-pointer"
                      >
                        RESUME
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-xs font-black tracking-widest uppercase">
                        SNAKE II • NOKIA
                      </div>
                      <div className="text-[9px] font-bold">
                        SPEED: {speedLevel} // MAZE: {maze}
                      </div>
                      <div className="text-[8px] text-[#2b3a20] max-w-[180px]">
                        Press 2/4/6/8 or swipe screen to steer snake
                      </div>
                      <button
                        type="button"
                        onClick={handleStartGame}
                        className="mt-1 px-4 py-1.5 bg-[#1c2714] text-[#95a881] font-black text-[10px] uppercase rounded-[2px] shadow cursor-pointer active:scale-95"
                      >
                        START GAME
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* LCD Bottom Hints */}
            <div className="flex items-center justify-between text-[8px] font-extrabold text-[#37472c] pt-1 mt-0.5 border-t border-[#73855f]">
              <span>SWIPE / 2,4,6,8</span>
              <span>MAZE: {maze}</span>
              <span>SPD: {speedLevel}</span>
            </div>
          </div>
        </div>

        {/* ── Nokia 3310 Softkeys & Central Navi-Bar ── */}
        <div className="mt-3 mb-2 px-1">
          <div className="flex items-center justify-between">
            {/* Left Softkey: Menu / Start */}
            <button
              type="button"
              onClick={handleStartGame}
              className="w-16 h-7 rounded-t-xl rounded-b-md bg-gradient-to-b from-[#3a4d60] to-[#253443] border border-[#506478] shadow-[0_2px_4px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.3)] active:translate-y-0.5 active:shadow-inner text-[9px] font-black text-[#d0e0f0] flex items-center justify-center cursor-pointer transition-transform"
            >
              {isPlaying && !isGameOver ? "RESTART" : "START"}
            </button>

            {/* Central Navi-Key (Classic Blue Curved Pill) */}
            <button
              type="button"
              onClick={isPlaying ? handleTogglePause : handleStartGame}
              className="w-20 h-9 rounded-2xl bg-gradient-to-b from-[#2b5887] via-[#1e3f63] to-[#12273e] border-2 border-[#4176ad] shadow-[0_4px_8px_rgba(0,0,0,0.7),inset_0_2px_3px_rgba(255,255,255,0.4)] active:scale-95 text-[10px] font-black text-white flex items-center justify-center gap-1 cursor-pointer transition-transform"
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{isPaused ? "RESUME" : "PAUSE"}</span>
            </button>

            {/* Right Softkey: Maze / Back */}
            <button
              type="button"
              onClick={handleCycleMaze}
              className="w-16 h-7 rounded-t-xl rounded-b-md bg-gradient-to-b from-[#3a4d60] to-[#253443] border border-[#506478] shadow-[0_2px_4px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.3)] active:translate-y-0.5 active:shadow-inner text-[9px] font-black text-[#d0e0f0] flex items-center justify-center cursor-pointer transition-transform"
            >
              MAZE 🔲
            </button>
          </div>
        </div>

        {/* ── Nokia 3310 Numeric Keypad (4 Rows x 3 Columns) ── */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 px-2 pt-1 pb-2">
          {/* Key 1: Speed Toggle */}
          <button
            type="button"
            onClick={handleCycleSpeed}
            className="h-10 rounded-xl bg-gradient-to-b from-[#2b3a4a] to-[#1a2530] border border-[#445668] shadow-[0_3px_5px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.2)] active:scale-95 text-center flex flex-col items-center justify-center cursor-pointer transition-transform group"
          >
            <span className="text-xs font-black text-white group-hover:text-amber-400">1</span>
            <span className="text-[7px] text-neutral-400">SPD {speedLevel}</span>
          </button>

          {/* Key 2: UP ARROW */}
          <button
            type="button"
            onClick={() => changeDirection("UP")}
            className="h-10 rounded-xl bg-gradient-to-b from-[#36495c] to-[#202e3b] border-2 border-[#5c7288] shadow-[0_3px_6px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.3)] active:scale-90 text-center flex flex-col items-center justify-center cursor-pointer transition-all hover:border-amber-400 group"
          >
            <span className="text-xs font-black text-amber-300">2 ▲</span>
            <span className="text-[7px] text-amber-200 font-bold">UP</span>
          </button>

          {/* Key 3: Sound Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsMuted((m) => !m);
              nokiaAudio.playKeyClick();
            }}
            className="h-10 rounded-xl bg-gradient-to-b from-[#2b3a4a] to-[#1a2530] border border-[#445668] shadow-[0_3px_5px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.2)] active:scale-95 text-center flex flex-col items-center justify-center cursor-pointer transition-transform group"
          >
            <span className="text-xs font-black text-white group-hover:text-amber-400">3</span>
            <span className="text-[7px] text-neutral-400 flex items-center gap-0.5">
              {isMuted ? <VolumeX className="w-2.5 h-2.5" /> : <Volume2 className="w-2.5 h-2.5" />}
              {isMuted ? "MUTE" : "SOUND"}
            </span>
          </button>

          {/* Key 4: LEFT ARROW */}
          <button
            type="button"
            onClick={() => changeDirection("LEFT")}
            className="h-10 rounded-xl bg-gradient-to-b from-[#36495c] to-[#202e3b] border-2 border-[#5c7288] shadow-[0_3px_6px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.3)] active:scale-90 text-center flex flex-col items-center justify-center cursor-pointer transition-all hover:border-amber-400 group"
          >
            <span className="text-xs font-black text-amber-300">4 ◄</span>
            <span className="text-[7px] text-amber-200 font-bold">LEFT</span>
          </button>

          {/* Key 5: Action / Enter */}
          <button
            type="button"
            onClick={isPlaying ? handleTogglePause : handleStartGame}
            className="h-10 rounded-xl bg-gradient-to-b from-[#2b3a4a] to-[#1a2530] border border-[#445668] shadow-[0_3px_5px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.2)] active:scale-95 text-center flex flex-col items-center justify-center cursor-pointer transition-transform group"
          >
            <span className="text-xs font-black text-white group-hover:text-amber-400">5</span>
            <span className="text-[7px] text-neutral-400">OK</span>
          </button>

          {/* Key 6: RIGHT ARROW */}
          <button
            type="button"
            onClick={() => changeDirection("RIGHT")}
            className="h-10 rounded-xl bg-gradient-to-b from-[#36495c] to-[#202e3b] border-2 border-[#5c7288] shadow-[0_3px_6px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.3)] active:scale-90 text-center flex flex-col items-center justify-center cursor-pointer transition-all hover:border-amber-400 group"
          >
            <span className="text-xs font-black text-amber-300">6 ►</span>
            <span className="text-[7px] text-amber-200 font-bold">RIGHT</span>
          </button>

          {/* Key 7 */}
          <button
            type="button"
            onClick={() => {
              setSpeedLevel(3);
              nokiaAudio.playKeyClick();
            }}
            className="h-10 rounded-xl bg-gradient-to-b from-[#2b3a4a] to-[#1a2530] border border-[#445668] shadow-[0_3px_5px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.2)] active:scale-95 text-center flex flex-col items-center justify-center cursor-pointer transition-transform group"
          >
            <span className="text-xs font-black text-white group-hover:text-amber-400">7</span>
            <span className="text-[7px] text-neutral-400">SLOW</span>
          </button>

          {/* Key 8: DOWN ARROW */}
          <button
            type="button"
            onClick={() => changeDirection("DOWN")}
            className="h-10 rounded-xl bg-gradient-to-b from-[#36495c] to-[#202e3b] border-2 border-[#5c7288] shadow-[0_3px_6px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.3)] active:scale-90 text-center flex flex-col items-center justify-center cursor-pointer transition-all hover:border-amber-400 group"
          >
            <span className="text-xs font-black text-amber-300">8 ▼</span>
            <span className="text-[7px] text-amber-200 font-bold">DOWN</span>
          </button>

          {/* Key 9 */}
          <button
            type="button"
            onClick={() => {
              setSpeedLevel(9);
              nokiaAudio.playKeyClick();
            }}
            className="h-10 rounded-xl bg-gradient-to-b from-[#2b3a4a] to-[#1a2530] border border-[#445668] shadow-[0_3px_5px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.2)] active:scale-95 text-center flex flex-col items-center justify-center cursor-pointer transition-transform group"
          >
            <span className="text-xs font-black text-white group-hover:text-amber-400">9</span>
            <span className="text-[7px] text-neutral-400">TURBO</span>
          </button>

          {/* Key * (Sound toggle) */}
          <button
            type="button"
            onClick={() => {
              setIsMuted((m) => !m);
              nokiaAudio.playKeyClick();
            }}
            className="h-9 rounded-xl bg-gradient-to-b from-[#24313f] to-[#151e27] border border-[#3c4c5c] shadow-[0_2px_4px_rgba(0,0,0,0.7)] active:scale-95 text-center flex flex-col items-center justify-center cursor-pointer transition-transform"
          >
            <span className="text-xs font-black text-neutral-300">*</span>
            <span className="text-[6px] text-neutral-500">MUTE</span>
          </button>

          {/* Key 0 */}
          <button
            type="button"
            onClick={handleCycleMaze}
            className="h-9 rounded-xl bg-gradient-to-b from-[#24313f] to-[#151e27] border border-[#3c4c5c] shadow-[0_2px_4px_rgba(0,0,0,0.7)] active:scale-95 text-center flex flex-col items-center justify-center cursor-pointer transition-transform"
          >
            <span className="text-xs font-black text-neutral-300">0</span>
            <span className="text-[6px] text-neutral-500">MAZE</span>
          </button>

          {/* Key # (Reset / Rematch) */}
          <button
            type="button"
            onClick={handleStartGame}
            className="h-9 rounded-xl bg-gradient-to-b from-[#24313f] to-[#151e27] border border-[#3c4c5c] shadow-[0_2px_4px_rgba(0,0,0,0.7)] active:scale-95 text-center flex flex-col items-center justify-center cursor-pointer transition-transform"
          >
            <span className="text-xs font-black text-neutral-300">#</span>
            <span className="text-[6px] text-neutral-500">RESET</span>
          </button>
        </div>

        {/* Bottom Phone Microphone Hole */}
        <div className="flex justify-center pt-1 pb-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#080d13] border border-[#2a3848]" />
        </div>
      </div>

      {/* Social & Chat Deck */}
      <div className="mt-4">
        <ArcadeSocialDeck match={match} currentUid={currentUid} />
      </div>
    </div>
  );
}
