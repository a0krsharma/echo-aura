"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateSnakeScore, type ArcadeMatch } from "@/lib/arcade";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Shield,
  Zap,
  Grid,
  Trophy,
} from "lucide-react";

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
  3: { ms: 160, label: "3" },
  4: { ms: 135, label: "4" },
  5: { ms: 110, label: "5 (CLASSIC)" },
  6: { ms: 90, label: "6" },
  7: { ms: 75, label: "7" },
  8: { ms: 60, label: "8" },
  9: { ms: 48, label: "9 (TURBO)" },
};

// ── Monophonic 8-bit Nokia 3310 Audio Synthesizer ─────────────────────────────
class NokiaAudioEngine {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public playTone(
    freq: number,
    durationMs: number,
    type: OscillatorType = "square",
    gainVal = 0.12
  ) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        this.ctx.currentTime + durationMs / 1000
      );

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + durationMs / 1000);
    } catch {
      // Ignore audio failure
    }
  }

  // Tactile click
  public playClick() {
    this.playTone(850, 14, "square", 0.08);
  }

  // Snake turn blip
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

  // Eat Bonus Insect (victory fanfare arpeggio)
  public playEatBonus() {
    if (this.isMuted) return;
    const notes = [1046, 1318, 1568, 2093];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 45, "square", 0.15), idx * 45);
    });
  }

  // Collision Crunch
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

  // Authentic descending Nokia 3310 Game Over melody
  public playGameOverJingle() {
    if (this.isMuted) return;
    const melody = [
      { freq: 698, dur: 90 }, // F5
      { freq: 587, dur: 90 }, // D5
      { freq: 466, dur: 90 }, // Bb4
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

  // Touch & Swipe gesture refs
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
  const spawnFood = useCallback(
    (
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
        if (
          currentMaze === "BOX" &&
          (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1)
        ) {
          attempts++;
          continue;
        }

        const onSnake = currentSnake.some(([sr, sc]) => sr === r && sc === c);
        const onObstacle = obstacles.some(([or, oc]) => or === r && oc === c);
        const onBonus =
          currentBonus && currentBonus.pos[0] === r && currentBonus.pos[1] === c;

        if (!onSnake && !onObstacle && !onBonus) {
          return [r, c];
        }
        attempts++;
      }
      return [5, 5];
    },
    [getObstacles]
  );

  // Spawns bonus creature (Snake II feature)
  const spawnBonus = useCallback(
    (
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
        timeLeft: 60,
        maxTime: 60,
        points: 100,
      };
    },
    [getObstacles]
  );

  // Start new game
  const handleStartGame = () => {
    nokiaAudio.playClick();
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
    nokiaAudio.playClick();
    setIsPaused((p) => !p);
  };

  // Safe direction changer (prevents 180° self reversals)
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
        if (typeof window !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate(10);
          } catch {
            // Ignore
          }
        }
      }
    }
  }, []);

  // Main game tick
  const step = useCallback(() => {
    if (!isPlayingRef.current || isPausedRef.current || isGameOverRef.current) return;

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

      // Check self-collision
      const willGrow =
        (newR === food[0] && newC === food[1]) ||
        (bonusRef.current &&
          newR === bonusRef.current.pos[0] &&
          newC === bonusRef.current.pos[1]);

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
      } else if (
        bonusRef.current &&
        newR === bonusRef.current.pos[0] &&
        newC === bonusRef.current.pos[1]
      ) {
        // Handle Bonus Insect consumption
        nokiaAudio.playEatBonus();
        const bonusPts =
          Math.round(
            bonusRef.current.points *
              (bonusRef.current.timeLeft / bonusRef.current.maxTime)
          ) + 50;
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

          let nextPos = prevB.pos;
          if (prevB.timeLeft % 8 === 0) {
            const dirs = [
              [-1, 0],
              [1, 0],
              [0, -1],
              [0, 1],
            ];
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
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
          e.code
        )
      ) {
        e.preventDefault();
      }

      if (
        e.code === "ArrowUp" ||
        e.code === "KeyW" ||
        e.code === "Numpad8" ||
        e.key === "2"
      ) {
        changeDirection("UP");
      } else if (
        e.code === "ArrowDown" ||
        e.code === "KeyS" ||
        e.code === "Numpad2" ||
        e.key === "8"
      ) {
        changeDirection("DOWN");
      } else if (
        e.code === "ArrowLeft" ||
        e.code === "KeyA" ||
        e.code === "Numpad4" ||
        e.key === "4"
      ) {
        changeDirection("LEFT");
      } else if (
        e.code === "ArrowRight" ||
        e.code === "KeyD" ||
        e.code === "Numpad6" ||
        e.key === "6"
      ) {
        changeDirection("RIGHT");
      } else if (e.code === "Space" || e.code === "Enter") {
        if (!isPlaying || isGameOver) {
          handleStartGame();
        } else {
          handleTogglePause();
        }
      } else if (e.key >= "1" && e.key <= "9" && !isPlaying) {
        setSpeedLevel(parseInt(e.key, 10));
        nokiaAudio.playClick();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, isGameOver, changeDirection]);

  // ── Screen Swipe Navigation (Up, Down, Left, Right) ──
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

    // Trigger swipe if moved at least 20px
    if (Math.max(absX, absY) > 20) {
      if (absX > absY) {
        if (dx > 0) changeDirection("RIGHT");
        else changeDirection("LEFT");
      } else {
        if (dy > 0) changeDirection("DOWN");
        else changeDirection("UP");
      }
    }
  };

  // Mouse drag swipe support for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    touchStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.clientX - touchStartRef.current.x;
    const dy = e.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) > 20) {
      if (absX > absY) {
        if (dx > 0) changeDirection("RIGHT");
        else changeDirection("LEFT");
      } else {
        if (dy > 0) changeDirection("DOWN");
        else changeDirection("UP");
      }
    }
  };

  const obstacles = MAZE_OBSTACLES[maze] || [];

  return (
    <div className="w-full max-w-lg mx-auto py-2 px-1 select-none font-mono">
      {/* ── Outer Retro Console Frame ── */}
      <div className="relative rounded-3xl p-3 sm:p-4 bg-gradient-to-b from-[#18232c] via-[#121a22] to-[#0a0f15] border-2 border-[#2b3b4a] shadow-[0_16px_40px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.2)]">
        
        {/* Top Console Header Bar */}
        <div className="flex items-center justify-between px-2 pb-2.5 mb-2 border-b border-[#233140] text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#95a881] shadow-[0_0_8px_#95a881] animate-pulse" />
            <span className="font-extrabold tracking-widest text-neutral-200 text-[11px] sm:text-xs">
              RETRO NOKIA SNAKE II
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Mute Button */}
            <button
              type="button"
              onClick={() => {
                setIsMuted((m) => !m);
                nokiaAudio.playClick();
              }}
              className="p-1.5 rounded-lg bg-[#1a2530] border border-[#344658] text-neutral-300 hover:text-white hover:border-[#95a881] transition-all cursor-pointer"
              title={isMuted ? "Unmute Audio" : "Mute Audio"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-neutral-400" /> : <Volume2 className="w-3.5 h-3.5 text-[#95a881]" />}
            </button>

            {/* Play / Restart Button */}
            <button
              type="button"
              onClick={isPlaying && !isGameOver ? handleTogglePause : handleStartGame}
              className="px-2.5 py-1 rounded-lg bg-[#95a881] text-[#1c2714] font-black text-[10px] sm:text-xs tracking-wider uppercase hover:bg-[#a6bb91] transition-all cursor-pointer flex items-center gap-1 shadow-[0_0_12px_rgba(149,168,129,0.3)]"
            >
              {isPlaying && !isGameOver ? (
                isPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />
              ) : (
                <RotateCcw className="w-3 h-3" />
              )}
              <span>{isPlaying && !isGameOver ? (isPaused ? "RESUME" : "PAUSE") : (isGameOver ? "RETRY" : "START")}</span>
            </button>
          </div>
        </div>

        {/* ── 2. Monochrome Dot-Matrix Green LCD Screen ── */}
        <div className="relative rounded-2xl p-2.5 sm:p-3 bg-gradient-to-b from-[#212d38] to-[#16202a] border-2 border-[#334455] shadow-[inset_0_3px_8px_rgba(0,0,0,0.65)]">
          {/* Glass Glare Reflection */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.1] pointer-events-none z-20" />

          {/* Screen Canvas Container */}
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            className="relative rounded-xl p-2.5 overflow-hidden border-2 border-[#3b4b35] shadow-[inset_0_4px_12px_rgba(0,0,0,0.55)] bg-[#95a881] text-[#1c2714] cursor-grab active:cursor-grabbing"
            style={{
              backgroundImage: `
                radial-gradient(#899c75 20%, transparent 20%),
                radial-gradient(#899c75 20%, transparent 20%)
              `,
              backgroundPosition: "0 0, 2px 2px",
              backgroundSize: "4px 4px",
            }}
          >
            {/* Status Bar */}
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold border-b border-[#73855f] pb-1.5 mb-1.5 tracking-wider uppercase">
              {/* Signal strength antenna bars */}
              <div className="flex items-end gap-0.5" title="Signal Strength">
                <span className="w-1 h-1.5 bg-[#1c2714]" />
                <span className="w-1 h-2.5 bg-[#1c2714]" />
                <span className="w-1 h-3.5 bg-[#1c2714]" />
                <span className="w-1 h-4 bg-[#1c2714]" />
                <span className="text-[8px] font-mono ml-0.5">ECHO</span>
              </div>

              {/* Title / State */}
              <div className="font-extrabold tracking-widest text-center">
                {isGameOver ? "💀 CRASH!" : isPaused ? "⏸ PAUSED" : "SNAKE II"}
              </div>

              {/* Battery level meter & Active Level */}
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black">LVL {speedLevel}</span>
                <div className="w-5 h-2.5 border border-[#1c2714] p-0.5 flex gap-0.5 rounded-[1px]" title="Nokia Battery">
                  <span className="w-1 h-full bg-[#1c2714]" />
                  <span className="w-1 h-full bg-[#1c2714]" />
                  <span className="w-1 h-full bg-[#1c2714]" />
                </div>
              </div>
            </div>

            {/* Score Readout & Bonus Countdown */}
            <div className="flex items-center justify-between text-[10px] sm:text-xs font-black px-0.5 mb-2">
              <span>SCORE: {String(score).padStart(5, "0")}</span>

              {/* Bonus Bug Countdown Bar */}
              {bonus && (
                <div className="flex items-center gap-1 text-[9px] font-black animate-pulse">
                  <span>BUG:</span>
                  <div className="w-14 h-2 bg-[#7e926a] border border-[#1c2714] overflow-hidden">
                    <div
                      className="h-full bg-[#1c2714] transition-all duration-100"
                      style={{ width: `${(bonus.timeLeft / bonus.maxTime) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <span>HI: {String(highScore).padStart(5, "0")}</span>
            </div>

            {/* ── 1-Bit Pixel Graphics (24 x 16 Grid) ── */}
            <div
              className={`relative aspect-[24/16] w-full bg-[#8ea177] border-2 border-[#1c2714] ${
                maze === "BOX" ? "ring-2 ring-[#1c2714]" : ""
              }`}
            >
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
                          // Pixel snake with directional 2-pixel eyes in the head
                          <div className="w-full h-full bg-[#1c2714] relative rounded-[1px] flex items-center justify-center">
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
                          // Solid Pixel Body
                          <div className="w-full h-full bg-[#1c2714] rounded-[0.5px]" />
                        ) : isApple ? (
                          // Classic 3x3 pixel apple with stem
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-2.5 h-2.5 bg-[#1c2714] rounded-[1px] relative">
                              <span className="absolute -top-[2px] left-[1px] w-[1px] h-[2px] bg-[#1c2714]" />
                            </div>
                          </div>
                        ) : isInsect ? (
                          // Nokia Snake II crawling 5-legged bonus bug/spider
                          <div className="w-full h-full flex items-center justify-center animate-bounce">
                            <div className="w-3 h-2.5 bg-[#1c2714] relative rounded-[1px]">
                              <span className="absolute -top-[1.5px] -left-[1px] w-[1px] h-[1.5px] bg-[#1c2714]" />
                              <span className="absolute -top-[1.5px] -right-[1px] w-[1px] h-[1.5px] bg-[#1c2714]" />
                              <span className="absolute -bottom-[1.5px] -left-[1px] w-[1px] h-[1.5px] bg-[#1c2714]" />
                              <span className="absolute -bottom-[1.5px] -right-[1px] w-[1px] h-[1.5px] bg-[#1c2714]" />
                              <span className="absolute -bottom-[2px] left-[3px] w-[1px] h-[1px] bg-[#1c2714]" />
                            </div>
                          </div>
                        ) : isObstacle ? (
                          // Wall obstacles rendered as crisp LCD bricks
                          <div className="w-full h-full bg-[#1c2714] border-[0.5px] border-[#8ea177]" />
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>

              {/* LCD Overlay: Start / GameOver / Pause */}
              {(!isPlaying || isGameOver || isPaused) && (
                <div className="absolute inset-0 bg-[#95a881]/90 flex flex-col items-center justify-center p-3 text-center text-[#1c2714] z-10 backdrop-blur-[0.5px]">
                  {isGameOver ? (
                    <div className="space-y-1.5 animate-in fade-in zoom-in-95">
                      <div className="text-sm font-black tracking-widest uppercase">
                        💀 GAME OVER
                      </div>
                      <div className="text-xs font-black">
                        FINAL SCORE: {score}
                      </div>
                      <div className="text-[10px] text-[#2b3a20] font-bold">
                        {score >= highScore && score > 0 ? "★ NEW RECORD! ★" : `BEST: ${highScore}`}
                      </div>
                      <button
                        type="button"
                        onClick={handleStartGame}
                        className="mt-2 px-4 py-1.5 bg-[#1c2714] text-[#95a881] font-black text-xs uppercase rounded shadow-md cursor-pointer hover:bg-black transition-transform active:scale-95"
                      >
                        [ PLAY AGAIN ]
                      </button>
                    </div>
                  ) : isPaused ? (
                    <div className="space-y-2">
                      <div className="text-sm font-black tracking-widest">GAME PAUSED</div>
                      <button
                        type="button"
                        onClick={handleTogglePause}
                        className="px-4 py-1.5 bg-[#1c2714] text-[#95a881] font-black text-xs uppercase rounded shadow cursor-pointer active:scale-95"
                      >
                        RESUME
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="text-sm font-black tracking-widest uppercase">
                        SNAKE II • NOKIA
                      </div>
                      <div className="text-[10px] font-bold">
                        SPEED {speedLevel} // MAZE: {maze}
                      </div>
                      <div className="text-[9px] text-[#2b3a20] max-w-[200px] leading-tight">
                        Swipe screen right, left, up, down or use Arrow Keys / D-Pad
                      </div>
                      <button
                        type="button"
                        onClick={handleStartGame}
                        className="mt-2 px-5 py-2 bg-[#1c2714] text-[#95a881] font-black text-xs uppercase rounded shadow-lg cursor-pointer hover:bg-black active:scale-95"
                      >
                        START GAME
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* LCD Bottom Control Hints */}
            <div className="flex items-center justify-between text-[9px] font-black text-[#37472c] pt-1.5 mt-1 border-t border-[#73855f]">
              <span>👆 SWIPE: ◄ ▲ ▼ ►</span>
              <span>MAZE: {maze}</span>
              <span>SPD: {speedLevel}</span>
            </div>
          </div>
        </div>

        {/* ── 4. Game Modes & Controls ── */}
        <div className="mt-3 space-y-3 px-1">
          {/* Labyrinths Mode Selector */}
          <div className="flex items-center justify-between gap-1.5 text-[10px] font-bold">
            <span className="text-neutral-400 uppercase flex items-center gap-1">
              <Grid className="w-3 h-3 text-[#95a881]" />
              MAZE:
            </span>
            <div className="flex items-center gap-1">
              {(["NONE", "BOX", "TUNNEL", "CROSS"] as MazeType[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMaze(m);
                    nokiaAudio.playClick();
                  }}
                  className={`px-2 py-1 rounded text-[9px] font-black uppercase transition-all cursor-pointer border ${
                    maze === m
                      ? "bg-[#95a881] text-[#1c2714] border-[#95a881] shadow-[0_0_8px_rgba(149,168,129,0.4)]"
                      : "bg-[#16212b] text-neutral-400 border-[#283949] hover:text-white"
                  }`}
                >
                  {m === "NONE" ? "WRAP" : m}
                </button>
              ))}
            </div>
          </div>

          {/* Speed Selector (1 to 9) */}
          <div className="flex items-center justify-between gap-1 text-[10px] font-bold">
            <span className="text-neutral-400 uppercase flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              SPEED:
            </span>
            <div className="grid grid-cols-9 gap-1 flex-1 max-w-[280px]">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    setSpeedLevel(lvl);
                    nokiaAudio.playClick();
                  }}
                  className={`py-1 rounded text-[9px] font-black text-center transition-all cursor-pointer border ${
                    speedLevel === lvl
                      ? "bg-amber-400 text-black border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.4)]"
                      : "bg-[#16212b] text-neutral-400 border-[#283949] hover:text-white"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Ergonomic Directional Controls (Screen right swipe, left, up, down + D-Pad) */}
          <div className="flex flex-col items-center justify-center pt-1 pb-1">
            <button
              type="button"
              onClick={() => changeDirection("UP")}
              className="w-14 h-11 rounded-t-xl rounded-b-md bg-gradient-to-b from-[#2b3a4a] to-[#1c2632] border-2 border-[#415366] text-amber-300 shadow-[0_3px_6px_rgba(0,0,0,0.6)] active:scale-95 active:border-amber-400 flex items-center justify-center cursor-pointer transition-transform"
              aria-label="Up"
            >
              <ArrowUp className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div className="flex items-center gap-3 my-1">
              <button
                type="button"
                onClick={() => changeDirection("LEFT")}
                className="w-14 h-11 rounded-l-xl rounded-r-md bg-gradient-to-b from-[#2b3a4a] to-[#1c2632] border-2 border-[#415366] text-amber-300 shadow-[0_3px_6px_rgba(0,0,0,0.6)] active:scale-95 active:border-amber-400 flex items-center justify-center cursor-pointer transition-transform"
                aria-label="Left"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onClick={isPlaying && !isGameOver ? handleTogglePause : handleStartGame}
                className="w-14 h-11 rounded-xl bg-gradient-to-b from-[#95a881] to-[#7f946c] text-[#1c2714] font-black text-[10px] shadow-[0_3px_8px_rgba(149,168,129,0.4)] active:scale-95 flex items-center justify-center cursor-pointer transition-transform uppercase"
              >
                {isPlaying && !isGameOver ? (isPaused ? "GO" : "PAUSE") : "PLAY"}
              </button>

              <button
                type="button"
                onClick={() => changeDirection("RIGHT")}
                className="w-14 h-11 rounded-r-xl rounded-l-md bg-gradient-to-b from-[#2b3a4a] to-[#1c2632] border-2 border-[#415366] text-amber-300 shadow-[0_3px_6px_rgba(0,0,0,0.6)] active:scale-95 active:border-amber-400 flex items-center justify-center cursor-pointer transition-transform"
                aria-label="Right"
              >
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => changeDirection("DOWN")}
              className="w-14 h-11 rounded-b-xl rounded-t-md bg-gradient-to-b from-[#2b3a4a] to-[#1c2632] border-2 border-[#415366] text-amber-300 shadow-[0_3px_6px_rgba(0,0,0,0.6)] active:scale-95 active:border-amber-400 flex items-center justify-center cursor-pointer transition-transform"
              aria-label="Down"
            >
              <ArrowDown className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* Social & Chat Deck */}
      <div className="mt-4">
        <ArcadeSocialDeck match={match} currentUid={currentUid} />
      </div>
    </div>
  );
}
