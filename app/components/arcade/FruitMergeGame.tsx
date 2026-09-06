"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Matter from "matter-js";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import {
  Sparkles,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";

interface FruitMergeGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
}

export interface FruitConfig {
  tier: number;
  name: string;
  emoji: string;
  radius: number;
  color: string;
  accent: string;
  points: number;
}

export const FRUIT_TIERS: FruitConfig[] = [
  { tier: 1, name: "Cherry", emoji: "🍒", radius: 14, color: "#ef4444", accent: "#991b1b", points: 10 },
  { tier: 2, name: "Strawberry", emoji: "🍓", radius: 19, color: "#f43f5e", accent: "#be123c", points: 20 },
  { tier: 3, name: "Grape", emoji: "🍇", radius: 25, color: "#8b5cf6", accent: "#6d28d9", points: 30 },
  { tier: 4, name: "Orange", emoji: "🍊", radius: 32, color: "#f97316", accent: "#c2410c", points: 40 },
  { tier: 5, name: "Apple", emoji: "🍎", radius: 40, color: "#dc2626", accent: "#991b1b", points: 50 },
  { tier: 6, name: "Pear", emoji: "🍐", radius: 49, color: "#84cc16", accent: "#4d7c0f", points: 60 },
  { tier: 7, name: "Peach", emoji: "🍑", radius: 59, color: "#f472b6", accent: "#db2777", points: 70 },
  { tier: 8, name: "Pineapple", emoji: "🍍", radius: 70, color: "#eab308", accent: "#a16207", points: 80 },
  { tier: 9, name: "Melon", emoji: "🍈", radius: 83, color: "#22c55e", accent: "#15803d", points: 90 },
  { tier: 10, name: "Watermelon Half", emoji: "🍉", radius: 98, color: "#10b981", accent: "#047857", points: 100 },
  { tier: 11, name: "Giant Watermelon", emoji: "🍉✨", radius: 115, color: "#059669", accent: "#065f46", points: 200 },
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

class FruitAudioEngine {
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

  public playDrop() {
    this.playTone(240, 45, "sine", 0.09);
  }

  public playMerge(tier: number) {
    if (this.isMuted) return;
    const baseFreq = 280 + tier * 50;
    this.playTone(baseFreq, 60, "sine", 0.16);
    setTimeout(() => this.playTone(baseFreq * 1.33, 90, "sine", 0.18), 35);
  }

  public playGiantWatermelon() {
    if (this.isMuted) return;
    const notes = [523, 659, 784, 1046, 1318];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 120, "triangle", 0.2), i * 65);
    });
  }

  public playGameOver() {
    this.playTone(180, 200, "sawtooth", 0.2);
  }

  public playTilt() {
    this.playTone(150, 40, "triangle", 0.09);
  }
}

const fruitAudio = new FruitAudioEngine();

const CONTAINER_WIDTH = 360;
const CONTAINER_HEIGHT = 500;
const DANGER_Y = 70;
const WALL_THICKNESS = 40;

export default function FruitMergeGame({ match, currentUid }: FruitMergeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Game state
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [dropX, setDropX] = useState<number>(CONTAINER_WIDTH / 2);
  const [currentTier, setCurrentTier] = useState<number>(1);
  const [nextTier, setNextTier] = useState<number>(1);
  const [canDrop, setCanDrop] = useState<boolean>(true);
  const [tiltCooldown, setTiltCooldown] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const engineRef = useRef<Matter.Engine | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const dangerTimerRef = useRef<number | null>(null);
  const isGameOverRef = useRef<boolean>(false);
  isGameOverRef.current = isGameOver;

  // Sync audio mute
  useEffect(() => {
    fruitAudio.isMuted = isMuted;
  }, [isMuted]);

  // Load high score
  useEffect(() => {
    try {
      const saved = localStorage.getItem("echo_fruit_merge_hi");
      if (saved) setHighScore(parseInt(saved, 10) || 0);
    } catch {}
  }, []);

  const updateLocalHighScore = useCallback((s: number) => {
    setHighScore((prev) => {
      if (s > prev) {
        try {
          localStorage.setItem("echo_fruit_merge_hi", String(s));
        } catch {}
        return s;
      }
      return prev;
    });
  }, []);

  // Spawn initial tiers
  useEffect(() => {
    setCurrentTier(Math.floor(Math.random() * 3) + 1);
    setNextTier(Math.floor(Math.random() * 3) + 1);
  }, []);

  const createFruitBody = useCallback((x: number, y: number, tier: number, isStatic = false) => {
    const config = FRUIT_TIERS[tier - 1] || FRUIT_TIERS[0];
    const body = Matter.Bodies.circle(x, y, config.radius, {
      restitution: 0.18,
      friction: 0.08,
      density: 0.002,
      isStatic,
      label: `fruit_${tier}`,
    });
    (body as unknown as { fruitTier: number; isMerging: boolean }).fruitTier = tier;
    (body as unknown as { fruitTier: number; isMerging: boolean }).isMerging = false;
    return body;
  }, []);

  // Init Matter.js
  const initEngine = useCallback(() => {
    if (engineRef.current) Matter.Engine.clear(engineRef.current);

    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 1.15, scale: 0.001 },
    });
    engineRef.current = engine;

    const ground = Matter.Bodies.rectangle(
      CONTAINER_WIDTH / 2,
      CONTAINER_HEIGHT + WALL_THICKNESS / 2 - 4,
      CONTAINER_WIDTH + 80,
      WALL_THICKNESS,
      { isStatic: true, label: "ground", friction: 0.2 }
    );
    const leftWall = Matter.Bodies.rectangle(
      -WALL_THICKNESS / 2 + 6,
      CONTAINER_HEIGHT / 2,
      WALL_THICKNESS,
      CONTAINER_HEIGHT * 2,
      { isStatic: true, label: "wall_left" }
    );
    const rightWall = Matter.Bodies.rectangle(
      CONTAINER_WIDTH + WALL_THICKNESS / 2 - 6,
      CONTAINER_HEIGHT / 2,
      WALL_THICKNESS,
      CONTAINER_HEIGHT * 2,
      { isStatic: true, label: "wall_right" }
    );

    Matter.Composite.add(engine.world, [ground, leftWall, rightWall]);

    // Merge handler
    Matter.Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach(({ bodyA, bodyB }) => {
        const a = bodyA as unknown as { fruitTier?: number; isMerging?: boolean; position: Matter.Vector };
        const b = bodyB as unknown as { fruitTier?: number; isMerging?: boolean; position: Matter.Vector };

        if (
          a.fruitTier &&
          b.fruitTier &&
          a.fruitTier === b.fruitTier &&
          !a.isMerging &&
          !b.isMerging
        ) {
          a.isMerging = true;
          b.isMerging = true;

          const currentT = a.fruitTier;
          const nextT = currentT + 1;
          const midX = (a.position.x + b.position.x) / 2;
          const midY = (a.position.y + b.position.y) / 2;

          Matter.Composite.remove(engine.world, bodyA);
          Matter.Composite.remove(engine.world, bodyB);

          if (nextT <= 11) {
            const newBody = createFruitBody(midX, midY, nextT);
            Matter.Body.setVelocity(newBody, { x: (Math.random() - 0.5) * 1.5, y: -2 });
            Matter.Composite.add(engine.world, newBody);

            if (nextT === 11) fruitAudio.playGiantWatermelon();
            else fruitAudio.playMerge(nextT);
          }

          const fruitCfg = FRUIT_TIERS[currentT - 1];
          for (let p = 0; p < 14; p++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1.5;
            particlesRef.current.push({
              x: midX,
              y: midY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 1.5,
              color: fruitCfg ? fruitCfg.color : "#ef4444",
              size: Math.random() * 4 + 2,
              life: 1,
              maxLife: 24,
            });
          }

          const addedPoints = currentT * 10;
          setScore((s) => {
            const next = s + addedPoints;
            updateLocalHighScore(next);
            return next;
          });
        }
      });
    });
  }, [createFruitBody, updateLocalHighScore]);

  const handleStartGame = useCallback(() => {
    initEngine();
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    setCanDrop(true);
    dangerTimerRef.current = null;
    particlesRef.current = [];
    setCurrentTier(Math.floor(Math.random() * 3) + 1);
    setNextTier(Math.floor(Math.random() * 3) + 1);
  }, [initEngine]);

  useEffect(() => {
    handleStartGame();
  }, [handleStartGame]);

  const handleDropFruit = () => {
    if (!canDrop || isGameOver || isPaused || !engineRef.current) return;

    const currentCfg = FRUIT_TIERS[currentTier - 1];
    const clampedX = Math.max(
      currentCfg.radius + 10,
      Math.min(CONTAINER_WIDTH - currentCfg.radius - 10, dropX)
    );

    const body = createFruitBody(clampedX, DANGER_Y - 15, currentTier);
    Matter.Composite.add(engineRef.current.world, body);
    fruitAudio.playDrop();

    setCanDrop(false);
    setCurrentTier(nextTier);
    setNextTier(Math.floor(Math.random() * 4) + 1);

    setTimeout(() => {
      setCanDrop(true);
    }, 450);
  };

  const handleTilt = () => {
    if (tiltCooldown || isGameOver || isPaused || !engineRef.current) return;
    fruitAudio.playTilt();
    setTiltCooldown(true);

    const bodies = Matter.Composite.allBodies(engineRef.current.world);
    bodies.forEach((b) => {
      if (!b.isStatic) {
        Matter.Body.applyForce(b, b.position, {
          x: (Math.random() - 0.5) * 0.015,
          y: -0.012,
        });
      }
    });

    setTimeout(() => setTiltCooldown(false), 3000);
  };

  // 60 FPS Render Loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      const engine = engineRef.current;
      if (!canvas || !engine) {
        animId = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (!isPaused && !isGameOverRef.current) {
        Matter.Engine.update(engine, 1000 / 60);
      }

      ctx.clearRect(0, 0, CONTAINER_WIDTH, CONTAINER_HEIGHT);

      // Glass jar backdrop
      ctx.fillStyle = "rgba(10, 15, 24, 0.8)";
      ctx.fillRect(0, 0, CONTAINER_WIDTH, CONTAINER_HEIGHT);

      // Deadline
      ctx.beginPath();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
      ctx.lineWidth = 2;
      ctx.moveTo(0, DANGER_Y);
      ctx.lineTo(CONTAINER_WIDTH, DANGER_Y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Cloud Dropper & Aim Line
      if (canDrop && !isGameOverRef.current && !isPaused) {
        const currentCfg = FRUIT_TIERS[currentTier - 1];
        const clampedX = Math.max(
          currentCfg.radius + 10,
          Math.min(CONTAINER_WIDTH - currentCfg.radius - 10, dropX)
        );

        // Trajectory guideline
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.moveTo(clampedX, DANGER_Y - 20);
        ctx.lineTo(clampedX, CONTAINER_HEIGHT);
        ctx.stroke();
        ctx.setLineDash([]);

        // Cute Cloud Dropper "Poppy"
        ctx.save();
        ctx.translate(clampedX, 22);

        // Cloud Body
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(-14, 0, 12, 0, Math.PI * 2);
        ctx.arc(0, -6, 16, 0, Math.PI * 2);
        ctx.arc(14, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        // Cloud Happy Eyes
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.arc(-6, -4, 2, 0, Math.PI * 2);
        ctx.arc(6, -4, 2, 0, Math.PI * 2);
        ctx.fill();

        // Rosy Cheeks
        ctx.fillStyle = "rgba(244, 63, 94, 0.5)";
        ctx.beginPath();
        ctx.arc(-10, 0, 3, 0, Math.PI * 2);
        ctx.arc(10, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Fruit Preview
        ctx.save();
        ctx.translate(clampedX, DANGER_Y - 20);
        ctx.beginPath();
        ctx.arc(0, 0, currentCfg.radius, 0, Math.PI * 2);
        ctx.fillStyle = currentCfg.color;
        ctx.fill();
        ctx.strokeStyle = currentCfg.accent;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.font = `${Math.max(12, currentCfg.radius * 0.9)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(currentCfg.emoji, 0, 1);
        ctx.restore();
      }

      // Draw Fruits
      let isOverflowing = false;
      const bodies = Matter.Composite.allBodies(engine.world);

      bodies.forEach((body) => {
        if (body.isStatic) return;
        const b = body as unknown as { fruitTier?: number };
        const tier = b.fruitTier;
        if (!tier) return;
        const config = FRUIT_TIERS[tier - 1];

        if (body.position.y - config.radius < DANGER_Y && Math.abs(body.velocity.y) < 0.15) {
          isOverflowing = true;
        }

        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);

        ctx.beginPath();
        ctx.arc(0, 0, config.radius, 0, Math.PI * 2);
        ctx.fillStyle = config.color;
        ctx.fill();
        ctx.strokeStyle = config.accent;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Kawaii Face: Eyes & Smile
        const eyeOffset = config.radius * 0.35;
        const eyeRadius = Math.max(1.5, config.radius * 0.08);

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(-eyeOffset, -config.radius * 0.1, eyeRadius * 1.5, 0, Math.PI * 2);
        ctx.arc(eyeOffset, -config.radius * 0.1, eyeRadius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(-eyeOffset + 0.5, -config.radius * 0.1, eyeRadius, 0, Math.PI * 2);
        ctx.arc(eyeOffset + 0.5, -config.radius * 0.1, eyeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Cute Smile
        ctx.beginPath();
        ctx.arc(0, config.radius * 0.1, config.radius * 0.2, 0, Math.PI);
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
      });

      // Handle Deadline
      if (isOverflowing && !isGameOverRef.current) {
        if (!dangerTimerRef.current) dangerTimerRef.current = Date.now();
        else if (Date.now() - dangerTimerRef.current > 2800) {
          isGameOverRef.current = true;
          setIsGameOver(true);
          fruitAudio.playGameOver();
          updateArcadeGameScore(match.id, currentUid, "fruit_merge", score, true);
        }
        ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
        ctx.fillRect(0, 0, CONTAINER_WIDTH, DANGER_Y);
      } else {
        dangerTimerRef.current = null;
      }

      // Splash Particles
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.life += 1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.size * (1 - p.life / p.maxLife)), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        return p.life < p.maxLife;
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [canDrop, currentTier, dropX, isPaused, match.id, currentUid, score]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    updateAim(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updateAim(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    updateAim(e);
    handleDropFruit();
  };

  const updateAim = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setDropX(x);
  };

  return (
    <div className="w-full max-w-md mx-auto py-2 px-1 select-none font-mono">
      <div className="relative rounded-3xl p-3 sm:p-4 bg-gradient-to-b from-[#161f2c] via-[#0f1722] to-[#0a0f16] border-2 border-[#2b3a4e] shadow-[0_16px_40px_rgba(0,0,0,0.85)]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-1 pb-3 mb-2 border-b border-[#233346] text-xs">
          <div className="space-y-0.5">
            <div className="text-[10px] text-neutral-400 font-bold uppercase">FRUIT MERGE 🍉</div>
            <div className="text-base font-black text-white flex items-center gap-1.5">
              <span>{score}</span>
              <span className="text-[10px] text-neutral-500 font-mono">/ HI {highScore}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#121c28] border border-[#2c3d52] px-3 py-1.5 rounded-2xl shadow-inner">
            <span className="text-[9px] font-bold text-neutral-400 uppercase">NEXT:</span>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm shadow-md"
              style={{
                backgroundColor: FRUIT_TIERS[nextTier - 1]?.color,
                border: `2px solid ${FRUIT_TIERS[nextTier - 1]?.accent}`,
              }}
            >
              {FRUIT_TIERS[nextTier - 1]?.emoji}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleTilt}
              disabled={tiltCooldown || isGameOver}
              className={`p-2 rounded-xl border text-[10px] font-black uppercase transition-all cursor-pointer ${
                tiltCooldown
                  ? "bg-neutral-900 border-neutral-800 text-neutral-600 cursor-not-allowed"
                  : "bg-[#1c2a3a] border-[#384e68] text-amber-300 hover:border-amber-400 active:scale-95"
              }`}
              title="Shake Jar"
            >
              <Zap className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              className="p-2 rounded-xl bg-[#1c2a3a] border border-[#384e68] text-neutral-300 hover:text-white transition-all cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-neutral-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            <button
              type="button"
              onClick={handleStartGame}
              className="p-2 rounded-xl bg-[#1c2a3a] border border-[#384e68] text-neutral-300 hover:text-white transition-all cursor-pointer active:scale-95"
              title="Restart"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Glass Container with Drag-to-Aim / Release-to-Drop ── */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative w-full aspect-[360/500] max-h-[520px] rounded-2xl overflow-hidden border-2 border-[#33465e] bg-[#0c131d] shadow-[inset_0_4px_20px_rgba(0,0,0,0.8)] cursor-pointer touch-none"
        >
          <canvas
            ref={canvasRef}
            width={CONTAINER_WIDTH}
            height={CONTAINER_HEIGHT}
            className="w-full h-full block"
          />

          {isGameOver && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-30 animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/50 flex items-center justify-center text-2xl mb-2">
                💥
              </div>
              <div className="text-lg font-black text-white uppercase tracking-wider">
                JAR OVERFLOW
              </div>
              <div className="text-xs text-neutral-400 mt-1">
                FINAL SCORE: <span className="text-amber-400 font-bold">{score}</span>
              </div>
              <button
                type="button"
                onClick={handleStartGame}
                className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-black text-xs uppercase shadow-lg shadow-emerald-500/30 hover:brightness-110 active:scale-95 cursor-pointer transition-transform"
              >
                PLAY AGAIN 🔄
              </button>
            </div>
          )}
        </div>

        {/* Evolution HUD */}
        <div className="mt-3 pt-2 border-t border-[#233346]">
          <div className="text-[9px] font-bold text-neutral-400 uppercase mb-1.5 flex items-center justify-between">
            <span>FUSION CIRCLE (11 TIERS)</span>
            <span className="text-emerald-400 font-bold">DRAG & RELEASE TO DROP</span>
          </div>
          <div className="flex items-center justify-between overflow-x-auto py-1 px-0.5 gap-1 scrollbar-none">
            {FRUIT_TIERS.map((ft) => (
              <div
                key={ft.tier}
                className="flex flex-col items-center gap-0.5 min-w-[26px]"
                title={`${ft.name} (${ft.points} pts)`}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow border"
                  style={{ backgroundColor: ft.color, borderColor: ft.accent }}
                >
                  {ft.emoji}
                </div>
                <span className="text-[8px] text-neutral-500">{ft.tier}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <ArcadeSocialDeck match={match} currentUid={currentUid} />
      </div>
    </div>
  );
}
