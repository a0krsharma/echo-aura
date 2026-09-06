"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import {
  Trophy,
  Zap,
  Volume2,
  VolumeX,
  RotateCcw,
  Flame,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface SnakesArenaGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
}

const ARENA_RADIUS = 1100;
const SEGMENT_SPACING = 10;
const SEGMENT_RADIUS = 11;

interface Point {
  x: number;
  y: number;
}

interface Pellet {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  value: number;
}

interface SnakeEntity {
  id: string;
  name: string;
  isBot: boolean;
  color: string;
  accent: string;
  head: Point;
  angle: number;
  targetAngle: number;
  speed: number;
  isBoosting: boolean;
  score: number;
  length: number;
  kills: number;
  history: Point[];
  isAlive: boolean;
  respawnTimer?: number;
}

const BOT_NAMES = [
  { name: "CYBER_VIPER", color: "#06b6d4", accent: "#0891b2" },
  { name: "NEO_COBRA", color: "#f43f5e", accent: "#e11d48" },
  { name: "TITAN_BOA", color: "#a855f7", accent: "#9333ea" },
  { name: "AURA_SLITHER", color: "#eab308", accent: "#ca8a04" },
  { name: "QUANTUM_ASP", color: "#10b981", accent: "#059669" },
  { name: "SYNTH_PYTHON", color: "#ec4899", accent: "#db2777" },
  { name: "SHADOW_FANG", color: "#3b82f6", accent: "#2563eb" },
];

const PELLET_COLORS = ["#06b6d4", "#f43f5e", "#a855f7", "#eab308", "#10b981", "#ec4899", "#3b82f6"];

// ── Web Audio Synthesizer ─────────────────────────────────────────────────────
class SlitherAudioEngine {
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
    } catch {}
  }

  public playEat() {
    this.playTone(460 + Math.random() * 180, 30, "sine", 0.05);
  }

  public playTurn() {
    this.playTone(620, 15, "square", 0.04);
  }

  public playKill() {
    if (this.isMuted) return;
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 60, "triangle", 0.12), idx * 45);
    });
  }

  public playExplode() {
    this.playTone(110, 240, "sawtooth", 0.22);
  }
}

const slitherAudio = new SlitherAudioEngine();

export default function SnakesArenaGame({ match, currentUid }: SnakesArenaGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Game States
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [kills, setKills] = useState<number>(0);
  const [rank, setRank] = useState<number>(1);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isBoosting, setIsBoosting] = useState<boolean>(false);
  const [leaderboard, setLeaderboard] = useState<{ name: string; score: number; isPlayer: boolean }[]>([]);

  // Refs
  const isGameOverRef = useRef(isGameOver);
  isGameOverRef.current = isGameOver;

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const isBoostingRef = useRef(isBoosting);
  isBoostingRef.current = isBoosting;

  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const mousePosRef = useRef<Point>({ x: 0, y: 0 });
  const isManualSteering = useRef<boolean>(false);

  const playerRef = useRef<SnakeEntity>({
    id: "player",
    name: "YOU",
    isBot: false,
    color: "#10b981",
    accent: "#059669",
    head: { x: 0, y: 0 },
    angle: 0,
    targetAngle: 0,
    speed: 3.4,
    isBoosting: false,
    score: 0,
    length: 16,
    kills: 0,
    history: [],
    isAlive: true,
  });

  const botsRef = useRef<SnakeEntity[]>([]);
  const pelletsRef = useRef<Pellet[]>([]);
  const nextPelletId = useRef<number>(1);

  // Sync mute
  useEffect(() => {
    slitherAudio.isMuted = isMuted;
  }, [isMuted]);

  // Load High Score
  useEffect(() => {
    try {
      const saved = localStorage.getItem("echo_slither_arena_hi");
      if (saved) setHighScore(parseInt(saved, 10) || 0);
    } catch {}
  }, []);

  const updateLocalHighScore = useCallback((s: number) => {
    setHighScore((prev) => {
      if (s > prev) {
        try {
          localStorage.setItem("echo_slither_arena_hi", String(s));
        } catch {}
        return s;
      }
      return prev;
    });
  }, []);

  // Direction Command Helper (Up, Down, Left, Right)
  const setDirectionCardinal = useCallback((dir: "UP" | "DOWN" | "LEFT" | "RIGHT") => {
    if (!playerRef.current.isAlive) return;
    isManualSteering.current = true;
    slitherAudio.playTurn();

    if (dir === "UP") playerRef.current.targetAngle = -Math.PI / 2;
    else if (dir === "DOWN") playerRef.current.targetAngle = Math.PI / 2;
    else if (dir === "LEFT") playerRef.current.targetAngle = Math.PI;
    else if (dir === "RIGHT") playerRef.current.targetAngle = 0;
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === "ArrowUp" || e.code === "KeyW") setDirectionCardinal("UP");
      else if (e.code === "ArrowDown" || e.code === "KeyS") setDirectionCardinal("DOWN");
      else if (e.code === "ArrowLeft" || e.code === "KeyA") setDirectionCardinal("LEFT");
      else if (e.code === "ArrowRight" || e.code === "KeyD") setDirectionCardinal("RIGHT");
      else if (e.code === "Space") setIsBoosting(true);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setIsBoosting(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [setDirectionCardinal]);

  // Screen Swipe Gesture Detection
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!swipeStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - swipeStartRef.current.x;
    const dy = touch.clientY - swipeStartRef.current.y;
    swipeStartRef.current = null;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) > 22) {
      if (absX > absY) {
        if (dx > 0) setDirectionCardinal("RIGHT");
        else setDirectionCardinal("LEFT");
      } else {
        if (dy > 0) setDirectionCardinal("DOWN");
        else setDirectionCardinal("UP");
      }
    }
  };

  // Spawn pellet
  const spawnPellet = (x?: number, y?: number, val = 1): Pellet => {
    let px = x ?? (Math.random() - 0.5) * (ARENA_RADIUS * 1.8);
    let py = y ?? (Math.random() - 0.5) * (ARENA_RADIUS * 1.8);
    const dist = Math.hypot(px, py);
    if (dist > ARENA_RADIUS - 30) {
      const ratio = (ARENA_RADIUS - 40) / dist;
      px *= ratio;
      py *= ratio;
    }
    const color = PELLET_COLORS[Math.floor(Math.random() * PELLET_COLORS.length)];
    const id = nextPelletId.current++;
    return { id, x: px, y: py, radius: val > 1 ? 5 : 2.8, color, value: val };
  };

  // Init World
  const initWorld = useCallback(() => {
    isManualSteering.current = false;
    playerRef.current = {
      id: "player",
      name: "YOU",
      isBot: false,
      color: "#10b981",
      accent: "#059669",
      head: { x: 0, y: 0 },
      angle: 0,
      targetAngle: 0,
      speed: 3.4,
      isBoosting: false,
      score: 0,
      length: 16,
      kills: 0,
      history: Array.from({ length: 16 * SEGMENT_SPACING }, () => ({ x: 0, y: 0 })),
      isAlive: true,
    };

    const newBots: SnakeEntity[] = BOT_NAMES.map((b, idx) => {
      const angle = (idx / BOT_NAMES.length) * Math.PI * 2;
      const dist = 350 + Math.random() * 300;
      const initX = Math.cos(angle) * dist;
      const initY = Math.sin(angle) * dist;
      const initLen = 14 + Math.floor(Math.random() * 12);
      return {
        id: `bot_${idx}`,
        name: b.name,
        isBot: true,
        color: b.color,
        accent: b.accent,
        head: { x: initX, y: initY },
        angle: angle + Math.PI,
        targetAngle: angle + Math.PI,
        speed: 3.2,
        isBoosting: false,
        score: (initLen - 14) * 10,
        length: initLen,
        kills: 0,
        history: Array.from({ length: initLen * SEGMENT_SPACING }, () => ({ x: initX, y: initY })),
        isAlive: true,
      };
    });
    botsRef.current = newBots;

    const initPellets: Pellet[] = [];
    for (let i = 0; i < 300; i++) initPellets.push(spawnPellet());
    pelletsRef.current = initPellets;

    setScore(0);
    setKills(0);
    setIsGameOver(false);
    setIsPaused(false);
  }, []);

  useEffect(() => {
    initWorld();
  }, [initWorld]);

  const smoothAngle = (current: number, target: number, turnRate = 0.12) => {
    let diff = target - current;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    return current + diff * turnRate;
  };

  // 60 FPS Loop
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(loop);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const player = playerRef.current;
      const bots = botsRef.current;
      const pellets = pelletsRef.current;

      if (!isPausedRef.current && !isGameOverRef.current && player.isAlive) {
        // Pointer Steering if not locked by cardinal D-pad
        if (!isManualSteering.current && (mousePosRef.current.x !== 0 || mousePosRef.current.y !== 0)) {
          player.targetAngle = Math.atan2(mousePosRef.current.y, mousePosRef.current.x);
        }

        player.angle = smoothAngle(player.angle, player.targetAngle, 0.14);

        const boosting = isBoostingRef.current && player.score > 2;
        player.isBoosting = boosting;
        player.speed = boosting ? 5.8 : 3.4;

        if (boosting) {
          player.score = Math.max(0, player.score - 0.06);
          if (Math.random() < 0.25 && player.history.length > 0) {
            const tail = player.history[player.history.length - 1];
            pellets.push(spawnPellet(tail.x, tail.y, 1));
          }
        }

        player.head.x += Math.cos(player.angle) * player.speed;
        player.head.y += Math.sin(player.angle) * player.speed;

        // Arena boundary collision
        if (Math.hypot(player.head.x, player.head.y) > ARENA_RADIUS) {
          player.isAlive = false;
          setIsGameOver(true);
          slitherAudio.playExplode();
          updateArcadeGameScore(match.id, currentUid, "snakes", Math.round(player.score), true);
        }

        // History
        player.history.unshift({ x: player.head.x, y: player.head.y });
        const maxLen = player.length * SEGMENT_SPACING;
        if (player.history.length > maxLen) player.history.length = maxLen;

        // Update Bots
        bots.forEach((bot) => {
          if (!bot.isAlive) {
            if (bot.respawnTimer && Date.now() > bot.respawnTimer) {
              const a = Math.random() * Math.PI * 2;
              const d = 200 + Math.random() * 600;
              bot.head = { x: Math.cos(a) * d, y: Math.sin(a) * d };
              bot.length = 15;
              bot.score = 50;
              bot.isAlive = true;
              bot.history = Array.from({ length: 15 * SEGMENT_SPACING }, () => ({ ...bot.head }));
            }
            return;
          }

          let bestAngle = bot.angle;
          const bDist = Math.hypot(bot.head.x, bot.head.y);

          if (bDist > ARENA_RADIUS - 120) {
            bestAngle = Math.atan2(-bot.head.y, -bot.head.x);
          } else {
            let nearestDist = 240;
            let targetX = bot.head.x + Math.cos(bot.angle) * 100;
            let targetY = bot.head.y + Math.sin(bot.angle) * 100;

            for (let i = 0; i < Math.min(50, pellets.length); i++) {
              const p = pellets[i];
              const d = Math.hypot(p.x - bot.head.x, p.y - bot.head.y);
              if (d < nearestDist) {
                nearestDist = d;
                targetX = p.x;
                targetY = p.y;
              }
            }
            bestAngle = Math.atan2(targetY - bot.head.y, targetX - bot.head.x);
          }

          bot.targetAngle = bestAngle;
          bot.angle = smoothAngle(bot.angle, bot.targetAngle, 0.08);
          bot.head.x += Math.cos(bot.angle) * bot.speed;
          bot.head.y += Math.sin(bot.angle) * bot.speed;

          bot.history.unshift({ x: bot.head.x, y: bot.head.y });
          const bMax = bot.length * SEGMENT_SPACING;
          if (bot.history.length > bMax) bot.history.length = bMax;
        });

        // Pellets eating
        for (let i = pellets.length - 1; i >= 0; i--) {
          const p = pellets[i];
          if (Math.hypot(p.x - player.head.x, p.y - player.head.y) < SEGMENT_RADIUS + p.radius + 6) {
            player.score += p.value * 5;
            player.length += p.value * 0.25;
            setScore(Math.round(player.score));
            updateLocalHighScore(Math.round(player.score));
            slitherAudio.playEat();
            pellets.splice(i, 1);
            pellets.push(spawnPellet());
            continue;
          }

          for (const bot of bots) {
            if (!bot.isAlive) continue;
            if (Math.hypot(p.x - bot.head.x, p.y - bot.head.y) < SEGMENT_RADIUS + p.radius + 6) {
              bot.score += p.value * 5;
              bot.length += p.value * 0.25;
              pellets.splice(i, 1);
              pellets.push(spawnPellet());
              break;
            }
          }
        }

        // Body Collisions
        bots.forEach((bot) => {
          if (!bot.isAlive) return;

          for (let s = 10; s < bot.history.length; s += SEGMENT_SPACING) {
            const seg = bot.history[s];
            if (Math.hypot(player.head.x - seg.x, player.head.y - seg.y) < SEGMENT_RADIUS * 1.5) {
              player.isAlive = false;
              setIsGameOver(true);
              slitherAudio.playExplode();
              updateArcadeGameScore(match.id, currentUid, "snakes", Math.round(player.score), true);
              break;
            }
          }

          if (player.isAlive) {
            for (let s = 10; s < player.history.length; s += SEGMENT_SPACING) {
              const seg = player.history[s];
              if (Math.hypot(bot.head.x - seg.x, bot.head.y - seg.y) < SEGMENT_RADIUS * 1.5) {
                bot.isAlive = false;
                bot.respawnTimer = Date.now() + 4000;
                player.kills += 1;
                player.score += 150;
                setKills(player.kills);
                setScore(Math.round(player.score));
                slitherAudio.playKill();

                for (let d = 0; d < bot.history.length; d += SEGMENT_SPACING * 2) {
                  const bSeg = bot.history[d];
                  pellets.push(spawnPellet(bSeg.x + (Math.random() - 0.5) * 10, bSeg.y + (Math.random() - 0.5) * 10, 3));
                }
                break;
              }
            }
          }
        });

        const allSnakes = [
          { name: player.name, score: Math.round(player.score), isPlayer: true },
          ...bots.map((b) => ({ name: b.name, score: Math.round(b.score), isPlayer: false })),
        ].sort((a, b) => b.score - a.score);

        setLeaderboard(allSnakes.slice(0, 5));
        const myRank = allSnakes.findIndex((s) => s.isPlayer) + 1;
        setRank(myRank);
      }

      // ── Graphics Render ──
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      ctx.save();
      ctx.translate(w / 2 - player.head.x, h / 2 - player.head.y);

      // Arena Floor & Grid
      ctx.fillStyle = "#080c14";
      ctx.fillRect(-ARENA_RADIUS - 300, -ARENA_RADIUS - 300, (ARENA_RADIUS + 300) * 2, (ARENA_RADIUS + 300) * 2);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
      ctx.lineWidth = 1;
      const gridSize = 80;
      for (let x = -ARENA_RADIUS - 200; x < ARENA_RADIUS + 200; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, -ARENA_RADIUS - 200);
        ctx.lineTo(x, ARENA_RADIUS + 200);
        ctx.stroke();
      }
      for (let y = -ARENA_RADIUS - 200; y < ARENA_RADIUS + 200; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(-ARENA_RADIUS - 200, y);
        ctx.lineTo(ARENA_RADIUS + 200, y);
        ctx.stroke();
      }

      // Glowing Arena Border
      ctx.beginPath();
      ctx.arc(0, 0, ARENA_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(6, 182, 212, 0.7)";
      ctx.lineWidth = 8;
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = 24;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Energy Pellets
      pellets.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.value > 1 ? 8 : 4;
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // Draw Snake Entity
      const drawSnake = (s: SnakeEntity) => {
        if (!s.isAlive || s.history.length === 0) return;

        for (let i = s.history.length - 1; i >= 0; i -= SEGMENT_SPACING) {
          const pt = s.history[i];
          const progress = 1 - i / s.history.length;
          const radius = SEGMENT_RADIUS * (0.65 + progress * 0.35);

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = s.color;
          ctx.fill();
          ctx.strokeStyle = s.accent;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.save();
        ctx.translate(s.head.x, s.head.y);
        ctx.rotate(s.angle);

        ctx.beginPath();
        ctx.arc(0, 0, SEGMENT_RADIUS * 1.25, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = s.isBoosting ? 16 : 6;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Eyes
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(4, -6, 3.5, 0, Math.PI * 2);
        ctx.arc(4, 6, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(5.5, -6, 1.8, 0, Math.PI * 2);
        ctx.arc(5.5, 6, 1.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        ctx.font = "bold 10px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(s.name, s.head.x, s.head.y - 18);
      };

      bots.forEach(drawSnake);
      if (player.isAlive) drawSnake(player);

      ctx.restore();

      // Radar Minimap
      const radarSize = 80;
      const radarX = w - radarSize - 12;
      const radarY = h - radarSize - 12;
      const radarRadius = radarSize / 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(radarX + radarRadius, radarY + radarRadius, radarRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(10, 18, 28, 0.75)";
      ctx.fill();
      ctx.strokeStyle = "rgba(6, 182, 212, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      bots.forEach((b) => {
        if (!b.isAlive) return;
        const rx = radarX + radarRadius + (b.head.x / ARENA_RADIUS) * radarRadius;
        const ry = radarY + radarRadius + (b.head.y / ARENA_RADIUS) * radarRadius;
        ctx.beginPath();
        ctx.arc(rx, ry, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
      });

      if (player.isAlive) {
        const px = radarX + radarRadius + (player.head.x / ARENA_RADIUS) * radarRadius;
        const py = radarY + radarRadius + (player.head.y / ARENA_RADIUS) * radarRadius;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#10b981";
        ctx.fill();
      }
      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [match.id, currentUid, updateLocalHighScore]);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current || isManualSteering.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    mousePosRef.current = {
      x: e.clientX - rect.left - centerX,
      y: e.clientY - rect.top - centerY,
    };
  };

  return (
    <div className="w-full max-w-xl mx-auto py-2 px-1 select-none font-mono">
      {/* Outer Shell */}
      <div className="relative rounded-3xl p-3 sm:p-4 bg-gradient-to-b from-[#111923] via-[#0b1017] to-[#06090e] border-2 border-[#203042] shadow-[0_16px_40px_rgba(0,0,0,0.85)]">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-1 pb-2.5 mb-2 border-b border-[#1c2c3e] text-xs">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-[9px] text-neutral-400 font-bold uppercase">SNAKES ARENA 🐍</div>
              <div className="text-base font-black text-emerald-400">
                {score} <span className="text-[10px] text-neutral-500 font-mono">PTS</span>
              </div>
            </div>

            <div className="pl-3 border-l border-neutral-800">
              <div className="text-[9px] text-neutral-400 font-bold uppercase">KILLS</div>
              <div className="text-sm font-black text-rose-400">{kills} 💀</div>
            </div>

            <div className="pl-3 border-l border-neutral-800">
              <div className="text-[9px] text-neutral-400 font-bold uppercase">RANK</div>
              <div className="text-sm font-black text-amber-400">#{rank} 🏆</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              className="p-2 rounded-xl bg-[#172332] border border-[#2e4359] text-neutral-300 hover:text-white transition-all cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-neutral-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            <button
              type="button"
              onClick={initWorld}
              className="p-2 rounded-xl bg-[#172332] border border-[#2e4359] text-neutral-300 hover:text-white transition-all cursor-pointer active:scale-95"
              title="Respawn / Restart"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── 2D Canvas Viewport (Screen Swipe Supported) ── */}
        <div
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onPointerMove={handlePointerMove}
          className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border-2 border-[#22364c] bg-[#080d14] shadow-[inset_0_4px_24px_rgba(0,0,0,0.85)] cursor-crosshair touch-none"
        >
          <canvas
            ref={canvasRef}
            width={580}
            height={435}
            className="w-full h-full block"
          />

          {/* Live Leaderboard Overlay */}
          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md border border-white/10 rounded-xl p-2 text-[10px] w-36 pointer-events-none z-10 shadow-lg">
            <div className="font-bold text-neutral-400 uppercase text-[9px] mb-1 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>LEADERBOARD</span>
            </div>
            <div className="space-y-0.5">
              {leaderboard.map((entry, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between font-mono text-[9px] ${
                    entry.isPlayer ? "text-emerald-400 font-bold" : "text-neutral-400"
                  }`}
                >
                  <span className="truncate max-w-[80px]">
                    {idx + 1}. {entry.name}
                  </span>
                  <span>{entry.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Game Over Screen */}
          {isGameOver && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-30 animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-2xl mb-2">
                💀
              </div>
              <div className="text-lg font-black text-white uppercase tracking-wider">
                SNAKE ELIMINATED
              </div>
              <div className="text-xs text-neutral-400 mt-1">
                FINAL SCORE: <span className="text-emerald-400 font-bold">{score}</span>
              </div>
              <div className="text-xs text-neutral-400">
                KILLS: <span className="text-rose-400 font-bold">{kills}</span> // FINAL RANK: <span className="text-amber-400 font-bold">#{rank}</span>
              </div>
              <button
                type="button"
                onClick={initWorld}
                className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-black text-xs uppercase shadow-lg shadow-emerald-500/30 hover:brightness-110 active:scale-95 cursor-pointer transition-transform"
              >
                RESPAWN 🔄
              </button>
            </div>
          )}
        </div>

        {/* ── Directional D-Pad & Swipe Controls (User Requested) ── */}
        <div className="mt-3 pt-2 border-t border-[#1c2c3e] flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Swipe & Instructions Hint */}
          <div className="text-[10px] text-neutral-400 font-bold space-y-0.5 text-center sm:text-left">
            <div className="text-emerald-400 font-black uppercase flex items-center gap-1 justify-center sm:justify-start">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SWIPE SCREEN OR TAP D-PAD</span>
            </div>
            <div>SWIPE: ◄ ▲ ▼ ► TO TURN SNAKE</div>
            <div>HOLD BOOST FOR 1.8X TURBO SPEED</div>
          </div>

          {/* Ergonomic 4-Way D-Pad + Turbo Boost */}
          <div className="flex items-center gap-3">
            {/* 4-Way D-Pad */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => setDirectionCardinal("UP")}
                className="w-11 h-9 rounded-t-xl rounded-b-md bg-[#192736] border-2 border-[#304860] text-emerald-400 active:scale-90 active:border-emerald-400 flex items-center justify-center cursor-pointer transition-transform shadow-md"
                aria-label="Steer Up"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
              <div className="flex items-center gap-2 my-0.5">
                <button
                  type="button"
                  onClick={() => setDirectionCardinal("LEFT")}
                  className="w-11 h-9 rounded-l-xl rounded-r-md bg-[#192736] border-2 border-[#304860] text-emerald-400 active:scale-90 active:border-emerald-400 flex items-center justify-center cursor-pointer transition-transform shadow-md"
                  aria-label="Steer Left"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
                <div className="w-7 h-7 rounded-full bg-[#101b26] border border-[#22364c]" />
                <button
                  type="button"
                  onClick={() => setDirectionCardinal("RIGHT")}
                  className="w-11 h-9 rounded-r-xl rounded-l-md bg-[#192736] border-2 border-[#304860] text-emerald-400 active:scale-90 active:border-emerald-400 flex items-center justify-center cursor-pointer transition-transform shadow-md"
                  aria-label="Steer Right"
                >
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setDirectionCardinal("DOWN")}
                className="w-11 h-9 rounded-b-xl rounded-t-md bg-[#192736] border-2 border-[#304860] text-emerald-400 active:scale-90 active:border-emerald-400 flex items-center justify-center cursor-pointer transition-transform shadow-md"
                aria-label="Steer Down"
              >
                <ArrowDown className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Turbo Boost Button */}
            <button
              type="button"
              onPointerDown={() => setIsBoosting(true)}
              onPointerUp={() => setIsBoosting(false)}
              onPointerLeave={() => setIsBoosting(false)}
              className={`w-16 h-20 rounded-2xl font-black text-[10px] uppercase flex flex-col items-center justify-center gap-1 shadow-xl transition-all cursor-pointer active:scale-95 border-2 ${
                isBoosting
                  ? "bg-amber-400 border-amber-300 text-black shadow-amber-400/50 scale-105"
                  : "bg-gradient-to-b from-[#241708] to-[#140c03] border-amber-500/60 text-amber-300 hover:border-amber-400"
              }`}
            >
              <Flame className="w-6 h-6 fill-current animate-pulse" />
              <span>BOOST</span>
            </button>
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
