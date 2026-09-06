"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Trophy } from "lucide-react";

interface TrafficJamGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
  onBack?: () => void;
}

interface Car {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number; // in radians
  speed: number;
  radius: number;
  color: string;
  isFallen: boolean;
  fallScale: number;
}

interface SkidMark {
  x: number;
  y: number;
  angle: number;
  opacity: number;
}

interface WaterSplash {
  id: number;
  x: number;
  y: number;
  radius: number;
  opacity: number;
}

export default function TrafficJamGame({
  match,
  currentUid,
  onBack,
}: TrafficJamGameProps) {
  const [inMenu, setInMenu] = useState(true);
  const [playMode, setPlayMode] = useState<"bot" | "friend">("bot");
  const [botDiff, setBotDiff] = useState<BotDifficulty>("medium");

  // Match score (First to 3 round wins)
  const [p1Wins, setP1Wins] = useState(0);
  const [p2Wins, setP2Wins] = useState(0);
  const [roundOver, setRoundOver] = useState(false);
  const [matchWinner, setMatchWinner] = useState<"p1" | "p2" | null>(null);

  // Arena shrinking stage
  const [arenaRadius, setArenaRadius] = useState(150); // initial 150px
  const [shrinkTimer, setShrinkTimer] = useState(15);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game loop physics refs
  const p1Ref = useRef<Car>({
    x: 140,
    y: 190,
    vx: 0,
    vy: 0,
    angle: 0,
    speed: 0,
    radius: 14,
    color: "#ef4444",
    isFallen: false,
    fallScale: 1,
  });

  const p2Ref = useRef<Car>({
    x: 220,
    y: 190,
    vx: 0,
    vy: 0,
    angle: Math.PI,
    speed: 0,
    radius: 14,
    color: "#3b82f6",
    isFallen: false,
    fallScale: 1,
  });

  const skidMarksRef = useRef<SkidMark[]>([]);
  const splashesRef = useRef<WaterSplash[]>([]);
  const splashId = useRef(1);

  // Controls input
  const inputRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  // Start new match
  const startGame = useCallback((mode: "bot" | "friend", diff: BotDifficulty = "medium") => {
    setPlayMode(mode);
    setBotDiff(diff);
    setP1Wins(0);
    setP2Wins(0);
    setMatchWinner(null);
    setInMenu(false);
    resetRound();
  }, []);

  const resetRound = useCallback(() => {
    setRoundOver(false);
    setArenaRadius(150);
    setShrinkTimer(15);
    skidMarksRef.current = [];
    splashesRef.current = [];

    p1Ref.current = {
      x: 130,
      y: 190,
      vx: 0,
      vy: 0,
      angle: 0,
      speed: 0,
      radius: 14,
      color: "#ef4444",
      isFallen: false,
      fallScale: 1,
    };

    p2Ref.current = {
      x: 230,
      y: 190,
      vx: 0,
      vy: 0,
      angle: Math.PI,
      speed: 0,
      radius: 14,
      color: "#3b82f6",
      isFallen: false,
      fallScale: 1,
    };
  }, []);

  // Arena collapse timer (Every 15s shrinking)
  useEffect(() => {
    if (inMenu || roundOver || matchWinner) return;

    const interval = setInterval(() => {
      setShrinkTimer((prev) => {
        if (prev <= 1) {
          // Collapse outer ring
          setArenaRadius((r) => Math.max(70, r - 25));
          arcadeSfx.playCarBump();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [inMenu, roundOver, matchWinner]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") inputRef.current.up = true;
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") inputRef.current.down = true;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") inputRef.current.left = true;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") inputRef.current.right = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") inputRef.current.up = false;
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") inputRef.current.down = false;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") inputRef.current.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") inputRef.current.right = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Main Canvas & Physics Loop
  useEffect(() => {
    if (inMenu) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const arenaCenter = { x: 180, y: 190 };

    const loop = () => {
      const p1 = p1Ref.current;
      const p2 = p2Ref.current;

      // 1. Update Player 1
      if (!p1.isFallen) {
        if (inputRef.current.left) p1.angle -= 0.08;
        if (inputRef.current.right) p1.angle += 0.08;
        if (inputRef.current.up) p1.speed = Math.min(3.5, p1.speed + 0.15);
        else if (inputRef.current.down) p1.speed = Math.max(-1.8, p1.speed - 0.1);
        else p1.speed *= 0.94; // friction

        p1.vx = Math.cos(p1.angle) * p1.speed;
        p1.vy = Math.sin(p1.angle) * p1.speed;
        p1.x += p1.vx;
        p1.y += p1.vy;

        // Skid marks if fast turning
        if (Math.abs(p1.speed) > 2 && (inputRef.current.left || inputRef.current.right)) {
          skidMarksRef.current.push({
            x: p1.x - Math.cos(p1.angle) * 10,
            y: p1.y - Math.sin(p1.angle) * 10,
            angle: p1.angle,
            opacity: 0.6,
          });
        }
      } else {
        p1.fallScale = Math.max(0, p1.fallScale - 0.04);
      }

      // 2. Update Bot / P2
      if (!p2.isFallen) {
        // Vector steering AI
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distToP1 = Math.hypot(dx, dy);
        const distFromCenter = Math.hypot(p2.x - arenaCenter.x, p2.y - arenaCenter.y);

        let targetAngle = Math.atan2(dy, dx);
        // If near edge, steer back toward center
        if (distFromCenter > arenaRadius - 30) {
          targetAngle = Math.atan2(arenaCenter.y - p2.y, arenaCenter.x - p2.x);
        }

        // Steer toward targetAngle
        let diff = targetAngle - p2.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const turnSpeed = botDiff === "hard" ? 0.08 : botDiff === "medium" ? 0.05 : 0.03;
        p2.angle += Math.sign(diff) * Math.min(Math.abs(diff), turnSpeed);

        const maxBotSpeed = botDiff === "hard" ? 3.3 : botDiff === "medium" ? 2.8 : 2.2;
        p2.speed = Math.min(maxBotSpeed, p2.speed + 0.1);
        p2.vx = Math.cos(p2.angle) * p2.speed;
        p2.vy = Math.sin(p2.angle) * p2.speed;
        p2.x += p2.vx;
        p2.y += p2.vy;
      } else {
        p2.fallScale = Math.max(0, p2.fallScale - 0.04);
      }

      // 3. Elastic Bumper Collision
      if (!p1.isFallen && !p2.isFallen) {
        const cdx = p2.x - p1.x;
        const cdy = p2.y - p1.y;
        const dist = Math.hypot(cdx, cdy);
        const minDist = p1.radius + p2.radius;

        if (dist < minDist && dist > 0) {
          arcadeSfx.playCarBump();

          // Normal vector
          const nx = cdx / dist;
          const ny = cdy / dist;

          // Push apart
          const overlap = minDist - dist;
          p1.x -= (nx * overlap) / 2;
          p1.y -= (ny * overlap) / 2;
          p2.x += (nx * overlap) / 2;
          p2.y += (ny * overlap) / 2;

          // Impulse transfer
          const impulse = 3.5;
          p1.x -= nx * impulse;
          p1.y -= ny * impulse;
          p2.x += nx * impulse;
          p2.y += ny * impulse;
        }
      }

      // 4. Check Platform Bounds & Water Falls
      const p1Dist = Math.hypot(p1.x - arenaCenter.x, p1.y - arenaCenter.y);
      if (p1Dist > arenaRadius && !p1.isFallen) {
        p1.isFallen = true;
        arcadeSfx.playCupSink(); // Water splash
        splashesRef.current.push({
          id: splashId.current++,
          x: p1.x,
          y: p1.y,
          radius: 10,
          opacity: 1,
        });

        // P2 Wins Round!
        setTimeout(() => {
          setRoundOver(true);
          setP2Wins((w) => {
            const nw = w + 1;
            if (nw >= 3) {
              setMatchWinner("p2");
              arcadeSfx.playVictory();
            }
            return nw;
          });
        }, 600);
      }

      const p2Dist = Math.hypot(p2.x - arenaCenter.x, p2.y - arenaCenter.y);
      if (p2Dist > arenaRadius && !p2.isFallen) {
        p2.isFallen = true;
        arcadeSfx.playCupSink();
        splashesRef.current.push({
          id: splashId.current++,
          x: p2.x,
          y: p2.y,
          radius: 10,
          opacity: 1,
        });

        // P1 Wins Round!
        setTimeout(() => {
          setRoundOver(true);
          setP1Wins((w) => {
            const nw = w + 1;
            if (nw >= 3) {
              setMatchWinner("p1");
              arcadeSfx.playVictory();
              if (currentUid && match?.id) {
                updateArcadeGameScore(match.id, currentUid, "traffic_jam" as any, 30, true);
              }
            }
            return nw;
          });
        }, 600);
      }

      // ── RENDERING ──
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Water Background
      ctx.fillStyle = "#0284c7";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Water Ripple Waves
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(arenaCenter.x, arenaCenter.y, arenaRadius + 20, 0, Math.PI * 2);
      ctx.stroke();

      // Floating Asphalt Arena
      ctx.save();
      ctx.beginPath();
      ctx.arc(arenaCenter.x, arenaCenter.y, arenaRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#334155";
      ctx.fill();
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 8]);
      ctx.stroke();
      ctx.restore();

      // Skid Marks
      skidMarksRef.current.forEach((sm) => {
        ctx.save();
        ctx.translate(sm.x, sm.y);
        ctx.rotate(sm.angle);
        ctx.fillStyle = `rgba(15, 23, 42, ${sm.opacity})`;
        ctx.fillRect(-6, -2, 12, 4);
        ctx.restore();
        sm.opacity -= 0.005;
      });
      skidMarksRef.current = skidMarksRef.current.filter((sm) => sm.opacity > 0);

      // Splashes
      splashesRef.current.forEach((sp) => {
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${sp.opacity})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        sp.radius += 1.5;
        sp.opacity -= 0.03;
      });
      splashesRef.current = splashesRef.current.filter((sp) => sp.opacity > 0);

      // Draw Car 1 (Red)
      if (p1.fallScale > 0) {
        ctx.save();
        ctx.translate(p1.x, p1.y);
        ctx.scale(p1.fallScale, p1.fallScale);
        ctx.rotate(p1.angle);
        // Chassis
        ctx.fillStyle = p1.color;
        ctx.beginPath();
        ctx.roundRect(-16, -11, 32, 22, 6);
        ctx.fill();
        ctx.strokeStyle = "#991b1b";
        ctx.lineWidth = 2;
        ctx.stroke();
        // Windshield
        ctx.fillStyle = "#93c5fd";
        ctx.fillRect(0, -7, 7, 14);
        // Headlights
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(12, -9, 3, 4);
        ctx.fillRect(12, 5, 3, 4);
        ctx.restore();
      }

      // Draw Car 2 (Blue)
      if (p2.fallScale > 0) {
        ctx.save();
        ctx.translate(p2.x, p2.y);
        ctx.scale(p2.fallScale, p2.fallScale);
        ctx.rotate(p2.angle);
        // Chassis
        ctx.fillStyle = p2.color;
        ctx.beginPath();
        ctx.roundRect(-16, -11, 32, 22, 6);
        ctx.fill();
        ctx.strokeStyle = "#1e3a8a";
        ctx.lineWidth = 2;
        ctx.stroke();
        // Windshield
        ctx.fillStyle = "#93c5fd";
        ctx.fillRect(0, -7, 7, 14);
        // Headlights
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(12, -9, 3, 4);
        ctx.fillRect(12, 5, 3, 4);
        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [inMenu, arenaRadius, botDiff, currentUid, match]);

  // Hero Graphic
  const trafficHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-slate-100 rounded-2xl flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          {/* Water */}
          <circle cx="80" cy="80" r="70" fill="#0284c7" />
          {/* Asphalt Arena */}
          <circle cx="80" cy="80" r="50" fill="#334155" stroke="#cbd5e1" strokeWidth="3" strokeDasharray="6 6" />

          {/* Red Car */}
          <g transform="translate(55, 75) rotate(-20)">
            <rect x="-14" y="-10" width="28" height="20" rx="5" fill="#ef4444" stroke="#991b1b" strokeWidth="2" />
            <rect x="0" y="-6" width="6" height="12" fill="#bfdbfe" />
          </g>

          {/* Blue Car */}
          <g transform="translate(105, 85) rotate(160)">
            <rect x="-14" y="-10" width="28" height="20" rx="5" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
            <rect x="0" y="-6" width="6" height="12" fill="#bfdbfe" />
          </g>

          {/* Collision Spark */}
          <circle cx="80" cy="80" r="8" fill="#fef08a" />
          <path d="M72,80 L62,80 M88,80 L98,80 M80,72 L80,62 M80,88 L80,98" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Push Opponent into Water",
      desc: "Drive your micro bumper car and ram into your opponent to push them off the edge!",
      icon: "🚗",
    },
    {
      title: "Dynamic Arena Collapse",
      desc: "Every 15 seconds, the outer edge tiles crumble and sink into the water!",
      icon: "⚠️",
    },
    {
      title: "First to 3 Wins",
      desc: "Last car standing on the platform takes the round. Score 3 rounds to win the match.",
      icon: "🏆",
    },
  ];

  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-slate-900 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="TRAFFIC JAM"
          subtitle="Arena Bumper Cars"
          categoryTag="PHYSICS ARENA"
          accentColor="#37474F"
          objective="Ram your opponent into the water! Outer platform tiles collapse every 15s. First to 3 wins!"
          heroGraphic={trafficHero}
          howToPlaySteps={howToPlaySteps}
          onPlayFriend={() => startGame("friend")}
          onPlayBot={(diff) => startGame("bot", diff)}
          onBack={onBack || (() => window.history.back())}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-between p-4 select-none touch-none bg-neutral-950 text-white font-sans">
      {/* Top HUD */}
      <div className="w-full max-w-sm flex items-center justify-between px-2 pt-2">
        <button
          type="button"
          onPointerDown={() => setInMenu(true)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-neutral-300 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Score */}
        <div className="flex items-center gap-4 bg-neutral-900/80 px-4 py-2 rounded-2xl border border-white/15 shadow-md">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-red-400">RED (YOU)</span>
            <span className="text-2xl font-black text-red-500">{p1Wins}</span>
          </div>
          <span className="text-neutral-500 font-bold">:</span>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-blue-400">
              BLUE ({playMode === "bot" ? "BOT" : "P2"})
            </span>
            <span className="text-2xl font-black text-blue-500">{p2Wins}</span>
          </div>
        </div>

        {/* Collapse Countdown */}
        <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-500/30">
          <span>⚠️ {shrinkTimer}s</span>
        </div>
      </div>

      {/* Main Canvas Arena */}
      <div className="relative w-full max-w-sm h-[380px] rounded-3xl overflow-hidden shadow-2xl border border-white/15 my-2 flex items-center justify-center">
        <canvas ref={canvasRef} width={360} height={380} className="w-full h-full" />

        {/* Round Over Banner */}
        {roundOver && !matchWinner && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 animate-fadeIn">
            <h3 className="text-2xl font-black text-amber-400 uppercase">ROUND FINISHED!</h3>
            <button
              type="button"
              onPointerDown={resetRound}
              className="mt-4 px-6 py-2.5 bg-emerald-500 font-black rounded-xl uppercase tracking-wider text-sm shadow-lg cursor-pointer"
            >
              NEXT ROUND
            </button>
          </div>
        )}

        {/* Match Finished Modal */}
        {matchWinner && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-3xl mb-2">
              🏆
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">
              {matchWinner === "p1" ? "VICTORY!" : "DEFEATED!"}
            </h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">
              Final Score: {p1Wins} - {p2Wins}
            </p>

            <button
              type="button"
              onPointerDown={() => startGame(playMode, botDiff)}
              className="w-full max-w-[220px] mt-6 py-3.5 bg-red-500 hover:bg-red-600 border-b-4 border-red-700 active:border-b-0 active:translate-y-1 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>PLAY AGAIN</span>
            </button>
          </div>
        )}
      </div>

      {/* On-Screen Virtual Controls */}
      <div className="w-full max-w-sm grid grid-cols-3 gap-2 px-6">
        <div />
        <button
          type="button"
          onPointerDown={() => {
            inputRef.current.up = true;
            arcadeSfx.playButtonTap();
          }}
          onPointerUp={() => (inputRef.current.up = false)}
          onPointerLeave={() => (inputRef.current.up = false)}
          className="h-14 bg-neutral-800 active:bg-neutral-700 border border-neutral-600 rounded-2xl font-black text-xl flex items-center justify-center shadow-md cursor-pointer select-none"
        >
          ▲
        </button>
        <div />

        <button
          type="button"
          onPointerDown={() => {
            inputRef.current.left = true;
            arcadeSfx.playButtonTap();
          }}
          onPointerUp={() => (inputRef.current.left = false)}
          onPointerLeave={() => (inputRef.current.left = false)}
          className="h-14 bg-neutral-800 active:bg-neutral-700 border border-neutral-600 rounded-2xl font-black text-xl flex items-center justify-center shadow-md cursor-pointer select-none"
        >
          ◄
        </button>

        <button
          type="button"
          onPointerDown={() => {
            inputRef.current.down = true;
            arcadeSfx.playButtonTap();
          }}
          onPointerUp={() => (inputRef.current.down = false)}
          onPointerLeave={() => (inputRef.current.down = false)}
          className="h-14 bg-neutral-800 active:bg-neutral-700 border border-neutral-600 rounded-2xl font-black text-xl flex items-center justify-center shadow-md cursor-pointer select-none"
        >
          ▼
        </button>

        <button
          type="button"
          onPointerDown={() => {
            inputRef.current.right = true;
            arcadeSfx.playButtonTap();
          }}
          onPointerUp={() => (inputRef.current.right = false)}
          onPointerLeave={() => (inputRef.current.right = false)}
          className="h-14 bg-neutral-800 active:bg-neutral-700 border border-neutral-600 rounded-2xl font-black text-xl flex items-center justify-center shadow-md cursor-pointer select-none"
        >
          ►
        </button>
      </div>
    </div>
  );
}
