"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Zap, Trophy } from "lucide-react";

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
  angle: number;
  speed: number;
  radius: number;
  color: string;
  isFallen: boolean;
  fallScale: number;
  isBoosting: boolean;
  boostCharge: number;
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

interface CrackLine {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
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

  // Match score (First to 3 wins)
  const [p1Wins, setP1Wins] = useState(0);
  const [p2Wins, setP2Wins] = useState(0);
  const [roundOver, setRoundOver] = useState(false);
  const [matchWinner, setMatchWinner] = useState<"p1" | "p2" | null>(null);

  // Arena shrinking stage
  const [arenaRadius, setArenaRadius] = useState(150);
  const [shrinkTimer, setShrinkTimer] = useState(15);
  const [isWobbling, setIsWobbling] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const p1Ref = useRef<Car>({
    x: 130,
    y: 190,
    vx: 0,
    vy: 0,
    angle: 0,
    speed: 0,
    radius: 15,
    color: "#ef4444",
    isFallen: false,
    fallScale: 1,
    isBoosting: false,
    boostCharge: 100,
  });

  const p2Ref = useRef<Car>({
    x: 230,
    y: 190,
    vx: 0,
    vy: 0,
    angle: Math.PI,
    speed: 0,
    radius: 15,
    color: "#3b82f6",
    isFallen: false,
    fallScale: 1,
    isBoosting: false,
    boostCharge: 100,
  });

  const skidMarksRef = useRef<SkidMark[]>([]);
  const splashesRef = useRef<WaterSplash[]>([]);
  const cracksRef = useRef<CrackLine[]>([]);
  const splashId = useRef(1);

  const inputRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
    boost: false,
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
    setIsWobbling(false);
    skidMarksRef.current = [];
    splashesRef.current = [];
    cracksRef.current = [];

    p1Ref.current = {
      x: 130,
      y: 190,
      vx: 0,
      vy: 0,
      angle: 0,
      speed: 0,
      radius: 15,
      color: "#ef4444",
      isFallen: false,
      fallScale: 1,
      isBoosting: false,
      boostCharge: 100,
    };

    p2Ref.current = {
      x: 230,
      y: 190,
      vx: 0,
      vy: 0,
      angle: Math.PI,
      speed: 0,
      radius: 15,
      color: "#3b82f6",
      isFallen: false,
      fallScale: 1,
      isBoosting: false,
      boostCharge: 100,
    };
  }, []);

  // Arena collapse timer
  useEffect(() => {
    if (inMenu || roundOver || matchWinner) return;

    const interval = setInterval(() => {
      setShrinkTimer((prev) => {
        if (prev === 4) {
          // Warning wobble & cracks
          setIsWobbling(true);
          arcadeSfx.playButtonTap();
          for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8;
            cracksRef.current.push({
              startX: 180 + Math.cos(angle) * (arenaRadius - 25),
              startY: 190 + Math.sin(angle) * (arenaRadius - 25),
              endX: 180 + Math.cos(angle) * arenaRadius,
              endY: 190 + Math.sin(angle) * arenaRadius,
              opacity: 1,
            });
          }
        }

        if (prev <= 1) {
          // Collapse outer ring into water
          setArenaRadius((r) => Math.max(65, r - 25));
          setIsWobbling(false);
          cracksRef.current = [];
          arcadeSfx.playCarBump();

          // Water ring splashes
          for (let a = 0; a < Math.PI * 2; a += 0.8) {
            splashesRef.current.push({
              id: splashId.current++,
              x: 180 + Math.cos(a) * arenaRadius,
              y: 190 + Math.sin(a) * arenaRadius,
              radius: 8,
              opacity: 1,
            });
          }
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [inMenu, roundOver, matchWinner, arenaRadius]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") inputRef.current.up = true;
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") inputRef.current.down = true;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") inputRef.current.left = true;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") inputRef.current.right = true;
      if (e.key === " " || e.key === "Shift") triggerBoost();
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

  const triggerBoost = () => {
    const p1 = p1Ref.current;
    if (p1.boostCharge >= 35 && !p1.isFallen) {
      p1.boostCharge -= 35;
      p1.speed = Math.min(5.5, p1.speed + 2.5);
      arcadeSfx.playWhoosh();
    }
  };

  // Main Canvas & Physics Loop
  useEffect(() => {
    if (inMenu) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const arenaCenter = { x: 180, y: 190 };
    let waveTime = 0;

    const loop = () => {
      waveTime += 0.05;
      const p1 = p1Ref.current;
      const p2 = p2Ref.current;

      // Regenerate boost charge slowly
      p1.boostCharge = Math.min(100, p1.boostCharge + 0.15);

      // 1. Update Player 1
      if (!p1.isFallen) {
        if (inputRef.current.left) p1.angle -= 0.08;
        if (inputRef.current.right) p1.angle += 0.08;
        if (inputRef.current.up) p1.speed = Math.min(3.6, p1.speed + 0.16);
        else if (inputRef.current.down) p1.speed = Math.max(-1.8, p1.speed - 0.1);
        else p1.speed *= 0.94;

        p1.vx = Math.cos(p1.angle) * p1.speed;
        p1.vy = Math.sin(p1.angle) * p1.speed;
        p1.x += p1.vx;
        p1.y += p1.vy;

        if (Math.abs(p1.speed) > 2) {
          skidMarksRef.current.push({
            x: p1.x - Math.cos(p1.angle) * 10,
            y: p1.y - Math.sin(p1.angle) * 10,
            angle: p1.angle,
            opacity: 0.5,
          });
        }
      } else {
        p1.fallScale = Math.max(0, p1.fallScale - 0.04);
      }

      // 2. Update Bot / P2
      if (!p2.isFallen) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distFromCenter = Math.hypot(p2.x - arenaCenter.x, p2.y - arenaCenter.y);

        let targetAngle = Math.atan2(dy, dx);
        if (distFromCenter > arenaRadius - 28) {
          targetAngle = Math.atan2(arenaCenter.y - p2.y, arenaCenter.x - p2.x);
        }

        let diff = targetAngle - p2.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const turnSpeed = botDiff === "hard" ? 0.085 : botDiff === "medium" ? 0.055 : 0.035;
        p2.angle += Math.sign(diff) * Math.min(Math.abs(diff), turnSpeed);

        const maxBotSpeed = botDiff === "hard" ? 3.4 : botDiff === "medium" ? 2.8 : 2.2;
        p2.speed = Math.min(maxBotSpeed, p2.speed + 0.12);
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

          const nx = cdx / dist;
          const ny = cdy / dist;
          const overlap = minDist - dist;

          p1.x -= (nx * overlap) / 2;
          p1.y -= (ny * overlap) / 2;
          p2.x += (nx * overlap) / 2;
          p2.y += (ny * overlap) / 2;

          const impulse = 3.8;
          p1.x -= nx * impulse;
          p1.y -= ny * impulse;
          p2.x += nx * impulse;
          p2.y += ny * impulse;
        }
      }

      // 4. Edge Bounds & Water Sinking
      const p1Dist = Math.hypot(p1.x - arenaCenter.x, p1.y - arenaCenter.y);
      if (p1Dist > arenaRadius && !p1.isFallen) {
        p1.isFallen = true;
        arcadeSfx.playCupSink();
        splashesRef.current.push({
          id: splashId.current++,
          x: p1.x,
          y: p1.y,
          radius: 12,
          opacity: 1,
        });

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
          radius: 12,
          opacity: 1,
        });

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

      // Water Deep Blue
      ctx.fillStyle = "#0369a1";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Animated Water Waves
      for (let r = arenaRadius + 10; r < 240; r += 22) {
        ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(arenaCenter.x, arenaCenter.y, r + Math.sin(waveTime + r * 0.1) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Floating Asphalt Platform (with wobble when collapsing)
      const wobbleX = isWobbling ? (Math.random() - 0.5) * 3 : 0;
      const wobbleY = isWobbling ? (Math.random() - 0.5) * 3 : 0;

      ctx.save();
      ctx.translate(arenaCenter.x + wobbleX, arenaCenter.y + wobbleY);

      // Outer Rubber Bumper Edge
      ctx.beginPath();
      ctx.arc(0, 0, arenaRadius + 4, 0, Math.PI * 2);
      ctx.fillStyle = "#0f172a";
      ctx.fill();

      // Asphalt
      ctx.beginPath();
      ctx.arc(0, 0, arenaRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#334155";
      ctx.fill();

      // Yellow/White Track Dashes
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Fracture Cracks
      cracksRef.current.forEach((c) => {
        ctx.strokeStyle = `rgba(239, 68, 68, ${c.opacity})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(c.startX - arenaCenter.x, c.startY - arenaCenter.y);
        ctx.lineTo(c.endX - arenaCenter.x, c.endY - arenaCenter.y);
        ctx.stroke();
      });

      ctx.restore();

      // Skid marks
      skidMarksRef.current.forEach((sm) => {
        ctx.save();
        ctx.translate(sm.x, sm.y);
        ctx.rotate(sm.angle);
        ctx.fillStyle = `rgba(15, 23, 42, ${sm.opacity})`;
        ctx.fillRect(-7, -2.5, 14, 5);
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
        sp.radius += 1.8;
        sp.opacity -= 0.035;
      });
      splashesRef.current = splashesRef.current.filter((sp) => sp.opacity > 0);

      // Draw Car 1 (Red Bumper Car)
      if (p1.fallScale > 0) {
        ctx.save();
        ctx.translate(p1.x, p1.y);
        ctx.scale(p1.fallScale, p1.fallScale);
        ctx.rotate(p1.angle);

        // Headlight Beams
        ctx.fillStyle = "rgba(254, 240, 138, 0.25)";
        ctx.beginPath();
        ctx.moveTo(14, -8);
        ctx.lineTo(45, -18);
        ctx.lineTo(45, 18);
        ctx.lineTo(14, 8);
        ctx.closePath();
        ctx.fill();

        // Rubber Bumper Ring
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(-18, -13, 36, 26, 8);
        ctx.stroke();

        // Chassis
        ctx.fillStyle = p1.color;
        ctx.beginPath();
        ctx.roundRect(-16, -11, 32, 22, 6);
        ctx.fill();

        // Driver Helmet
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.arc(-2, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0f172a"; // visor
        ctx.fillRect(0, -3, 3, 6);

        ctx.restore();
      }

      // Draw Car 2 (Blue Bumper Car)
      if (p2.fallScale > 0) {
        ctx.save();
        ctx.translate(p2.x, p2.y);
        ctx.scale(p2.fallScale, p2.fallScale);
        ctx.rotate(p2.angle);

        // Headlight Beams
        ctx.fillStyle = "rgba(254, 240, 138, 0.25)";
        ctx.beginPath();
        ctx.moveTo(14, -8);
        ctx.lineTo(45, -18);
        ctx.lineTo(45, 18);
        ctx.lineTo(14, 8);
        ctx.closePath();
        ctx.fill();

        // Rubber Bumper Ring
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(-18, -13, 36, 26, 8);
        ctx.stroke();

        // Chassis
        ctx.fillStyle = p2.color;
        ctx.beginPath();
        ctx.roundRect(-16, -11, 32, 22, 6);
        ctx.fill();

        // Driver Helmet
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.arc(-2, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, -3, 3, 6);

        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [inMenu, arenaRadius, botDiff, isWobbling, currentUid, match]);

  // Hero Graphic
  const trafficHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-slate-100 rounded-2xl flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          <circle cx="80" cy="80" r="70" fill="#0284c7" />
          <circle cx="80" cy="80" r="50" fill="#334155" stroke="#cbd5e1" strokeWidth="3" strokeDasharray="6 6" />
          <g transform="translate(55, 75) rotate(-20)">
            <rect x="-14" y="-10" width="28" height="20" rx="5" fill="#ef4444" stroke="#991b1b" strokeWidth="2" />
            <rect x="0" y="-6" width="6" height="12" fill="#bfdbfe" />
          </g>
          <g transform="translate(105, 85) rotate(160)">
            <rect x="-14" y="-10" width="28" height="20" rx="5" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
            <rect x="0" y="-6" width="6" height="12" fill="#bfdbfe" />
          </g>
          <circle cx="80" cy="80" r="8" fill="#fef08a" />
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Ram Opponent off Platform",
      desc: "Drive your bumper car into your opponent to push them into the water!",
      icon: "🚗",
    },
    {
      title: "Turbo Nitro Charge",
      desc: "Tap the NITRO button (`⚡`) to unleash a high-speed ramming ram charge!",
      icon: "⚡",
    },
    {
      title: "Crumbling Edge Collapse",
      desc: "Outer platform tiles crack and plunge into water every 15s. First to 3 wins!",
      icon: "⚠️",
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
          objective="Ram opponents into the water! Use Nitro charges to push rivals off collapsing edge tiles!"
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
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 animate-fadeIn">
            <h3 className="text-2xl font-black text-amber-400 uppercase">ROUND COMPLETED!</h3>
            <button
              type="button"
              onPointerDown={resetRound}
              className="mt-4 px-6 py-2.5 bg-emerald-500 font-black rounded-xl uppercase tracking-wider text-sm shadow-lg cursor-pointer"
            >
              NEXT ROUND
            </button>
          </div>
        )}

        {/* Match Winner Modal */}
        {matchWinner && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-3xl mb-2">
              🏆
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">
              {matchWinner === "p1" ? "VICTORY!" : "DEFEATED!"}
            </h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">Final Score: {p1Wins} - {p2Wins}</p>

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

      {/* On-Screen Virtual Controls with Dedicated Nitro Boost */}
      <div className="w-full max-w-sm grid grid-cols-4 gap-2 px-2">
        {/* Left */}
        <button
          type="button"
          onPointerDown={() => {
            inputRef.current.left = true;
          }}
          onPointerUp={() => (inputRef.current.left = false)}
          className="h-16 bg-neutral-800 active:bg-neutral-700 border border-neutral-600 rounded-2xl font-black text-xl flex items-center justify-center cursor-pointer select-none"
        >
          ◄
        </button>

        {/* Drive Forward */}
        <button
          type="button"
          onPointerDown={() => {
            inputRef.current.up = true;
          }}
          onPointerUp={() => (inputRef.current.up = false)}
          className="h-16 bg-neutral-800 active:bg-neutral-700 border border-neutral-600 rounded-2xl font-black text-xl flex items-center justify-center cursor-pointer select-none"
        >
          ▲
        </button>

        {/* Right */}
        <button
          type="button"
          onPointerDown={() => {
            inputRef.current.right = true;
          }}
          onPointerUp={() => (inputRef.current.right = false)}
          className="h-16 bg-neutral-800 active:bg-neutral-700 border border-neutral-600 rounded-2xl font-black text-xl flex items-center justify-center cursor-pointer select-none"
        >
          ►
        </button>

        {/* Turbo Nitro */}
        <button
          type="button"
          onPointerDown={triggerBoost}
          className="h-16 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 border-b-4 border-amber-900 rounded-2xl font-black text-sm flex flex-col items-center justify-center text-white cursor-pointer select-none"
        >
          <Zap className="w-5 h-5" />
          <span className="text-[9px] uppercase tracking-wider font-black">NITRO</span>
        </button>
      </div>
    </div>
  );
}
